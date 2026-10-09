import { RatingHistoryEntry } from '../types/chess';

const monthsPt: Record<string, string> = {
  jan: 'Jan', feb: 'Fev', fev: 'Fev', mar: 'Mar', apr: 'Abr', abr: 'Abr',
  may: 'Mai', mai: 'Mai', jun: 'Jun', jul: 'Jul', aug: 'Ago', ago: 'Ago',
  sep: 'Set', set: 'Set', oct: 'Out', out: 'Out', nov: 'Nov', dec: 'Dez', dez: 'Dez'
};

const mNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function normalizePeriod(raw: string): string {
  if (!raw) return '';
  const s = String(raw).trim();

  // YYYY-Mmm (e.g. "2026-Oct", "2025-Aug", "2024-Apr")
  const yearMonthNameMatch = s.match(/^(\d{4})\s*[-/]\s*([a-zA-Z]{3,})$/);
  if (yearMonthNameMatch) {
    const y = yearMonthNameMatch[1];
    const mText = yearMonthNameMatch[2].toLowerCase().slice(0, 3);
    const mName = monthsPt[mText] || mText.toUpperCase();
    return `${mName}/${y}`;
  }

  // YYYY-MM or YYYY/MM
  const isoMatch = s.match(/^(\d{4})[/-](\d{1,2})(?:[/-]\d{1,2})?$/);
  if (isoMatch) {
    const m = parseInt(isoMatch[2], 10);
    if (m >= 1 && m <= 12) return `${mNames[m - 1]}/${isoMatch[1]}`;
  }

  // MM/YYYY
  const slashMatch = s.match(/^(\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const m = parseInt(slashMatch[1], 10);
    if (m >= 1 && m <= 12) return `${mNames[m - 1]}/${slashMatch[2]}`;
  }

  // Month Name YYYY (e.g. "May 2024", "Jul-2023", "2024 May")
  const textMonthMatch = s.match(/([a-zA-Z]{3,})\s*[-/,\s]\s*(\d{4})/) || s.match(/(\d{4})\s*[-/,\s]\s*([a-zA-Z]{3,})/);
  if (textMonthMatch) {
    const isYearFirst = /^\d{4}$/.test(textMonthMatch[1]);
    const y = isYearFirst ? textMonthMatch[1] : textMonthMatch[2];
    const mText = (isYearFirst ? textMonthMatch[2] : textMonthMatch[1]).toLowerCase().slice(0, 3);
    const mName = monthsPt[mText] || mText.toUpperCase();
    return `${mName}/${y}`;
  }

  // Month Name YY (e.g. "May 24")
  const shortYearMatch = s.match(/([a-zA-Z]{3,})\s*[-/,\s]\s*(\d{2})$/);
  if (shortYearMatch) {
    const mText = shortYearMatch[1].toLowerCase().slice(0, 3);
    const mName = monthsPt[mText] || mText.toUpperCase();
    return `${mName}/20${shortYearMatch[2]}`;
  }

  return s;
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
 * - Coluna 0: Período (ex: "2026-Oct", "2024-Apr")
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
    if (!rawPeriod || rawPeriod.toUpperCase().includes('PERIOD') || rawPeriod.toUpperCase().includes('STD')) return;

    const period = normalizePeriod(rawPeriod);
    if (!period) return;

    // Strict column mapping:
    // Col 0: Period
    // Col 1: Standard Rating
    // Col 3: Rapid Rating
    // Col 5: Blitz Rating
    const std = cells.length > 1 ? extractRatingNumber(cells[1]) : null;
    const rap = cells.length > 3 ? extractRatingNumber(cells[3]) : null;
    const blz = cells.length > 5 ? extractRatingNumber(cells[5]) : null;

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

  // 2. Plain text / Tab-separated copied lines
  const lines = trimmed.split(/\r?\n/);
  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.toUpperCase().includes('PERIOD') || cleanLine.toUpperCase().includes('STD. RATING')) {
      continue;
    }

    let tokens: string[] = [];
    if (line.includes('\t')) {
      // Direct tab separated without collapsing empty tabs
      tokens = line.split('\t').map(t => t.trim());
    } else {
      // Split by 2 or more spaces or single space
      tokens = cleanLine.split(/\s{2,}/);
      if (tokens.length < 2) {
        tokens = cleanLine.split(/\s+/);
      }
    }

    processRowCells(tokens);
  }

  return Array.from(historyMap.values());
}
