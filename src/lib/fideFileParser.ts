/**
 * Parser for official FIDE Rating List files (TXT, XML, CSV, TSV)
 * Handles FIDE fixed-width format with columns:
 * ID Number      Name                                                         Fed Sex Tit  WTit OTit           FOA SRtng SGm SK RRtng RGm Rk BRtng BGm BK B-day Flag
 * Specifically extracts:
 * - SRtng (Standard Rating) -> 0 if 0 or unrated
 * - RRtng (Rapid Rating) -> 0 if 0 or unrated
 * - BRtng (Blitz Rating) -> 0 if 0 or unrated
 * - Titles (Tit, WTit, FOA)
 * - Fed, Sex, Birth year
 */

export interface FideParsedEntry {
  fideId: string;
  name: string;
  title?: string;
  country?: string;
  gender?: 'M' | 'F' | 'Outro';
  standardRating: number;
  rapidRating: number;
  blitzRating: number;
  birthYear?: number;
}

export interface FideUpdateReportItem {
  playerId: string;
  name: string;
  gender: string;
  fideId: string;
  oldStandard: number;
  newStandard: number;
  oldRapid: number;
  newRapid: number;
  oldBlitz: number;
  newBlitz: number;
  oldTitle?: string;
  newTitle?: string;
  hasChanged: boolean;
}

interface ColumnPositions {
  idStart: number;
  idEnd: number;
  nameStart: number;
  nameEnd: number;
  fedStart: number;
  fedEnd: number;
  sexStart: number;
  sexEnd: number;
  titStart: number;
  titEnd: number;
  wtitStart?: number;
  wtitEnd?: number;
  foaStart?: number;
  foaEnd?: number;
  srtngStart: number;
  srtngEnd: number;
  rrtngStart?: number;
  rrtngEnd?: number;
  brtngStart?: number;
  brtngEnd?: number;
  bdayStart?: number;
  bdayEnd?: number;
}

/**
 * Dynamically identifies the exact start and end offset of each column from the header row.
 * Header example:
 * ID Number      Name                                                         Fed Sex Tit  WTit OTit           FOA SRtng SGm SK RRtng RGm Rk BRtng BGm BK B-day Flag
 */
