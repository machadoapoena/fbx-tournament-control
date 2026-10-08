import express from 'express';
import { createServer as createViteServer } from 'vite';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to extract 3-4 digit ratings
function extractRating(val: string | null | undefined): number | null {
  if (!val) return null;
  const clean = val.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean || clean.toLowerCase() === 'unrated' || clean === '-' || clean === '0') return null;

  // Match 3 or 4 digit ratings (e.g., 800-3800)
  const match = clean.match(/\b([4-9]\d{2}|[1-3]\d{3})\b/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num >= 400 && num <= 3800) return num;
  }

  // If the clean string is simply digits
  const directDigits = clean.replace(/[^\d]/g, '');
  if (directDigits.length >= 3 && directDigits.length <= 4) {
    const num = parseInt(directDigits, 10);
    if (!isNaN(num) && num >= 400 && num <= 3800) return num;
  }

  return null;
}

// Helper to parse FIDE HTML
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
    const $ = cheerio.load(html);

    // Dedicated extractor targeting game blocks like:
    // <div class="profile-standart profile-game"><p>1508</p><p>STANDARD</p></div>
    const extractFromGameBlock = (selectors: string[]) => {
      for (const selector of selectors) {
        const elements = $(selector);
        for (let i = 0; i < elements.length; i++) {
          const el = $(elements[i]);

          // 1. First priority: look for <p> tags inside the block
          const ps = el.find('p');
          for (let j = 0; j < ps.length; j++) {
            const pText = $(ps[j]).text().trim();
            const rating = extractRating(pText);
            if (rating) return rating;
          }

          // 2. Look for <span> tags inside
          const spans = el.find('span');
          for (let j = 0; j < spans.length; j++) {
            const spanText = $(spans[j]).text().trim();
            const rating = extractRating(spanText);
            if (rating) return rating;
          }

          // 3. Fallback to direct element text
          const directRating = extractRating(el.text());
          if (directRating) return directRating;
        }
      }
      return null;
    };

    // Standard rating selectors
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

    // Rapid rating selectors
    result.rapid = extractFromGameBlock([
      '.profile-rapid.profile-game',
      '.profile-game.profile-rapid',
      '.profile-rapid',
      '[class*="profile-rapid"]',
      '.profile-top-rating-data_rap',
      '.profile-games .profile-rapid'
    ]);

    // Blitz rating selectors
    result.blitz = extractFromGameBlock([
      '.profile-blitz.profile-game',
      '.profile-game.profile-blitz',
      '.profile-blitz',
      '[class*="profile-blitz"]',
      '.profile-top-rating-data_blz',
      '.profile-games .profile-blitz'
    ]);

    // Regex fallbacks specifically matching the user's HTML structure:
    // <div class="profile-standart profile-game ..."><p>1508</p></div>
    if (!result.standard) {
      const stdPatterns = [
        /class=["'][^"']*profile-standar[td][^"']*profile-game[^"']*["'][\s\S]*?<p[^>]*>\s*(\d{3,4})\s*<\/p>/i,
        /class=["'][^"']*profile-game[^"']*profile-standar[td][^"']*["'][\s\S]*?<p[^>]*>\s*(\d{3,4})\s*<\/p>/i,
        /class=["'][^"']*profile-standar[td][^"']*["'][\s\S]*?<p[^>]*>\s*(\d{3,4})\s*<\/p>/i,
        /profile-standar[td][\s\S]*?<p[^>]*>\s*(\d{3,4})\s*<\/p>/i,
        /profile-top-rating-data_std[^>]*>\s*(\d{3,4})\s*</i,
        /STANDARD[\s\S]{0,100}?(\d{3,4})/i
      ];
      for (const pat of stdPatterns) {
        const m = html.match(pat);
        if (m && m[1]) {
          const num = parseInt(m[1], 10);
          if (num >= 400 && num <= 3800) {
            result.standard = num;
            break;
          }
        }
      }
    }

    if (!result.rapid) {
      const rapPatterns = [
        /class=["'][^"']*profile-rapid[^"']*profile-game[^"']*["'][\s\S]*?<p[^>]*>\s*(\d{3,4})\s*<\/p>/i,
        /class=["'][^"']*profile-game[^"']*profile-rapid[^"']*["'][\s\S]*?<p[^>]*>\s*(\d{3,4})\s*<\/p>/i,
        /class=["'][^"']*profile-rapid[^"']*["'][\s\S]*?<p[^>]*>\s*(\d{3,4})\s*<\/p>/i,
        /profile-rapid[\s\S]*?<p[^>]*>\s*(\d{3,4})\s*<\/p>/i,
        /profile-top-rating-data_rap[^>]*>\s*(\d{3,4})\s*</i,
        /RAPID[\s\S]{0,100}?(\d{3,4})/i
      ];
      for (const pat of rapPatterns) {
        const m = html.match(pat);
        if (m && m[1]) {
          const num = parseInt(m[1], 10);
          if (num >= 400 && num <= 3800) {
            result.rapid = num;
            break;
          }
        }
      }
    }

    if (!result.blitz) {
      const blzPatterns = [
        /class=["'][^"']*profile-blitz[^"']*profile-game[^"']*["'][\s\S]*?<p[^>]*>\s*(\d{3,4})\s*<\/p>/i,
        /class=["'][^"']*profile-game[^"']*profile-blitz[^"']*["'][\s\S]*?<p[^>]*>\s*(\d{3,4})\s*<\/p>/i,
        /class=["'][^"']*profile-blitz[^"']*["'][\s\S]*?<p[^>]*>\s*(\d{3,4})\s*<\/p>/i,
        /profile-blitz[\s\S]*?<p[^>]*>\s*(\d{3,4})\s*<\/p>/i,
        /profile-top-rating-data_blz[^>]*>\s*(\d{3,4})\s*</i,
        /BLITZ[\s\S]{0,100}?(\d{3,4})/i
      ];
      for (const pat of blzPatterns) {
        const m = html.match(pat);
        if (m && m[1]) {
          const num = parseInt(m[1], 10);
          if (num >= 400 && num <= 3800) {
            result.blitz = num;
            break;
          }
        }
      }
    }

    // 3. Name, Title, Federation, Birth Year, Sex
    const titleMatch = html.match(/\b(GM|WGM|IM|WIM|FM|WFM|CM|WCM|MN|CMN|AGM|AIM|AFM|ACM|NM)\b/);
    if (titleMatch) result.title = titleMatch[1];

    const fedMatch = html.match(/Federation:[^<]*?>([^<]+)</i) || html.match(/FED:[^<]*?>([^<]+)</i);
    if (fedMatch) result.country = fedMatch[1].trim();

    const bYearMatch = html.match(/B-Year:[^<]*?>\s*(\d{4})/i) || html.match(/Birth year:[^<]*?>\s*(\d{4})/i);
    if (bYearMatch) result.birthYear = parseInt(bYearMatch[1], 10);

    const sexMatch = html.match(/Sex:[^<]*?>\s*([MF])/i);
    if (sexMatch) result.gender = sexMatch[1].toUpperCase();

    const nameEl = $('.profile-top-title, .player-title-name, h1').first();
    if (nameEl.length) {
      const n = nameEl.text().trim();
      if (n && !n.toLowerCase().includes('fide')) result.name = n;
    }
  } catch (e) {
    console.error('Error parsing FIDE HTML:', e);
  }

  return result;
}

// Helper to parse CBX HTML
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
    const $ = cheerio.load(html);

    // Rule: CBX Table with ID "ContentPlaceHolder1_gdvRating"
    // Row 1 (2nd row of table, since row 0 is headers [Mês/Ano, Clássico, Rápido, Blitz])
    // Col 1 = Clássico, Col 2 = Rápido, Col 3 = Blitz
    const table = $('#ContentPlaceHolder1_gdvRating, table[id*="ContentPlaceHolder1_gdvRating"], table[id*="gdvRating"]');
    
    if (table.length > 0) {
      const trs = table.find('tr');
      // The 2nd row is the first data row (index 1)
      const dataRow = trs.length >= 2 ? trs.eq(1) : trs.eq(0);
      const tds = dataRow.find('td');

      if (tds.length >= 4) {
        // Col 0: Mês/Ano (ex: Jul/2026)
        // Col 1: Clássico
        result.standard = extractRating(tds.eq(1).text());
        // Col 2: Rápido
        result.rapid = extractRating(tds.eq(2).text());
        // Col 3: Blitz
        result.blitz = extractRating(tds.eq(3).text());
      } else if (tds.length === 3) {
        result.standard = extractRating(tds.eq(0).text());
        result.rapid = extractRating(tds.eq(1).text());
        result.blitz = extractRating(tds.eq(2).text());
      }
    }

    // Direct regex fallback for ContentPlaceHolder1_gdvRating
    if (!result.standard || !result.rapid || !result.blitz) {
      const tableMatch = html.match(/ContentPlaceHolder1_gdvRating[\s\S]*?<\/table>/i);
      if (tableMatch) {
        const tableHtml = tableMatch[0];
        const trMatches = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
        if (trMatches && trMatches.length >= 2) {
          const secondRow = trMatches[1];
          const tdMatches = secondRow.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
          if (tdMatches && tdMatches.length >= 4) {
            if (!result.standard) result.standard = extractRating(tdMatches[1]);
            if (!result.rapid) result.rapid = extractRating(tdMatches[2]);
            if (!result.blitz) result.blitz = extractRating(tdMatches[3]);
          }
        }
      }
    }

    // Extract State (UF) e.g., SP, RJ, SC...
    const stateMatch = html.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);
    if (stateMatch) result.state = stateMatch[1];

    // Extract Title
    const titleMatch = html.match(/\b(GM|MI|MF|MN|CMN|NM|WGM|WMI|WMF|WCM|CM|AIM|AFM|AGM|ACM)\b/);
    if (titleMatch) {
      const t = titleMatch[1];
      result.title = t === 'MI' ? 'IM' : t === 'MF' ? 'FM' : t === 'WMI' ? 'WIM' : t === 'WMF' ? 'WFM' : t;
    }

    // Extract Name
    const titleHeader = $('title').text();
    const titleHeaderMatch = titleHeader.match(/Jogador:\s*\d+\s*-\s*([^-\n\r]+)/i);
    if (titleHeaderMatch) {
      result.name = titleHeaderMatch[1].trim();
    } else {
      const h1Text = $('h1, h2, .nome-jogador').first().text().trim();
      if (h1Text && !h1Text.toLowerCase().includes('cbx')) result.name = h1Text;
    }
  } catch (e) {
    console.error('Error parsing CBX HTML:', e);
  }

  return result;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Endpoint: Scrape Ratings & Details from FIDE and CBX
  app.post('/api/scrape-ratings', async (req, res) => {
    try {
      const { fideId, fideUrl, cbxId, cbxUrl, rawSnippet } = req.body;

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

      // 0. If direct raw HTML snippet was provided, parse it immediately
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

      // 1. Scrape CBX (verified and fast)
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
            signal: AbortSignal.timeout(6000),
          });

          if (cbxRes.ok) {
            const html = await cbxRes.text();
            const parsed = parseCbxHtml(html);
            result.cbx = {
              ...result.cbx,
              ...parsed,
              error: null,
            };
          } else {
            result.cbx.error = `CBX HTTP ${cbxRes.status}`;
          }
        } catch (cbxErr: any) {
          result.cbx.error = cbxErr?.message || 'Erro ao consultar CBX';
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

        // Try direct and reliable proxy sources
        const sources = [
          targetFideUrl,
          `https://api.allorigins.win/raw?url=${encodeURIComponent(targetFideUrl)}`,
          `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetFideUrl)}`,
          `https://r.jina.ai/${targetFideUrl}`,
          `https://corsproxy.io/?url=${encodeURIComponent(targetFideUrl)}`,
        ];

        for (const url of sources) {
          try {
            const res = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,pt-BR;q=0.8',
                'Cache-Control': 'no-cache',
              },
              signal: AbortSignal.timeout(5000),
            });

            if (res.ok) {
              const text = await res.text();
              if (text && text.length > 100 && (text.includes('profile-') || text.includes('STANDARD') || text.includes('ratings.fide.com') || text.includes('fide') || text.includes('Standard'))) {
                fideHtml = text;
                break;
              }
            }
          } catch {
            // try next source
          }
        }

        if (fideHtml) {
          const parsed = parseFideHtml(fideHtml);
          result.fide = {
            ...result.fide,
            ...parsed,
            error: null,
          };
        } else {
          result.fide.error = 'Não foi possível baixar automaticamente da FIDE (bloqueio Cloudflare). Utilize a opção "Colar HTML" ou preencha manualmente.';
        }
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Scrape API error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao processar raspagem de dados',
      });
    }
  });

  // Setup Vite in Development or Static Server in Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
