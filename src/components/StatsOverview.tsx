import React, { useState, useMemo } from 'react';
import { Player, Tournament, HallOfFamePlayer, PlayerPodiumPlacement } from '../types/chess';
import { calculateAge } from '../lib/exportUtils';
import { AgeGroupPlayersModal } from './AgeGroupPlayersModal';
import { HallOfFameModal } from './HallOfFameModal';
import { 
  Users, 
  Award, 
  Crown, 
  MapPin, 
  TrendingUp, 
  Calendar, 
  Sparkles, 
  ArrowUpRight, 
  Eye,
  Trophy,
  Medal,
  Star
} from 'lucide-react';

interface StatsOverviewProps {
  players: Player[];
  tournaments?: Tournament[];
  onSelectFilter?: (type: 'gender' | 'title' | 'state', value: string) => void;
  onNavigateToPlayers: () => void;
  onNavigateToTournaments?: () => void;
}

type SpotlightCategory = 'TODOS' | 'SUB10' | 'SUB14' | 'SUB20';
type SpotlightSystem = 'fide' | 'cbx';
type SpotlightModality = 'standard' | 'rapid' | 'blitz';

const getPlayerRating = (player: Player, system: SpotlightSystem, modality: SpotlightModality): number => {
  if (system === 'fide') {
    if (modality === 'standard') return player.ratingFideStandard ?? player.ratingFide ?? 0;
    if (modality === 'rapid') return player.ratingFideRapid ?? 0;
    if (modality === 'blitz') return player.ratingFideBlitz ?? 0;
  } else {
    if (modality === 'standard') return player.ratingCbxStandard ?? player.ratingCbx ?? 0;
    if (modality === 'rapid') return player.ratingCbxRapid ?? 0;
    if (modality === 'blitz') return player.ratingCbxBlitz ?? 0;
  }
  return 0;
};

const getModalityLabel = (modality: SpotlightModality): string => {
  switch (modality) {
    case 'standard': return 'Standard';
    case 'rapid': return 'Rápido';
    case 'blitz': return 'Blitz';
  }
};

