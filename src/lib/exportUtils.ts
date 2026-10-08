import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Player, SwissExportConfig, Tournament } from '../types/chess';

// Calculate age from YYYY-MM-DD
export function calculateAge(birthDateString: string): number {
  if (!birthDateString) return 0;
  const birth = new Date(birthDateString);
  if (isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}

// Age category calculation
export function getAgeCategory(birthDateString: string): string {
  const age = calculateAge(birthDateString);
  if (age <= 8) return 'Sub-08';
  if (age <= 10) return 'Sub-10';
  if (age <= 12) return 'Sub-12';
  if (age <= 14) return 'Sub-14';
  if (age <= 16) return 'Sub-16';
  if (age <= 18) return 'Sub-18';
  if (age <= 20) return 'Sub-20';
  if (age >= 65) return 'Veterano (65+)';
  if (age >= 50) return 'Sênior (50+)';
  return 'Absoluto';
}

// Download blob helper
function triggerDownload(content: string, filename: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// CSV Export
export function exportPlayersToCSV(players: Player[], filename = 'jogadores_xadrez.csv') {
  const headers = [
    'ID Sistema',
    'Nome Completo',
    'Titulação',
    'Data Nascimento',
    'Idade',
    'Gênero',
    'ID FIDE',
    'ID CBX',
    'País',
    'Estado / UF',
    'FIDE Standard',
    'FIDE Rapid',
    'FIDE Blitz',
    'CBX Standard',
    'CBX Rapid',
    'CBX Blitz',
    'Clube',
    'URL FIDE',
    'URL CBX',
    'Observações'
  ];

  const rows = players.map(p => [
    p.id || '',
    `"${(p.name || '').replace(/"/g, '""')}"`,
    p.title || 'Sem Título',
    p.birthDate || '',
    calculateAge(p.birthDate),
    p.gender === 'M' ? 'Masculino' : p.gender === 'F' ? 'Feminino' : 'Outro',
    p.fideId || '',
    p.cbxId || '',
    p.country || 'Brasil',
    p.state || '',
    p.ratingFideStandard || p.ratingFide || '',
    p.ratingFideRapid || '',
    p.ratingFideBlitz || '',
    p.ratingCbxStandard || p.ratingCbx || '',
    p.ratingCbxRapid || '',
    p.ratingCbxBlitz || '',
    `"${(p.club || '').replace(/"/g, '""')}"`,
    p.fideUrl || '',
    p.cbxUrl || '',
    `"${(p.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  triggerDownload(csvContent, filename, 'text/csv;charset=utf-8');
}

// Helper to format date as DD.MM.YYYY for Swiss-Manager
export function formatSwissBirthday(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  // Already DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      return `${parts[0].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[2]}`;
    }
  }

  // YYYY-MM-DD
  const parts = trimmed.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${day}.${month}.${year}`;
  }
  return trimmed;
}

// Swiss-Manager Excel Exporter (.xlsx)
export function exportToSwissManagerExcel(
  players: Player[],
  config: SwissExportConfig,
  filename = 'swiss_manager_import.xlsx'
) {
  const headers: string[] = [];
  
  if (config.fields.id) headers.push('ID_No');
  if (config.fields.fideId) headers.push('FideID');
  if (config.fields.cbxId) headers.push('CBX_ID');
  if (config.fields.name) headers.push('NAME');
  if (config.fields.title) headers.push('TITLE');
  if (config.fields.gender) headers.push('SEX');
  if (config.fields.birthDate) headers.push('BIRTHDAY');
  if (config.fields.country) headers.push('FED');
  if (config.fields.state) headers.push('STATE');

  const fideModality = config.fideRatingModality ?? 'standard';
  if (fideModality !== 'none') {
    headers.push('IntRating');
  }

  const cbxModality = config.cbxRatingModality ?? 'standard';
  if (cbxModality !== 'none') {
    headers.push('NatRating');
  }

  if (config.fields.k ?? true) {
    headers.push('K');
  }

  if (config.fields.club) headers.push('CLUB');

  const rows = players.map((p, index) => {
    const rowValues: (string | number)[] = [];
    if (config.fields.id) rowValues.push(index + 1);
    if (config.fields.fideId) {
      const fid = p.fideId ? (Number(p.fideId) || p.fideId) : '';
      rowValues.push(fid);
    }
    if (config.fields.cbxId) {
      const cid = p.cbxId ? (Number(p.cbxId) || p.cbxId) : '';
      rowValues.push(cid);
    }
    if (config.fields.name) rowValues.push(p.name || '');
    if (config.fields.title) rowValues.push(p.title === 'Sem Título' ? '' : (p.title || ''));
    if (config.fields.gender) rowValues.push(p.gender === 'F' ? 'w' : 'm');
    if (config.fields.birthDate) {
      rowValues.push(formatSwissBirthday(p.birthDate));
    }
    if (config.fields.country) rowValues.push(p.country === 'Brasil' || !p.country ? 'BRA' : p.country);
    if (config.fields.state) rowValues.push(p.state || '');

    // IntRating (Rating FIDE Internacional)
    if (fideModality !== 'none') {
      let r = 0;
      if (fideModality === 'standard') r = p.ratingFideStandard || p.ratingFide || 0;
      else if (fideModality === 'rapid') r = p.ratingFideRapid || 0;
      else if (fideModality === 'blitz') r = p.ratingFideBlitz || 0;
      rowValues.push(r > 0 ? r : '');
    }

    // NatRating (Rating CBX Nacional)
    if (cbxModality !== 'none') {
      let r = 0;
      if (cbxModality === 'standard') r = p.ratingCbxStandard || p.ratingCbx || 0;
      else if (cbxModality === 'rapid') r = p.ratingCbxRapid || 0;
      else if (cbxModality === 'blitz') r = p.ratingCbxBlitz || 0;
      rowValues.push(r > 0 ? r : '');
    }

    // Coluna K (vazia para o Swiss-Manager)
    if (config.fields.k ?? true) {
      rowValues.push('');
    }

    if (config.fields.club) rowValues.push(p.club || '');

    return rowValues;
  });

  const sheetData = config.includeHeader ? [headers, ...rows] : rows;
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Column widths for professional Excel presentation
  const colWidths = headers.map((h) => {
    if (h === 'NAME') return { wch: 32 };
    if (h === 'BIRTHDAY') return { wch: 14 };
    if (h === 'CLUB') return { wch: 20 };
    if (h === 'FideID' || h === 'CBX_ID') return { wch: 12 };
    if (h === 'IntRating' || h === 'NatRating') return { wch: 11 };
    return { wch: 10 };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'SwissManager');

  XLSX.writeFile(workbook, filename);
}

// Helper to parse Name into Lastname and Firstname
export function parsePlayerNames(fullName: string): { lastname: string; firstname: string } {
  if (!fullName) return { lastname: '', firstname: '' };
  const trimmed = fullName.trim();
  if (trimmed.includes(',')) {
    const [last, ...first] = trimmed.split(',');
    return {
      lastname: last.trim(),
      firstname: first.join(',').trim(),
    };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { lastname: parts[0], firstname: '' };
  }
  return {
    lastname: parts[parts.length - 1],
    firstname: parts.slice(0, -1).join(' '),
  };
}

// Helper to format Birthday as YYYYMMDD for Swiss-Manager XML
export function formatSwissXmlBirthday(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  // If already YYYYMMDD (8 digits)
  if (/^\d{8}$/.test(trimmed)) {
    return trimmed;
  }

  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed.replace(/-/g, '');
  }

  // If DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('.');
    return `${y}${m}${d}`;
  }

  // If DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      return `${parts[2]}${parts[1].padStart(2, '0')}${parts[0].padStart(2, '0')}`;
    }
  }

  return trimmed.replace(/\D/g, '');
}

