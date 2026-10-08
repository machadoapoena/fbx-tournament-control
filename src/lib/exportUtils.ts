import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

// Swiss-Manager Custom Exporter
export function exportToSwissManager(
  players: Player[],
  config: SwissExportConfig,
  filename = 'swiss_manager_jogadores.txt'
) {
  const delimiter = config.delimiter;
  const headers: string[] = [];
  
  if (config.fields.id) headers.push('ID');
  if (config.fields.fideId) headers.push('FIDE_ID');
  if (config.fields.cbxId) headers.push('CBX_ID');
  if (config.fields.name) headers.push('NAME');
  if (config.fields.title) headers.push('TITLE');
  if (config.fields.gender) headers.push('SEX');
  if (config.fields.birthDate) headers.push('BIRTHDAY');
  if (config.fields.country) headers.push('FED');
  if (config.fields.state) headers.push('STATE');
  if (config.fields.ratingFide) headers.push('RATING_FIDE_STD');
  if (config.fields.ratingFideRapid) headers.push('RATING_FIDE_RAPID');
  if (config.fields.ratingFideBlitz) headers.push('RATING_FIDE_BLITZ');
  if (config.fields.ratingCbx) headers.push('RATING_CBX_STD');
  if (config.fields.ratingCbxRapid) headers.push('RATING_CBX_RAPID');
  if (config.fields.ratingCbxBlitz) headers.push('RATING_CBX_BLITZ');
  if (config.fields.club) headers.push('CLUB');

  const rows = players.map((p, index) => {
    const rowValues: string[] = [];
    if (config.fields.id) rowValues.push(String(index + 1));
    if (config.fields.fideId) rowValues.push(p.fideId || '');
    if (config.fields.cbxId) rowValues.push(p.cbxId || '');
    if (config.fields.name) rowValues.push(p.name || '');
    if (config.fields.title) rowValues.push(p.title === 'Sem Título' ? '' : p.title);
    if (config.fields.gender) rowValues.push(p.gender === 'F' ? 'w' : 'm');
    if (config.fields.birthDate) {
      rowValues.push(p.birthDate ? p.birthDate.replace(/-/g, '/') : '');
    }
    if (config.fields.country) rowValues.push(p.country === 'Brasil' ? 'BRA' : p.country);
    if (config.fields.state) rowValues.push(p.state || '');
    if (config.fields.ratingFide) rowValues.push(String(p.ratingFideStandard || p.ratingFide || 0));
    if (config.fields.ratingFideRapid) rowValues.push(String(p.ratingFideRapid || 0));
    if (config.fields.ratingFideBlitz) rowValues.push(String(p.ratingFideBlitz || 0));
    if (config.fields.ratingCbx) rowValues.push(String(p.ratingCbxStandard || p.ratingCbx || 0));
    if (config.fields.ratingCbxRapid) rowValues.push(String(p.ratingCbxRapid || 0));
    if (config.fields.ratingCbxBlitz) rowValues.push(String(p.ratingCbxBlitz || 0));
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
  const tableHead = [['Pos', 'Jogador', 'Título', 'ID FIDE', 'Pts']];
  const tableBody = standings.map((s, idx) => [
    s.rank || idx + 1,
    s.playerName,
    s.title || '-',
    s.fideId || '-',
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
