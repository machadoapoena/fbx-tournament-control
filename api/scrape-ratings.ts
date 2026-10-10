import { load } from 'cheerio';

function extractRating(val: string | null | undefined): number | null {
  if (!val) return null;
  const clean = val.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean || clean.toLowerCase() === 'unrated' || clean === '-' || clean === '0') return null;

  const match = clean.match(/\b([4-9]\d{2}|[1-3]\d{3})\b/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num >= 400 && num <= 3800) return num;
  }

  const directDigits = clean.replace(/[^\d]/g, '');
  if (directDigits.length >= 3 && directDigits.length <= 4) {
    const num = parseInt(directDigits, 10);
    if (!isNaN(num) && num >= 400 && num <= 3800) return num;
  }

  return null;
}

function parseFideHtml(html: string) {
  const result = {
    standard: null as number | null,
    rapid: null as number | null,
    blitz: null as number | null,
    title: null as string | null,
    name: null as string | null,
    country: null as string | null,
    birthYear: null as number | null,
    gender: null as string | null,
  };

  if (!html) return result;

  try {
    const $ = load(html);

    const extractFromGameBlock = (selectors: string[]) => {
      for (const selector of selectors) {
        const elements = $(selector);
        for (let i = 0; i < elements.length; i++) {
          const el = $(elements[i]);
          const ps = el.find('p');
          for (let j = 0; j < ps.length; j++) {
            const pText = $(ps[j]).text().trim();
            const rating = extractRating(pText);
            if (rating) return rating;
          }
          const spans = el.find('span');
          for (let j = 0; j < spans.length; j++) {
            const spanText = $(spans[j]).text().trim();
            const rating = extractRating(spanText);
            if (rating) return rating;
          }
          const directRating = extractRating(el.text());
          if (directRating) return directRating;
        }
      }
      return null;
    };

    result.standard = extractFromGameBlock([
      '.profile-standart.profile-game',
      '.profile-game.profile-standart',
      '.profile-standard.profile-game',
      '.profile-game.profile-standard',
      '.profile-standart',
      '.profile-standard',
      '[class*="profile-standart"]',
      '[class*="profile-standard"]',
      '.profile-top-rating-data_std',
      '.profile-games .profile-standart',
      '.profile-games .profile-standard'
    ]);

    result.rapid = extractFromGameBlock([
      '.profile-rapid.profile-game',
      '.profile-game.profile-rapid',
      '.profile-rapid',
      '[class*="profile-rapid"]',
      '.profile-top-rating-data_rap',
      '.profile-games .profile-rapid'
    ]);

    result.blitz = extractFromGameBlock([
      '.profile-blitz.profile-game',
      '.profile-game.profile-blitz',
      '.profile-blitz',
      '[class*="profile-blitz"]',
      '.profile-top-rating-data_blz',
      '.profile-games .profile-blitz'
    ]);

    // Name
    const nameEl = $('.profile-top-title, .profile-title, h1.profile-top-title');
    if (nameEl.length > 0) {
      const rawName = nameEl.first().text().trim();
      if (rawName && !rawName.toLowerCase().includes('fide')) {
        result.name = rawName;
      }
    }

    // Title (GM, IM, FM, etc.)
    const titleEl = $('.profile-top-info__title, .profile-top-data_title');
    if (titleEl.length > 0) {
      result.title = titleEl.first().text().trim();
    }
  } catch {
    // Ignore cheerio parse error
  }

  return result;
}

function parseCbxHtml(html: string) {
  const result = {
    standard: null as number | null,
    rapid: null as number | null,
    blitz: null as number | null,
    title: null as string | null,
    name: null as string | null,
    state: null as string | null,
    club: null as string | null,
  };

  if (!html) return result;

  try {
    const $ = load(html);

    $('table tr').each((_, row) => {
      const text = $(row).text().toLowerCase();
      const cells = $(row).find('td');

      if (text.includes('pensado') || text.includes('convencional') || text.includes('clássico') || text.includes('standard')) {
        cells.each((_, cell) => {
          const val = extractRating($(cell).text());
          if (val && !result.standard) result.standard = val;
        });
      }

      if (text.includes('rápido') || text.includes('rapido') || text.includes('rapid')) {
        cells.each((_, cell) => {
          const val = extractRating($(cell).text());
          if (val && !result.rapid) result.rapid = val;
        });
      }

      if (text.includes('blitz') || text.includes('relâmpago') || text.includes('relampago')) {
        cells.each((_, cell) => {
          const val = extractRating($(cell).text());
          if (val && !result.blitz) result.blitz = val;
        });
      }
    });

    // Try name or state from CBX profile
    const headerTitle = $('h1, h2, .nome-jogador').first().text().trim();
    if (headerTitle && !headerTitle.toLowerCase().includes('cbx') && headerTitle.length > 3) {
      result.name = headerTitle;
    }
  } catch {
    // Ignore cheerio error
  }

  return result;
}