function findHeaderPositions(headerLine: string): ColumnPositions | null {
  const line = headerLine;
  const upper = line.toUpperCase();

  const idIdx = upper.search(/\bID\b/);
  const srtngMatch = upper.search(/\bS_?RTNG?\b|\bS_?RTG\b|\bSRATING\b|\bSTANDARD\b/);

  if (idIdx === -1 && srtngMatch === -1) {
    return null;
  }

  // Find occurrences of column tokens
  const nameIdx = upper.search(/\bNAME\b/);
  const fedIdx = upper.search(/\bFED\b|\bNAT\b|\bCOUNTRY\b/);
  const sexIdx = upper.search(/\bSEX\b|\bGEN\b/);
  const titIdx = upper.search(/\bTIT\b/);
  const wtitIdx = upper.search(/\bWTIT\b/);
  const otitIdx = upper.search(/\bOTIT\b/);
  const foaIdx = upper.search(/\bFOA\b/);
  
  const srtngIdx = upper.search(/\bS_?RTNG?\b|\bS_?RTG\b|\bSTANDARD\b/);
  const sgmIdx = upper.search(/\bSGM\b|\bSG\b/);
  const skIdx = upper.search(/\bSK\b/);

  const rrtngIdx = upper.search(/\bR_?RTNG?\b|\bR_?RTG\b|\bRAPID\b/);
  const rgmIdx = upper.search(/\bRGM\b|\bRG\b/);
  const rkIdx = upper.search(/\bRK\b/);

  const brtngIdx = upper.search(/\bB_?RTNG?\b|\bB_?RTG\b|\bBLITZ\b/);
  const bgmIdx = upper.search(/\bBGM\b|\bBG\b/);
  const bkIdx = upper.search(/\bBK\b/);

  const bdayIdx = upper.search(/\bB-?DAY\b|\bBIRTH\b|\bDOB\b|\bYEAR\b/);
  const flagIdx = upper.search(/\bFLAG\b/);

  // Determine boundary for SRtng
  const srtngStart = srtngIdx !== -1 ? srtngIdx : 110;
  let srtngEnd = srtngStart + 7;
  if (sgmIdx > srtngStart) {
    srtngEnd = sgmIdx;
  } else if (skIdx > srtngStart) {
    srtngEnd = skIdx;
  } else if (rrtngIdx > srtngStart) {
    srtngEnd = Math.min(srtngStart + 7, rrtngIdx);
  }

  // Determine boundary for RRtng
  let rrtngStart: number | undefined = rrtngIdx !== -1 ? rrtngIdx : undefined;
  let rrtngEnd: number | undefined = undefined;
  if (rrtngStart !== undefined) {
    rrtngEnd = rrtngStart + 7;
    if (rgmIdx > rrtngStart) {
      rrtngEnd = rgmIdx;
    } else if (rkIdx > rrtngStart) {
      rrtngEnd = rkIdx;
    } else if (brtngIdx > rrtngStart) {
      rrtngEnd = Math.min(rrtngStart + 7, brtngIdx);
    }
  }

  // Determine boundary for BRtng
  let brtngStart: number | undefined = brtngIdx !== -1 ? brtngIdx : undefined;
  let brtngEnd: number | undefined = undefined;
  if (brtngStart !== undefined) {
    brtngEnd = brtngStart + 7;
    if (bgmIdx > brtngStart) {
      brtngEnd = bgmIdx;
    } else if (bkIdx > brtngStart) {
      brtngEnd = bkIdx;
    } else if (bdayIdx > brtngStart) {
      brtngEnd = Math.min(brtngStart + 7, bdayIdx);
    }
  }

  // Determine titles boundaries
  const sexEnd = titIdx !== -1 ? titIdx : (srtngStart > 60 ? 60 : srtngStart);
  const titEnd = wtitIdx !== -1 ? wtitIdx : (otitIdx !== -1 ? otitIdx : (foaIdx !== -1 ? foaIdx : srtngStart));

  const pos: ColumnPositions = {
    idStart: idIdx !== -1 ? idIdx : 0,
    idEnd: nameIdx !== -1 ? nameIdx : 15,
    nameStart: nameIdx !== -1 ? nameIdx : 15,
    nameEnd: fedIdx !== -1 ? fedIdx : (sexIdx !== -1 ? sexIdx : 60),
    fedStart: fedIdx !== -1 ? fedIdx : 60,
    fedEnd: sexIdx !== -1 ? sexIdx : 65,
    sexStart: sexIdx !== -1 ? sexIdx : 65,
    sexEnd: sexEnd,
    titStart: titIdx !== -1 ? titIdx : 70,
    titEnd: titEnd,
    wtitStart: wtitIdx !== -1 ? wtitIdx : undefined,
    wtitEnd: otitIdx !== -1 ? otitIdx : (foaIdx !== -1 ? foaIdx : srtngStart),
    foaStart: foaIdx !== -1 ? foaIdx : undefined,
    foaEnd: srtngStart,
    srtngStart: srtngStart,
    srtngEnd: srtngEnd,
    rrtngStart: rrtngStart,
    rrtngEnd: rrtngEnd,
    brtngStart: brtngStart,
    brtngEnd: brtngEnd,
    bdayStart: bdayIdx !== -1 ? bdayIdx : undefined,
    bdayEnd: flagIdx !== -1 ? flagIdx : (bdayIdx !== -1 ? bdayIdx + 6 : undefined),
  };

  return pos;
}

/**
 * Robustly parses a rating number from a column slice.
 * If the column contains 0, '0000', empty, or '-', it returns 0.
 * If it contains a valid rating (e.g. 1508), it returns that number.
 */
export function parseRatingNumber(val: string | undefined): number {
  if (!val) return 0;
  const trimmed = val.trim();
  if (!trimmed || trimmed === '0' || trimmed === '0000' || trimmed === '-') {
    return 0;
  }
  
  // Extract isolated 3-4 digit rating (between 400 and 3800)
  const match = trimmed.match(/\b([1-3]\d{3}|[4-9]\d{2})\b/);
  if (!match) return 0;
  
  const num = parseInt(match[1], 10);
  if (isNaN(num) || num < 400 || num > 3800) return 0;
  return num;
}

/**
 * Extracts chess title from Tit, WTit, FOA or general title string
 */
function extractTitleFromTokens(...chunks: (string | undefined)[]): string | undefined {
  for (const chunk of chunks) {
    if (!chunk) continue;
    const clean = chunk.trim().toUpperCase();
    if (!clean || clean === 'SEM TÍTULO' || clean === 'SEM TITULO' || clean === '-') continue;
    
    const match = clean.match(/\b(GM|IM|FM|CM|WGM|WIM|WFM|WCM|MN|NM|CMN|AGM|AIM|AFM|ACM)\b/);
    if (match) {
      return match[1].toUpperCase();
    }
  }
  return undefined;
}

/**
 * Main parser function for FIDE rating files
 */