const getModalitySublabel = (modality: SpotlightModality): string => {
  switch (modality) {
    case 'standard': return 'Clássico / Pensado';
    case 'rapid': return 'Rápido';
    case 'blitz': return 'Relâmpago';
  }
};

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  players,
  tournaments = [],
  onSelectFilter,
  onNavigateToPlayers,
  onNavigateToTournaments,
}) => {
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<{
    id: string;
    label: string;
    desc: string;
    players: Player[];
  } | null>(null);

  const [spotlightSystem, setSpotlightSystem] = useState<SpotlightSystem>('fide');
  const [spotlightModality, setSpotlightModality] = useState<SpotlightModality>('standard');
  const [spotlightCategory, setSpotlightCategory] = useState<SpotlightCategory>('TODOS');
  const [selectedHallOfFamePlayer, setSelectedHallOfFamePlayer] = useState<HallOfFamePlayer | null>(null);

  // Compute Hall da Fama (players with Top-3 podium finishes exclusively in finished tournaments)
  const hallOfFamePlayers = useMemo<HallOfFamePlayer[]>(() => {
    // Strictly filter tournaments that are finished ('Finalizado')
    const finishedTournaments = (tournaments || []).filter(
      (t) => t.status === 'Finalizado'
    );

    if (finishedTournaments.length === 0) return [];

    const podiumMap = new Map<string, HallOfFamePlayer>();

    finishedTournaments.forEach((tourn) => {
      if (!tourn.standings || tourn.standings.length === 0) return;

      tourn.standings.forEach((st) => {
        // Only top 3 (1º, 2º, 3º lugar) count as podium
        if (!st.rank || st.rank < 1 || st.rank > 3) return;

        // Try matching with player in players list
        const matched = players.find(
          (p) =>
            (p.id && p.id === st.playerId) ||
            (p.fideId && st.fideId && p.fideId === st.fideId) ||
            (p.cbxId && st.cbxId && p.cbxId === st.cbxId) ||
            (p.name.trim().toLowerCase() === st.playerName.trim().toLowerCase())
        );

        const playerId = matched?.id || st.playerId || st.fideId || st.playerName.trim().toLowerCase();
        const playerName = matched?.name || st.playerName;
        const playerTitle = matched?.title || st.title;
        const playerGender = matched?.gender;
        const playerState = matched?.state;
        const playerFideId = matched?.fideId || st.fideId;
        const playerCbxId = matched?.cbxId || st.cbxId;

        const placement: PlayerPodiumPlacement = {
          tournamentId: tourn.id,
          tournamentName: tourn.name,
          startDate: tourn.startDate,
          endDate: tourn.endDate,
          city: tourn.city,
          state: tourn.state,
          type: tourn.type,
          timeControl: tourn.timeControl,
          rank: st.rank,
          points: st.points,
          buchholz: st.buchholz,
          sonnebornBerger: st.sonnebornBerger,
          wins: st.wins,
        };

        if (!podiumMap.has(playerId)) {
          podiumMap.set(playerId, {
            id: playerId,
            name: playerName,
            title: playerTitle,
            gender: playerGender,
            state: playerState,
            fideId: playerFideId,
            cbxId: playerCbxId,
            totalPodiums: 0,
            goldCount: 0,
            silverCount: 0,
            bronzeCount: 0,
            placements: [],
          });
        }

        const entry = podiumMap.get(playerId)!;
        entry.placements.push(placement);
        entry.totalPodiums += 1;
        if (st.rank === 1) entry.goldCount += 1;
        else if (st.rank === 2) entry.silverCount += 1;
        else if (st.rank === 3) entry.bronzeCount += 1;
      });
    });

    return Array.from(podiumMap.values()).sort((a, b) => {
      if (b.totalPodiums !== a.totalPodiums) return b.totalPodiums - a.totalPodiums;
      if (b.goldCount !== a.goldCount) return b.goldCount - a.goldCount;
      if (b.silverCount !== a.silverCount) return b.silverCount - a.silverCount;
      if (b.bronzeCount !== a.bronzeCount) return b.bronzeCount - a.bronzeCount;
      return a.name.localeCompare(b.name);
    });
  }, [tournaments, players]);

  // Top 3 players in Hall of Fame
  const top3HallOfFame = useMemo(() => {
    return hallOfFamePlayers.slice(0, 3);
  }, [hallOfFamePlayers]);

  const spotlightPlayers = useMemo(() => {
    return [...players]
      .filter((p) => {
        const rating = getPlayerRating(p, spotlightSystem, spotlightModality);
        if (rating <= 0) return false;

        if (spotlightCategory === 'TODOS') return true;

        if (!p.birthDate) return false;
        const age = calculateAge(p.birthDate);

        if (spotlightCategory === 'SUB10') {
          return age <= 10;
        }
        if (spotlightCategory === 'SUB14') {
          return age <= 14;
        }
        if (spotlightCategory === 'SUB20') {
          return age <= 20;
        }
        return true;
      })
      .sort((a, b) => getPlayerRating(b, spotlightSystem, spotlightModality) - getPlayerRating(a, spotlightSystem, spotlightModality))
      .slice(0, 5);
  }, [players, spotlightCategory, spotlightSystem, spotlightModality]);

  const hasAnySpotlightPlayers = useMemo(() => {
    return players.some((p) => 
      (p.ratingFideStandard ?? p.ratingFide ?? 0) > 0 ||
      (p.ratingFideRapid ?? 0) > 0 ||
      (p.ratingFideBlitz ?? 0) > 0 ||
      (p.ratingCbxStandard ?? p.ratingCbx ?? 0) > 0 ||
      (p.ratingCbxRapid ?? 0) > 0 ||
      (p.ratingCbxBlitz ?? 0) > 0
    );
  }, [players]);

  // Compute players with most participations in tournaments with status 'Finalizado'
  const mostActivePlayers = useMemo(() => {
    const finishedTournaments = (tournaments || []).filter(
      (t) => t.status === 'Finalizado'
    );

    if (finishedTournaments.length === 0 || players.length === 0) {
      return [];
    }

    // Map to count each player's distinct finished tournaments
    const participationMap = new Map<
      string,
      { player: Player; count: number; tournamentNames: string[] }
    >();

    players.forEach((p) => {
      const key = p.id || p.fideId || p.name;
      participationMap.set(key, { player: p, count: 0, tournamentNames: [] });
    });

    finishedTournaments.forEach((tourn) => {
      const participantKeysInTourn = new Set<string>();

      // 1. From standings
      if (tourn.standings && tourn.standings.length > 0) {
        tourn.standings.forEach((st) => {
          const matched = players.find(
            (p) =>
              (p.id && p.id === st.playerId) ||
              (p.fideId && st.fideId && p.fideId === st.fideId) ||
              (p.cbxId && st.cbxId && p.cbxId === st.cbxId) ||
              (p.name.trim().toLowerCase() === st.playerName.trim().toLowerCase())
          );
          if (matched) {
            participantKeysInTourn.add(matched.id || matched.fideId || matched.name);
          }
        });
      }

      // 2. From participants array
      if (tourn.participants && tourn.participants.length > 0) {
        tourn.participants.forEach((partId) => {
          const matched = players.find(
            (p) =>
              (p.id && p.id === partId) ||
              (p.fideId && p.fideId === partId) ||
              (p.cbxId && p.cbxId === partId) ||
              (p.name.trim().toLowerCase() === partId.trim().toLowerCase())
          );
          if (matched) {
            participantKeysInTourn.add(matched.id || matched.fideId || matched.name);
          }
        });
      }

      participantKeysInTourn.forEach((pKey) => {
        const item = participationMap.get(pKey);
        if (item) {
          item.count += 1;
          item.tournamentNames.push(tourn.name);
        }
      });
    });

    return Array.from(participationMap.values())
      .filter((item) => item.count > 0)
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        const rA = a.player.ratingFideStandard ?? a.player.ratingFide ?? 0;
        const rB = b.player.ratingFideStandard ?? b.player.ratingFide ?? 0;
        return rB - rA;
      })
      .slice(0, 5);
  }, [players, tournaments]);

  const totalFinishedTournaments = useMemo(() => {
    return (tournaments || []).filter((t) => t.status === 'Finalizado').length;
  }, [tournaments]);

  const stats = useMemo(() => {
    const total = players.length;
    if (total === 0) {
      return {
        total: 0,
        men: 0,
        women: 0,
        other: 0,
        menPct: 0,
        womenPct: 0,
        avgAge: 0,
        titledCount: 0,
        gmCount: 0,
        imCount: 0,
        wgmCount: 0,
        ageGroups: {
          sub12: 0,
          sub18: 0,
          adult18to29: 0,
          adult30to49: 0,
          senior50to64: 0,
          veteran65plus: 0,
        },
        titlesDistribution: {} as Record<string, number>,
        stateDistribution: {} as Record<string, number>,
        topFidePlayers: [] as Player[],
      };
    }

    let men = 0;
    let women = 0;
    let other = 0;
    let totalAge = 0;
    let validAgeCount = 0;
    let titledCount = 0;
    let gmCount = 0;
    let imCount = 0;
    let wgmCount = 0;

    const ageGroups = {
      sub12: 0,
      sub18: 0,
      adult18to29: 0,
      adult30to49: 0,
      senior50to64: 0,
      veteran65plus: 0,
    };

    const titlesDistribution: Record<string, number> = {};
    const stateDistribution: Record<string, number> = {};

    players.forEach((p) => {
      // Gender
      if (p.gender === 'M') men++;
      else if (p.gender === 'F') women++;
      else other++;

      // Age
      if (p.birthDate) {
        const age = calculateAge(p.birthDate);
        totalAge += age;
        validAgeCount++;

        if (age < 12) ageGroups.sub12++;
        else if (age < 18) ageGroups.sub18++;
        else if (age <= 29) ageGroups.adult18to29++;
        else if (age <= 49) ageGroups.adult30to49++;
        else if (age <= 64) ageGroups.senior50to64++;
        else ageGroups.veteran65plus++;
      }

      // Titles
      const t = p.title || 'Sem Título';
      titlesDistribution[t] = (titlesDistribution[t] || 0) + 1;
      if (t !== 'Sem Título') titledCount++;
      if (t === 'GM') gmCount++;
      if (t === 'IM') imCount++;
      if (t === 'WGM' || t === 'WIM') wgmCount++;

      // States
      const state = p.state ? p.state.toUpperCase().trim() : 'N/D';
      stateDistribution[state] = (stateDistribution[state] || 0) + 1;
    });

    const menPct = total > 0 ? Math.round((men / total) * 100) : 0;
    const womenPct = total > 0 ? Math.round((women / total) * 100) : 0;
    const avgAge = validAgeCount > 0 ? Math.round((totalAge / validAgeCount) * 10) / 10 : 0;

    const topFidePlayers = [...players]
      .filter((p) => (p.ratingFide || 0) > 0)
      .sort((a, b) => (b.ratingFide || 0) - (a.ratingFide || 0))
      .slice(0, 5);

    return {
      total,
      men,
      women,
      other,
      menPct,
      womenPct,
      avgAge,
      titledCount,
      gmCount,
      imCount,
      wgmCount,
      ageGroups,
      titlesDistribution,
      stateDistribution,
      topFidePlayers,
    };
  }, [players]);

  const maxAgeGroupCount = Math.max(
    ...Object.values(stats.ageGroups),
    1
  );

  const sortedStates = Object.entries(stats.stateDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const titlePriority = ['GM', 'IM', 'FM', 'CM', 'WGM', 'WIM', 'WFM', 'WCM', 'MN', 'NM', 'CMN', 'AGM', 'AIM', 'AFM', 'ACM', 'Sem Título'];

  return (
    <div className="space-y-8">
      {/* Hero Banner / Summary */}
      <div className="relative overflow-hidden bg-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-800 text-stone-300 text-xs font-semibold mb-3 border border-stone-700">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Estatísticas & Censo Oficial de Enxadristas
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 font-sans">
              Registro Oficial de Enxadristas
            </h1>
            <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
              Monitore a base de atletas federados, distribuição demográfica, faixas etárias, mestres internacionais e exporte listagens compatíveis com o <b>Swiss-Manager</b>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
            <button
              onClick={onNavigateToPlayers}
              className="inline-flex items-center gap-2 px-5 py-3 bg-white text-stone-900 rounded-xl font-bold text-sm hover:bg-stone-100 transition-all shadow-md hover:shadow-lg hover:scale-102 cursor-pointer"
            >
              Consultar Todos os Jogadores
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <div className="text-xs text-stone-400 flex items-center gap-1.5 px-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Base de Dados Firebase Sincronizada
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Players */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs hover:border-stone-300 transition-all">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Inscritos</span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-800">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-stone-900 font-sans tracking-tight">
            {stats.total}
          </div>
          <p className="text-xs text-stone-700 mt-1 flex items-center gap-1">
            <span className="font-semibold text-stone-800">{stats.titledCount}</span> enxadristas titulados
          </p>
        </div>

        {/* Gender Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs hover:border-stone-300 transition-all">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Gênero</span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-800">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-stone-900 font-sans">
              {stats.men} <span className="text-xs font-semibold text-stone-700">M</span>
            </span>
            <span className="text-stone-300">/</span>
            <span className="text-2xl font-extrabold text-stone-900 font-sans">
              {stats.women} <span className="text-xs font-semibold text-stone-700">F</span>
            </span>
          </div>
          <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mt-3 flex">
            <div 
              style={{ width: `${stats.menPct}%` }} 
              className="bg-stone-900 h-full" 
              title={`Homens: ${stats.menPct}%`}
            />
            <div 
              style={{ width: `${stats.womenPct}%` }} 
              className="bg-stone-400 h-full" 
              title={`Mulheres: ${stats.womenPct}%`}
            />
          </div>
          <div className="flex justify-between text-[11px] text-stone-700 mt-1 font-mono">
            <span>Homens {stats.menPct}%</span>
            <span>Mulheres {stats.womenPct}%</span>
          </div>
        </div>

        {/* Grandmasters & Masters */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs hover:border-stone-300 transition-all">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Titulados FIDE/CBX</span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-800">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-stone-900 font-sans tracking-tight">
            {stats.titledCount}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-stone-700">
            <span className="px-1.5 py-0.5 rounded bg-stone-100 font-bold text-stone-800">{stats.gmCount} GM</span>
            <span className="px-1.5 py-0.5 rounded bg-stone-100 font-bold text-stone-800">{stats.imCount} IM</span>
            <span className="px-1.5 py-0.5 rounded bg-stone-100 font-bold text-stone-800">{stats.wgmCount} WGM/WIM</span>
          </div>
        </div>

        {/* Average Age */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs hover:border-stone-300 transition-all">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Média de Idade</span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-800">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-stone-900 font-sans tracking-tight">
            {stats.avgAge} <span className="text-sm font-semibold text-stone-700">anos</span>
          </div>
          <p className="text-xs text-stone-700 mt-1">
            Desde a categoria Sub-08 até Veteranos 65+
          </p>
        </div>
      </div>

      {/* Top Rated Players Spotlight */}
      {hasAnySpotlightPlayers && (
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    spotlightSystem === 'fide' ? 'bg-emerald-500' : 'bg-blue-500'
                  } animate-pulse`}
                ></span>
                <h2 className="text-base sm:text-lg font-bold text-stone-900 font-sans">
                  Destaques por Rating {spotlightSystem === 'fide' ? 'FIDE' : 'CBX'} • {getModalityLabel(spotlightModality)}
                </h2>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    spotlightSystem === 'fide'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {spotlightSystem === 'fide' ? 'Internacional' : 'Nacional'}
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                Top 5 maiores pontuações {spotlightSystem === 'fide' ? 'FIDE' : 'CBX'} {getModalityLabel(spotlightModality)} ({getModalitySublabel(spotlightModality)})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Classification System: FIDE vs CBX */}
              <div className="inline-flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setSpotlightSystem('fide')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    spotlightSystem === 'fide'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/70'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      spotlightSystem === 'fide' ? 'bg-white' : 'bg-emerald-500'
                    }`}
                  ></span>
                  FIDE
                </button>
                <button
                  type="button"
                  onClick={() => setSpotlightSystem('cbx')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    spotlightSystem === 'cbx'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/70'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      spotlightSystem === 'cbx' ? 'bg-white' : 'bg-blue-500'
                    }`}
                  ></span>
                  CBX
                </button>
              </div>

              {/* Modality Option: Standard vs Rápido vs Blitz */}
              <div className="inline-flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200/80 shadow-2xs">
                {(['standard', 'rapid', 'blitz'] as const).map((mod) => {
                  const isActive = spotlightModality === mod;
                  const label = mod === 'standard' ? 'Standard' : mod === 'rapid' ? 'Rápido' : 'Blitz';
                  return (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => setSpotlightModality(mod)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-stone-900 text-white shadow-2xs'
                          : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/70'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Category tags: TODOS, SUB10, SUB14, SUB20 */}
              <div className="inline-flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200/80">
                {(['TODOS', 'SUB10', 'SUB14', 'SUB20'] as const).map((cat) => {
                  const isActive = spotlightCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSpotlightCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-stone-900 text-white shadow-2xs'
                          : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/70'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={onNavigateToPlayers}
                className="text-xs font-semibold text-stone-700 hover:text-stone-950 hover:underline inline-flex items-center gap-1 ml-auto sm:ml-0"
              >
                Ver todos <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {spotlightPlayers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {spotlightPlayers.map((player, idx) => {
                const currentRating = getPlayerRating(player, spotlightSystem, spotlightModality);
                const age = player.birthDate ? calculateAge(player.birthDate) : null;
                const fideUrl =
                  player.fideUrl ||
                  (player.fideId ? `https://ratings.fide.com/profile/${player.fideId}` : undefined);
                const cbxUrl =
                  player.cbxUrl ||
                  (player.cbxId ? `https://www.cbx.org.br/jogador/${player.cbxId}` : undefined);

                return (
                  <div
                    key={player.id || idx}
                    className="p-4 rounded-xl border border-stone-200/90 bg-stone-50/60 hover:bg-white hover:border-stone-300 transition-all flex flex-col justify-between shadow-2xs group"
                  >
                    <div>
                      {/* Top bar in card: Rank badge + State & Icon */}
                      <div className="flex items-center justify-between mb-2.5">
                        <span
                          className={`text-[10px] font-mono font-black px-2 py-0.5 rounded shadow-2xs ${
                            idx === 0
                              ? 'bg-amber-400 text-stone-950 border border-amber-500'
                              : idx === 1
                              ? 'bg-stone-300 text-stone-900 border border-stone-400'
                              : idx === 2
                              ? 'bg-amber-700 text-amber-50 border border-amber-800'
                              : 'bg-stone-900 text-stone-100'
                          }`}
                        >
                          #{idx + 1}
                        </span>

                        <div className="flex items-center gap-2">
                          {player.state && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-stone-200/80 text-stone-700">
                              {player.state.toUpperCase()}
                            </span>
                          )}

                          {spotlightSystem === 'fide' && fideUrl && (
                            <a
                              href={fideUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Abrir perfil FIDE oficial de ${player.name} (${player.fideId || ''})`}
                              className="inline-flex items-center hover:scale-110 transition-transform cursor-pointer"
                            >
                              <img
                                src="https://www.fide.com/img/logo1.png"
                                alt="FIDE"
                                width="20"
                                height="20"
                                className="inline-block"
                              />
                            </a>
                          )}

                          {spotlightSystem === 'cbx' && (cbxUrl || player.cbxId) && (
                            <a
                              href={cbxUrl || `https://www.cbx.org.br/jogador/${player.cbxId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Abrir perfil CBX oficial de ${player.name} (${player.cbxId || ''})`}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-blue-100 text-blue-800 border border-blue-200 hover:scale-105 transition-transform cursor-pointer"
                            >
                              CBX {player.cbxId || ''}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Name */}
                      <h3
                        className={`font-bold text-sm line-clamp-1 mb-1 ${
                          player.gender === 'F' ? 'text-pink-700' : 'text-stone-900'
                        }`}
                        title={player.name}
                      >
                        {player.name}
                      </h3>

                      {/* Details: Title & Age */}
                      <div className="flex items-center gap-1.5 text-xs text-stone-600 flex-wrap min-h-[20px]">
                        {player.title && player.title !== 'Sem Título' ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-black bg-stone-800 text-amber-300">
                            {player.title}
                          </span>
                        ) : null}
                        {age !== null ? (
                          <span className="text-[11px] font-mono text-stone-500 font-medium">
                            {age} {age === 1 ? 'ano' : 'anos'}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Footer: Rating Value */}
                    <div className="mt-3.5 pt-2.5 border-t border-stone-200/90 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-tight">
                          {spotlightSystem === 'fide' ? 'FIDE' : 'CBX'} {getModalityLabel(spotlightModality)}
                        </span>
                        <span
                          className={`text-[9px] font-semibold ${
                            spotlightSystem === 'fide' ? 'text-emerald-700' : 'text-blue-700'
                          }`}
                        >
                          {spotlightModality === 'standard'
                            ? (spotlightSystem === 'fide' ? 'Clássico / Internacional' : 'Clássico / Nacional')
                            : getModalitySublabel(spotlightModality)}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center justify-center min-w-[46px] px-2 py-0.5 rounded text-xs font-mono font-bold shadow-2xs ${
                          spotlightSystem === 'fide'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {currentRating}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 px-4 text-center rounded-xl bg-stone-50/70 border border-dashed border-stone-200">
              <p className="text-sm font-semibold text-stone-700">
                Nenhum atleta na categoria{' '}
                <span className="font-mono font-bold">{spotlightCategory}</span> com rating{' '}
                <span className="font-bold">{spotlightSystem === 'fide' ? 'FIDE' : 'CBX'} {getModalityLabel(spotlightModality)}</span> cadastrado.
              </p>
              <p className="text-xs text-stone-500 mt-1">
                {spotlightSystem === 'fide'
                  ? 'Cadastre novos atletas com ID FIDE ou atualize os ratings através da busca online.'
                  : 'Cadastre novos atletas com ID CBX ou atualize os ratings através da busca online.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hall da Fama - Compacto e Elegante (Top 3 em Torneios Finalizados) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shadow-2xs">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900 font-sans">
                  Hall da Fama
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Top 3 • Torneios Finalizados
                </span>
              </div>
              <p className="text-xs text-stone-700 mt-0.5">
                Os 3 maiores medalhistas considerando exclusivamente competições finalizadas no Firebase • Clique para ver detalhes dos pódios
              </p>
            </div>
          </div>

          {top3HallOfFame.length > 0 && (
            <div className="text-xs text-stone-700 font-mono flex items-center gap-1.5 self-start sm:self-auto px-2 py-1 bg-stone-50 rounded-lg border border-stone-200/80">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Top 3 laureados</span>
            </div>
          )}
        </div>

        {top3HallOfFame.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            {top3HallOfFame.map((player, idx) => {
              const isTop1 = idx === 0;
              const isTop2 = idx === 1;
              const isTop3 = idx === 2;

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => setSelectedHallOfFamePlayer(player)}
                  className={`group p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    isTop1
                      ? 'bg-gradient-to-b from-amber-50/80 via-white to-amber-50/30 border-amber-300 hover:border-amber-400 hover:shadow-md'
                      : isTop2
                      ? 'bg-gradient-to-b from-slate-50/80 via-white to-stone-50 border-slate-300 hover:border-slate-400 hover:shadow-md'
                      : 'bg-gradient-to-b from-orange-50/60 via-white to-amber-50/20 border-amber-700/30 hover:border-amber-700/50 hover:shadow-md'
                  }`}
                  title={`Ver histórico de colocações no top 3 de ${player.name}`}
                >
                  <div>
                    {/* Header: Rank Medal Badge */}
                    <div className="flex items-center justify-between gap-1 mb-2.5">
                      {isTop1 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-stone-950 font-black text-xs shadow-2xs border border-amber-500 font-mono">
                          <span>🥇</span>
                          <span>1º Lugar • Ouro</span>
                        </span>
                      ) : isTop2 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200 text-slate-900 font-black text-xs shadow-2xs border border-slate-300 font-mono">
                          <span>🥈</span>
                          <span>2º Lugar • Prata</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-700 text-amber-50 font-black text-xs shadow-2xs border border-amber-800 font-mono">
                          <span>🥉</span>
                          <span>3º Lugar • Bronze</span>
                        </span>
                      )}

                      <span className="text-[10px] font-mono text-stone-700 group-hover:text-stone-950 font-semibold transition-colors">
                        Ver pódios →
                      </span>
                    </div>

                    {/* Nome do jogador */}
                    <h3
                      className={`font-extrabold text-sm sm:text-base line-clamp-1 mb-3 group-hover:text-amber-800 transition-colors ${
                        player.gender === 'F' ? 'text-pink-700' : 'text-stone-900'
                      }`}
                      title={player.name}
                    >
                      {player.name}
                    </h3>
                  </div>

                  {/* Quantidade de pódios */}
                  <div className="flex items-center justify-between pt-3 border-t border-stone-200/80 bg-white/70 px-2 py-1.5 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-stone-700 tracking-wider">
                      Total de Pódios
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300/80 group-hover:bg-amber-400 group-hover:text-stone-950 transition-colors shadow-2xs">
                      <Trophy className="w-3 h-3 text-amber-600 group-hover:text-stone-950" />
                      <span>{player.totalPodiums} {player.totalPodiums === 1 ? 'pódio' : 'pódios'}</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-8 px-4 text-center rounded-xl bg-stone-50/70 border border-dashed border-stone-200">
            <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-4 h-4" />
            </div>
            <p className="text-sm font-semibold text-stone-700">
              Nenhum torneio com status "Finalizado" com pódio registrado no Firebase ainda.
            </p>
            <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
              O Hall da Fama considera exclusivamente competições com status <b className="text-emerald-700">FINALIZADO</b>. Ao concluir e registrar o resultado final de torneios na aba <b>Torneios</b>, os 3 maiores medalhistas aparecerão automaticamente aqui.
            </p>
          </div>
        )}
      </div>

      {/* Ranking de Participação em Torneios Finalizados */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                <Trophy className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 font-sans">
                Jogadores com Mais Participações em Torneios
              </h2>
            </div>
            <p className="text-xs text-stone-600 mt-1">
              Top 5 enxadristas mais assíduos considerando exclusivamente competições com status{' '}
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                FINALIZADO
              </span>{' '}
              ({totalFinishedTournaments} {totalFinishedTournaments === 1 ? 'torneio concluído' : 'torneios concluídos'})
            </p>
          </div>

          {onNavigateToTournaments && (
            <button
              onClick={onNavigateToTournaments}
              className="text-xs font-semibold text-stone-700 hover:text-stone-950 hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer"
            >
              Ver todos os torneios <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {mostActivePlayers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {mostActivePlayers.map((item, idx) => {
              const player = item.player;
              const count = item.count;

              // 1º: Ouro 🥇 | 2º: Prata 🥈 | 3º: Bronze 🥉 | 4º: Destaque 🎖️ | 5º: Destaque ⭐
              const isGold = idx === 0;
              const isSilver = idx === 1;
              const isBronze = idx === 2;
              const isFourth = idx === 3;

              return (
                <div
                  key={player.id || idx}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-2xs relative overflow-hidden group ${
                    isGold
                      ? 'bg-gradient-to-b from-amber-50/90 to-amber-100/40 border-amber-300 hover:border-amber-400 hover:shadow-md'
                      : isSilver
                      ? 'bg-gradient-to-b from-slate-50 to-stone-100/80 border-slate-300 hover:border-slate-400 hover:shadow-md'
                      : isBronze
                      ? 'bg-gradient-to-b from-orange-50/70 to-amber-100/30 border-amber-600/40 hover:border-amber-600/60 hover:shadow-md'
                      : isFourth
                      ? 'bg-gradient-to-b from-indigo-50/40 to-white border-indigo-200/90 hover:border-indigo-300 hover:shadow-md'
                      : 'bg-gradient-to-b from-emerald-50/40 to-white border-emerald-200/90 hover:border-emerald-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      {/* Top Badge: Medal / Highlight label */}
                      <div className="flex items-center justify-between mb-3">
                        {isGold ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-stone-950 font-black text-xs shadow-xs border border-amber-500">
                            <span className="text-sm">🥇</span>
                            <span>1º Lugar • Ouro</span>
                          </div>
                        ) : isSilver ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-300 text-slate-950 font-black text-xs shadow-xs border border-slate-400">
                            <span className="text-sm">🥈</span>
                            <span>2º Lugar • Prata</span>
                          </div>
                        ) : isBronze ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-700 text-amber-50 font-black text-xs shadow-xs border border-amber-800">
                            <span className="text-sm">🥉</span>
                            <span>3º Lugar • Bronze</span>
                          </div>
                        ) : isFourth ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-900 text-indigo-100 font-bold text-xs shadow-xs border border-indigo-950">
                            <span className="text-xs">🎖️</span>
                            <span>4º Lugar • Destaque</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-900 text-emerald-300 font-bold text-xs shadow-xs border border-stone-950">
                            <span className="text-xs">⭐</span>
                            <span>5º Lugar • Destaque</span>
                          </div>
                        )}

                        {player.state && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/80 border border-stone-200/70 text-stone-700">
                            {player.state.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* 1. Nome do Jogador */}
                      <h3
                        className={`font-bold text-sm line-clamp-1 mb-1 ${
                          player.gender === 'F' ? 'text-pink-700' : 'text-stone-900'
                        }`}
                        title={player.name}
                      >
                        {player.name}
                      </h3>

                      {/* 2. Titulação do Jogador */}
                      <div className="flex items-center gap-1.5 text-xs text-stone-600 flex-wrap min-h-[20px] mb-3">
                        {player.title && player.title !== 'Sem Título' ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-black bg-stone-800 text-amber-300">
                            {player.title}
                          </span>
                        ) : (
                          <span className="text-[11px] text-stone-400 font-medium">Sem título</span>
                        )}
                      </div>
                    </div>

                    {/* 3. Número de Torneios Jogados (ABAIXO do nome e titulação) */}
                    <div className="p-2.5 rounded-xl bg-white/95 border border-stone-200/80 shadow-2xs mt-auto">
                      <div className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider">
                        Torneios Jogados
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span
                          className={`text-2xl font-extrabold font-mono ${
                            isGold
                              ? 'text-amber-900'
                              : isSilver
                              ? 'text-slate-900'
                              : isBronze
                              ? 'text-amber-800'
                              : isFourth
                              ? 'text-indigo-950'
                              : 'text-emerald-950'
                          }`}
                        >
                          {count}
                        </span>
                        <span className="text-xs font-semibold text-stone-600">
                          {count === 1 ? 'finalizado' : 'finalizados'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 px-4 text-center rounded-xl bg-stone-50/70 border border-dashed border-stone-200">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-stone-700">
              Nenhum torneio com status "Finalizado" com participantes computados ainda.
            </p>
            <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
              Ao cadastrar e concluir torneios na aba <b>Torneios</b> (marcando como Finalizado), o ranking dos enxadristas mais assíduos será exibido aqui.
            </p>
          </div>
        )}
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Age Groups Histogram Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-stone-900">Distribuição por Faixa Etária</h2>
              <p className="text-xs text-stone-700">Contagem de enxadristas em cada faixa etária oficial</p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 'sub12',
                label: 'Sub-12 (Infantil)',
                count: stats.ageGroups.sub12,
                desc: '< 12 anos',
                filter: (p: Player) => {
                  if (!p.birthDate) return false;
                  const age = calculateAge(p.birthDate);
                  return age < 12;
                },
              },
              {
                id: 'sub18',
                label: 'Sub-18 (Juvenil)',
                count: stats.ageGroups.sub18,
                desc: '12 - 17 anos',
                filter: (p: Player) => {
                  if (!p.birthDate) return false;
                  const age = calculateAge(p.birthDate);
                  return age >= 12 && age < 18;
                },
              },
              {
                id: 'adult18to29',
                label: '18 - 29 Anos (Adulto Jovem)',
                count: stats.ageGroups.adult18to29,
                desc: '18 - 29 anos',
                filter: (p: Player) => {
                  if (!p.birthDate) return false;
                  const age = calculateAge(p.birthDate);
                  return age >= 18 && age <= 29;
                },
              },
              {
                id: 'adult30to49',
                label: '30 - 49 Anos (Absoluto)',
                count: stats.ageGroups.adult30to49,
                desc: '30 - 49 anos',
                filter: (p: Player) => {
                  if (!p.birthDate) return false;
                  const age = calculateAge(p.birthDate);
                  return age >= 30 && age <= 49;
                },
              },
              {
                id: 'senior50to64',
                label: '50 - 64 Anos (Sênior)',
                count: stats.ageGroups.senior50to64,
                desc: '50 - 64 anos',
                filter: (p: Player) => {
                  if (!p.birthDate) return false;
                  const age = calculateAge(p.birthDate);
                  return age >= 50 && age <= 64;
                },
              },
              {
                id: 'veteran65plus',
                label: '65+ Anos (Veterano)',
                count: stats.ageGroups.veteran65plus,
                desc: '65 anos ou mais',
                filter: (p: Player) => {
                  if (!p.birthDate) return false;
                  const age = calculateAge(p.birthDate);
                  return age >= 65;
                },
              },
            ].map((item) => {
              const pct = stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;
              const barWidth = stats.total > 0 ? (item.count / maxAgeGroupCount) * 100 : 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    const groupPlayers = players.filter(item.filter);
                    setSelectedAgeGroup({
                      id: item.id,
                      label: item.label,
                      desc: item.desc,
                      players: groupPlayers,
                    });
                  }}
                  className="w-full text-left p-3 rounded-xl border border-stone-200/90 hover:border-stone-400 bg-stone-50/50 hover:bg-stone-100/70 transition-all group focus:outline-none focus:ring-2 focus:ring-stone-900 cursor-pointer shadow-2xs"
                  title={`Clique para visualizar os jogadores na categoria ${item.label}`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-stone-800 group-hover:text-stone-950 group-hover:underline flex items-center gap-1">
                        {item.label}
                        <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-900 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                      <span className="text-[11px] text-stone-700 font-mono">({item.desc})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-stone-700 font-medium text-xs">
                        <span className="font-bold text-stone-900">{item.count}</span> atletas <span className="text-stone-700">({pct}%)</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white group-hover:bg-stone-900 group-hover:text-white text-stone-700 text-[10px] font-bold transition-colors border border-stone-200 group-hover:border-stone-900 shadow-2xs">
                        <Eye className="w-3 h-3" />
                        Ver lista
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-stone-200/70 h-2.5 rounded-full overflow-hidden p-0.5">
                    <div
                      style={{ width: `${Math.max(barWidth, item.count > 0 ? 4 : 0)}%` }}
                      className="h-full bg-stone-800 rounded-full transition-all duration-500 group-hover:bg-stone-950"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Titles & States Distribution (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Titles Distribution */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">Titulações Registradas</h2>
                <p className="text-xs text-stone-700">Títulos oficiais FIDE e CBX</p>
              </div>
              <Award className="w-4 h-4 text-stone-700" />
            </div>

            <div className="flex flex-wrap gap-2">
              {titlePriority.map((title) => {
                const count = stats.titlesDistribution[title] || 0;
                if (count === 0) return null;
                return (
                  <button
                    key={title}
                    onClick={() => onSelectFilter && onSelectFilter('title', title)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-colors text-xs font-semibold text-stone-800"
                  >
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono ${
                      title === 'GM' ? 'bg-stone-900 text-amber-300 font-black' :
                      title.startsWith('W') ? 'bg-stone-900 text-purple-200 font-bold' :
                      title === 'IM' ? 'bg-stone-800 text-stone-100 font-bold' :
                      'bg-stone-200 text-stone-700'
                    }`}>
                      {title}
                    </span>
                    <span className="font-mono text-stone-900 font-bold">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* States Distribution */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">Federações Estaduais (UF)</h2>
                <p className="text-xs text-stone-700">Atletas por estado de filiação</p>
              </div>
              <MapPin className="w-4 h-4 text-stone-700" />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {sortedStates.map(([uf, count]) => (
                <button
                  key={uf}
                  onClick={() => onSelectFilter && onSelectFilter('state', uf)}
                  className="p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-center transition-colors"
                >
                  <div className="text-xs font-extrabold text-stone-900 font-mono">{uf}</div>
                  <div className="text-[11px] text-stone-700">{count} {count === 1 ? 'atleta' : 'atletas'}</div>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Age Group Athletes Modal */}
      {selectedAgeGroup && (
        <AgeGroupPlayersModal
          isOpen={!!selectedAgeGroup}
          onClose={() => setSelectedAgeGroup(null)}
          groupTitle={selectedAgeGroup.label}
          groupDesc={selectedAgeGroup.desc}
          players={selectedAgeGroup.players}
        />
      )}

      {/* Hall da Fama Modal */}
      {selectedHallOfFamePlayer && (
        <HallOfFameModal
          isOpen={!!selectedHallOfFamePlayer}
          onClose={() => setSelectedHallOfFamePlayer(null)}
          player={selectedHallOfFamePlayer}
        />
      )}
    </div>
  );
};