async function getParsedBody(req: any): Promise<any> {
  if (req.body) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      return req.body;
    }
    try {
      const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf-8') : String(req.body);
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  try {
    const buffers: Buffer[] = [];
    for await (const chunk of req) {
      buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(buffers).toString('utf-8');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = await getParsedBody(req);
    const { fideId, fideUrl, cbxId, cbxUrl, rawSnippet } = body;

    const result = {
      fide: {
        standard: null as number | null,
        rapid: null as number | null,
        blitz: null as number | null,
        title: null as string | null,
        name: null as string | null,
        country: null as string | null,
        birthYear: null as number | null,
        gender: null as string | null,
        error: null as string | null,
      },
      cbx: {
        standard: null as number | null,
        rapid: null as number | null,
        blitz: null as number | null,
        title: null as string | null,
        name: null as string | null,
        state: null as string | null,
        club: null as string | null,
        error: null as string | null,
      },
    };

    // 0. Direct pasted snippet
    if (rawSnippet) {
      const fideParsed = parseFideHtml(rawSnippet);
      const cbxParsed = parseCbxHtml(rawSnippet);
      if (fideParsed.standard || fideParsed.rapid || fideParsed.blitz) {
        result.fide = { ...result.fide, ...fideParsed };
      }
      if (cbxParsed.standard || cbxParsed.rapid || cbxParsed.blitz) {
        result.cbx = { ...result.cbx, ...cbxParsed };
      }
    }

    // 1. Scrape CBX
    let targetCbxUrl = cbxUrl?.trim();
    const cleanCbxId = cbxId?.toString().trim();
    if (!targetCbxUrl && cleanCbxId) {
      targetCbxUrl = `https://www.cbx.org.br/jogador/${encodeURIComponent(cleanCbxId)}`;
    } else if (targetCbxUrl && !targetCbxUrl.startsWith('http')) {
      targetCbxUrl = `https://www.cbx.org.br/jogador/${encodeURIComponent(targetCbxUrl)}`;
    }

    if (targetCbxUrl) {
      try {
        const cbxRes = await fetch(targetCbxUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9',
          },
          signal: AbortSignal.timeout(4500),
        });
        if (cbxRes.ok) {
          const html = await cbxRes.text();
          const parsed = parseCbxHtml(html);
          result.cbx = { ...result.cbx, ...parsed, error: null };
        } else {
          result.cbx.error = `CBX HTTP ${cbxRes.status}`;
        }
      } catch (err: any) {
        result.cbx.error = err?.message || 'Erro ao consultar CBX';
      }
    }

    // 2. Scrape FIDE
    const cleanFideId = fideId?.toString().trim();
    let targetFideUrl = fideUrl?.trim();
    if (!targetFideUrl && cleanFideId) {
      targetFideUrl = `https://ratings.fide.com/profile/${encodeURIComponent(cleanFideId)}`;
    }

    if (targetFideUrl) {
      let fideHtml: string | null = null;
      const sources = [
        targetFideUrl,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetFideUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetFideUrl)}`,
        `https://corsproxy.io/?url=${encodeURIComponent(targetFideUrl)}`,
      ];

      for (const url of sources) {
        try {
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
              'Accept': 'text/html,*/*',
            },
            signal: AbortSignal.timeout(3500),
          });
          if (res.ok) {
            const text = await res.text();
            if (text && text.length > 100 && (text.includes('profile-') || text.includes('STANDARD') || text.includes('fide') || text.includes('ratings.fide.com'))) {
              fideHtml = text;
              break;
            }
          }
        } catch {}
      }

      if (fideHtml) {
        const parsed = parseFideHtml(fideHtml);
        result.fide = { ...result.fide, ...parsed, error: null };
      } else {
        result.fide.error = 'Não foi possível baixar da FIDE automaticamente (bloqueio Cloudflare). Utilize a opção "Colar HTML" ou preencha manualmente.';
      }
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('API scrape-ratings error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erro ao processar raspagem de dados',
    });
  }
}
