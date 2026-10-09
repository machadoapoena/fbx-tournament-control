import React, { useState, useEffect, useMemo } from 'react';
import { Player, RatingHistoryEntry, ChessTitle, Gender } from '../types/chess';
import { 
  X, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  Award, 
  User, 
  Globe, 
  RefreshCw, 
  Check, 
  Copy, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Activity,
  Layers,
  HelpCircle,
  Table,
  Clipboard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { parseFideTableData } from '../utils/fideParser';

interface PlayerProfileModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdatePlayerHistory?: (playerId: string, cbxHistory: RatingHistoryEntry[], fideHistory: RatingHistoryEntry[]) => void;
}

type EvolutionSource = 'fide' | 'cbx' | null;
type ModalityFilter = 'all' | 'standard' | 'rapid' | 'blitz';

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  player,
  isOpen,
  onClose,
  onUpdatePlayerHistory
}) => {
  // Selected evolution system: null initially (only loaded when user explicitly clicks EVOLUÇÃO FIDE or EVOLUÇÃO CBX)
  const [selectedSource, setSelectedSource] = useState<EvolutionSource>(null);

  // Selected modality filter: all 3 or specific
  const [selectedModality, setSelectedModality] = useState<ModalityFilter>('all');

  // Option to hide dots on the chart when rating is equal to previous (clean line without balls on identical ratings)
  const [hideEqualDots, setHideEqualDots] = useState(true);

  // Hovered data point for chart tooltip
  const [hoveredPoint, setHoveredPoint] = useState<{
    period: string;
    modality: 'standard' | 'rapid' | 'blitz';
    rating: number;
    diff: number | null;
    x: number;
    y: number;
  } | null>(null);

  // Sync / Scraping states
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySourceStatus, setHistorySourceStatus] = useState<string | null>(null);
  const [showTableDetails, setShowTableDetails] = useState(false);

  // Manual / Paste Import states for FIDE profile-table_calc
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [rawTableInput, setRawTableInput] = useState('');
  const [parsedPreview, setParsedPreview] = useState<RatingHistoryEntry[]>([]);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);

  const handleProcessImport = () => {
    if (!rawTableInput.trim()) {
      setImportStatusMessage('Por favor, cole o HTML ou texto da tabela antes de processar.');
      return;
    }
    const results = parseFideTableData(rawTableInput);
    if (results.length === 0) {
      setImportStatusMessage('Nenhum período com rating encontrado. Certifique-se de copiar a tabela de classe "profile-table_calc" de https://ratings.fide.com/profile/.../chart.');
    } else {
      setParsedPreview(results);
      setImportStatusMessage(`✓ ${results.length} períodos identificados com sucesso (Coluna 0: Período, Coluna 1: Std, Coluna 3: Rápido, Coluna 5: Blitz)!`);
    }
  };

  const handleApplyImportedHistory = () => {
    if (parsedPreview.length === 0) return;
    setLocalFideHistory(parsedPreview);
    setSelectedSource('fide');
    setShowTableDetails(true);
    setHistorySourceStatus(`✓ Histórico FIDE atualizado com ${parsedPreview.length} períodos da tabela profile-table_calc!`);
    if (onUpdatePlayerHistory && player?.id) {
      onUpdatePlayerHistory(player.id, localCbxHistory, parsedPreview);
    }
    setIsImportModalOpen(false);
    setRawTableInput('');
    setParsedPreview([]);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawTableInput(text);
        const results = parseFideTableData(text);
        if (results.length > 0) {
          setParsedPreview(results);
          setImportStatusMessage(`✓ ${results.length} períodos identificados da área de transferência!`);
        } else {
          setImportStatusMessage('Texto colado da área de transferência. Clique em "Processar Tabela" se necessário.');
        }
      }
    } catch {
      setImportStatusMessage('Não foi possível ler a área de transferência diretamente. Pressione Ctrl+V na caixa de texto abaixo.');
    }
  };

  const handleLoadSampleFideData = () => {
    const sampleHtml = `<table class="profile-table_calc">
  <thead>
    <tr>
      <th>Period</th>
      <th>STD. RATING</th>
      <th>STD GMS</th>
      <th>RPD</th>
      <th>RPD GMS</th>
      <th>BLZ</th>
      <th>BLZ GMS</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>2026-Oct</td><td>1584</td><td>0</td><td>1625</td><td>0</td><td>1600</td><td>0</td></tr>
    <tr><td>2026-Sep</td><td>1584</td><td>0</td><td>1625</td><td>0</td><td>1600</td><td>0</td></tr>
    <tr><td>2026-Aug</td><td>1584</td><td>0</td><td>1625</td><td>0</td><td>1600</td><td>0</td></tr>
    <tr><td>2026-Jul</td><td>1584</td><td>0</td><td>1625</td><td>0</td><td>1600</td><td>0</td></tr>
    <tr><td>2026-Jun</td><td>1584</td><td>0</td><td>1625</td><td>0</td><td>1600</td><td>0</td></tr>
    <tr><td>2026-May</td><td>1584</td><td>0</td><td>1625</td><td>0</td><td>1600</td><td>0</td></tr>
    <tr><td>2026-Apr</td><td>1584</td><td>0</td><td>1625</td><td>0</td><td>1600</td><td>0</td></tr>
    <tr><td>2026-Mar</td><td>1584</td><td>0</td><td>1625</td><td>0</td><td>1600</td><td>0</td></tr>
    <tr><td>2026-Feb</td><td>1584</td><td>0</td><td>1625</td><td>0</td><td>1600</td><td>0</td></tr>
    <tr><td>2026-Jan</td><td>1584</td><td>0</td><td>1625</td><td>0</td><td>1600</td><td>0</td></tr>
    <tr><td>2025-Dec</td><td>1584</td><td>0</td><td>1625</td><td>0</td><td>1600</td><td>0</td></tr>
    <tr><td>2025-Nov</td><td>1584</td><td>0</td><td>1625</td><td>0</td><td>1600</td><td>0</td></tr>
    <tr><td>2025-Oct</td><td>1584</td><td>0</td><td>1625</td><td>0</td><td>1600</td><td>0</td></tr>
    <tr><td>2025-Sep</td><td>1584</td><td>0</td><td>1625</td><td>3</td><td>1600</td><td>0</td></tr>
    <tr><td>2025-Aug</td><td>1584</td><td>7</td><td>1651</td><td>8</td><td>1600</td><td>10</td></tr>
    <tr><td>2025-Jul</td><td>1625</td><td>0</td><td>1571</td><td>0</td><td>1587</td><td>0</td></tr>
    <tr><td>2025-Jun</td><td>1625</td><td>0</td><td>1571</td><td>0</td><td>1587</td><td>0</td></tr>
    <tr><td>2025-May</td><td>1625</td><td>0</td><td>1571</td><td>0</td><td>1587</td><td>0</td></tr>
    <tr><td>2025-Apr</td><td>1625</td><td>0</td><td>1571</td><td>4</td><td>1587</td><td>5</td></tr>
    <tr><td>2025-Mar</td><td>1625</td><td>0</td><td>1537</td><td>0</td><td>1575</td><td>0</td></tr>
    <tr><td>2025-Feb</td><td>1625</td><td>0</td><td>1537</td><td>0</td><td>1575</td><td>5</td></tr>
    <tr><td>2025-Jan</td><td>1625</td><td>0</td><td>1537</td><td>0</td><td>1609</td><td>0</td></tr>
    <tr><td>2024-Dec</td><td>1625</td><td>4</td><td>1537</td><td>4</td><td>1609</td><td>14</td></tr>
    <tr><td>2024-Nov</td><td>1631</td><td>0</td><td>1520</td><td>0</td><td>1631</td><td>0</td></tr>
    <tr><td>2024-Oct</td><td>1631</td><td>0</td><td>1520</td><td>0</td><td></td><td></td></tr>
    <tr><td>2024-Sep</td><td>1631</td><td>0</td><td>1520</td><td>0</td><td></td><td></td></tr>
    <tr><td>2024-Aug</td><td>1631</td><td>5</td><td>1520</td><td>0</td><td></td><td></td></tr>
    <tr><td>2024-Jul</td><td></td><td></td><td>1520</td><td>0</td><td></td><td></td></tr>
    <tr><td>2024-Jun</td><td></td><td></td><td>1520</td><td>4</td><td></td><td></td></tr>
    <tr><td>2024-May</td><td></td><td></td><td>1529</td><td>0</td><td></td><td></td></tr>
    <tr><td>2024-Apr</td><td></td><td></td><td>1529</td><td>0</td><td></td><td></td></tr>
  </tbody>
</table>`;
    setRawTableInput(sampleHtml);
    const parsed = parseFideTableData(sampleHtml);
    setParsedPreview(parsed);
    setImportStatusMessage(`✓ Dados de demonstração carregados (${parsed.length} períodos)! Para atualizar o perfil de qualquer enxadrista, copie e cole a tabela profile-table_calc da página oficial da FIDE.`);
    setIsImportModalOpen(true);
  };

  // Local state for histories so changes/syncing reflect immediately
  const [localCbxHistory, setLocalCbxHistory] = useState<RatingHistoryEntry[]>(player?.cbxHistory || []);
  const [localFideHistory, setLocalFideHistory] = useState<RatingHistoryEntry[]>(player?.fideHistory || []);

  // Update local state when player changes or when modal opens
  // STRICT RULE: Ao entrar na modal, NENHUM histórico de rating deve vir carregado.
  // Somente se o usuário clicar em EVOLUÇÃO FIDE ou EVOLUÇÃO CBX é que vai carregar o gráfico e histórico.
  useEffect(() => {
    if (isOpen && player) {
      setLocalCbxHistory(player.cbxHistory || []);
      setLocalFideHistory(player.fideHistory || []);
      setHistorySourceStatus(null);
      setSelectedSource(null);
      setShowTableDetails(false);
      setHoveredPoint(null);
    }
  }, [isOpen, player]);

  // Calculate age
  const age = useMemo(() => {
    if (!player?.birthDate) return null;
    const birthYear = parseInt(player.birthDate.split('-')[0], 10);
    if (isNaN(birthYear)) return null;
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear;
  }, [player?.birthDate]);

  // Get active history list based on selected source (FIDE vs CBX)
  // Strictly uses real history data from official sources (no fabricated or simulated data)
  const activeHistory: RatingHistoryEntry[] = useMemo(() => {
    if (!selectedSource) return [];
    const isFide = selectedSource === 'fide';
    const explicitHistory = isFide ? localFideHistory : localCbxHistory;

    if (explicitHistory && explicitHistory.length > 0) {
      // Sort chronologically if needed (oldest to newest)
      return [...explicitHistory].reverse();
    }

    return [];
  }, [selectedSource, localFideHistory, localCbxHistory]);

  // Statistics calculation for the active dataset
  const stats = useMemo(() => {
    if (!activeHistory || activeHistory.length === 0) {
      return { peak: null, lowest: null, current: null, netGain: null, count: 0 };
    }

    const ratings: number[] = [];
    activeHistory.forEach(item => {
      if (selectedModality === 'all' || selectedModality === 'standard') {
        if (item.standard) ratings.push(item.standard);
      }
      if (selectedModality === 'all' || selectedModality === 'rapid') {
        if (item.rapid) ratings.push(item.rapid);
      }
      if (selectedModality === 'all' || selectedModality === 'blitz') {
        if (item.blitz) ratings.push(item.blitz);
      }
    });

    if (ratings.length === 0) {
      return { peak: null, lowest: null, current: null, netGain: null, count: 0 };
    }

    const peak = Math.max(...ratings);
    const lowest = Math.min(...ratings);

    // Get current (last non-null) and start (first non-null)
    const lastItem = activeHistory[activeHistory.length - 1];
    const firstItem = activeHistory[0];

    const current = selectedModality === 'standard' 
      ? (lastItem.standard || 0)
      : selectedModality === 'rapid'
      ? (lastItem.rapid || 0)
      : selectedModality === 'blitz'
      ? (lastItem.blitz || 0)
      : (lastItem.standard || lastItem.rapid || lastItem.blitz || 0);

    const start = selectedModality === 'standard' 
      ? (firstItem.standard || current)
      : selectedModality === 'rapid'
      ? (firstItem.rapid || current)
      : selectedModality === 'blitz'
      ? (firstItem.blitz || current)
      : (firstItem.standard || firstItem.rapid || firstItem.blitz || current);

    const netGain = current - start;

    return { peak, lowest, current, netGain, count: activeHistory.length };
  }, [activeHistory, selectedModality]);

  // Fetch online history from backend API
  const handleFetchOnlineHistory = async () => {
    if (!player) return;
    setIsLoadingHistory(true);
    setHistorySourceStatus('Consultando servidores CBX e FIDE...');

    try {
      const res = await fetch('/api/player-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cbxId: player.cbxId,
          cbxUrl: player.cbxUrl,
          fideId: player.fideId,
          fideUrl: player.fideUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        let cbxCount = 0;
        let fideCount = 0;
        let currentCbxHistory: RatingHistoryEntry[] = localCbxHistory;
        let currentFideHistory: RatingHistoryEntry[] = localFideHistory;

        if (data.data?.cbxHistory && data.data.cbxHistory.length > 0) {
          setLocalCbxHistory(data.data.cbxHistory);
          currentCbxHistory = data.data.cbxHistory;
          cbxCount = data.data.cbxHistory.length;
        }

        if (data.data?.fideHistory && data.data.fideHistory.length > 0) {
          setLocalFideHistory(data.data.fideHistory);
          currentFideHistory = data.data.fideHistory;
          fideCount = data.data.fideHistory.length;
        }

        // If backend could not reach FIDE due to IP blocks, try client-side fetch of official profile chart page
        if (fideCount === 0 && player.fideId) {
          try {
            const cleanId = String(player.fideId).trim();
            const targetChartUrl = `https://ratings.fide.com/profile/${encodeURIComponent(cleanId)}/chart`;
            const clientProxies = [
              `https://api.allorigins.win/raw?url=${encodeURIComponent(targetChartUrl)}`,
              `https://api.allorigins.win/get?url=${encodeURIComponent(targetChartUrl)}`,
              `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetChartUrl)}`,
              `https://thingproxy.freeboard.io/fetch/${targetChartUrl}`,
            ];

            const normalizePeriodClient = (raw: string): string => {
              if (!raw) return '';
              const s = String(raw).trim();
              const monthsPt: Record<string, string> = {
                jan: 'Jan', feb: 'Fev', fev: 'Fev', mar: 'Mar', apr: 'Abr', abr: 'Abr',
                may: 'Mai', mai: 'Mai', jun: 'Jun', jul: 'Jul', aug: 'Ago', ago: 'Ago',
                sep: 'Set', set: 'Set', oct: 'Out', out: 'Out', nov: 'Nov', dec: 'Dez', dez: 'Dez'
              };
              const mNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

              const isoMatch = s.match(/^(\d{4})[/-](\d{1,2})(?:[/-]\d{1,2})?$/);
              if (isoMatch) {
                const m = parseInt(isoMatch[2], 10);
                if (m >= 1 && m <= 12) return `${mNames[m - 1]}/${isoMatch[1]}`;
              }

              const slashMatch = s.match(/^(\d{1,2})[/-](\d{4})$/);
              if (slashMatch) {
                const m = parseInt(slashMatch[1], 10);
                if (m >= 1 && m <= 12) return `${mNames[m - 1]}/${slashMatch[2]}`;
              }

              const textMonthMatch = s.match(/([a-zA-Z]{3,})\s*[-/,\s]\s*(\d{4})/) || s.match(/(\d{4})\s*[-/,\s]\s*([a-zA-Z]{3,})/);
              if (textMonthMatch) {
                const isYearFirst = /^\d{4}$/.test(textMonthMatch[1]);
                const y = isYearFirst ? textMonthMatch[1] : textMonthMatch[2];
                const mText = (isYearFirst ? textMonthMatch[2] : textMonthMatch[1]).toLowerCase().slice(0, 3);
                return `${monthsPt[mText] || mText.toUpperCase()}/${y}`;
              }

              const shortYearMatch = s.match(/([a-zA-Z]{3,})\s*[-/,\s]\s*(\d{2})$/);
              if (shortYearMatch) {
                const mText = shortYearMatch[1].toLowerCase().slice(0, 3);
                return `${monthsPt[mText] || mText.toUpperCase()}/20${shortYearMatch[2]}`;
              }

              return s;
            };

            const extractNum = (text: string | null | undefined): number | null => {
              if (!text) return null;
              const s = text.trim();
              if (!s || s === '0' || s === '-' || s.toUpperCase() === 'N/A') return null;
              const num = parseInt(s.replace(/\D/g, ''), 10);
              return isNaN(num) || num < 400 || num > 3800 ? null : num;
            };

            for (const proxyUrl of clientProxies) {
              try {
                const proxyRes = await fetch(proxyUrl);
                if (proxyRes.ok) {
                  let text = await proxyRes.text();
                  if (proxyUrl.includes('/get?url=')) {
                    try {
                      const json = JSON.parse(text);
                      if (json.contents) text = json.contents;
                    } catch {}
                  }

                  // Look for table.profile-table_calc
                  if (text.includes('profile-table_calc') || text.includes('<table')) {
                    const doc = new DOMParser().parseFromString(text, 'text/html');
                    const tbl = doc.querySelector('table.profile-table_calc, table[class*="profile-table_calc"]');
                    if (tbl) {
                      const rows = Array.from(tbl.querySelectorAll('tr'));
                      const tableParsed: RatingHistoryEntry[] = [];

                      rows.forEach((row) => {
                        const cells = Array.from(row.querySelectorAll('td'));
                        if (cells.length < 2) return;

                        const rawPeriod = (cells[0]?.textContent || '').trim();
                        if (!rawPeriod || rawPeriod.toUpperCase().includes('PERIOD')) return;
                        const period = normalizePeriodClient(rawPeriod);
                        if (!period) return;

                        let std: number | null = null;
                        let rap: number | null = null;
                        let blz: number | null = null;

                        // Layout oficial da tabela profile-table_calc:
                        // Coluna 0: Período
                        // Coluna 1: STD. RATING
                        // Coluna 3: RPD
                        // Coluna 5: BLZ
                        if (cells.length >= 6) {
                          std = extractNum(cells[1]?.textContent);
                          rap = extractNum(cells[3]?.textContent);
                          blz = extractNum(cells[5]?.textContent);
                        } else if (cells.length >= 4) {
                          std = extractNum(cells[1]?.textContent);
                          rap = extractNum(cells[2]?.textContent);
                          blz = extractNum(cells[3]?.textContent);
                        }

                        if (std !== null || rap !== null || blz !== null) {
                          tableParsed.push({ period, standard: std, rapid: rap, blitz: blz });
                        }
                      });

                      if (tableParsed.length > 0) {
                        setLocalFideHistory(tableParsed);
                        currentFideHistory = tableParsed;
                        fideCount = tableParsed.length;
                        break;
                      }
                    }
                  }
                }
              } catch {
                // Next proxy
              }
            }
          } catch {
            // Ignore client fallback error
          }
        }

        if (cbxCount > 0 || fideCount > 0) {
          const parts: string[] = [];
          if (cbxCount > 0) parts.push(`${cbxCount} meses CBX`);
          if (fideCount > 0) parts.push(`${fideCount} períodos FIDE (profile-table_calc)`);
          setHistorySourceStatus(`Histórico sincronizado com sucesso! (${parts.join(', ')})`);

          if (onUpdatePlayerHistory && player.id) {
            onUpdatePlayerHistory(
              player.id, 
              currentCbxHistory, 
              currentFideHistory
            );
          }
        } else {
          setHistorySourceStatus(
            player?.fideId 
              ? 'A FIDE protege seus servidores via Cloudflare e bloqueia requisições externas. Clique em "Colar Tabela FIDE" para importar a tabela profile-table_calc!' 
              : 'Nenhum histórico disponível para este jogador nas fontes online.'
          );
        }
      } else {
        setHistorySourceStatus('Falha ao obter histórico online.');
      }
    } catch (err: any) {
      setHistorySourceStatus('Erro ao conectar ao serviço de histórico.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Chart Rendering Geometry
  const chartWidth = 720;
  const chartHeight = 260;
  const paddingLeft = 55;
  const paddingRight = 25;
  const paddingTop = 30;
  const paddingBottom = 40;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  // Determine Y-axis limits
  const { minY, maxY, yTicks } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    activeHistory.forEach(item => {
      if (item.standard) {
        min = Math.min(min, item.standard);
        max = Math.max(max, item.standard);
      }
      if (item.rapid) {
        min = Math.min(min, item.rapid);
        max = Math.max(max, item.rapid);
      }
      if (item.blitz) {
        min = Math.min(min, item.blitz);
        max = Math.max(max, item.blitz);
      }
    });

    if (min === Infinity || max === -Infinity) {
      min = 1500;
      max = 2200;
    } else {
      // Add comfortable padding
      min = Math.floor((min - 40) / 50) * 50;
      max = Math.ceil((max + 40) / 50) * 50;
      if (max - min < 100) {
        min -= 50;
        max += 50;
      }
    }

    const step = Math.ceil((max - min) / 4 / 25) * 25;
    const ticks: number[] = [];
    for (let val = min; val <= max; val += step) {
      ticks.push(val);
    }

    return { minY: min, maxY: max, yTicks: ticks };
  }, [activeHistory]);

  // Coordinate scales
  const getX = (index: number) => {
    if (activeHistory.length <= 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (index / (activeHistory.length - 1)) * innerWidth;
  };

  const getY = (rating: number) => {
    if (maxY === minY) return paddingTop + innerHeight / 2;
    const norm = (rating - minY) / (maxY - minY);
    return paddingTop + innerHeight - norm * innerHeight;
  };

  // Build SVG path strings for each modality
  const buildPath = (key: 'standard' | 'rapid' | 'blitz') => {
    let d = '';
    let hasPoint = false;

    activeHistory.forEach((item, index) => {
      const val = item[key];
      if (val !== undefined && val !== null && val > 0) {
        const x = getX(index);
        const y = getY(val);
        if (!hasPoint) {
          d += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
          hasPoint = true;
        } else {
          d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        }
      }
    });

    return d;
  };

  // Build SVG area fill path
  const buildAreaPath = (key: 'standard' | 'rapid' | 'blitz') => {
    const linePath = buildPath(key);
    if (!linePath) return '';

    const validIndices = activeHistory
      .map((item, idx) => (item[key] ? idx : -1))
      .filter(idx => idx !== -1);

    if (validIndices.length < 2) return '';

    const firstX = getX(validIndices[0]);
    const lastX = getX(validIndices[validIndices.length - 1]);
    const bottomY = paddingTop + innerHeight;

    return `${linePath} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;
  };

  const stdLinePath = (selectedModality === 'all' || selectedModality === 'standard') ? buildPath('standard') : '';
  const rapLinePath = (selectedModality === 'all' || selectedModality === 'rapid') ? buildPath('rapid') : '';
  const blzLinePath = (selectedModality === 'all' || selectedModality === 'blitz') ? buildPath('blitz') : '';

  const stdAreaPath = (selectedModality === 'standard') ? buildAreaPath('standard') : '';
  const rapAreaPath = (selectedModality === 'rapid') ? buildAreaPath('rapid') : '';
  const blzAreaPath = (selectedModality === 'blitz') ? buildAreaPath('blitz') : '';

  if (!isOpen || !player) return null;

  // Current ratings for quick cards
  const curFideStd = player.ratingFideStandard || player.ratingFide || 0;
  const curFideRap = player.ratingFideRapid || 0;
  const curFideBlz = player.ratingFideBlitz || 0;

  const curCbxStd = player.ratingCbxStandard || player.ratingCbx || 0;
  const curCbxRap = player.ratingCbxRapid || 0;
  const curCbxBlz = player.ratingCbxBlitz || 0;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-6 py-5 bg-linear-to-r from-stone-900 via-stone-800 to-stone-900 text-white flex items-start justify-between relative border-b border-stone-700/60">
          <div className="flex items-start gap-4">
            {/* Player Avatar */}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold font-mono shadow-md border ${
              player.gender === 'F' 
                ? 'bg-rose-950/80 border-rose-500/40 text-rose-300' 
                : 'bg-sky-950/80 border-sky-500/40 text-sky-300'
            }`}>
              {player.gender === 'F' ? '♀' : '♂'}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {player.name}
                </h2>
                {player.title && player.title !== 'Sem Título' && (
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-extrabold shadow-xs ${
                    player.title === 'GM'
                      ? 'bg-amber-400 text-stone-950'
                      : player.title === 'IM'
                      ? 'bg-amber-200 text-stone-900'
                      : player.title.startsWith('W')
                      ? 'bg-purple-400 text-purple-950'
                      : 'bg-stone-200 text-stone-900'
                  }`}>
                    {player.title}
                  </span>
                )}
              </div>

              {/* Subtitle / Attributes badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-300">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-800 border border-stone-700 font-mono text-[11px]">
                  <Globe className="w-3 h-3 text-emerald-400" />
                  <span>{player.country || 'BRA'}</span>
                  {player.state && <span className="text-stone-400">({player.state})</span>}
                </span>

                {age !== null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-800 border border-stone-700 font-mono text-[11px]">
                    <Calendar className="w-3 h-3 text-amber-400" />
                    <span>{age} anos</span>
                    {player.birthDate && (
                      <span className="text-stone-400 text-[10px]">
                        ({player.birthDate.split('-').reverse().join('/')})
                      </span>
                    )}
                  </span>
                )}

                {player.club && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-800 border border-stone-700 text-[11px]">
                    <span>Clube: {player.club}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons (Links & Close) */}
          <div className="flex items-center gap-2">
            {player.fideId && (
              <a
                href={player.fideUrl || `https://ratings.fide.com/profile/${player.fideId}`}
                target="_blank"
                rel="noreferrer"
                title="Abrir perfil oficial na FIDE"
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-semibold text-stone-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <img src="https://www.fide.com/img/logo1.png" alt="FIDE" className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">FIDE</span>
                <ExternalLink className="w-3 h-3 text-stone-400" />
              </a>
            )}

            {player.cbxId && (
              <a
                href={player.cbxUrl || `https://www.cbx.org.br/jogador/${player.cbxId}`}
                target="_blank"
                rel="noreferrer"
                title="Abrir perfil oficial na CBX"
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-semibold text-stone-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <img src="https://cbx.org.br/files/textos/003659/000965.jpg" alt="CBX" className="w-3.5 h-3.5 rounded-xs" />
                <span className="hidden sm:inline">CBX</span>
                <ExternalLink className="w-3 h-3 text-stone-400" />
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer ml-1"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* 1. Quick Ratings Summary Cards (FIDE & CBX side by side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FIDE Current Ratings Card */}
            <div className={`p-4 rounded-xl border transition-all ${
              selectedSource === 'fide' 
                ? 'bg-amber-50/40 border-amber-300 ring-2 ring-amber-400/20 shadow-xs' 
                : 'bg-stone-50 border-stone-200 hover:border-stone-300'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-stone-900 text-white flex items-center justify-center font-bold text-[10px]">
                    F
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-900">
                      Ratings FIDE (Internacional)
                    </h3>
                    <div className="text-[11px] text-stone-500 font-mono">
                      ID FIDE: {player.fideId || 'Não vinculado'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSource('fide')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    selectedSource === 'fide'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {selectedSource === 'fide' ? '✓ Evolução Ativa' : 'Evolução FIDE'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                  <div className="text-[10px] uppercase font-bold text-emerald-800">Clássico</div>
                  <div className="text-base font-extrabold text-emerald-950 mt-0.5">
                    {curFideStd > 0 ? curFideStd : '-'}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-sky-100 shadow-2xs">
                  <div className="text-[10px] uppercase font-bold text-sky-800">Rápido</div>
                  <div className="text-base font-extrabold text-sky-950 mt-0.5">
                    {curFideRap > 0 ? curFideRap : '-'}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-amber-100 shadow-2xs">
                  <div className="text-[10px] uppercase font-bold text-amber-800">Blitz</div>
                  <div className="text-base font-extrabold text-amber-950 mt-0.5">
                    {curFideBlz > 0 ? curFideBlz : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* CBX Current Ratings Card */}
            <div className={`p-4 rounded-xl border transition-all ${
              selectedSource === 'cbx' 
                ? 'bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-400/20 shadow-xs' 
                : 'bg-stone-50 border-stone-200 hover:border-stone-300'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-emerald-800 text-white flex items-center justify-center font-bold text-[10px]">
                    C
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-900">
                      Ratings CBX (Nacional)
                    </h3>
                    <div className="text-[11px] text-stone-500 font-mono">
                      ID CBX: {player.cbxId || 'Não vinculado'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSource('cbx')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    selectedSource === 'cbx'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {selectedSource === 'cbx' ? '✓ Evolução Ativa' : 'Evolução CBX'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                  <div className="text-[10px] uppercase font-bold text-emerald-800">Clássico</div>
                  <div className="text-base font-extrabold text-emerald-950 mt-0.5">
                    {curCbxStd > 0 ? curCbxStd : '-'}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-sky-100 shadow-2xs">
                  <div className="text-[10px] uppercase font-bold text-sky-800">Rápido</div>
                  <div className="text-base font-extrabold text-sky-950 mt-0.5">
                    {curCbxRap > 0 ? curCbxRap : '-'}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-amber-100 shadow-2xs">
                  <div className="text-[10px] uppercase font-bold text-amber-800">Blitz</div>
                  <div className="text-base font-extrabold text-amber-950 mt-0.5">
                    {curCbxBlz > 0 ? curCbxBlz : '-'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Rating Evolution Section */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            {/* Controls Bar */}
            <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-stone-900" />
                  <h3 className="text-base font-extrabold text-stone-900">
                    Evolução Histórica de Rating
                  </h3>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Acompanhe a trajetória de desempenho nas modalidades Clássico, Rápido e Blitz
                </p>
              </div>

              {/* Source Switcher: FIDE vs CBX */}
              <div className="flex items-center gap-1.5 p-1 bg-stone-200/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSelectedSource('fide')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedSource === 'fide'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900 bg-white/70 hover:bg-white'
                  }`}
                >
                  <Globe className={`w-3.5 h-3.5 ${selectedSource === 'fide' ? 'text-white' : 'text-amber-600'}`} />
                  <span>Evolução FIDE</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSource('cbx')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedSource === 'cbx'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900 bg-white/70 hover:bg-white'
                  }`}
                >
                  <img src="https://cbx.org.br/files/textos/003659/000965.jpg" alt="CBX" className="w-3.5 h-3.5 rounded-xs" />
                  <span>Evolução CBX</span>
                </button>
              </div>
            </div>

            {/* If no source is selected yet, prompt user to select FIDE or CBX */}
            {!selectedSource ? (
              <div className="py-14 sm:py-16 px-6 text-center bg-stone-50/50">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-300/40 text-amber-700 flex items-center justify-center mb-3.5 shadow-2xs">
                  <Activity className="w-7 h-7 text-amber-600" />
                </div>
                <h4 className="text-base sm:text-lg font-extrabold text-stone-900">
                  Nenhum histórico carregado no momento
                </h4>
                <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto mt-1 mb-6 leading-relaxed">
                  Para carregar e visualizar o gráfico de evolução e o histórico deste enxadrista, selecione a federação desejada:
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedSource('fide')}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Carregar Evolução FIDE</span>
                    {player.fideId && (
                      <span className="bg-amber-600/70 px-1.5 py-0.5 rounded font-mono text-[11px] font-normal">
                        ID: {player.fideId}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSource('cbx')}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <img src="https://cbx.org.br/files/textos/003659/000965.jpg" alt="CBX" className="w-4 h-4 rounded-xs" />
                    <span>Carregar Evolução CBX</span>
                    {player.cbxId && (
                      <span className="bg-emerald-700/70 px-1.5 py-0.5 rounded font-mono text-[11px] font-normal">
                        ID: {player.cbxId}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Sub-bar: Modality Filters and Stat Badges */}
                <div className="px-5 py-3 bg-stone-100/50 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Modality Filter Pills */}
              <div className="flex items-center gap-2">
                <span className="text-stone-500 font-semibold text-[11px] uppercase tracking-wider">
                  Modalidade:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedModality('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer transition-colors ${
                      selectedModality === 'all'
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    Todas (3)
                  </button>

                  <button
                    onClick={() => setSelectedModality('standard')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5 ${
                      selectedModality === 'standard'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Clássico / Pensado</span>
                  </button>

                  <button
                    onClick={() => setSelectedModality('rapid')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5 ${
                      selectedModality === 'rapid'
                        ? 'bg-sky-700 text-white shadow-2xs'
                        : 'bg-white border border-sky-200 text-sky-800 hover:bg-sky-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    <span>Rápido</span>
                  </button>

                  <button
                    onClick={() => setSelectedModality('blitz')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5 ${
                      selectedModality === 'blitz'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Blitz</span>
                  </button>
                </div>
              </div>

              {/* Metric Highlights & Chart Style Option */}
              <div className="flex flex-wrap items-center gap-3 text-stone-700 font-mono">
                <button
                  type="button"
                  onClick={() => setHideEqualDots(!hideEqualDots)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-sans font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                    hideEqualDots
                      ? 'bg-amber-100/90 text-amber-900 border border-amber-300 shadow-2xs font-bold'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                  }`}
                  title="Quando ativado, remove as bolinhas nos meses em que o rating se manteve igual, deixando a linha limpa"
                >
                  <span className={`w-2 h-2 rounded-full ${hideEqualDots ? 'bg-amber-600 ring-2 ring-amber-300' : 'bg-stone-400'}`} />
                  <span>{hideEqualDots ? 'Sem bolas quando iguais' : 'Todas as bolas'}</span>
                </button>

                {stats.peak !== null && (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-stone-500">Pico:</span>
                    <span className="font-extrabold text-stone-900">{stats.peak}</span>
                  </div>
                )}
                {stats.netGain !== null && (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-stone-500">Progresso:</span>
                    <span className={`font-extrabold flex items-center gap-0.5 ${
                      stats.netGain > 0 
                        ? 'text-emerald-600' 
                        : stats.netGain < 0 
                        ? 'text-rose-600' 
                        : 'text-stone-600'
                    }`}>
                      {stats.netGain > 0 ? '+' : ''}{stats.netGain}
                      {stats.netGain > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : stats.netGain < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* SVG Interactive Chart Box */}
            <div className="p-4 sm:p-6 bg-white relative">
              {activeHistory.length === 0 ? (
                <div className="py-12 px-4 text-center max-w-md mx-auto">
                  <Activity className="w-9 h-9 mx-auto text-amber-500 mb-2.5" />
                  <p className="text-sm sm:text-base font-extrabold text-stone-900">
                    Nenhum histórico disponível para {selectedSource.toUpperCase()}
                  </p>
                  {selectedSource === 'fide' ? (
                    <div className="mt-2 space-y-3">
                      <p className="text-xs text-stone-600 leading-relaxed">
                        A FIDE bloqueia consultas automatizadas via Cloudflare e CORS.
                        {player?.fideId ? (
                          <> Abra a página oficial da FIDE com seu perfil, copie a tabela <code className="px-1.5 py-0.5 rounded bg-stone-100 font-mono text-[11px] text-amber-800 font-bold">profile-table_calc</code> e cole diretamente aqui:</>
                        ) : (
                          <> Adicione o ID FIDE do enxadrista para importar o histórico.</>
                        )}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        {player?.fideId && (
                          <a
                            href={`https://ratings.fide.com/profile/${player.fideId}/chart`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Abrir Página FIDE</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsImportModalOpen(true)}
                          className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                        >
                          <Table className="w-3.5 h-3.5 text-amber-400" />
                          <span>Colar Tabela profile-table_calc</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleLoadSampleFideData}
                          className="px-3 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Exemplo (ID 22747281)</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500 mt-1">
                      O enxadrista ainda não possui pontuação ou registro cadastrado nesta federação.
                    </p>
                  )}
                </div>
              ) : (
                <div className="relative w-full overflow-x-auto">
                  <div className="min-w-[640px]">
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="w-full h-auto select-none overflow-visible"
                    >
                      <defs>
                        {/* Gradient Fills */}
                        <linearGradient id="gradStd" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="gradRap" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="gradBlz" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines and Y-axis labels */}
                      {yTicks.map((val) => {
                        const y = getY(val);
                        return (
                          <g key={`ytick-${val}`}>
                            <line
                              x1={paddingLeft}
                              y1={y}
                              x2={chartWidth - paddingRight}
                              y2={y}
                              stroke="#e7e5e4"
                              strokeDasharray="4 4"
                              strokeWidth="1"
                            />
                            <text
                              x={paddingLeft - 8}
                              y={y + 4}
                              textAnchor="end"
                              className="text-[10px] font-mono fill-stone-400"
                            >
                              {val}
                            </text>
                          </g>
                        );
                      })}

                      {/* Area Fills for single modality view */}
                      {stdAreaPath && <path d={stdAreaPath} fill="url(#gradStd)" />}
                      {rapAreaPath && <path d={rapAreaPath} fill="url(#gradRap)" />}
                      {blzAreaPath && <path d={blzAreaPath} fill="url(#gradBlz)" />}

                      {/* Modality Line Curves */}
                      {stdLinePath && (
                        <path
                          d={stdLinePath}
                          fill="none"
                          stroke="#059669"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      {rapLinePath && (
                        <path
                          d={rapLinePath}
                          fill="none"
                          stroke="#0284c7"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      {blzLinePath && (
                        <path
                          d={blzLinePath}
                          fill="none"
                          stroke="#d97706"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Interactive Point Dots */}
                      {activeHistory.map((item, index) => {
                        const x = getX(index);
                        const prevItem = index > 0 ? activeHistory[index - 1] : null;

                        // Standard dot conditions
                        const isStdHovered = hoveredPoint?.period === item.period && hoveredPoint?.modality === 'standard';
                        const stdChanged = prevItem?.standard === undefined || prevItem.standard === null || item.standard !== prevItem.standard;
                        const isStdEndpoint = index === 0 || index === activeHistory.length - 1;
                        const showStdCircle = !hideEqualDots || isStdEndpoint || stdChanged || isStdHovered;

                        // Rapid dot conditions
                        const isRapHovered = hoveredPoint?.period === item.period && hoveredPoint?.modality === 'rapid';
                        const rapChanged = prevItem?.rapid === undefined || prevItem.rapid === null || item.rapid !== prevItem.rapid;
                        const isRapEndpoint = index === 0 || index === activeHistory.length - 1;
                        const showRapCircle = !hideEqualDots || isRapEndpoint || rapChanged || isRapHovered;

                        // Blitz dot conditions
                        const isBlzHovered = hoveredPoint?.period === item.period && hoveredPoint?.modality === 'blitz';
                        const blzChanged = prevItem?.blitz === undefined || prevItem.blitz === null || item.blitz !== prevItem.blitz;
                        const isBlzEndpoint = index === 0 || index === activeHistory.length - 1;
                        const showBlzCircle = !hideEqualDots || isBlzEndpoint || blzChanged || isBlzHovered;

                        return (
                          <g key={`pts-${item.period}-${index}`}>
                            {/* Standard Dot */}
                            {(selectedModality === 'all' || selectedModality === 'standard') &&
                              item.standard && (
                                <>
                                  {/* Hit area for hover tooltip */}
                                  <circle
                                    cx={x}
                                    cy={getY(item.standard)}
                                    r={8}
                                    fill="transparent"
                                    className="cursor-pointer"
                                    onMouseEnter={() => {
                                      const diff = prevItem?.standard ? item.standard! - prevItem.standard : null;
                                      setHoveredPoint({
                                        period: item.period,
                                        modality: 'standard',
                                        rating: item.standard!,
                                        diff,
                                        x,
                                        y: getY(item.standard!),
                                      });
                                    }}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                  />
                                  {showStdCircle && (
                                    <circle
                                      cx={x}
                                      cy={getY(item.standard)}
                                      r={isStdHovered ? 6 : 4}
                                      className="fill-white stroke-emerald-600 stroke-2 pointer-events-none transition-all"
                                    />
                                  )}
                                </>
                              )}

                            {/* Rapid Dot */}
                            {(selectedModality === 'all' || selectedModality === 'rapid') &&
                              item.rapid && (
                                <>
                                  <circle
                                    cx={x}
                                    cy={getY(item.rapid)}
                                    r={8}
                                    fill="transparent"
                                    className="cursor-pointer"
                                    onMouseEnter={() => {
                                      const diff = prevItem?.rapid ? item.rapid! - prevItem.rapid : null;
                                      setHoveredPoint({
                                        period: item.period,
                                        modality: 'rapid',
                                        rating: item.rapid!,
                                        diff,
                                        x,
                                        y: getY(item.rapid!),
                                      });
                                    }}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                  />
                                  {showRapCircle && (
                                    <circle
                                      cx={x}
                                      cy={getY(item.rapid)}
                                      r={isRapHovered ? 6 : 4}
                                      className="fill-white stroke-sky-600 stroke-2 pointer-events-none transition-all"
                                    />
                                  )}
                                </>
                              )}

                            {/* Blitz Dot */}
                            {(selectedModality === 'all' || selectedModality === 'blitz') &&
                              item.blitz && (
                                <>
                                  <circle
                                    cx={x}
                                    cy={getY(item.blitz)}
                                    r={8}
                                    fill="transparent"
                                    className="cursor-pointer"
                                    onMouseEnter={() => {
                                      const diff = prevItem?.blitz ? item.blitz! - prevItem.blitz : null;
                                      setHoveredPoint({
                                        period: item.period,
                                        modality: 'blitz',
                                        rating: item.blitz!,
                                        diff,
                                        x,
                                        y: getY(item.blitz!),
                                      });
                                    }}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                  />
                                  {showBlzCircle && (
                                    <circle
                                      cx={x}
                                      cy={getY(item.blitz)}
                                      r={isBlzHovered ? 6 : 4}
                                      className="fill-white stroke-amber-500 stroke-2 pointer-events-none transition-all"
                                    />
                                  )}
                                </>
                              )}

                            {/* X-axis Month Label (displayed periodically to prevent clutter) */}
                            {(index % Math.ceil(activeHistory.length / 8) === 0 || index === activeHistory.length - 1) && (
                              <text
                                x={x}
                                y={chartHeight - 12}
                                textAnchor="middle"
                                className="text-[10px] font-mono fill-stone-500"
                              >
                                {item.period}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    {/* Floating Tooltip */}
                    {hoveredPoint && (
                      <div
                        className="absolute pointer-events-none bg-stone-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-stone-700 font-mono z-30 transition-all -translate-x-1/2 -translate-y-full mb-3"
                        style={{
                          left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                          top: `${(hoveredPoint.y / chartHeight) * 100}%`,
                        }}
                      >
                        <div className="flex items-center justify-between gap-3 text-[11px] text-stone-300 font-sans">
                          <span>{hoveredPoint.period}</span>
                          <span className="font-bold uppercase tracking-wider text-amber-300">
                            {hoveredPoint.modality === 'standard' ? 'Clássico' : hoveredPoint.modality === 'rapid' ? 'Rápido' : 'Blitz'}
                          </span>
                        </div>
                        <div className="text-base font-extrabold text-white mt-0.5 flex items-center gap-2">
                          <span>{hoveredPoint.rating}</span>
                          {hoveredPoint.diff !== null && (
                            <span className={`text-xs font-bold ${
                              hoveredPoint.diff > 0 
                                ? 'text-emerald-400' 
                                : hoveredPoint.diff < 0 
                                ? 'text-rose-400' 
                                : 'text-stone-400'
                            }`}>
                              ({hoveredPoint.diff > 0 ? '+' : ''}{hoveredPoint.diff})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Chart Legend & Source Sync Controls */}
            <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Legend */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 font-medium text-stone-700">
                  <span className="w-3 h-1 bg-emerald-600 rounded-full"></span>
                  <span>Clássico (Pensado)</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-stone-700">
                  <span className="w-3 h-1 bg-sky-600 rounded-full"></span>
                  <span>Rápido</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-stone-700">
                  <span className="w-3 h-1 bg-amber-600 rounded-full"></span>
                  <span>Blitz</span>
                </div>
              </div>

              {/* Action Buttons: Sync Online, Table Toggle, HTML Paste */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTableDetails(!showTableDetails)}
                  className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{showTableDetails ? 'Ocultar Tabela' : 'Ver Tabela'}</span>
                  {showTableDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                <button
                  type="button"
                  onClick={handleFetchOnlineHistory}
                  disabled={isLoadingHistory}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                  <span>{isLoadingHistory ? 'Buscando...' : 'Atualizar Online'}</span>
                </button>

                {selectedSource === 'fide' && (
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Importar ou colar tabela profile-table_calc da FIDE"
                  >
                    <Table className="w-3.5 h-3.5 text-amber-700" />
                    <span>Colar Tabela FIDE</span>
                  </button>
                )}

                {selectedSource === 'fide' && player.fideId && (
                  <a
                    href={`https://ratings.fide.com/profile/${player.fideId}/chart`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Ver página oficial de gráfico da FIDE em nova aba"
                  >
                    <span>Gráfico Oficial FIDE</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Status notice */}
            {historySourceStatus && (
              <div className="px-5 py-2.5 bg-blue-50/60 border-t border-blue-100 text-xs text-blue-900 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{historySourceStatus}</span>
                </div>
              </div>
            )}

            {/* Expandable Historical Data Table */}
            {showTableDetails && activeHistory.length > 0 && (
              <div className="border-t border-stone-200 max-h-64 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-stone-100 sticky top-0 border-b border-stone-200 text-[11px] font-bold text-stone-600 uppercase font-mono">
                    <tr>
                      <th className="py-2.5 px-4">Período</th>
                      <th className="py-2.5 px-4 text-emerald-800">
                        {selectedSource === 'fide' ? 'STD. RATING (Clássico)' : 'Clássico'}
                      </th>
                      <th className="py-2.5 px-4 text-sky-800">
                        {selectedSource === 'fide' ? 'RPD (Rápido)' : 'Rápido'}
                      </th>
                      <th className="py-2.5 px-4 text-amber-800">
                        {selectedSource === 'fide' ? 'BLZ (Blitz)' : 'Blitz'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono">
                    {[...activeHistory].reverse().map((row, idx, arr) => {
                      const nextRow = arr[idx + 1];
                      const stdDiff = nextRow && row.standard && nextRow.standard ? row.standard - nextRow.standard : null;
                      const rapDiff = nextRow && row.rapid && nextRow.rapid ? row.rapid - nextRow.rapid : null;
                      const blzDiff = nextRow && row.blitz && nextRow.blitz ? row.blitz - nextRow.blitz : null;

                      return (
                        <tr key={`tbl-${row.period}-${idx}`} className="hover:bg-stone-50 transition-colors">
                          <td className="py-2 px-4 font-bold text-stone-800">{row.period}</td>
                          <td className="py-2 px-4">
                            {row.standard ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="font-bold text-stone-900">{row.standard}</span>
                                {stdDiff !== null && stdDiff !== 0 && (
                                  <span className={`text-[10px] font-bold ${stdDiff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {stdDiff > 0 ? `+${stdDiff}` : stdDiff}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-stone-300">-</span>
                            )}
                          </td>
                          <td className="py-2 px-4">
                            {row.rapid ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="font-bold text-stone-900">{row.rapid}</span>
                                {rapDiff !== null && rapDiff !== 0 && (
                                  <span className={`text-[10px] font-bold ${rapDiff > 0 ? 'text-sky-600' : 'text-rose-600'}`}>
                                    {rapDiff > 0 ? `+${rapDiff}` : rapDiff}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-stone-300">-</span>
                            )}
                          </td>
                          <td className="py-2 px-4">
                            {row.blitz ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="font-bold text-stone-900">{row.blitz}</span>
                                {blzDiff !== null && blzDiff !== 0 && (
                                  <span className={`text-[10px] font-bold ${blzDiff > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                                    {blzDiff > 0 ? `+${blzDiff}` : blzDiff}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-stone-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
              </>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-4 bg-stone-100 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-700">Visualização de Perfil de Enxadrista</span>
            <span>•</span>
            <span>Compatível com FIDE & CBX</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Sub-Modal: Import FIDE Profile Table (profile-table_calc) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-60 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-stone-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                  <Table className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Importar Tabela da FIDE (profile-table_calc)</h3>
                  <p className="text-xs text-stone-400">
                    {player?.name} {player?.fideId ? `(ID FIDE: ${player.fideId})` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Instructions */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-amber-900 text-sm">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Como obter os dados oficiais:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-stone-700">
                  <li>
                    Acesse a página do gráfico oficial:{' '}
                    {player?.fideId ? (
                      <a
                        href={`https://ratings.fide.com/profile/${player.fideId}/chart`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-amber-900 underline hover:text-amber-700"
                      >
                        ratings.fide.com/profile/{player.fideId}/chart
                        <ExternalLink className="w-3 h-3 inline" />
                      </a>
                    ) : (
                      <span className="font-mono">ratings.fide.com/profile/[FIDE_ID]/chart</span>
                    )}
                  </li>
                  <li>Aguarde o navegador renderizar a tabela com classe <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono font-bold text-[11px]">profile-table_calc</code>.</li>
                  <li>
                    Selecione a tabela inteira (ou copie o código HTML da página) e cole na caixa abaixo.
                  </li>
                </ol>
                <div className="pt-1.5 border-t border-amber-200/60 text-[11px] text-amber-900 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                  <span><strong>Col 0:</strong> Período</span>
                  <span><strong>Col 1:</strong> STD Rating</span>
                  <span><strong>Col 3:</strong> RPD (Rápido)</span>
                  <span><strong>Col 5:</strong> BLZ (Blitz)</span>
                </div>
              </div>

              {/* Action Buttons: Paste, Sample, Process */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Clipboard className="w-3.5 h-3.5 text-stone-600" />
                    <span>Colar da Área de Transferência</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadSampleFideData}
                    className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50/50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Carregar Demonstração (ID 22747281)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleProcessImport}
                  className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Processar Tabela</span>
                </button>
              </div>

              {/* Textarea */}
              <div>
                <textarea
                  value={rawTableInput}
                  onChange={(e) => {
                    setRawTableInput(e.target.value);
                    if (e.target.value) {
                      const res = parseFideTableData(e.target.value);
                      if (res.length > 0) {
                        setParsedPreview(res);
                        setImportStatusMessage(`✓ ${res.length} períodos identificados automaticamente!`);
                      }
                    }
                  }}
                  rows={7}
                  placeholder={`Cole aqui o código HTML da tabela (<table class="profile-table_calc">...) ou o texto selecionado diretamente da página FIDE...`}
                  className="w-full text-xs font-mono p-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-y"
                />
              </div>

              {/* Status Message */}
              {importStatusMessage && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  parsedPreview.length > 0 
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                    : 'bg-stone-100 text-stone-800 border border-stone-200'
                }`}>
                  {parsedPreview.length > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-stone-500 shrink-0" />
                  )}
                  <span>{importStatusMessage}</span>
                </div>
              )}

              {/* Parsed Preview Table */}
              {parsedPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                    <span>Prévia dos dados extraídos ({parsedPreview.length} períodos):</span>
                    <span className="text-[11px] text-stone-500 font-mono">
                      Coluna 0, 1, 3 e 5 mapeadas
                    </span>
                  </div>
                  <div className="border border-stone-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-stone-100 sticky top-0 border-b border-stone-200 text-[11px] font-bold text-stone-600 uppercase font-mono">
                        <tr>
                          <th className="py-2 px-3">Período (Col 0)</th>
                          <th className="py-2 px-3 text-emerald-800">Standard (Col 1)</th>
                          <th className="py-2 px-3 text-sky-800">Rápido (Col 3)</th>
                          <th className="py-2 px-3 text-amber-800">Blitz (Col 5)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                        {parsedPreview.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-stone-50">
                            <td className="py-1.5 px-3 font-semibold text-stone-900">{row.period}</td>
                            <td className="py-1.5 px-3 text-emerald-700 font-bold">{row.standard || '-'}</td>
                            <td className="py-1.5 px-3 text-sky-700 font-bold">{row.rapid || '-'}</td>
                            <td className="py-1.5 px-3 text-amber-700 font-bold">{row.blitz || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedPreview.length > 10 && (
                    <p className="text-[11px] text-stone-500 text-center">
                      ... e mais {parsedPreview.length - 10} períodos que serão salvos no histórico.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setRawTableInput('');
                  setParsedPreview([]);
                  setImportStatusMessage(null);
                }}
                className="px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleApplyImportedHistory}
                disabled={parsedPreview.length === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Salvar {parsedPreview.length > 0 ? `(${parsedPreview.length})` : ''} no Histórico e Atualizar Gráfico</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