export function parseFideRatingFile(fileContent: string): Map<string, FideParsedEntry> {
  const fideMap = new Map<string, FideParsedEntry>();

  if (!fileContent || fileContent.trim().length === 0) {
    return fideMap;
  }

  // 1. Check if XML format (<player><fideid>44760922</fideid>...)
  if (fileContent.includes('<player>') || fileContent.includes('<fideid>')) {
    const playerBlocks = fileContent.split(/<\/player>/i);
    for (const block of playerBlocks) {
      const idMatch = block.match(/<fideid>([^<]+)<\/fideid>/i);
      if (!idMatch) continue;
      const fideId = idMatch[1].trim();
      const nameMatch = block.match(/<name>([^<]+)<\/name>/i);
      const titleMatch = block.match(/<title>([^<]+)<\/title>/i);
      const countryMatch = block.match(/<country>([^<]+)<\/country>/i);
      const sexMatch = block.match(/<sex>([^<]+)<\/sex>/i);
      const ratingMatch = block.match(/<rating>([^<]+)<\/rating>/i) || block.match(/<srtng>([^<]+)<\/srtng>/i);
      const rapidMatch = block.match(/<rapid_rating>([^<]+)<\/rapid_rating>/i) || block.match(/<rrtng>([^<]+)<\/rrtng>/i);
      const blitzMatch = block.match(/<blitz_rating>([^<]+)<\/blitz_rating>/i) || block.match(/<brtng>([^<]+)<\/brtng>/i);
      const birthdayMatch = block.match(/<birthday>([^<]+)<\/birthday>/i) || block.match(/<bday>([^<]+)<\/bday>/i);

      const std = ratingMatch ? parseRatingNumber(ratingMatch[1]) : 0;
      const rap = rapidMatch ? parseRatingNumber(rapidMatch[1]) : 0;
      const blz = blitzMatch ? parseRatingNumber(blitzMatch[1]) : 0;

      fideMap.set(fideId, {
        fideId,
        name: nameMatch ? nameMatch[1].trim() : '',
        title: titleMatch ? extractTitleFromTokens(titleMatch[1]) : undefined,
        country: countryMatch ? countryMatch[1].trim() : undefined,
        gender: sexMatch && sexMatch[1].toUpperCase() === 'F' ? 'F' : 'M',
        standardRating: std,
        rapidRating: rap,
        blitzRating: blz,
        birthYear: birthdayMatch ? parseInt(birthdayMatch[1], 10) : undefined,
      });
    }
    return fideMap;
  }

  // 2. Parse Text / Fixed-width or Delimited format line by line
  const lines = fileContent.split(/\r?\n/);

  // First pass: locate the header line to detect exact column positions of SRtng, RRtng, BRtng
  let headerPositions: ColumnPositions | null = null;
  let headerLineIndex = -1;

  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const line = lines[i];
    const upper = line.toUpperCase();
    if (
      upper.includes('SRTNG') ||
      upper.includes('SRTG') ||
      (upper.includes('ID') && upper.includes('NAME') && (upper.includes('FED') || upper.includes('SEX')))
    ) {
      headerPositions = findHeaderPositions(line);
      headerLineIndex = i;
      break;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    if (i === headerLineIndex) continue;
    const line = lines[i];
    if (!line || line.trim().length < 6) continue;

    const trimmed = line.trim();

    // Skip comment lines or repetition of header
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('#') ||
      trimmed.toUpperCase().startsWith('ID NUMBER') ||
      trimmed.toUpperCase().startsWith('ID_NUMBER') ||
      trimmed.toUpperCase().startsWith('FIDE_ID')
    ) {
      continue;
    }

    // A. Tab-delimited format (TSV)
    if (line.includes('\t')) {
      const cols = line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const idStr = cols[0]?.match(/^\d{4,10}$/)?.[0];
      if (idStr) {
        const fideId = idStr;
        const name = cols[1] || '';
        const fed = cols[2] || '';
        const sex = cols[3]?.toUpperCase() === 'F' ? 'F' : 'M';
        const title = extractTitleFromTokens(cols[4], cols[5], cols[6]);
        
        // Find rating columns
        let std = 0;
        let rap = 0;
        let blz = 0;
        let foundCount = 0;

        for (let c = 4; c < cols.length; c++) {
          const num = parseRatingNumber(cols[c]);
          if (foundCount === 0) {
            std = num;
            foundCount++;
          } else if (foundCount === 1) {
            rap = num;
            foundCount++;
          } else if (foundCount === 2) {
            blz = num;
            break;
          }
        }

        fideMap.set(fideId, {
          fideId,
          name,
          country: fed || undefined,
          gender: sex,
          title,
          standardRating: std,
          rapidRating: rap,
          blitzRating: blz,
        });
        continue;
      }
    }

    // B. Semicolon or Comma CSV format
    if (trimmed.includes(';') || (trimmed.includes(',') && !headerPositions)) {
      const sep = trimmed.includes(';') ? ';' : ',';
      const cols = trimmed.split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const idMatch = cols[0]?.match(/^(\d{4,10})$/);
      if (idMatch) {
        const fideId = idMatch[1];
        const name = cols[1] || '';
        const country = cols[2] || '';
        const sex = cols[3]?.toUpperCase() === 'F' ? 'F' : 'M';
        const title = extractTitleFromTokens(cols[4], cols[5]);
        const std = parseRatingNumber(cols[5]);
        const rap = parseRatingNumber(cols[6]);
        const blz = parseRatingNumber(cols[7]);

        fideMap.set(fideId, {
          fideId,
          name,
          country,
          gender: sex,
          title,
          standardRating: std,
          rapidRating: rap,
          blitzRating: blz,
        });
        continue;
      }
    }

    // C. Fixed-width Parsing with Detected SRtng, RRtng, BRtng Positions
    if (headerPositions) {
      const idChunk = line.slice(headerPositions.idStart, headerPositions.idEnd).trim();
      const idMatch = idChunk.match(/^(\d{4,10})\b/) || line.slice(0, 20).match(/^(\d{4,10})\b/);
      
      if (idMatch) {
        const fideId = idMatch[1];
        const name = line.slice(headerPositions.nameStart, headerPositions.nameEnd).trim();
        const fed = line.slice(headerPositions.fedStart, headerPositions.fedEnd).trim();
        const sexChunk = line.slice(headerPositions.sexStart, headerPositions.sexEnd).trim().toUpperCase();
        
        const titChunk = line.slice(headerPositions.titStart, headerPositions.titEnd).trim();
        const wtitChunk = headerPositions.wtitStart !== undefined ? line.slice(headerPositions.wtitStart, headerPositions.wtitEnd).trim() : '';
        const foaChunk = headerPositions.foaStart !== undefined ? line.slice(headerPositions.foaStart, headerPositions.foaEnd).trim() : '';

        const srtngChunk = line.slice(headerPositions.srtngStart, headerPositions.srtngEnd);
        const rrtngChunk = headerPositions.rrtngStart !== undefined ? line.slice(headerPositions.rrtngStart, headerPositions.rrtngEnd) : undefined;
        const brtngChunk = headerPositions.brtngStart !== undefined ? line.slice(headerPositions.brtngStart, headerPositions.brtngEnd) : undefined;

        const std = parseRatingNumber(srtngChunk);
        const rap = parseRatingNumber(rrtngChunk);
        const blz = parseRatingNumber(brtngChunk);

        const gender = sexChunk.includes('F') ? 'F' : 'M';
        const title = extractTitleFromTokens(titChunk, wtitChunk, foaChunk);

        fideMap.set(fideId, {
          fideId,
          name,
          country: fed || undefined,
          gender,
          title,
          standardRating: std,
          rapidRating: rap,
          blitzRating: blz,
        });
        continue;
      }
    }

    // D. Fallback for lines starting with ID number without detected header positions
    const idMatch = trimmed.match(/^(\d{4,10})\b/);
    if (idMatch) {
      const fideId = idMatch[1];
      
      // Look for standard ratings around column 105..150
      let std = 0;
      let rap = 0;
      let blz = 0;

      if (line.length >= 110) {
        std = parseRatingNumber(line.slice(108, 119));
        rap = parseRatingNumber(line.slice(120, 131));
        blz = parseRatingNumber(line.slice(132, 143));
      }

      // If not located in standard offsets, scan token clusters
      if (std === 0 && rap === 0 && blz === 0) {
        const tokens = trimmed.split(/\s+/);
        const numbers = tokens
          .slice(2)
          .map((t) => parseRatingNumber(t))
          .filter((n): n is number => n > 0 && String(n) !== fideId);

        if (numbers.length >= 1) std = numbers[0];
        if (numbers.length >= 2) rap = numbers[1];
        if (numbers.length >= 3) blz = numbers[2];
      }

      const title = extractTitleFromTokens(line);
      const sexMatch = line.slice(15, 80).match(/\b([MF])\b/);
      const gender = sexMatch && sexMatch[1] === 'F' ? 'F' : 'M';

      fideMap.set(fideId, {
        fideId,
        name: '',
        gender,
        title,
        standardRating: std,
        rapidRating: rap,
        blitzRating: blz,
      });
    }
  }

  return fideMap;
}