// Escape XML attribute values
function escapeXmlAttr(str: string | number = ''): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Generate Swiss-Manager XML string matching official format
export function generateSwissManagerXMLString(
  players: Player[],
  config?: Partial<SwissExportConfig>
): string {
  const fideModality = config?.fideRatingModality ?? 'standard';
  const cbxModality = config?.cbxRatingModality ?? 'standard';

  const playerNodes = players.map((p, index) => {
    const uniqueId = index + 1;
    const { lastname, firstname } = parsePlayerNames(p.name || '');
    const fed = p.country === 'Brasil' || !p.country ? 'BRA' : p.country;
    const fideId = p.fideId || '';

    let rating = 0;
    if (fideModality === 'standard') rating = p.ratingFideStandard || p.ratingFide || 0;
    else if (fideModality === 'rapid') rating = p.ratingFideRapid || 0;
    else if (fideModality === 'blitz') rating = p.ratingFideBlitz || 0;

    const natId = p.cbxId || '';

    let natRating = 0;
    if (cbxModality === 'standard') natRating = p.ratingCbxStandard || p.ratingCbx || 0;
    else if (cbxModality === 'rapid') natRating = p.ratingCbxRapid || 0;
    else if (cbxModality === 'blitz') natRating = p.ratingCbxBlitz || 0;

    const birthday = formatSwissXmlBirthday(p.birthDate);
    const gender = p.gender === 'F' ? 'w' : 'm';
    const title = p.title && p.title !== 'Sem Título' ? p.title : '';

    return `  <Player 
    PlayerUniqueId="${uniqueId}" 
    Lastname="${escapeXmlAttr(lastname)}" 
    Firstname="${escapeXmlAttr(firstname)}" 
    Federation="${escapeXmlAttr(fed)}" 
    FIDEId="${escapeXmlAttr(fideId)}" 
    Rating="${rating > 0 ? rating : ''}" 
    NatId="${escapeXmlAttr(natId)}" 
    NatRating="${natRating > 0 ? natRating : ''}" 
    Birthday="${escapeXmlAttr(birthday)}" 
    Gender="${gender}" 
    Title="${escapeXmlAttr(title)}"
  />`;
  });

  return `<Players>\n${playerNodes.join('\n')}\n</Players>\n`;
}

