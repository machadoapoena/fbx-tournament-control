import React, { useState, useMemo } from 'react';
import { Player } from '../types/chess';
import { calculateAge } from '../lib/exportUtils';
import { AgeGroupPlayersModal } from './AgeGroupPlayersModal';
import { 
  Users, 
  Award, 
  Crown, 
  MapPin, 
  TrendingUp, 
  Calendar, 
  Sparkles,
  ArrowUpRight,
  Eye
} from 'lucide-react';

interface StatsOverviewProps {
  players: Player[];
  onSelectFilter?: (type: 'gender' | 'title' | 'state', value: string) => void;
  onNavigateToPlayers: () => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  players,
  onSelectFilter,
  onNavigateToPlayers,
}) => {
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<{
    id: string;
    label: string;
    desc: string;
    players: Player[];
  } | null>(null);

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
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none hidden md:flex items-center justify-center">
          <svg className="w-96 h-96 fill-white" viewBox="0 0 24 24">
            <path d="M19 22H5V20H19V22M17.16 8.27C17.07 8.04 16.92 7.84 16.71 7.71C16.5 7.57 16.26 7.5 16 7.5H15.5C15.22 7.5 15 7.28 15 7C15 5.9 14.1 5 13 5C12.38 5 11.83 5.28 11.47 5.72L9.41 7.78C9.15 8.04 9 8.39 9 8.76V10.5C9 10.78 8.78 11 8.5 11C8.22 11 8 10.78 8 10.5V7C8 6.45 7.55 6 7 6S6 6.45 6 7V11.23C4.81 12.08 4 13.43 4 15V19H20V15C20 12.33 18.84 9.94 17.16 8.27Z"/>
          </svg>
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-800 text-stone-300 text-xs font-semibold mb-4 border border-stone-700">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Estatísticas & Censo Oficial de Enxadristas
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 font-sans">
            Registro Oficial de Enxadristas
          </h1>
          <p className="text-stone-300 text-sm sm:text-base leading-relaxed mb-6">
            Monitore a base de atletas federados, distribuição demográfica, faixas etárias, mestres internacionais e exporte listagens compatíveis com o <b>Swiss-Manager</b>.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onNavigateToPlayers}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-stone-900 rounded-xl font-bold text-xs sm:text-sm hover:bg-stone-100 transition-colors shadow-sm"
            >
              Consultar Todos os Jogadores
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <div className="text-xs text-stone-400 flex items-center gap-1.5 px-2">
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

      {/* Top Rated Players Spotlight */}
      {stats.topFidePlayers.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-stone-900">Destaques por Rating FIDE</h2>
              <p className="text-xs text-stone-700">Maiores pontuações Elo registradas no sistema</p>
            </div>
            <button
              onClick={onNavigateToPlayers}
              className="text-xs font-semibold text-stone-900 hover:underline inline-flex items-center gap-1"
            >
              Ver todos <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {stats.topFidePlayers.map((player, idx) => (
              <div
                key={player.id || idx}
                className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-white hover:border-stone-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-stone-900 text-white">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-stone-700">
                      {player.state || 'BRA'}
                    </span>
                  </div>
                  <div className={`font-bold text-sm line-clamp-1 ${player.gender === 'F' ? 'text-pink-600' : 'text-stone-900'}`}>
                    {player.name}
                  </div>
                  <div className="text-xs text-stone-700 font-medium">
                    {player.title || 'Sem Título'}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-stone-200 flex items-center justify-between">
                  <span className="text-[11px] text-stone-700 font-medium">Rating FIDE</span>
                  <span className="font-mono font-extrabold text-sm text-stone-900">
                    {player.ratingFide}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
};
