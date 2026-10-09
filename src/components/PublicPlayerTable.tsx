import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Player, Tournament } from '../types/chess';
import { calculateAge, exportPlayersToCSV, exportPlayersToPDF } from '../lib/exportUtils';
import { playerService } from '../lib/services/playerService';
import { FideRatingUpdateModal } from './FideRatingUpdateModal';
import { PlayerProfileModal } from './PlayerProfileModal';
import { 
  Search, 
  ExternalLink, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Filter, 
  CheckSquare, 
  Square, 
  Check, 
  X, 
  Globe, 
  SlidersHorizontal, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Zap, 
  XCircle, 
  Users, 
  Loader2, 
  Database,
  RefreshCw,
  TrendingUp,
  Activity
} from 'lucide-react';

interface PublicPlayerTableProps {
  players: Player[];
  isAdmin?: boolean;
  onOpenSwissModalWithSelected: (selectedPlayerIds: string[]) => void;
  initialFilter?: { type: 'gender' | 'title' | 'state'; value: string } | null;
  onClearInitialFilter?: () => void;
  onViewPlayer?: (player: Player) => void;
  tournaments?: Tournament[];
}

export const PublicPlayerTable: React.FC<PublicPlayerTableProps> = ({
  players: initialPlayersProp,
  isAdmin = false,
  onOpenSwissModalWithSelected,
  initialFilter,
  onClearInitialFilter,
  onViewPlayer,
  tournaments,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTitle, setSelectedTitle] = useState<string>('todos');
  const [selectedGender, setSelectedGender] = useState<string>('todos');
  const [selectedState, setSelectedState] = useState<string>('todos');

  // Player Profile Modal state
  const [internalProfilePlayer, setInternalProfilePlayer] = useState<Player | null>(null);

  const handleViewPlayer = (player: Player) => {
    if (onViewPlayer) {
      onViewPlayer(player);
    } else {
      setInternalProfilePlayer(player);
    }
  };

  // FIDE rating update modal state
  const [isFideUpdateModalOpen, setIsFideUpdateModalOpen] = useState(false);

  // Selection state
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [selectedPlayersMap, setSelectedPlayersMap] = useState<Map<string, Player>>(new Map());

  // Pagination state (defaults to 10 players initially from Firebase)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Firestore Paginated Data & Loading state
  const [paginatedPlayers, setPaginatedPlayers] = useState<Player[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Filter dropdown options (States and Titles)
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [availableTitles, setAvailableTitles] = useState<string[]>([
    'GM', 'IM', 'FM', 'CM', 'WGM', 'WIM', 'WFM', 'WCM', 'MN', 'NM', 'CMN', 'AGM', 'AIM', 'AFM', 'ACM', 'Sem Título'
  ]);

  // Load filter options from Firebase
  useEffect(() => {
    let isMounted = true;
    playerService.getFilterOptions().then((opts) => {
      if (isMounted) {
        if (opts.states.length > 0) setAvailableStates(opts.states);
        if (opts.titles.length > 0) setAvailableTitles(opts.titles);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [initialPlayersProp]);

  // Also collect states from initialPlayersProp if available
  useEffect(() => {
    if (initialPlayersProp && initialPlayersProp.length > 0) {
      const set = new Set<string>(availableStates);
      initialPlayersProp.forEach((p) => {
        if (p.state) set.add(p.state.toUpperCase().trim());
      });
      setAvailableStates(Array.from(set).sort());
    }
  }, [initialPlayersProp]);

  // Apply initial filter if passed from Dashboard/Stats
  useEffect(() => {
    if (initialFilter) {
      if (initialFilter.type === 'title') setSelectedTitle(initialFilter.value);
      if (initialFilter.type === 'gender') setSelectedGender(initialFilter.value);
      if (initialFilter.type === 'state') setSelectedState(initialFilter.value);
    }
  }, [initialFilter]);

  // Reset to page 1 when search or filters change
  const handleFilterChange = (setter: (val: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (val: number) => {
    setItemsPerPage(val);
    setCurrentPage(1);
  };

  // Fetch page from Firebase Firestore according to pagination and filters
  const fetchPageFromFirebase = useCallback(async () => {
    setIsFetching(true);
    try {
      const result = await playerService.fetchPlayersPaginated({
        page: currentPage,
        pageSize: itemsPerPage,
        searchTerm,
        gender: selectedGender,
        title: selectedTitle,
        state: selectedState,
      });

      setPaginatedPlayers(result.players);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('Error fetching players from Firebase:', err);
    } finally {
      setIsFetching(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, selectedGender, selectedTitle, selectedState]);

  // Debounce search/filter fetch to avoid spamming Firestore
  const fetchTimeoutRef = useRef<any>(null);
  useEffect(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Debounce search typing by 250ms, immediate for pagination or dropdowns
    const delay = searchTerm ? 250 : 0;
    fetchTimeoutRef.current = setTimeout(() => {
      fetchPageFromFirebase();
    }, delay);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [fetchPageFromFirebase, searchTerm]);

  // List of selected player objects for tags container
  const selectedPlayers = useMemo(() => {
    return Array.from(selectedPlayersMap.values());
  }, [selectedPlayersMap]);

  // Selection handlers
  const handleToggleSelectPlayer = (player: Player) => {
    const pId = player.id || player.fideId || player.name;
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(pId)) {
        next.delete(pId);
      } else {
        next.add(pId);
      }
      return next;
    });

    setSelectedPlayersMap((prev) => {
      const next = new Map(prev);
      if (next.has(pId)) {
        next.delete(pId);
      } else {
        next.set(pId, player);
      }
      return next;
    });
  };

  const handleRemoveSelectedPlayer = (id: string) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setSelectedPlayersMap((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      paginatedPlayers.forEach((p) => {
        const id = p.id || p.fideId || p.name;
        next.add(id);
      });
      return next;
    });

    setSelectedPlayersMap((prev) => {
      const next = new Map(prev);
      paginatedPlayers.forEach((p) => {
        const id = p.id || p.fideId || p.name;
        next.set(id, p);
      });
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedPlayerIds(new Set());
    setSelectedPlayersMap(new Map());
  };

  const allVisibleSelected =
    paginatedPlayers.length > 0 &&
    paginatedPlayers.every((p) => selectedPlayerIds.has(p.id || p.fideId || p.name));

  const hasSelected = selectedPlayerIds.size > 0;

  // Export handlers with Firestore query support
  const handleExportCSV = async () => {
    if (selectedPlayers.length > 0) {
      exportPlayersToCSV(selectedPlayers, 'jogadores_selecionados.csv');
      return;
    }
    setIsExporting(true);
    try {
      const result = await playerService.fetchPlayersPaginated({
        page: 1,
        pageSize: 10000,
        searchTerm,
        gender: selectedGender,
        title: selectedTitle,
        state: selectedState,
      });
      exportPlayersToCSV(result.players, 'jogadores_xadrez.csv');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (selectedPlayers.length > 0) {
      exportPlayersToPDF(selectedPlayers, 'Jogadores Selecionados');
      return;
    }
    setIsExporting(true);
    try {
      const result = await playerService.fetchPlayersPaginated({
        page: 1,
        pageSize: 10000,
        searchTerm,
        gender: selectedGender,
        title: selectedTitle,
        state: selectedState,
      });
      exportPlayersToPDF(result.players, 'Cadastro Geral de Jogadores de Xadrez');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenSwiss = () => {
    const ids = Array.from(selectedPlayerIds);
    onOpenSwissModalWithSelected(ids);
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedTitle('todos');
    setSelectedGender('todos');
    setSelectedState('todos');
    setCurrentPage(1);
    if (onClearInitialFilter) onClearInitialFilter();
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedTitle !== 'todos' ||
    selectedGender !== 'todos' ||
    selectedState !== 'todos';

  const startIndex = totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, totalCount);

  return (
    <div className="space-y-6">
      {/* Top Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o nome do jogador, ID FIDE, ID CBX ou UF..."
              className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all font-sans"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-900"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Action Export & Update Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Atualizar RATING FIDE Button (Admin Only) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsFideUpdateModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer border border-amber-500/40"
                title="Atualizar Ratings FIDE dos jogadores via arquivo oficial TXT/XML da FIDE"
              >
                <RefreshCw className="w-3.5 h-3.5 text-stone-900" />
                <span>Atualizar RATING FIDE</span>
              </button>
            )}

            <button
              onClick={handleOpenSwiss}
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Swiss-Manager</span>
              {hasSelected && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-[11px] font-mono">
                  {selectedPlayerIds.size}
                </span>
              )}
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Exportar para planilha CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Gerar relatório em PDF"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns & Select All Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Title Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-stone-700 font-medium hidden sm:inline">Título:</span>
              <select
                value={selectedTitle}
                onChange={(e) => handleFilterChange(setSelectedTitle, e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 font-medium focus:outline-none focus:ring-1 focus:ring-stone-900"
              >
                <option value="todos">Todos os Títulos</option>
                {availableTitles.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-stone-700 font-medium hidden sm:inline">Sexo:</span>
              <select
                value={selectedGender}
                onChange={(e) => handleFilterChange(setSelectedGender, e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 font-medium focus:outline-none focus:ring-1 focus:ring-stone-900"
              >
                <option value="todos">Todos os Gêneros</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            {/* State Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-stone-700 font-medium hidden sm:inline">UF:</span>
              <select
                value={selectedState}
                onChange={(e) => handleFilterChange(setSelectedState, e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 font-medium focus:outline-none focus:ring-1 focus:ring-stone-900"
              >
                <option value="todos">Todos os Estados</option>
                {availableStates.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="text-stone-700 hover:text-stone-900 underline ml-1 font-medium cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Selection Controls */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={allVisibleSelected ? handleClearSelection : handleSelectAllVisible}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium transition-colors cursor-pointer"
            >
              {allVisibleSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-stone-900" />
              ) : (
                <Square className="w-3.5 h-3.5 text-stone-600" />
              )}
              <span>{allVisibleSelected ? 'Desmarcar Todos' : 'Selecionar Visíveis'}</span>
            </button>

            {hasSelected && (
              <span className="text-stone-700 font-mono font-semibold">
                {selectedPlayerIds.size} selecionado(s)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Selected Players Tags Panel */}
      {selectedPlayers.length > 0 && (
        <div className="bg-stone-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-stone-800 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">
                  Jogadores Selecionados
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-mono font-bold">
                  {selectedPlayers.length} {selectedPlayers.length === 1 ? 'enxadrista' : 'enxadristas'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearSelection}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-rose-950/70 hover:text-rose-300 hover:border-rose-800/80 text-stone-300 text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
                title="Desmarcar todos os jogadores selecionados"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Desmarcar todos</span>
              </button>
            </div>
          </div>

          {/* Tags List Container */}
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
            {selectedPlayers.map((player) => {
              const pId = player.id || player.fideId || player.name;
              return (
                <div
                  key={pId}
                  className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl bg-stone-800/90 border border-stone-700/90 hover:border-stone-500 shadow-2xs group transition-all"
                >
                  {player.title && player.title !== 'Sem Título' && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-extrabold bg-stone-700 text-amber-300">
                      {player.title}
                    </span>
                  )}
                  <span
                    className={`text-xs font-semibold max-w-[180px] sm:max-w-[240px] truncate ${
                      player.gender === 'F' ? 'text-pink-300 font-bold' : 'text-stone-100'
                    }`}
                  >
                    {player.name}
                  </span>
                  {player.state && (
                    <span className="text-[10px] font-mono text-stone-400 bg-stone-900/80 px-1.5 py-0.5 rounded">
                      {player.state}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveSelectedPlayer(pId)}
                    className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-rose-600 transition-colors ml-0.5 cursor-pointer"
                    title={`Desmarcar ${player.name}`}
                    aria-label={`Desmarcar ${player.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Players List / Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        
        {/* Table Header Info Bar */}
        <div className="px-6 py-3.5 bg-stone-50/80 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-700">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Mostrando <span className="font-bold text-stone-900">{totalCount > 0 ? startIndex : 0}</span> a <span className="font-bold text-stone-900">{endIndex}</span> de <span className="font-bold text-stone-900">{totalCount}</span> jogadores
            </span>
            {isFetching ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                <span>Buscando no Firebase...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                <Database className="w-3 h-3 text-emerald-600" />
                <span>Firebase Sincronizado</span>
              </span>
            )}
            {isExporting && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-semibold">
                <Loader2 className="w-3 h-3 animate-spin text-sky-600" />
                <span>Preparando exportação...</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-stone-600 font-medium">Exibir por página:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 cursor-pointer shadow-2xs"
              >
                <option value={5}>5 por página</option>
                <option value={10}>10 por página</option>
                <option value={15}>15 por página</option>
                <option value={20}>20 por página</option>
              </select>
            </div>
          </div>
        </div>

        {paginatedPlayers.length === 0 && !isFetching ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-600 mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900">Nenhum jogador encontrado</h3>
            <p className="text-xs text-stone-700 mt-1 max-w-sm mx-auto">
              Não encontramos nenhum jogador correspondente aos filtros de pesquisa informados no Firebase.
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="mt-4 px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Limpar todos os filtros
              </button>
            )}
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-100/60 text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={allVisibleSelected ? handleClearSelection : handleSelectAllVisible}
                      aria-label="Selecionar todos os jogadores visíveis nesta página"
                      className="rounded border-stone-300 text-stone-900 focus:ring-stone-900 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Jogador / Nome</th>
                  <th className="py-3 px-3 text-center">Título</th>
                  <th className="py-3 px-3 text-center">Nasc.</th>
                  <th className="py-3 px-3 text-center">Sexo</th>
                  <th className="py-3 px-3 text-center">UF</th>
                  <th className="py-3 px-3">IDs</th>
                  <th className="py-3 px-3">FIDE</th>
                  <th className="py-3 px-3">CBX</th>
                  <th className="py-3 px-3 text-center w-28">Evolução / Perfis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {paginatedPlayers.map((player) => {
                  const pId = player.id || player.fideId || player.name;
                  const isSelected = selectedPlayerIds.has(pId);
                  const age = calculateAge(player.birthDate);

                  const stdFide = player.ratingFideStandard || player.ratingFide || 0;
                  const rapFide = player.ratingFideRapid || 0;
                  const blzFide = player.ratingFideBlitz || 0;

                  const stdCbx = player.ratingCbxStandard || player.ratingCbx || 0;
                  const rapCbx = player.ratingCbxRapid || 0;
                  const blzCbx = player.ratingCbxBlitz || 0;

                  return (
                    <tr
                      key={pId}
                      className={`hover:bg-stone-50/80 transition-colors ${
                        isSelected ? 'bg-stone-50/90' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectPlayer(player)}
                          aria-label={`Selecionar jogador ${player.name}`}
                          className="rounded border-stone-300 text-stone-900 focus:ring-stone-900 cursor-pointer"
                        />
                      </td>

                      {/* Name - Clickable to open Profile & Rating Evolution Modal */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleViewPlayer(player)}
                          className={`font-bold flex items-center gap-1.5 text-left group hover:underline cursor-pointer transition-colors ${
                            player.gender === 'F' ? 'text-pink-600 hover:text-pink-700' : 'text-stone-900 hover:text-emerald-700'
                          }`}
                          title={`Ver perfil e gráfico de evolução de rating de ${player.name}`}
                        >
                          <span>{player.name}</span>
                          <TrendingUp className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-600 transition-colors opacity-70 group-hover:opacity-100" />
                        </button>
                      </td>

                      {/* Title */}
                      <td className="py-3.5 px-3 text-center">
                        {player.title && player.title !== 'Sem Título' ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-extrabold ${
                              player.title === 'GM'
                                ? 'bg-stone-900 text-amber-300 shadow-xs'
                                : player.title.startsWith('W')
                                ? 'bg-purple-900 text-purple-200'
                                : player.title === 'IM'
                                ? 'bg-stone-800 text-white'
                                : player.title.startsWith('A')
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                : player.title === 'CMN' || player.title === 'MN'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : 'bg-stone-200 text-stone-800'
                            }`}
                          >
                            {player.title}
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400 font-mono">-</span>
                        )}
                      </td>

                      {/* Age / Birth */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="font-semibold text-stone-900 text-xs font-mono">
                          {age > 0 ? `${age}a` : '-'}
                        </div>
                        <div className="text-[10px] text-stone-700 font-mono">
                          {player.birthDate
                            ? player.birthDate.split('-').reverse().join('/')
                            : '-'}
                        </div>
                      </td>

                      {/* Gender */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold font-mono ${
                            player.gender === 'F'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : player.gender === 'M'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {player.gender === 'F' ? 'F' : player.gender === 'M' ? 'M' : 'Outro'}
                        </span>
                      </td>

                      {/* State UF */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono text-xs font-bold text-stone-800 px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">
                          {player.state || 'BRA'}
                        </span>
                      </td>

                      {/* IDs */}
                      <td className="py-3.5 px-3 font-mono text-xs text-stone-700">
                        {player.fideId ? <div><span className="text-[10px] text-stone-600 font-sans">F:</span> {player.fideId}</div> : null}
                        {player.cbxId ? <div><span className="text-[10px] text-stone-600 font-sans">C:</span> {player.cbxId}</div> : null}
                        {!player.fideId && !player.cbxId && <span className="text-stone-600">-</span>}
                      </td>

                      {/* Ratings FIDE (Standard / Rapid / Blitz) */}
                      <td className="py-3.5 px-3 font-mono text-xs">
                        <div className="flex items-center gap-1">
                          {/* Standard */}
                          <span
                            className={`inline-flex items-center justify-center min-w-[40px] px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              stdFide > 0
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs'
                                : 'bg-stone-100/70 text-stone-400 border border-stone-200/60 font-normal'
                            }`}
                            title={`FIDE Standard (Pensado / Clássico): ${stdFide > 0 ? stdFide : 'Sem rating'}`}
                          >
                            {stdFide > 0 ? stdFide : '-'}
                          </span>

                          {/* Rapid */}
                          <span
                            className={`inline-flex items-center justify-center min-w-[40px] px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              rapFide > 0
                                ? 'bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs'
                                : 'bg-stone-100/70 text-stone-400 border border-stone-200/60 font-normal'
                            }`}
                            title={`FIDE Rapid (Rápido): ${rapFide > 0 ? rapFide : 'Sem rating'}`}
                          >
                            {rapFide > 0 ? rapFide : '-'}
                          </span>

                          {/* Blitz */}
                          <span
                            className={`inline-flex items-center justify-center min-w-[40px] px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              blzFide > 0
                                ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs'
                                : 'bg-stone-100/70 text-stone-400 border border-stone-200/60 font-normal'
                            }`}
                            title={`FIDE Blitz (Relâmpago): ${blzFide > 0 ? blzFide : 'Sem rating'}`}
                          >
                            {blzFide > 0 ? blzFide : '-'}
                          </span>
                        </div>
                      </td>

                      {/* Ratings CBX (Standard / Rapid / Blitz) */}
                      <td className="py-3.5 px-3 font-mono text-xs">
                        <div className="flex items-center gap-1">
                          {/* Standard */}
                          <span
                            className={`inline-flex items-center justify-center min-w-[40px] px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              stdCbx > 0
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs'
                                : 'bg-stone-100/70 text-stone-400 border border-stone-200/60 font-normal'
                            }`}
                            title={`CBX Standard (Pensado / Clássico): ${stdCbx > 0 ? stdCbx : 'Sem rating'}`}
                          >
                            {stdCbx > 0 ? stdCbx : '-'}
                          </span>

                          {/* Rapid */}
                          <span
                            className={`inline-flex items-center justify-center min-w-[40px] px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              rapCbx > 0
                                ? 'bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs'
                                : 'bg-stone-100/70 text-stone-400 border border-stone-200/60 font-normal'
                            }`}
                            title={`CBX Rapid (Rápido): ${rapCbx > 0 ? rapCbx : 'Sem rating'}`}
                          >
                            {rapCbx > 0 ? rapCbx : '-'}
                          </span>

                          {/* Blitz */}
                          <span
                            className={`inline-flex items-center justify-center min-w-[40px] px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              blzCbx > 0
                                ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs'
                                : 'bg-stone-100/70 text-stone-400 border border-stone-200/60 font-normal'
                            }`}
                            title={`CBX Blitz (Relâmpago): ${blzCbx > 0 ? blzCbx : 'Sem rating'}`}
                          >
                            {blzCbx > 0 ? blzCbx : '-'}
                          </span>
                        </div>
                      </td>

                      {/* Evolution & Profiles Links */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Dedicated Rating Evolution Chart Button */}
                          <button
                            type="button"
                            onClick={() => handleViewPlayer(player)}
                            className="p-1 rounded-lg bg-stone-100 hover:bg-emerald-50 text-stone-600 hover:text-emerald-700 border border-stone-200 hover:border-emerald-300 transition-colors cursor-pointer shadow-2xs"
                            title={`Abrir perfil e gráfico de evolução de rating (FIDE & CBX) de ${player.name}`}
                          >
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          </button>

                          {player.fideUrl || player.fideId ? (
                            <a
                              href={player.fideUrl || `https://ratings.fide.com/profile/${player.fideId}`}
                              target="_blank"
                              rel="noreferrer"
                              title={`Abrir perfil FIDE oficial de ${player.name} (${player.fideId || ''})`}
                              className="p-0.5 hover:opacity-80 transition-opacity"
                            >
                              <span>
                                <img src="https://www.fide.com/img/logo1.png" width="22" alt="FIDE" />
                              </span>
                            </a>
                          ) : null}

                          {player.cbxUrl || player.cbxId ? (
                            <a
                              href={player.cbxUrl || `https://www.cbx.org.br/jogador/${player.cbxId}`}
                              target="_blank"
                              rel="noreferrer"
                              title={`Abrir perfil CBX oficial de ${player.name} (${player.cbxId || ''})`}
                              className="p-0.5 hover:opacity-80 transition-opacity"
                            >
                              <span>
                                <img src="https://cbx.org.br/files/textos/003659/000965.jpg" width="22" alt="CBX" className="rounded-xs" />
                              </span>
                            </a>
                          ) : null}

                          {!player.fideUrl && !player.fideId && !player.cbxUrl && !player.cbxId && (
                            <span className="text-xs text-stone-400 font-mono">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bottom Bar */}
        {totalCount > 0 && (
          <div className="px-6 py-4 bg-stone-50/70 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-stone-700">
              <span>
                Página <strong className="text-stone-900 font-bold">{currentPage}</strong> de <strong className="text-stone-900 font-bold">{totalPages}</strong>
              </span>
              <span className="text-stone-300">•</span>
              <span>
                Total de <strong className="text-stone-900 font-bold">{totalCount}</strong> enxadristas no Firebase
              </span>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1.5">
              {/* First Page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || isFetching}
                className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700 transition-colors cursor-pointer"
                title="Primeira página"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Prev Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isFetching}
                className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700 transition-colors cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((pageNumber) => {
                    return (
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      Math.abs(pageNumber - currentPage) <= 1
                    );
                  })
                  .map((pageNumber, idx, arr) => {
                    const prevPage = arr[idx - 1];
                    const showEllipsis = prevPage && pageNumber - prevPage > 1;

                    return (
                      <React.Fragment key={pageNumber}>
                        {showEllipsis && (
                          <span className="px-1 text-stone-600 text-xs">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(pageNumber)}
                          disabled={isFetching}
                          className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            currentPage === pageNumber
                              ? 'bg-stone-900 text-white shadow-xs'
                              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-60'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              {/* Next Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || isFetching}
                className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700 transition-colors cursor-pointer"
                title="Próxima página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last Page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || isFetching}
                className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700 transition-colors cursor-pointer"
                title="Última página"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend of Rating Modalities below Table */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-stone-900"></div>
          <span className="font-bold text-stone-900">Legenda das Modalidades de Rating (FIDE / CBX):</span>
        </div>

        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
              Std
            </span>
            <span className="text-stone-700 font-medium">Standard / Pensado (Clássico)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs">
              Rap
            </span>
            <span className="text-stone-700 font-medium">Rápido (Rapid)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
              Blz
            </span>
            <span className="text-stone-700 font-medium">Relâmpago (Blitz)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded text-[11px] font-mono font-normal bg-stone-100/70 text-stone-400 border border-stone-200/60">
              -
            </span>
            <span className="text-stone-500">Sem rating cadastrado</span>
          </div>
        </div>
      </div>

      {/* FIDE Rating Update Modal */}
      <FideRatingUpdateModal
        isOpen={isFideUpdateModalOpen}
        onClose={() => setIsFideUpdateModalOpen(false)}
        onSuccess={() => {
          fetchPageFromFirebase();
        }}
      />

      {/* Player Profile & Rating Evolution Modal */}
      <PlayerProfileModal
        player={internalProfilePlayer}
        isOpen={!!internalProfilePlayer}
        onClose={() => setInternalProfilePlayer(null)}
        tournaments={tournaments}
      />
    </div>
  );
};
