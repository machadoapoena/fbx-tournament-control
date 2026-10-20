import { RatingHistoryEntry } from '../types/chess';

const monthsPt: Record<string, string> = {
  jan: 'Jan', feb: 'Fev', fev: 'Fev', mar: 'Mar', apr: 'Abr', abr: 'Abr',
  may: 'Mai', mai: 'Mai', jun: 'Jun', jul: 'Jul', aug: 'Ago', ago: 'Ago',
  sep: 'Set', set: 'Set', oct: 'Out', out: 'Out', nov: 'Nov', dec: 'Dez', dez: 'Dez'
};

const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthMap: Record<string, number> = {
  jan: 1, feb: 2, fev: 2, mar: 3, apr: 4, abr: 4,
  may: 5, mai: 5, jun: 6, jul: 7, aug: 8, ago: 8,
  sep: 9, set: 9, oct: 10, out: 10, nov: 11, dec: 12, dez: 12
};

export function normalizePeriod(raw: string, targetFormat: 'fide' | 'cbx' = 'fide'): string {
  if (!raw) return '';
  const s = String(raw).trim();

  // YYYY-Mmm or YYYY/Mmm (e.g. "2026-Oct", "2023-Feb", "2026-Out")
  const yearMonthNameMatch = s.match(/^(\d{4})\s*[-/]\s*([a-zA-Z]{3,})$/);
  if (yearMonthNameMatch) {
    const y = yearMonthNameMatch[1];
    const mStr = yearMonthNameMatch[2].toLowerCase().slice(0, 3);
    const mNum = monthMap[mStr];
    if (mNum) {
      if (targetFormat === 'cbx') {
        const mPt = monthsPt[mStr] || monthsEn[mNum - 1];
        return `${mPt}/${y}`;
      }
      return `${y}-${monthsEn[mNum - 1]}`;
    }
  }

  // YYYY-MM or YYYY/MM
  const isoMatch = s.match(/^(\d{4})[/-](\d{1,2})(?:[/-]\d{1,2})?$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = parseInt(isoMatch[2], 10);
    if (m >= 1 && m <= 12) {
      if (targetFormat === 'cbx') {
        return `${String(m).padStart(2, '0')}/${y}`;
      }
      return `${y}-${monthsEn[m - 1]}`;
    }
  }

  // MM/YYYY or Mmm/YYYY (e.g. "10/2026", "Out/2026", "Oct/2026")
  const slashMatch = s.match(/^([a-zA-Z]{3,}|\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const y = slashMatch[2];
    const mPart = slashMatch[1].toLowerCase();
    const mNum = monthMap[mPart.slice(0, 3)] || parseInt(mPart, 10);
    if (mNum >= 1 && mNum <= 12) {
      if (targetFormat === 'cbx') {
        return `${String(mNum).padStart(2, '0')}/${y}`;
      }
      return `${y}-${monthsEn[mNum - 1]}`;
    }
  }

  // Month Name YYYY (e.g. "Oct 2026", "May 2024", "2026 Oct")
  const textMonthMatch = s.match(/([a-zA-Z]{3,})\s*[-/,\s]\s*(\d{4})/) || s.match(/(\d{4})\s*[-/,\s]\s*([a-zA-Z]{3,})/);
  if (textMonthMatch) {
    const isYearFirst = /^\d{4}$/.test(textMonthMatch[1]);
    const y = isYearFirst ? textMonthMatch[1] : textMonthMatch[2];
    const mPart = (isYearFirst ? textMonthMatch[2] : textMonthMatch[1]).toLowerCase().slice(0, 3);
    const mNum = monthMap[mPart];
    if (mNum && mNum >= 1 && mNum <= 12) {
      if (targetFormat === 'cbx') {
        return `${String(mNum).padStart(2, '0')}/${y}`;
      }
      return `${y}-${monthsEn[mNum - 1]}`;
    }
  }

  return s;
}

export function parsePeriodYearMonth(raw: string): { year: number; month: number } {
  if (!raw) return { year: 0, month: 0 };
  const s = String(raw).trim();

  // 1. "YYYY-Mon" or "YYYY/Mon" or "YYYY-MM" or "YYYY/MM"
  const yFirst = s.match(/^(\d{4})[-/]([a-zA-Z]{3,}|\d{1,2})/);
  if (yFirst) {
    const y = parseInt(yFirst[1], 10);
    const mPart = yFirst[2].toLowerCase();
    const m = monthMap[mPart.slice(0, 3)] || parseInt(mPart, 10) || 1;
    return { year: y, month: Math.min(12, Math.max(1, m)) };
  }

  // 2. "Mon/YYYY" or "MM/YYYY" or "Mon-YYYY" or "MM-YYYY"
  const mFirst = s.match(/^([a-zA-Z]{3,}|\d{1,2})[-/](\d{4})/);
  if (mFirst) {
    const y = parseInt(mFirst[2], 10);
    const mPart = mFirst[1].toLowerCase();
    const m = monthMap[mPart.slice(0, 3)] || parseInt(mPart, 10) || 1;
    return { year: y, month: Math.min(12, Math.max(1, m)) };
  }

  // 3. "Mon YYYY" or "YYYY Mon"
  const wordMatch = s.match(/([a-zA-Z]{3,})\s+(\d{4})/) || s.match(/(\d{4})\s+([a-zA-Z]{3,})/);
  if (wordMatch) {
    const isYearFirst = /^\d{4}$/.test(wordMatch[1]);
    const y = parseInt(isYearFirst ? wordMatch[1] : wordMatch[2], 10);
    const mStr = (isYearFirst ? wordMatch[2] : wordMatch[1]).toLowerCase().slice(0, 3);
    const m = monthMap[mStr] || 1;
    return { year: y, month: m };
  }

  // 4. Any 4-digit year found
  const yMatch = s.match(/\b(19\d{2}|20\d{2})\b/);
  return { year: yMatch ? parseInt(yMatch[1], 10) : 0, month: 1 };
}

export function sortHistoryChronological(items: RatingHistoryEntry[], ascending = true): RatingHistoryEntry[] {
  if (!items || items.length <= 1) return items ? [...items] : [];
  return [...items].sort((a, b) => {
    const da = parsePeriodYearMonth(a.period);
    const db = parsePeriodYearMonth(b.period);
    const valA = da.year * 100 + da.month;
    const valB = db.year * 100 + db.month;
    return ascending ? valA - valB : valB - valA;
  });
}

export function extractRatingNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const s = String(text).trim();
  if (!s || s === '0' || s === '-' || s.toUpperCase() === 'N/A') return null;
  const num = parseInt(s.replace(/[^\d]/g, ''), 10);
  return isNaN(num) || num < 400 || num > 3800 ? null : num;
}

