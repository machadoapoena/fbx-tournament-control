import React, { useEffect, useState, useMemo } from 'react';
import { HallOfFamePlayer, Tournament } from '../types/chess';
import { 
  X, 
  Trophy, 
  Medal, 
  Calendar, 
  MapPin, 
  Clock, 
  Award,
  Crown,
  Sparkles,
  TrendingUp
} from 'lucide-react';

interface HallOfFameModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: HallOfFamePlayer | null;
  tournaments?: Tournament[];
}

export const HallOfFameModal: React.FC<HallOfFameModalProps> = ({
  isOpen,
  onClose,
  player,
  tournaments,
}) => {
  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !player) return null;

  // Sort placements: 1º places first, then 2º, then 3º, then recent dates
  const sortedPlacements = [...player.placements].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Compute all tournament participations for this player
  const timelineData = useMemo(() => {
    if (!player) return [];

    interface TournamentHistoryItem {
      tournamentName: string;
      startDate: string;
      rank: number;
      points?: number;
      type?: string;
      timeControl?: string;
      city?: string;
      state?: string;
    }

    const map = new Map<string, TournamentHistoryItem>();

    // 1. Gather from all tournaments where standings are available
    if (tournaments && tournaments.length > 0) {
      tournaments.forEach(t => {
        if (!t.standings || t.standings.length === 0) return;
        const st = t.standings.find(s => {
          if (s.playerId && s.playerId === player.id) return true;
          if (s.fideId && player.fideId && s.fideId === player.fideId) return true;
          if (s.cbxId && player.cbxId && s.cbxId === player.cbxId) return true;
          if (s.playerName && player.name && s.playerName.trim().toLowerCase() === player.name.trim().toLowerCase()) return true;
          return false;
        });

        if (st && st.rank !== undefined) {
          const key = `${t.id || t.name}-${t.startDate}`;
          map.set(key, {
            tournamentName: t.name,
            startDate: t.startDate,
            rank: st.rank,
            points: st.points,
            type: t.type,
            timeControl: t.timeControl,
            city: t.city,
            state: t.state,
          });
        }
      });
    }

    // 2. Also ensure all entries from player.placements are included
    (player.placements || []).forEach(plc => {
      const key = `${plc.tournamentId || plc.tournamentName}-${plc.startDate}`;
      if (!map.has(key)) {
        map.set(key, {
          tournamentName: plc.tournamentName,
          startDate: plc.startDate,
          rank: plc.rank,
          points: plc.points,
          type: plc.type,
          timeControl: plc.timeControl,
          city: plc.city,
          state: plc.state,
        });
      }
    });

    // Sort chronologically ascending (oldest to newest)
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }, [player, tournaments]);

  const getRankColor = (rank: number) => {
    if (rank === 1) return { fill: '#f59e0b', stroke: '#d97706', bg: 'bg-amber-100 text-amber-950 border-amber-300', label: '1º Lugar' };
    if (rank === 2) return { fill: '#94a3b8', stroke: '#64748b', bg: 'bg-slate-100 text-slate-900 border-slate-300', label: '2º Lugar' };
    if (rank === 3) return { fill: '#b45309', stroke: '#92400e', bg: 'bg-amber-50 text-amber-900 border-amber-500', label: '3º Lugar' };
    return { fill: '#78716c', stroke: '#57534e', bg: 'bg-stone-100 text-stone-800 border-stone-300', label: `${rank}º Lugar` };
  };

  // Chart Geometry
  const chartWidth = 880;
  const chartHeight = 160;
  const padX = 54;
  const padTop = 32;
  const padBottom = 30;
  const innerWidth = chartWidth - padX * 2;
  const innerHeight = chartHeight - padTop - padBottom;

  const minRank = 1;
  const maxRank = Math.max(3, ...timelineData.map(d => d.rank));

  const yTicks = useMemo(() => {
    if (timelineData.length === 0) return [1, 2, 3];
    const unique = new Set([1, 2, 3]);
    if (maxRank > 3) unique.add(maxRank);
    return Array.from(unique).sort((a, b) => a - b);
  }, [timelineData, maxRank]);

  const getY = (rank: number) => {
    const range = Math.max(1, maxRank - minRank);
    return padTop + ((rank - minRank) / range) * innerHeight;
  };

  const getX = (idx: number) => {
    if (timelineData.length <= 1) return padX + innerWidth / 2;
    return padX + (idx / (timelineData.length - 1)) * innerWidth;
  };

  const linePath = useMemo(() => {
    if (timelineData.length < 2) return '';
    return timelineData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.rank)}`).join(' ');
  }, [timelineData, maxRank]);

  const areaPath = useMemo(() => {
    if (timelineData.length < 2) return '';
    const lastX = getX(timelineData.length - 1);
    const firstX = getX(0);
    const bottomY = chartHeight - padBottom;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [linePath, timelineData]);

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-3xl max-w-4xl sm:max-w-5xl lg:max-w-6xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hall-of-fame-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with decorative ambient gold glow */}
        <div className="relative bg-stone-900 text-white p-6 pb-7 border-b border-stone-800 overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-4 right-4 z-20 p-2.5 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            title="Fechar (ESC)"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5 pointer-events-none" />
          </button>

          <div className="relative z-10 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 shadow-lg shadow-amber-500/20 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>

            <div className="flex-1 pr-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-1.5 font-mono">
                <Crown className="w-3 h-3 text-amber-400" />
                Hall da Fama • Enxadrista
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <h2 
                  id="hall-of-fame-title"
                  className={`text-xl sm:text-2xl font-black tracking-tight ${
                    player.gender === 'F' ? 'text-pink-300' : 'text-white'
                  }`}
                >
                  {player.name}
                </h2>
                {player.title && player.title !== 'Sem Título' && (
                  <span className="px-2 py-0.5 rounded-md text-xs font-mono font-black bg-amber-400 text-stone-950 shadow-2xs">
                    {player.title}
                  </span>
                )}
              </div>

              {/* Badges / Medals Summary */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-800/90 border border-stone-700 text-stone-200 text-xs font-bold font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{player.totalPodiums} {player.totalPodiums === 1 ? 'Pódio' : 'Pódios no total'}</span>
                </div>

                {player.goldCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold font-mono">
                    🥇 {player.goldCount} {player.goldCount === 1 ? 'Ouro' : 'Ouros'}
                  </span>
                )}
                {player.silverCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-300/20 border border-slate-300/40 text-slate-200 text-xs font-bold font-mono">
                    🥈 {player.silverCount} {player.silverCount === 1 ? 'Prata' : 'Pratas'}
                  </span>
                )}
                {player.bronzeCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-700/20 border border-amber-700/40 text-amber-200 text-xs font-bold font-mono">
                    🥉 {player.bronzeCount} {player.bronzeCount === 1 ? 'Bronze' : 'Bronzes'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content: List of podium placements & Timeline Chart */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-stone-50/50">
          {/* Gráfico Minimalista de Colocações nos Torneios */}
          {timelineData.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2.5 border-b border-stone-100">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider font-mono">
                    Histórico de Colocações
                  </h4>
                  <span className="text-[11px] text-stone-400 font-mono">
                    ({timelineData.length} {timelineData.length === 1 ? 'torneio' : 'torneios'})
                  </span>
                </div>

                <div className="text-xs font-mono">
                  {hoveredIdx !== null && timelineData[hoveredIdx] ? (
                    <div className="flex items-center gap-2 animate-in fade-in duration-150">
                      <span className="font-semibold text-stone-800 max-w-[200px] sm:max-w-xs truncate" title={timelineData[hoveredIdx].tournamentName}>
                        {timelineData[hoveredIdx].tournamentName}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${getRankColor(timelineData[hoveredIdx].rank).bg}`}>
                        {getRankColor(timelineData[hoveredIdx].rank).label}
                      </span>
                      <span className="text-stone-500 text-[11px]">
                        {formatDate(timelineData[hoveredIdx].startDate)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-stone-400 text-[11px]">
                      Topo = 1º lugar • Passe nas bolinhas para detalhes
                    </span>
                  )}
                </div>
              </div>

              {/* Responsive SVG Chart */}
              <div className="relative w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-auto select-none overflow-visible"
                >
                  <defs>
                    <linearGradient id="hofRankGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines for ranks */}
                  {yTicks.map((tick) => {
                    const y = getY(tick);
                    return (
                      <g key={`ytick-${tick}`}>
                        <line
                          x1={padX}
                          y1={y}
                          x2={chartWidth - padX}
                          y2={y}
                          stroke="#f0eeee"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                        <text
                          x={padX - 8}
                          y={y + 3.5}
                          textAnchor="end"
                          className="text-[10px] font-mono fill-stone-400 font-bold"
                        >
                          {tick}º
                        </text>
                      </g>
                    );
                  })}

                  {/* Subtle area gradient fill */}
                  {areaPath && <path d={areaPath} fill="url(#hofRankGrad)" />}

                  {/* Line connection */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#d6d3d1"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Bolinhas (dots) */}
                  {timelineData.map((pt, idx) => {
                    const x = getX(idx);
                    const y = getY(pt.rank);
                    const isHovered = hoveredIdx === idx;
                    const rankInfo = getRankColor(pt.rank);

                    return (
                      <g
                        key={`pt-${pt.tournamentName}-${idx}`}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        onClick={() => setHoveredIdx(hoveredIdx === idx ? null : idx)}
                      >
                        {/* Guideline on hover */}
                        {isHovered && (
                          <line
                            x1={x}
                            y1={padTop}
                            x2={x}
                            y2={chartHeight - padBottom}
                            stroke="#f59e0b"
                            strokeWidth="1.5"
                            strokeDasharray="3 3"
                            strokeOpacity="0.7"
                          />
                        )}

                        {/* Large transparent hit area */}
                        <circle cx={x} cy={y} r="18" fill="transparent" />

                        {/* Outer hover halo */}
                        {isHovered && (
                          <circle
                            cx={x}
                            cy={y}
                            r="13"
                            fill={rankInfo.fill}
                            fillOpacity="0.25"
                          />
                        )}

                        {/* Dot circle */}
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? 8 : 6}
                          fill={rankInfo.fill}
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          className="transition-all duration-150 shadow-xs"
                        />

                        {/* Rank placement label above dot */}
                        <text
                          x={x}
                          y={y - 9}
                          textAnchor="middle"
                          className={`text-[9.5px] font-mono transition-colors select-none ${
                            isHovered ? 'fill-stone-950 font-black' : 'fill-stone-600 font-bold'
                          }`}
                        >
                          {pt.rank}º
                        </text>

                        {/* X-axis date underneath */}
                        <text
                          x={x}
                          y={chartHeight - 10}
                          textAnchor="middle"
                          className={`text-[9px] font-mono transition-colors select-none ${
                            isHovered ? 'fill-stone-900 font-bold' : 'fill-stone-400 font-medium'
                          }`}
                        >
                          {formatShortDate(pt.startDate)}
                        </text>

                        {/* Floating Tooltip in SVG right above the hovered dot */}
                        {isHovered && (
                          <g
                            transform={`translate(${Math.max(130, Math.min(chartWidth - 130, x))}, ${Math.max(40, y - 18)})`}
                            pointerEvents="none"
                          >
                            <rect
                              x="-125"
                              y="-36"
                              width="250"
                              height="34"
                              rx="7"
                              fill="#1c1917"
                              stroke="#44403c"
                              strokeWidth="0.8"
                              className="shadow-xl"
                            />
                            <text
                              textAnchor="middle"
                              y="-21"
                              fill="#ffffff"
                              fontSize="10"
                              fontWeight="bold"
                              fontFamily="sans-serif"
                            >
                              {pt.tournamentName.length > 30 ? pt.tournamentName.slice(0, 28) + '...' : pt.tournamentName}
                            </text>
                            <text
                              textAnchor="middle"
                              y="-8"
                              fill="#fbbf24"
                              fontSize="9.5"
                              fontWeight="600"
                              fontFamily="monospace"
                            >
                              {rankInfo.label} • {formatDate(pt.startDate)}{pt.points !== undefined ? ` • ${pt.points} pts` : ''}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-stone-700 font-semibold mb-1 px-1">
            <span>Torneios com Colocação no Pódio (Top 3)</span>
            <span className="font-mono text-stone-700">{sortedPlacements.length} {sortedPlacements.length === 1 ? 'registro' : 'registros'}</span>
          </div>

          {sortedPlacements.length === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-white border border-stone-200 p-6">
              <Trophy className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-stone-700">Nenhum pódio computado</p>
              <p className="text-xs text-stone-500 mt-1">
                As colocações no pódio são registradas através da classificação oficial dos torneios.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {sortedPlacements.map((plc, idx) => {
              const isGold = plc.rank === 1;
              const isSilver = plc.rank === 2;
              const isBronze = plc.rank === 3;

              return (
                <div
                  key={`${plc.tournamentName}-${idx}`}
                  className={`p-4 rounded-2xl border transition-all shadow-2xs ${
                    isGold
                      ? 'bg-gradient-to-r from-amber-50/90 via-white to-amber-50/40 border-amber-300 shadow-amber-500/5'
                      : isSilver
                      ? 'bg-gradient-to-r from-slate-50/90 via-white to-slate-100/40 border-slate-300'
                      : 'bg-gradient-to-r from-orange-50/80 via-white to-amber-50/30 border-amber-700/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {/* Placement Badge */}
                      <div className="mb-2">
                        {isGold ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-stone-950 font-black text-xs shadow-2xs border border-amber-500 font-mono">
                            <span>🥇</span>
                            <span>1º Lugar</span>
                          </span>
                        ) : isSilver ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200 text-slate-900 font-black text-xs shadow-2xs border border-slate-300 font-mono">
                            <span>🥈</span>
                            <span>2º Lugar</span>
                          </span>
                        ) : isBronze ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-700 text-amber-50 font-black text-xs shadow-2xs border border-amber-800 font-mono">
                            <span>🥉</span>
                            <span>3º Lugar</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-800 text-white font-bold text-xs font-mono">
                            <span>Top 3</span>
                          </span>
                        )}
                      </div>

                      {/* Tournament Name */}
                      <h4 className="font-bold text-sm sm:text-base text-stone-900 tracking-tight leading-snug">
                        {plc.tournamentName}
                      </h4>

                      {/* Tournament Meta: Date, City, State, Modality */}
                      <div className="flex items-center gap-x-3 gap-y-1.5 text-xs text-stone-600 flex-wrap mt-2">
                        {plc.startDate && (
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            {formatDate(plc.startDate)}
                          </span>
                        )}

                        {(plc.city || plc.state) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-stone-400" />
                            {[plc.city, plc.state].filter(Boolean).join(', ')}
                          </span>
                        )}

                        {plc.type && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-mono font-semibold text-[11px] uppercase">
                            {plc.type === 'standard' ? 'Standard / Pensado' : plc.type === 'rapid' ? 'Rápido' : 'Blitz'}
                          </span>
                        )}

                        {plc.timeControl && !plc.type && (
                          <span className="inline-flex items-center gap-1 text-stone-500">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            {plc.timeControl}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Points & Score badge */}
                    <div className="text-right shrink-0 bg-white/90 p-2.5 rounded-xl border border-stone-200/90 shadow-2xs">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-600">
                        Pontuação
                      </div>
                      <div className="text-lg font-black font-mono text-stone-900 leading-tight">
                        {plc.points} <span className="text-xs font-semibold text-stone-700">pts</span>
                      </div>
                      {plc.wins !== undefined && plc.wins > 0 && (
                        <div className="text-[10px] font-mono text-stone-700 mt-0.5">
                          {plc.wins} {plc.wins === 1 ? 'vitória' : 'vitórias'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-stone-200 flex items-center justify-between gap-3">
          <div className="text-xs text-stone-700 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Registro oficial de premiação em torneios</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer shadow-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