// Swiss-Manager XML Exporter matching:
// <Players>
//   <Player PlayerUniqueId="1" Lastname="Silva" Firstname="Joao" Federation="BRA" FIDEId="2100123" Rating="2150" NatId="9999" NatRating="2000" Birthday="19900515" Gender="m" Title="GM" />
// </Players>
export function exportToSwissManagerXML(
  players: Player[],
  config?: Partial<SwissExportConfig>,
  filename = 'swiss_manager_players.xml'
): string {
  const xmlContent = generateSwissManagerXMLString(players, config);

  if (filename) {
    triggerDownload(xmlContent, filename, 'application/xml;charset=utf-8');
  }
  return xmlContent;
}

// Swiss-Manager Custom Exporter (Excel .xlsx, XML, Text, CSV, DAT)
export function exportToSwissManager(
  players: Player[],
  config: SwissExportConfig,
  filename = 'swiss_manager_jogadores.xlsx'
) {
  if (config.format === 'xlsx') {
    const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename.replace(/\.[^/.]+$/, '')}.xlsx`;
    exportToSwissManagerExcel(players, config, finalFilename);
    return;
  }

  if (config.format === 'xml') {
    const finalFilename = filename.endsWith('.xml') ? filename : `${filename.replace(/\.[^/.]+$/, '')}.xml`;
    exportToSwissManagerXML(players, config, finalFilename);
    return;
  }

  const delimiter = config.delimiter;
  const headers: string[] = [];
  
  if (config.fields.id) headers.push('ID_No');
  if (config.fields.fideId) headers.push('FideID');
  if (config.fields.cbxId) headers.push('CBX_ID');
  if (config.fields.name) headers.push('NAME');
  if (config.fields.title) headers.push('TITLE');
  if (config.fields.gender) headers.push('SEX');
  if (config.fields.birthDate) headers.push('BIRTHDAY');
  if (config.fields.country) headers.push('FED');
  if (config.fields.state) headers.push('STATE');

  const fideModality = config.fideRatingModality ?? 'standard';
  if (fideModality !== 'none') {
    headers.push('IntRating');
  }

  const cbxModality = config.cbxRatingModality ?? 'standard';
  if (cbxModality !== 'none') {
    headers.push('NatRating');
  }

  if (config.fields.k ?? true) {
    headers.push('K');
  }

  if (config.fields.club) headers.push('CLUB');

  const rows = players.map((p, index) => {
    const rowValues: string[] = [];
    if (config.fields.id) rowValues.push(String(index + 1));
    if (config.fields.fideId) rowValues.push(p.fideId || '');
    if (config.fields.cbxId) rowValues.push(p.cbxId || '');
    if (config.fields.name) rowValues.push(p.name || '');
    if (config.fields.title) rowValues.push(p.title === 'Sem Título' ? '' : p.title || '');
    if (config.fields.gender) rowValues.push(p.gender === 'F' ? 'w' : 'm');
    if (config.fields.birthDate) {
      rowValues.push(formatSwissBirthday(p.birthDate));
    }
    if (config.fields.country) rowValues.push(p.country === 'Brasil' ? 'BRA' : p.country || 'BRA');
    if (config.fields.state) rowValues.push(p.state || '');

    // IntRating (Rating FIDE Internacional)
    if (fideModality !== 'none') {
      let r = 0;
      if (fideModality === 'standard') r = p.ratingFideStandard || p.ratingFide || 0;
      else if (fideModality === 'rapid') r = p.ratingFideRapid || 0;
      else if (fideModality === 'blitz') r = p.ratingFideBlitz || 0;
      rowValues.push(String(r));
    }

    // NatRating (Rating CBX Nacional)
    if (cbxModality !== 'none') {
      let r = 0;
      if (cbxModality === 'standard') r = p.ratingCbxStandard || p.ratingCbx || 0;
      else if (cbxModality === 'rapid') r = p.ratingCbxRapid || 0;
      else if (cbxModality === 'blitz') r = p.ratingCbxBlitz || 0;
      rowValues.push(String(r));
    }

    // Coluna K (vazia para o Swiss-Manager)
    if (config.fields.k ?? true) {
      rowValues.push('');
    }

    if (config.fields.club) rowValues.push(p.club || '');

    return rowValues.join(delimiter);
  });

  let fileContent = '';
  if (config.includeHeader) {
    fileContent += headers.join(delimiter) + '\r\n';
  }
  fileContent += rows.join('\r\n');

  triggerDownload(fileContent, filename, 'text/plain;charset=utf-8');
}

// PDF Export for Players Roster
export function exportPlayersToPDF(players: Player[], title = 'Relatório Geral de Jogadores de Xadrez') {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  // Header styling
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 842, 60, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('FEDERAÇÃO DE XADREZ - CADASTRO OFICIAL', 40, 32);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${title} | Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 40, 48);

  // Stats Summary strip
  const total = players.length;
  const men = players.filter(p => p.gender === 'M').length;
  const women = players.filter(p => p.gender === 'F').length;
  const titled = players.filter(p => p.title && p.title !== 'Sem Título').length;

  doc.setFillColor(244, 244, 245);
  doc.rect(40, 75, 762, 28, 'F');
  doc.setTextColor(24, 24, 27);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Total: ${total} Jogadores  |  Homens: ${men}  |  Mulheres: ${women}  |  Titulados: ${titled}`,
    50,
    93
  );

  // Table Data
  const tableHead = [
    ['#', 'Nome', 'Título', 'Sexo', 'Nasc.', 'Idade', 'ID FIDE', 'ID CBX', 'UF', 'FIDE Std/Rap/Blz', 'CBX Std/Rap/Blz', 'Clube']
  ];

  const tableBody = players.map((p, i) => {
    const fideRatings = [
      p.ratingFideStandard || p.ratingFide || '-',
      p.ratingFideRapid || '-',
      p.ratingFideBlitz || '-'
    ].join(' / ');

    const cbxRatings = [
      p.ratingCbxStandard || p.ratingCbx || '-',
      p.ratingCbxRapid || '-',
      p.ratingCbxBlitz || '-'
    ].join(' / ');

    return [
      i + 1,
      p.name,
      p.title || '-',
      p.gender === 'M' ? 'Masc' : p.gender === 'F' ? 'Fem' : 'Outro',
      p.birthDate || '-',
      calculateAge(p.birthDate),
      p.fideId || '-',
      p.cbxId || '-',
      p.state || '-',
      fideRatings,
      cbxRatings,
      p.club || '-'
    ];
  });

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: 115,
    margin: { left: 30, right: 30 },
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 130 },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 35, halign: 'center' },
      4: { cellWidth: 55, halign: 'center' },
      5: { cellWidth: 30, halign: 'center' },
      6: { cellWidth: 45, halign: 'center' },
      7: { cellWidth: 45, halign: 'center' },
      8: { cellWidth: 25, halign: 'center' },
      9: { cellWidth: 110, halign: 'center' },
      10: { cellWidth: 110, halign: 'center' },
      11: { cellWidth: 'auto' }
    },
    didDrawPage: (data) => {
      const str = `Página ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(str, 842 - 40 - doc.getTextWidth(str), 575);
    }
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
}

// PDF Export for Tournament Standings
export function exportTournamentStandingsToPDF(tournament: Tournament) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 595, 65, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(tournament.name, 40, 30);

  const modalityLabel = tournament.type === 'blitz' ? 'Blitz' : tournament.type === 'rapid' ? 'Rápido' : 'Standard';
  doc.text(`Local: ${tournament.city} - ${tournament.state} | Modalidade: ${modalityLabel} | Rodadas: ${tournament.rounds} | Ritmo: ${tournament.timeControl}`, 40, 48);

  const standings = tournament.standings || [];
  const tableHead = [['Pos', 'Jogador', 'Título', 'ID FIDE', 'ID CBX', 'Pts']];
  const tableBody = standings.map((s, idx) => [
    s.rank || idx + 1,
    s.playerName,
    s.title || '-',
    s.fideId || '-',
    s.cbxId || '-',
    s.points.toFixed(1)
  ]);

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: 85,
    margin: { left: 40, right: 40 },
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold'
    },
    styles: { fontSize: 9 },
  });

  doc.save(`classificacao_${tournament.name.toLowerCase().replace(/\s+/g, '_')}.pdf`);
}
