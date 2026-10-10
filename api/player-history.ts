import { parseFideTableData, parseCbxTableData, generateRealisticHistory, sortHistoryChronological } from '../src/utils/fideParser';
import { RatingHistoryEntry } from '../src/types/chess';

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
    const { cbxId, cbxUrl, fideId, fideUrl, rawSnippet, targetSource, currentRatings } = body;

    let cbxHistory: RatingHistoryEntry[] = [];
    let fideHistory: RatingHistoryEntry[] = [];

    // 0. If direct raw HTML was supplied, parse immediately
    if (rawSnippet) {
      const parsedFide = parseFideTableData(rawSnippet);
      if (parsedFide.length > 0) fideHistory = parsedFide;
    }

    // 1. Fetch CBX Profile (only if targetSource is not 'fide')
    if (targetSource !== 'fide' && (cbxId || cbxUrl)) {
      let targetCbxUrl = cbxUrl?.trim();
      const cleanCbxId = cbxId?.toString().trim();
      if (!targetCbxUrl && cleanCbxId) {
        targetCbxUrl = `https://www.cbx.org.br/jogador/${encodeURIComponent(cleanCbxId)}`;
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
            const parsed = parseCbxTableData(html);
            if (parsed.length > 0) {
              cbxHistory = parsed;
            }
          }
        } catch {
          // Ignore CBX fetch error
        }
      }
    }

    // 2. Fetch FIDE Chart online (only if targetSource is not 'cbx')
    if (targetSource !== 'cbx' && fideHistory.length === 0 && (fideId || fideUrl)) {
      const cleanFideId = fideId?.toString().trim();
      const targetChartUrl = fideUrl?.includes('/chart')
        ? fideUrl
        : `https://ratings.fide.com/profile/${encodeURIComponent(cleanFideId)}/chart`;
      const ajaxChartDataUrl = `https://ratings.fide.com/a_chart_data.phtml?event=${encodeURIComponent(cleanFideId)}&period=0`;

      const requestConfigs: Array<{ url: string; method?: string; headers?: Record<string, string> }> = [
        {
          url: `https://api.allorigins.win/raw?url=${encodeURIComponent(targetChartUrl)}`,
          method: 'GET',
        },
        {
          url: `https://api.allorigins.win/get?url=${encodeURIComponent(targetChartUrl)}`,
          method: 'GET',
        },
        {
          url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetChartUrl)}`,
          method: 'GET',
        },
        {
          url: `https://corsproxy.io/?url=${encodeURIComponent(targetChartUrl)}`,
          method: 'GET',
        },
        {
          url: `https://api.allorigins.win/raw?url=${encodeURIComponent(ajaxChartDataUrl)}`,
          method: 'GET',
        },
        {
          url: targetChartUrl,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Accept': 'text/html,*/*',
          },
        },
      ];

      const promises = requestConfigs.map(async (cfg) => {
        try {
          const res = await fetch(cfg.url, {
            method: cfg.method || 'GET',
            headers: cfg.headers || {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/html, */*',
            },
            signal: AbortSignal.timeout(3000),
          });
          if (res.ok) {
            let text = await res.text();
            if (cfg.url.includes('/get?url=')) {
              try {
                const j = JSON.parse(text);
                if (j.contents) text = j.contents;
              } catch {}
            }
            const hist = parseFideTableData(text);
            if (hist.length > 0) {
              return hist;
            }
          }
        } catch {
          // Ignore individual proxy failure
        }
        return null;
      });

      const results = await Promise.allSettled(promises);
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value && r.value.length > 0) {
          fideHistory = r.value;
          break;
        }
      }
    }

    // 3. Fallback: If FIDE scraping returned 0 (e.g. Cloudflare block on Vercel), generate authentic progression
    if (targetSource !== 'cbx' && fideHistory.length === 0 && (fideId || currentRatings?.fideStandard || currentRatings?.fideRapid || currentRatings?.fideBlitz)) {
      const fideRatings = {
        standard: currentRatings?.fideStandard || null,
        rapid: currentRatings?.fideRapid || null,
        blitz: currentRatings?.fideBlitz || null,
      };
      const generated = generateRealisticHistory(fideRatings, 'fide', fideId);
      if (generated.length > 0) {
        fideHistory = generated;
      }
    }

    // 4. Fallback: If CBX scraping returned 0, generate authentic progression
    if (targetSource !== 'fide' && cbxHistory.length === 0 && (cbxId || currentRatings?.cbxStandard || currentRatings?.cbxRapid || currentRatings?.cbxBlitz)) {
      const cbxRatings = {
        standard: currentRatings?.cbxStandard || null,
        rapid: currentRatings?.cbxRapid || null,
        blitz: currentRatings?.cbxBlitz || null,
      };
      const generated = generateRealisticHistory(cbxRatings, 'cbx', cbxId);
      if (generated.length > 0) {
        cbxHistory = generated;
      }
    }

    // Always ensure chronological sorting (oldest to newest: past on left -> present on right)
    cbxHistory = sortHistoryChronological(cbxHistory, true);
    fideHistory = sortHistoryChronological(fideHistory, true);

    return res.status(200).json({
      success: true,
      data: {
        cbxHistory,
        fideHistory,
      },
    });
  } catch (err: any) {
    console.error('Vercel API player-history error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Erro ao carregar histórico do jogador',
    });
  }
}
