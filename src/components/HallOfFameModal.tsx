import React, { useEffect } from 'react';
import { HallOfFamePlayer } from '../types/chess';
import { 
  X, 
  Trophy, 
  Medal, 
  Calendar, 
  MapPin, 
  Clock, 
  Award,
  Crown,
  Sparkles
} from 'lucide-react';

interface HallOfFameModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: HallOfFamePlayer | null;
}

export const HallOfFameModal: React.FC<HallOfFameModalProps> = ({
  isOpen,
  onClose,
  player,
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="relative bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hall-of-fame-title"
      >
        {/* Header with decorative ambient gold glow */}
        <div className="relative bg-stone-900 text-white p-6 pb-7 border-b border-stone-800 overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
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
                {player.state && (
                  <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-stone-800 text-stone-300 border border-stone-700">
                    {player.state.toUpperCase()}
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

        {/* Content: List of podium placements */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-stone-50/50">
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
            sortedPlacements.map((plc, idx) => {
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
                            <span>1º Lugar • Campeão</span>
                          </span>
                        ) : isSilver ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200 text-slate-900 font-black text-xs shadow-2xs border border-slate-300 font-mono">
                            <span>🥈</span>
                            <span>2º Lugar • Vice-Campeão</span>
                          </span>
                        ) : isBronze ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-700 text-amber-50 font-black text-xs shadow-2xs border border-amber-800 font-mono">
                            <span>🥉</span>
                            <span>3º Lugar • Bronze</span>
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
            })
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
