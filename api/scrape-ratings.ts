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
    fideId: null as string | null,
    birthDate: null as string | null,
  };

  if (!html) return result;

  try {
    const $ = load(html);

    // Extract player name from header
    const primaryName = $('#dados-jogador-row1 h2, .nome-jogador').first().text().trim();
    if (primaryName && !primaryName.toLowerCase().includes('cbx') && !primaryName.toLowerCase().includes('informa')) {
      result.name = primaryName;
    } else {
      const h2El = $('h2').first().text().trim();
      if (h2El && !h2El.toLowerCase().includes('cbx') && !h2El.toLowerCase().includes('informa')) {
        result.name = h2El;
      }
    }

    // Extract UF, FIDE ID, Birth Date from #dados-jogador-row1
    const infoContainer = $('#dados-jogador-row1, #dados-jogador');
    const infoText = infoContainer.length > 0 ? infoContainer.text() : html;

    const ufMatch = infoText.match(/UF:\s*([A-Z]{2})/i) || html.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);
    if (ufMatch) {
      result.state = (ufMatch[1] || ufMatch[0]).toUpperCase();
    }

    const fideMatch = infoText.match(/ID\s*FIDE:\s*(\d+)/i);
    if (fideMatch) {
      result.fideId = fideMatch[1].trim();
    }

    const birthMatch = infoText.match(/Data\s*Nasc\.?:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
    if (birthMatch) {
      result.birthDate = birthMatch[1].trim();
    }

    // Title (GM, IM, FM, etc.)
    const titleMatch = infoText.match(/\b(GM|MI|MF|MN|CMN|NM|WGM|WMI|WMF|WCM|CM)\b/);
    if (titleMatch) {
      const t = titleMatch[1];
      result.title = t === 'MI' ? 'IM' : t === 'MF' ? 'FM' : t === 'WMI' ? 'WIM' : t === 'WMF' ? 'WFM' : t;
    }

    // TARGET TABLE: Look for table with header/caption "Evolução Rating"
    // Requirement: "Para rating cbx deve esperar carregar a pagina da cbx e procurar uma tag table com header 'Evolução Rating' . Nela tem os regustros de rating e os mais atuais na primeira linha"
    let ratingTable: any = null;

    $('table').each((_, tbl) => {
      const $tbl = $(tbl);
      const caption = $tbl.find('caption').text().toLowerCase();
      const headerText = $tbl.find('tr, th').first().text().toLowerCase();
      const idAttr = $tbl.attr('id') || '';

      const isEvolucaoTable =
        /evolu[cç][aã]o\s*(de)?\s*rating/i.test(caption) ||
        /evolu[cç][aã]o\s*(de)?\s*rating/i.test(headerText) ||
        (idAttr.includes('gdvRating') && !idAttr.includes('Torneio'));

      if (isEvolucaoTable) {
        ratingTable = $tbl;
        return false; // Break
      }
    });

    // Fallback: table with columns "Mês/Ano" and ("Clássico" or "Rápido" or "Blitz")
    if (!ratingTable) {
      $('table').each((_, tbl) => {
        const $tbl = $(tbl);
        const text = $tbl.text().toLowerCase();
        const caption = $tbl.find('caption').text().toLowerCase();
        if (
          !caption.includes('torneio') &&
          (text.includes('mês/ano') || text.includes('mes/ano')) &&
          (text.includes('clássico') || text.includes('classico') || text.includes('rápido') || text.includes('blitz'))
        ) {
          ratingTable = $tbl;
          return false;
        }
      });
    }

    if (ratingTable) {
      // Determine columns from header row
      let stdCol = 1;
      let rapCol = 2;
      let blzCol = 3;

      const headerRow = ratingTable
        .find('tr')
        .filter((_: number, r: any) => $(r).find('th').length > 0 || $(r).find('td strong').length > 0)
        .first();

      if (headerRow.length > 0) {
        headerRow.find('th, td').each((idx: number, cell: any) => {
          const txt = $(cell).text().toLowerCase();
          if (txt.includes('cláss') || txt.includes('class') || txt.includes('pensad') || txt.includes('std')) stdCol = idx;
          else if (txt.includes('ráp') || txt.includes('rap')) rapCol = idx;
          else if (txt.includes('blitz') || txt.includes('relâm') || txt.includes('relam')) blzCol = idx;
        });
      }

      // Filter rows that have <td> elements (data rows)
      const dataRows = ratingTable.find('tr').filter((_: number, r: any) => $(r).find('td').length >= 3);
      if (dataRows.length > 0) {
        // "Nela tem os registros de rating e os mais atuais na primeira linha"
        const firstRow = dataRows.first();
        const tds = firstRow.find('td');

        const parseNum = (cellEl: any): number | null => {
          if (!cellEl || cellEl.length === 0) return null;
          const raw = cellEl.text().replace(/\s+/g, ' ').trim();
          const clean = raw.replace(/[^\d]/g, '');
          if (!clean) return null;
          const num = parseInt(clean, 10);
          return num >= 400 && num <= 3800 ? num : null;
        };

        result.standard = parseNum(tds.eq(stdCol));
        result.rapid = parseNum(tds.eq(rapCol));
        result.blitz = parseNum(tds.eq(blzCol));

        // If any modality is missing in the first row, look down subsequent rows to find most recent
        if (!result.standard || !result.rapid || !result.blitz) {
          dataRows.each((idx: number, r: any) => {
            if (idx === 0) return;
            const rowTds = $(r).find('td');
            if (!result.standard) result.standard = parseNum(rowTds.eq(stdCol));
            if (!result.rapid) result.rapid = parseNum(rowTds.eq(rapCol));
            if (!result.blitz) result.blitz = parseNum(rowTds.eq(blzCol));
          });
        }
      }
    }

    // Direct regex fallback on raw HTML
    if (!result.standard && !result.rapid && !result.blitz) {
      const matchTable =
        html.match(/<(?:table)[^>]*?(?:gdvRating|Evolu[cç][aã]o[^>]*?Rating)[^>]*>([\s\S]*?)<\/table>/i) ||
        html.match(/<table[^>]*>([\s\S]*?Evolu[cç][aã]o\s*(?:de)?\s*Rating[\s\S]*?)<\/table>/i);

      if (matchTable) {
        const tableContent = matchTable[0];
        const trMatches = tableContent.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
        if (trMatches) {
          for (const tr of trMatches) {
            const tdMatches = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
            if (tdMatches && tdMatches.length >= 4) {
              const cleanTd = (str: string) => {
                const n = parseInt(str.replace(/<[^>]*>/g, '').replace(/[^\d]/g, ''), 10);
                return n >= 400 && n <= 3800 ? n : null;
              };
              result.standard = cleanTd(tdMatches[1]);
              result.rapid = cleanTd(tdMatches[2]);
              result.blitz = cleanTd(tdMatches[3]);
              break;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error parsing CBX HTML:', err);
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
        fideId: null as string | null,
        birthDate: null as string | null,
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
          },
          signal: AbortSignal.timeout(10000), // Espera carregar a página da CBX
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
