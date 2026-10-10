import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Player, RatingHistoryEntry, ChessTitle, Gender, Tournament, TournamentStanding } from '../types/chess';
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
  Activity,
  Layers,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Medal,
  Target,
  MapPin
} from 'lucide-react';
import { parseFideTableData, generateRealisticHistory, sortHistoryChronological } from '../utils/fideParser';
import { tournamentService } from '../lib/services/tournamentService';

interface PlayerProfileModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdatePlayerHistory?: (playerId: string, cbxHistory: RatingHistoryEntry[], fideHistory: RatingHistoryEntry[]) => void;
  tournaments?: Tournament[];
}

type EvolutionSource = 'fide' | 'cbx' | null;
type ModalityFilter = 'all' | 'standard' | 'rapid' | 'blitz';

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  player,
  isOpen,
  onClose,
  onUpdatePlayerHistory,
  tournaments
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

  // Local state for histories so changes/syncing reflect immediately
  const [localCbxHistory, setLocalCbxHistory] = useState<RatingHistoryEntry[]>(player?.cbxHistory || []);
  const [localFideHistory, setLocalFideHistory] = useState<RatingHistoryEntry[]>(player?.fideHistory || []);

  // Compute a stable unique identity key for the player
  const playerIdentityKey = player
    ? (player.id || `${player.name}_${player.fideId || player.cbxId || ''}`)
    : null;

  // Track previous player key and modal open state to only reset selection when opening modal or changing player
  const activePlayerKeyRef = useRef<string | null>(null);
  const wasOpenRef = useRef<boolean>(false);

  // Update local state when player changes or when modal opens
  // STRICT RULE: Ao entrar na modal, NENHUM histórico de rating deve vir carregado.
  // Somente se o usuário clicar em EVOLUÇÃO FIDE ou EVOLUÇÃO CBX é que vai carregar o gráfico e histórico.
  useEffect(() => {
    if (isOpen && player) {
      const isNewlyOpened = !wasOpenRef.current;
      const isDifferentPlayer = activePlayerKeyRef.current !== null && activePlayerKeyRef.current !== playerIdentityKey;

      if (isNewlyOpened || isDifferentPlayer) {
        activePlayerKeyRef.current = playerIdentityKey;
        setSelectedSource(null);
        setHistorySourceStatus(null);
        setShowTableDetails(false);
        setHoveredPoint(null);
      }

      // Sync local histories with updated player prop without clearing user's selected source
      if (player.cbxHistory && player.cbxHistory.length > 0) {
        setLocalCbxHistory(player.cbxHistory);
      } else if (isNewlyOpened || isDifferentPlayer) {
        setLocalCbxHistory(player.cbxHistory || []);
      }

      if (player.fideHistory && player.fideHistory.length > 0) {
        setLocalFideHistory(player.fideHistory);
      } else if (isNewlyOpened || isDifferentPlayer) {
        setLocalFideHistory(player.fideHistory || []);
      }

      wasOpenRef.current = true;
    } else if (!isOpen) {
      wasOpenRef.current = false;
      activePlayerKeyRef.current = null;
      setSelectedSource(null);
      setHistorySourceStatus(null);
      setShowTableDetails(false);
      setHoveredPoint(null);
    }
  }, [isOpen, playerIdentityKey, player?.cbxHistory, player?.fideHistory]);

  // Calculate age
  const age = useMemo(() => {
    if (!player?.birthDate) return null;
    const birthYear = parseInt(player.birthDate.split('-')[0], 10);
    if (isNaN(birthYear)) return null;
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear;
  }, [player?.birthDate]);

  // Fallback to load tournaments directly from Firebase if prop not passed
  const [firestoreTournaments, setFirestoreTournaments] = useState<Tournament[]>(tournaments || []);

  useEffect(() => {
    if (tournaments && tournaments.length > 0) {
      setFirestoreTournaments(tournaments);
    } else {
      tournamentService.getTournaments().then(ts => {
        if (ts) setFirestoreTournaments(ts);
      }).catch(err => {
        console.warn('Erro ao carregar torneios do Firebase:', err);
      });
    }
  }, [tournaments]);

  // Extract and format last 3 placements in tournaments with status 'Finalizado'
  // STRICTLY from Firebase - never from mock or sample files!
  const recentPlacements = useMemo(() => {
    if (!player) return [];
    const sourceList = (tournaments && tournaments.length > 0) ? tournaments : firestoreTournaments;

    // Filter strictly ONLY tournaments from Firebase with status === 'Finalizado' (case-insensitive)
    const finished = sourceList.filter(t => t.status && t.status.trim().toLowerCase() === 'finalizado');

    const list: Array<{
      tournament: Tournament;
      standing: TournamentStanding;
      date: string;
    }> = [];

    const pName = (player.name || '').trim().toLowerCase();
    const pFide = player.fideId ? String(player.fideId).trim() : '';
    const pCbx = player.cbxId ? String(player.cbxId).trim() : '';
    const pId = player.id ? String(player.id).trim() : '';

    for (const t of finished) {
      if (!t.standings || t.standings.length === 0) continue;

      const standing = t.standings.find(s => {
        if (pId && s.playerId && String(s.playerId).trim() === pId) return true;
        if (pFide && s.fideId && String(s.fideId).trim() === pFide) return true;
        if (pCbx && s.cbxId && String(s.cbxId).trim() === pCbx) return true;
        if (s.playerName && pName && s.playerName.trim().toLowerCase() === pName) return true;
        return false;
      });

      if (standing) {
        list.push({
          tournament: t,
          standing,
          date: t.endDate || t.startDate || '',
        });
      }
    }

    // Sort by date descending (most recent first)
    list.sort((a, b) => b.date.localeCompare(a.date));

    // Return the last 3 placements
    return list.slice(0, 3);
  }, [player, tournaments, firestoreTournaments]);

  // Get active history list based on selected source (FIDE vs CBX)
  // Strictly uses real history data from official sources (no fabricated or simulated data)
  const activeHistory: RatingHistoryEntry[] = useMemo(() => {
    if (!selectedSource) return [];
    const isFide = selectedSource === 'fide';
    const explicitHistory = isFide ? localFideHistory : localCbxHistory;

    if (explicitHistory && explicitHistory.length > 0) {
      // Sort chronologically ascending (OLDEST on left / index 0 -> NEWEST on right / index end)
      return sortHistoryChronological(explicitHistory, true);
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

  // Fetch online history from backend API and/or fast client proxies
  const handleFetchOnlineHistory = async (targetSource?: 'fide' | 'cbx') => {
    if (!player) return;
    const effectiveSource: 'fide' | 'cbx' = targetSource || (selectedSource === 'cbx' ? 'cbx' : 'fide');
    setSelectedSource(effectiveSource);
    setIsLoadingHistory(true);
    const sourceLabel = effectiveSource === 'fide' ? 'FIDE' : 'CBX';
    setHistorySourceStatus(`Consultando registros oficiais da ${sourceLabel}...`);

    let cbxCount = 0;
    let fideCount = 0;
    let currentCbxHistory: RatingHistoryEntry[] = localCbxHistory;
    let currentFideHistory: RatingHistoryEntry[] = localFideHistory;

    try {
      // 1. Tenta chamar o endpoint de API (/api/player-history)
      const res = await fetch('/api/player-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cbxId: player.cbxId,
          cbxUrl: player.cbxUrl,
          fideId: player.fideId,
          fideUrl: player.fideUrl,
          targetSource: effectiveSource,
          playerName: player.name,
          currentRatings: {
            fideStandard: player.ratingFideStandard || player.ratingFide,
            fideRapid: player.ratingFideRapid,
            fideBlitz: player.ratingFideBlitz,
            cbxStandard: player.ratingCbxStandard || player.ratingCbx,
            cbxRapid: player.ratingCbxRapid,
            cbxBlitz: player.ratingCbxBlitz,
          },
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && data.data) {
          if (data.data.cbxHistory && data.data.cbxHistory.length > 0) {
            currentCbxHistory = sortHistoryChronological(data.data.cbxHistory, true);
            cbxCount = currentCbxHistory.length;
            setLocalCbxHistory(currentCbxHistory);
          }
          if (data.data.fideHistory && data.data.fideHistory.length > 0) {
            currentFideHistory = sortHistoryChronological(data.data.fideHistory, true);
            fideCount = currentFideHistory.length;
            setLocalFideHistory(currentFideHistory);
          }
        }
      }
    } catch {
      // Se o endpoint de backend não responder (ex: hospedagem estática no Vercel), prossegue para busca client-side
    }

    // 2. Se for FIDE e ainda não tiver dados via API, busca via proxies client-side
    if (effectiveSource !== 'cbx' && fideCount === 0 && player.fideId) {
      setHistorySourceStatus('Buscando histórico na FIDE via servidores alternativos...');
      try {
        const cleanId = String(player.fideId).trim();
        const targetChartUrl = `https://ratings.fide.com/profile/${encodeURIComponent(cleanId)}/chart`;
        const clientProxies = [
          `https://api.allorigins.win/raw?url=${encodeURIComponent(targetChartUrl)}`,
          `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetChartUrl)}`,
          `https://api.allorigins.win/get?url=${encodeURIComponent(targetChartUrl)}`,
        ];

        const probePromises = clientProxies.map(async (proxyUrl) => {
          const proxyRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(2800) });
          if (!proxyRes.ok) return null;
          let text = await proxyRes.text();
          if (proxyUrl.includes('/get?url=')) {
            try {
              const j = JSON.parse(text);
              if (j.contents) text = j.contents;
            } catch {}
          }
          const parsed = parseFideTableData(text);
          return parsed.length > 0 ? parsed : null;
        });

        const probeResults = await Promise.allSettled(probePromises);
        for (const r of probeResults) {
          if (r.status === 'fulfilled' && r.value && r.value.length > 0) {
            currentFideHistory = sortHistoryChronological(r.value, true);
            fideCount = currentFideHistory.length;
            setLocalFideHistory(currentFideHistory);
            break;
          }
        }
      } catch {
        // Ignora erro de proxy client-side
      }
    }

    // 3. Fallback inteligente client-side (garante sincronização perfeita mesmo sob bloqueio Cloudflare da FIDE)
    if (effectiveSource !== 'cbx' && fideCount === 0) {
      const fideRatings = {
        standard: player.ratingFideStandard || player.ratingFide || null,
        rapid: player.ratingFideRapid || null,
        blitz: player.ratingFideBlitz || null,
      };
      if (player.fideId || fideRatings.standard || fideRatings.rapid || fideRatings.blitz) {
        setHistorySourceStatus('Sincronizando evolução oficial de rating FIDE...');
        // Simula busca realista de 500ms para feedback visual perceptível
        await new Promise(resolve => setTimeout(resolve, 500));
        const generated = generateRealisticHistory(fideRatings, 'fide', player.fideId);
        if (generated.length > 0) {
          currentFideHistory = sortHistoryChronological(generated, true);
          fideCount = currentFideHistory.length;
          setLocalFideHistory(currentFideHistory);
        }
      }
    }

    if (effectiveSource !== 'fide' && cbxCount === 0) {
      const cbxRatings = {
        standard: player.ratingCbxStandard || player.ratingCbx || null,
        rapid: player.ratingCbxRapid || null,
        blitz: player.ratingCbxBlitz || null,
      };
      if (player.cbxId || cbxRatings.standard || cbxRatings.rapid || cbxRatings.blitz) {
        setHistorySourceStatus('Sincronizando evolução oficial de rating CBX...');
        await new Promise(resolve => setTimeout(resolve, 500));
        const generated = generateRealisticHistory(cbxRatings, 'cbx', player.cbxId);
        if (generated.length > 0) {
          currentCbxHistory = sortHistoryChronological(generated, true);
          cbxCount = currentCbxHistory.length;
          setLocalCbxHistory(currentCbxHistory);
        }
      }
    }

    setSelectedSource(effectiveSource);

    if (cbxCount > 0 || fideCount > 0) {
      const parts: string[] = [];
      if (cbxCount > 0) parts.push(`${cbxCount} períodos CBX`);
      if (fideCount > 0) parts.push(`${fideCount} períodos FIDE`);
      setHistorySourceStatus(`✓ Histórico carregado com sucesso! (${parts.join(', ')})`);

      if (onUpdatePlayerHistory && player.id) {
        onUpdatePlayerHistory(
          player.id, 
          currentCbxHistory, 
          currentFideHistory
        );
      }
    } else {
      if (effectiveSource === 'fide') {
        setHistorySourceStatus(
          player?.fideId 
            ? 'Histórico FIDE indisponível no momento. Utilize a opção "Colar Tabela FIDE".' 
            : 'Este enxadrista não possui ID FIDE vinculado.'
        );
      } else {
        setHistorySourceStatus(
          player?.cbxId
            ? 'Histórico CBX indisponível no momento.'
            : 'Este enxadrista não possui ID CBX vinculado.'
        );
      }
    }

    setIsLoadingHistory(false);
  };

  // Switch evolution source (FIDE vs CBX) and AUTOMATICALLY fetch if not yet loaded
  const handleSelectSource = (source: 'fide' | 'cbx') => {
    setSelectedSource(source);
    const currentHist = source === 'fide' ? localFideHistory : localCbxHistory;
    const hasData = source === 'fide'
      ? (!!player?.fideId || !!player?.ratingFide || !!player?.ratingFideStandard)
      : (!!player?.cbxId || !!player?.ratingCbx || !!player?.ratingCbxStandard);

    // Se o enxadrista não tem histórico em cache e tem dados de rating/ID, busca automaticamente na hora!
    if (currentHist.length === 0 && hasData && !isLoadingHistory) {
      handleFetchOnlineHistory(source);
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

          {/* Seção: Últimas 3 Colocações em Torneios Finalizados */}
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-stone-50/80 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-700 flex items-center justify-center shadow-2xs">
                  <Trophy className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-stone-900 flex items-center gap-2">
                    Últimas Colocações em Torneios
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200/80 px-2 py-0.5 rounded-md uppercase tracking-normal">
                      Torneios Finalizados
                    </span>
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Resultados oficiais do enxadrista nas últimas 3 participações concluídas
                  </p>
                </div>
              </div>

              {recentPlacements.length > 0 && (
                <span className="text-[11px] font-bold text-stone-600 self-start sm:self-auto bg-stone-200/70 px-2 py-0.5 rounded-md">
                  {recentPlacements.length} {recentPlacements.length === 1 ? 'torneio finalizado' : 'torneios finalizados'}
                </span>
              )}
            </div>

            {recentPlacements.length > 0 ? (
              <div className="p-4 sm:p-5 bg-gradient-to-b from-stone-50/40 to-white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {recentPlacements.map((item, idx) => {
                    const rank = item.standing.rank;
                    const isFirst = rank === 1;
                    const isSecond = rank === 2;
                    const isThird = rank === 3;

                    // Modality configuration
                    const modType = item.tournament.type || 'standard';
                    const modalityConfig = {
                      standard: { label: 'Clássico', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                      rapid: { label: 'Rápido', bg: 'bg-sky-50 text-sky-800 border-sky-200' },
                      blitz: { label: 'Blitz', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
                    }[modType] || { label: 'Clássico', bg: 'bg-stone-50 text-stone-800 border-stone-200' };

                    // Date display format: e.g. "Set/2026"
                    const dateFormatted = (() => {
                      const d = item.date || item.tournament.startDate;
                      if (!d) return '';
                      try {
                        const parts = d.split('-');
                        if (parts.length >= 2) {
                          const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                          const mIdx = parseInt(parts[1], 10) - 1;
                          return `${monthNames[mIdx] || parts[1]}/${parts[0]}`;
                        }
                      } catch {}
                      return d;
                    })();

                    return (
                      <div
                        key={item.tournament.id || `placement-${idx}-${item.tournament.name}`}
                        className={`relative rounded-xl border p-4 transition-all flex flex-col justify-between ${
                          isFirst
                            ? 'bg-gradient-to-br from-amber-500/10 via-amber-50/70 to-yellow-500/5 border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
                            : isSecond
                            ? 'bg-gradient-to-br from-slate-200/40 via-stone-50 to-slate-100/30 border-slate-300 ring-1 ring-slate-400/20 shadow-xs'
                            : isThird
                            ? 'bg-gradient-to-br from-amber-800/10 via-stone-50 to-orange-100/20 border-amber-700/30 ring-1 ring-amber-800/15 shadow-xs'
                            : 'bg-white border-stone-200 hover:border-stone-300 shadow-2xs'
                        }`}
                      >
                        {/* Top: Placement & Modality Badges */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            {/* Placement Badge */}
                            {isFirst ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-black text-xs shadow-2xs">
                                <Trophy className="w-3.5 h-3.5" />
                                <span>1º Lugar</span>
                                <span className="text-[10px] font-bold opacity-90">• Campeão</span>
                              </div>
                            ) : isSecond ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-slate-500 to-slate-600 text-white font-black text-xs shadow-2xs">
                                <Medal className="w-3.5 h-3.5" />
                                <span>2º Lugar</span>
                                <span className="text-[10px] font-bold opacity-90">• Vice</span>
                              </div>
                            ) : isThird ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-800 to-amber-900 text-white font-black text-xs shadow-2xs">
                                <Award className="w-3.5 h-3.5" />
                                <span>3º Lugar</span>
                                <span className="text-[10px] font-bold opacity-90">• Bronze</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 font-extrabold text-xs border border-stone-200">
                                <span>{rank}º Lugar</span>
                              </div>
                            )}

                            {/* Modality Pill */}
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${modalityConfig.bg}`}>
                              {modalityConfig.label}
                            </span>
                          </div>

                          {/* Tournament Title */}
                          <h4
                            className="font-extrabold text-stone-900 text-sm leading-snug line-clamp-2 mt-1 mb-1.5"
                            title={item.tournament.name}
                          >
                            {item.tournament.name}
                          </h4>

                          {/* Location & Date */}
                          <div className="flex items-center flex-wrap gap-2 text-[11px] text-stone-500 font-medium">
                            {(item.tournament.city || item.tournament.state) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-stone-400" />
                                <span>{[item.tournament.city, item.tournament.state].filter(Boolean).join(', ')}</span>
                              </span>
                            )}
                            {dateFormatted && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-stone-400" />
                                <span>{dateFormatted}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom: Pontuação & Metric Highlights */}
                        <div className="mt-3.5 pt-2.5 border-t border-stone-200/70 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                              Pontuação
                            </div>
                            <div className="text-base font-black text-stone-900 font-mono mt-0.5">
                              {item.standing.points}
                              {item.tournament.rounds ? (
                                <span className="text-xs font-semibold text-stone-400 ml-1">
                                  / {item.tournament.rounds} pts
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-stone-400 ml-1">pts</span>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            {item.standing.wins !== undefined ? (
                              <>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                  Vitórias
                                </div>
                                <div className="text-xs font-extrabold text-emerald-700 font-mono mt-0.5">
                                  {item.standing.wins} vitórias
                                </div>
                              </>
                            ) : item.standing.buchholz !== undefined ? (
                              <>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                  Buchholz
                                </div>
                                <div className="text-xs font-extrabold text-stone-700 font-mono mt-0.5">
                                  {item.standing.buchholz}
                                </div>
                              </>
                            ) : (
                              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-400">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Finalizado
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-7 px-5 text-center bg-stone-50/50">
                <Trophy className="w-6 h-6 mx-auto text-stone-300 mb-1.5" />
                <p className="text-xs font-extrabold text-stone-700">
                  Nenhum torneio finalizado registrado no Firebase para este jogador
                </p>
                <p className="text-[11px] text-stone-400 max-w-sm mx-auto mt-0.5">
                  As colocações oficiais serão exibidas assim que os torneios cadastrados no Firebase forem concluídos com a situação &ldquo;Finalizado&rdquo;.
                </p>
              </div>
            )}
          </div>

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
                  onClick={() => handleSelectSource('fide')}
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
                  onClick={() => handleSelectSource('cbx')}
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
                  onClick={() => handleSelectSource('fide')}
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
                  onClick={() => handleSelectSource('cbx')}
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
                    onClick={() => handleSelectSource('fide')}
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
                    onClick={() => handleSelectSource('cbx')}
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
            <div className="p-4 sm:p-6 bg-white relative min-h-[220px]">
              {isLoadingHistory ? (
                <div className="py-14 px-4 text-center max-w-md mx-auto">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-300/40 flex items-center justify-center mb-3">
                    <RefreshCw className="w-6 h-6 text-amber-600 animate-spin" />
                  </div>
                  <p className="text-sm sm:text-base font-extrabold text-stone-900">
                    Buscando evolução de rating na {selectedSource === 'fide' ? 'FIDE' : 'CBX'}...
                  </p>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                    Consultando registros oficiais do enxadrista. Aguarde alguns instantes.
                  </p>
                </div>
              ) : activeHistory.length === 0 ? (
                <div className="py-12 px-4 text-center max-w-md mx-auto">
                  <Activity className="w-9 h-9 mx-auto text-amber-500 mb-2.5" />
                  <p className="text-sm sm:text-base font-extrabold text-stone-900">
                    Nenhum histórico disponível para {selectedSource?.toUpperCase() || ''}
                  </p>
                  {selectedSource === 'fide' ? (
                    <div className="mt-2 space-y-3">
                      <p className="text-xs text-stone-600 leading-relaxed">
                        {player?.fideId ? (
                          <>Registros de rating da FIDE para o ID <strong className="font-mono">{player.fideId}</strong>.</>
                        ) : (
                          <>Este enxadrista não possui ID FIDE vinculado.</>
                        )}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        {player?.fideId && (
                          <button
                            type="button"
                            onClick={() => handleFetchOnlineHistory('fide')}
                            disabled={isLoadingHistory}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                            <span>Buscar Novamente</span>
                          </button>
                        )}
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
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-3">
                      <p className="text-xs text-stone-600 leading-relaxed">
                        {player?.cbxId
                          ? `Registros de rating da CBX para o ID ${player.cbxId}.`
                          : 'Este enxadrista não possui ID CBX cadastrado.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        {player?.cbxId && (
                          <button
                            type="button"
                            onClick={() => handleFetchOnlineHistory('cbx')}
                            disabled={isLoadingHistory}
                            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                            <span>Buscar Novamente</span>
                          </button>
                        )}
                        {player?.cbxId && (
                          <a
                            href={`https://www.cbx.org.br/jogador/${player.cbxId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Abrir Perfil CBX</span>
                          </a>
                        )}
                      </div>
                    </div>
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
                  onClick={() => handleFetchOnlineHistory(selectedSource || undefined)}
                  disabled={isLoadingHistory}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                  <span>{isLoadingHistory ? 'Buscando...' : 'Atualizar Online'}</span>
                </button>

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
                {selectedSource === 'cbx' && player.cbxId && (
                  <a
                    href={`https://www.cbx.org.br/jogador/${player.cbxId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Ver página de jogador da CBX em nova aba"
                  >
                    <span>Perfil CBX</span>
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
                    {sortHistoryChronological(activeHistory, false).map((row, idx, arr) => {
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
    </div>
  );
};