/**
 * Parses FIDE ratings history according to official FIDE profile-table_calc specification:
 * - Coluna 0: Período (ex: "2026-Oct", "2023-Feb")
 * - Coluna 1: STD. RATING (Clássico / Pensado)
 * - Coluna 2: STD GMS (partidas jogadas - desconsiderar)
 * - Coluna 3: RPD (Rating Rápido)
 * - Coluna 4: RPD GMS (partidas jogadas - desconsiderar)
 * - Coluna 5: BLZ (Rating Blitz)
 * - Coluna 6: BLZ GMS (partidas jogadas - desconsiderar)
 */
export function parseFideTableData(input: string): RatingHistoryEntry[] {
  if (!input || !input.trim()) return [];

  const trimmed = input.trim();
  const historyMap = new Map<string, RatingHistoryEntry>();

  const processRowCells = (cells: string[]) => {
    if (cells.length < 2) return;

    const rawPeriod = (cells[0] || '').trim();
    if (!rawPeriod || /period|std\. rating/i.test(rawPeriod)) return;

    const period = normalizePeriod(rawPeriod, 'fide');
    if (!period || /period/i.test(period)) return;

    let std: number | null = null;
    let rap: number | null = null;
    let blz: number | null = null;

    if (cells.length >= 6) {
      std = extractRatingNumber(cells[1]);
      rap = extractRatingNumber(cells[3]);
      blz = extractRatingNumber(cells[5]);
    } else if (cells.length >= 4) {
      std = extractRatingNumber(cells[1]);
      rap = extractRatingNumber(cells[2]);
      blz = extractRatingNumber(cells[3]);
    } else if (cells.length >= 2) {
      std = extractRatingNumber(cells[1]);
    }

    if (std !== null || rap !== null || blz !== null) {
      if (!historyMap.has(period)) {
        historyMap.set(period, { period, standard: std, rapid: rap, blitz: blz });
      } else {
        const prev = historyMap.get(period)!;
        if (std !== null) prev.standard = std;
        if (rap !== null) prev.rapid = rap;
        if (blz !== null) prev.blitz = blz;
      }
    }
  };

  // 1. If HTML input
  if (trimmed.includes('<table') || trimmed.includes('<tr') || trimmed.includes('profile-table_calc')) {
    if (typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(trimmed, 'text/html');

        let tables = doc.querySelectorAll('table.profile-table_calc, table[class*="profile-table_calc"]');
        if (tables.length === 0) {
          tables = doc.querySelectorAll('table');
        }

        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent || '');
            processRowCells(cells);
          });
        });

        if (historyMap.size > 0) {
          return Array.from(historyMap.values());
        }
      } catch {
        // Fallback to regex
      }
    }

    // Fallback HTML regex for <tr> / <td>
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    while ((trMatch = trRegex.exec(trimmed)) !== null) {
      const rowHtml = trMatch[1];
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells: string[] = [];
      let tdMatch;
      while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
        cells.push(tdMatch[1].replace(/<[^>]+>/g, '').trim());
      }
      processRowCells(cells);
    }

    if (historyMap.size > 0) {
      return Array.from(historyMap.values());
    }
  }

  // 2. Plain text / Tab-separated / Space-separated / Line-by-line cell streams
  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Check if each table cell was pasted on its own line
  const periodRegex = /^(\d{4}[-/][a-zA-Z]{3,}|\d{4}[-/]\d{1,2}|[a-zA-Z]{3,}[-/]\d{4})$/;
  let singleCellCount = 0;
  for (let i = 0; i < Math.min(25, lines.length); i++) {
    if (periodRegex.test(lines[i])) singleCellCount++;
  }
  const isLineByLineCells = singleCellCount >= 2 && lines.some(l => !l.includes('\t') && !l.includes(' ') && periodRegex.test(l));

  if (isLineByLineCells) {
    let currentPeriod: string | null = null;
    let currentCells: string[] = [];
    for (const l of lines) {
      if (periodRegex.test(l)) {
        if (currentPeriod) {
          processRowCells([currentPeriod, ...currentCells]);
        }
        currentPeriod = l;
        currentCells = [];
      } else {
        currentCells.push(l);
      }
    }
    if (currentPeriod) {
      processRowCells([currentPeriod, ...currentCells]);
    }
  } else {
    for (const line of lines) {
      if (/period|std\. rating/i.test(line)) continue;
      let tokens: string[] = [];
      if (line.includes('\t')) {
        tokens = line.split('\t').map(t => t.trim());
      } else {
        tokens = line.split(/\s{2,}|\s+/);
      }
      processRowCells(tokens);
    }
  }

  return Array.from(historyMap.values());
}

/**
 * Parses CBX rating evolution table:
 * Table with caption or header "Evolução Rating" / id="ContentPlaceHolder1_gdvRating":
 * - Coluna 0: Mês/Ano (ex: "Jul/2026", "Set/2025")
 * - Coluna 1: Clássico (Standard / Pensado)
 * - Coluna 2: Rápido (Rapid)
 * - Coluna 3: Blitz
 * "Nela tem os registros de rating e os mais atuais na primeira linha"
 */
export function parseCbxTableData(input: string): RatingHistoryEntry[] {
  if (!input || !input.trim()) return [];

  const trimmed = input.trim();
  const history: RatingHistoryEntry[] = [];

  // Browser environment using DOMParser
  if (typeof DOMParser !== 'undefined' && (trimmed.includes('<table') || trimmed.includes('<tr'))) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, 'text/html');

      // Find the Evolução Rating table
      let ratingTable: Element | null = null;
      const tables = doc.querySelectorAll('table');
      for (let i = 0; i < tables.length; i++) {
        const tbl = tables[i];
        const caption = (tbl.querySelector('caption')?.textContent || '').toLowerCase();
        const headerText = (tbl.querySelector('tr, th')?.textContent || '').toLowerCase();
        const idAttr = tbl.getAttribute('id') || '';

        if (
          /evolu[cç][aã]o\s*(de)?\s*rating/i.test(caption) ||
          /evolu[cç][aã]o\s*(de)?\s*rating/i.test(headerText) ||
          (idAttr.includes('gdvRating') && !idAttr.includes('Torneio'))
        ) {
          ratingTable = tbl;
          break;
        }
      }

      if (!ratingTable) {
        ratingTable = doc.querySelector('#ContentPlaceHolder1_gdvRating, table[id*="gdvRating"]');
      }

      if (ratingTable) {
        let stdCol = 1;
        let rapCol = 2;
        let blzCol = 3;

        const headerRow = ratingTable.querySelector('tr');
        if (headerRow) {
          const cells = headerRow.querySelectorAll('th, td');
          cells.forEach((cell, idx) => {
            const txt = (cell.textContent || '').toLowerCase();
            if (txt.includes('cláss') || txt.includes('class') || txt.includes('pensad') || txt.includes('std')) stdCol = idx;
            else if (txt.includes('ráp') || txt.includes('rap')) rapCol = idx;
            else if (txt.includes('blitz') || txt.includes('relâm') || txt.includes('relam')) blzCol = idx;
          });
        }

        const rows = ratingTable.querySelectorAll('tr');
        rows.forEach((row) => {
          const tds = row.querySelectorAll('td');
          if (tds.length >= 3) {
            const period = normalizePeriod(tds[0]?.textContent || '');
            const std = extractRatingNumber(tds[stdCol]?.textContent);
            const rap = extractRatingNumber(tds[rapCol]?.textContent);
            const blz = extractRatingNumber(tds[blzCol]?.textContent);
            if (period && (std !== null || rap !== null || blz !== null)) {
              history.push({ period, standard: std, rapid: rap, blitz: blz });
            }
          }
        });

        if (history.length > 0) {
          return history;
        }
      }
    } catch {
      // Fallback to regex
    }
  }

  // Regex parser (works in both Node.js and Browser)
  let tableSnippet = '';
  const evolucaoMatch =
    trimmed.match(/<table[^>]*?(?:gdvRating|Evolu[cç][aã]o[^>]*?Rating)[^>]*>([\s\S]*?)<\/table>/i) ||
    trimmed.match(/<table[^>]*>([\s\S]*?Evolu[cç][aã]o\s*(?:de)?\s*Rating[\s\S]*?)<\/table>/i);

  if (evolucaoMatch) {
    tableSnippet = evolucaoMatch[0];
  } else {
    tableSnippet = trimmed;
  }

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(tableSnippet)) !== null) {
    const rowHtml = rowMatch[1];
    if (rowHtml.toLowerCase().includes('<th') || rowHtml.toLowerCase().includes('mês/ano') || rowHtml.toLowerCase().includes('mes/ano')) {
      continue;
    }

    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]*>/g, '').trim());
    }

    if (cells.length >= 3) {
      const period = normalizePeriod(cells[0]);
      const std = extractRatingNumber(cells[1]);
      const rap = extractRatingNumber(cells[2]);
      const blz = cells.length >= 4 ? extractRatingNumber(cells[3]) : null;
      if (period && (std !== null || rap !== null || blz !== null)) {
        history.push({ period, standard: std, rapid: rap, blitz: blz });
      }
    }
  }

  return history;
}

/**
 * Real data policy: No synthetic or fabricated rating history is ever generated.
 * Returns empty array so only genuine FIDE / CBX records are displayed.
 */
export function generateRealisticHistory(): RatingHistoryEntry[] {
  return [];
}

