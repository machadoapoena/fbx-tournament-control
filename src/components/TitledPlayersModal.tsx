import React, { useState, useMemo, useEffect } from 'react';
import { Player, ChessTitle } from '../types/chess';
import { calculateAge } from '../lib/exportUtils';
import { 
  X, 
  Search, 
  Crown, 
  Award, 
  ExternalLink, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Sparkles,
  Users
} from 'lucide-react';

interface TitledPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  initialTitleFilter?: string | null;
  onViewPlayer?: (player: Player) => void;
}

const TITLE_ORDER: ChessTitle[] = [
  'GM', 
  'IM', 
  'FM', 
  'CM', 
  'WGM', 
  'WIM', 
  'WFM', 
  'WCM', 
  'MN', 
  'NM', 
  'CMN', 
  'AGM', 
  'AIM', 
  'AFM', 
  'ACM'
];

export const getTitleBadgeStyle = (title: string) => {
  switch (title) {
    case 'GM':
      return 'bg-amber-400 text-stone-950 border border-amber-500 shadow-2xs font-black';
    case 'IM':
      return 'bg-stone-900 text-stone-50 border border-stone-800 shadow-2xs font-extrabold';
    case 'WGM':
    case 'WIM':
      return 'bg-purple-900 text-purple-100 border border-purple-800 shadow-2xs font-extrabold';
    case 'WFM':
    case 'WCM':
      return 'bg-purple-800/90 text-purple-100 border border-purple-700 font-bold';
    case 'FM':
      return 'bg-blue-900 text-blue-100 border border-blue-800 font-bold';
    case 'CM':
      return 'bg-sky-800 text-sky-100 border border-sky-700 font-bold';
    case 'MN':
    case 'NM':
    case 'CMN':
      return 'bg-emerald-800 text-emerald-100 border border-emerald-700 font-bold';
    default:
      return 'bg-stone-800 text-stone-200 border border-stone-700 font-bold';
  }
};

export const TitledPlayersModal: React.FC<TitledPlayersModalProps> = ({
  isOpen,
  onClose,
  players,
  initialTitleFilter = null,
  onViewPlayer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTitle, setSelectedTitle] = useState<string>('TODOS');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Set initial filter when opened
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setCurrentPage(1);
      if (initialTitleFilter && initialTitleFilter !== 'Sem Título') {
        setSelectedTitle(initialTitleFilter);
      } else {
        setSelectedTitle('TODOS');
      }
    }
  }, [isOpen, initialTitleFilter]);

  // Reset to page 1 on filter or search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTitle, searchTerm, pageSize]);

  // Filter only players that have a legitimate title
  const allTitledPlayers = useMemo(() => {
    return players.filter(
      (p) => p.title && p.title !== 'Sem Título' && p.title.trim() !== ''
    );
  }, [players]);

  // Extract available title tags from existing titled players only (sorted by chess hierarchy)
  const availableTitleTags = useMemo(() => {
    const counts: Record<string, number> = {};
    allTitledPlayers.forEach((p) => {
      const t = p.title.trim();
      counts[t] = (counts[t] || 0) + 1;
    });

    const presentTitles = Object.keys(counts);

    // Sort according to TITLE_ORDER priority, remainder alphabetically
    presentTitles.sort((a, b) => {
      const idxA = TITLE_ORDER.indexOf(a as ChessTitle);
      const idxB = TITLE_ORDER.indexOf(b as ChessTitle);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return presentTitles.map((t) => ({
      title: t,
      count: counts[t],
    }));
  }, [allTitledPlayers]);

  // Filter players by selected title tag and search term
  const filteredPlayers = useMemo(() => {
    let list = allTitledPlayers;

    // Filter by tag
    if (selectedTitle !== 'TODOS') {
      list = list.filter((p) => p.title.trim() === selectedTitle);
    }

    // Filter by search query
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.title.toLowerCase().includes(term) ||
          (p.fideId && p.fideId.toLowerCase().includes(term)) ||
          (p.cbxId && p.cbxId.toLowerCase().includes(term)) ||
          (p.state && p.state.toLowerCase().includes(term)) ||
          (p.club && p.club.toLowerCase().includes(term))
      );
    }

    // Sort: by title priority first, then standard rating desc, then name
    return [...list].sort((a, b) => {
      const idxA = TITLE_ORDER.indexOf(a.title as ChessTitle);
      const idxB = TITLE_ORDER.indexOf(b.title as ChessTitle);
      const rankA = idxA === -1 ? 999 : idxA;
      const rankB = idxB === -1 ? 999 : idxB;

      if (rankA !== rankB) return rankA - rankB;

      const ratingA = a.ratingFideStandard ?? a.ratingFide ?? a.ratingCbxStandard ?? a.ratingCbx ?? 0;
      const ratingB = b.ratingFideStandard ?? b.ratingFide ?? b.ratingCbxStandard ?? b.ratingCbx ?? 0;
      if (ratingB !== ratingA) return ratingB - ratingA;

      return a.name.localeCompare(b.name);
    });
  }, [allTitledPlayers, selectedTitle, searchTerm]);

  // On-demand pagination calculations
  const totalCount = filteredPlayers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  const paginatedPlayers = useMemo(() => {
    return filteredPlayers.slice(startIndex, endIndex);
  }, [filteredPlayers, startIndex, endIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titled-players-title"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center shadow-sm">
              <Crown className="w-5 h-5 fill-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="modal-titled-players-title" className="text-lg font-bold font-sans text-white">
                  Enxadristas Titulados FIDE / CBX
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-400 text-stone-950">
                  {allTitledPlayers.length} {allTitledPlayers.length === 1 ? 'titulado' : 'titulados'}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Quadro oficial de Grandes Mestres, Mestres Internacionais, Mestres FIDE e Nacionais
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            title="Fechar (ESC)"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tag Filters Bar (Apenas titulações que possuem jogadores cadastrados) */}
        <div className="px-6 py-3 bg-stone-100/90 border-b border-stone-200 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Award className="w-3.5 h-3.5 text-stone-500" />
            Filtrar por Titulação:
          </span>

          {/* Tag: TODOS */}
          <button
            type="button"
            onClick={() => setSelectedTitle('TODOS')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer shadow-2xs ${
              selectedTitle === 'TODOS'
                ? 'bg-stone-900 text-white ring-2 ring-stone-900/30'
                : 'bg-white text-stone-700 hover:bg-stone-200/80 border border-stone-200'
            }`}
          >
            <span>Todos os Titulados</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedTitle === 'TODOS' ? 'bg-stone-800 text-amber-300' : 'bg-stone-100 text-stone-600'
            }`}>
              {allTitledPlayers.length}
            </span>
          </button>

          {/* Tags for each existing Title */}
          {availableTitleTags.map(({ title, count }) => {
            const isSelected = selectedTitle === title;
            return (
              <button
                key={title}
                type="button"
                onClick={() => setSelectedTitle(title)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shadow-2xs ${
                  isSelected
                    ? 'bg-stone-900 text-white ring-2 ring-amber-400'
                    : 'bg-white text-stone-800 hover:bg-stone-200/80 border border-stone-200'
                }`}
              >
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${getTitleBadgeStyle(title)}`}>
                  {title}
                </span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-stone-800 text-amber-300' : 'bg-stone-100 text-stone-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search and Counts Bar */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por nome, ID, UF ou clube..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-stone-700 font-medium flex items-center gap-2">
            <span>
              Exibindo <span className="font-bold text-stone-900">{totalCount > 0 ? startIndex + 1 : 0}-{endIndex}</span> de{' '}
              <span className="font-bold text-stone-900">{totalCount}</span> enxadristas
              {selectedTitle !== 'TODOS' && (
                <span className="ml-1 text-stone-500">
                  (com título <span className="font-mono font-bold text-stone-800">{selectedTitle}</span>)
                </span>
              )}
            </span>
            {totalPages > 1 && (
              <span className="text-stone-400 font-mono text-[11px]">
                (Pág. {validCurrentPage}/{totalPages})
              </span>
            )}
          </div>
        </div>

        {/* Players Content Table */}
        <div className="flex-1 overflow-y-auto">
          {filteredPlayers.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-3">
                <Crown className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">
                Nenhum enxadrista titulado encontrado
              </h3>
              <p className="text-xs text-stone-600 mt-1 max-w-sm mx-auto">
                {searchTerm
                  ? 'Nenhum jogador titulado corresponde ao termo pesquisado.'
                  : selectedTitle !== 'TODOS'
                  ? `Não há enxadristas cadastrados com o título ${selectedTitle}.`
                  : 'Nenhum jogador cadastrado possui titulação FIDE ou CBX.'}
              </p>
              {(searchTerm || selectedTitle !== 'TODOS') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedTitle('TODOS');
                  }}
                  className="mt-3 px-3 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-100/80 text-[11px] font-bold text-stone-600 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                    <th className="py-3 px-4">Titulação & Jogador</th>
                    <th className="py-3 px-3 text-center">UF</th>
                    <th className="py-3 px-3 text-center">Rating FIDE Std</th>
                    <th className="py-3 px-3 text-center">Rating CBX Std</th>
                    <th className="py-3 px-3">ID FIDE</th>
                    <th className="py-3 px-3">ID CBX</th>
                    <th className="py-3 px-3 text-center">Links Oficiais</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginatedPlayers.map((player) => {
                    const fideProfileUrl = player.fideUrl || (player.fideId ? `https://ratings.fide.com/profile/${player.fideId}` : '');
                    const cbxProfileUrl = player.cbxUrl || (player.cbxId ? `https://www.cbx.org.br/jogador/${player.cbxId}` : '');
                    const fideRating = player.ratingFideStandard ?? player.ratingFide ?? 0;
                    const cbxRating = player.ratingCbxStandard ?? player.ratingCbx ?? 0;

                    return (
                      <tr 
                        key={player.id || `${player.title}-${player.name}`} 
                        className="hover:bg-stone-50/80 transition-colors group"
                      >
                        {/* Titulação antes do nome */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Titulação antes do nome */}
                            <span 
                              className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-mono ${getTitleBadgeStyle(player.title)}`}
                              title={`Título oficial: ${player.title}`}
                            >
                              {player.title}
                            </span>

                            {/* Nome do jogador */}
                            <span
                              className={`font-bold text-sm ${
                                player.gender === 'F' ? 'text-pink-700' : 'text-stone-900'
                              } group-hover:text-amber-800 transition-colors`}
                            >
                              {player.name}
                            </span>
                          </div>
                          {player.club && (
                            <div className="text-[11px] text-stone-500 mt-0.5 ml-1">
                              {player.club}
                            </div>
                          )}
                        </td>

                        {/* UF */}
                        <td className="py-3 px-3 text-center">
                          <span className="font-mono text-xs font-bold text-stone-800 px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">
                            {player.state || 'BRA'}
                          </span>
                        </td>

                        {/* Rating FIDE */}
                        <td className="py-3 px-3 text-center font-mono">
                          {fideRating > 0 ? (
                            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {fideRating}
                            </span>
                          ) : (
                            <span className="text-stone-400">-</span>
                          )}
                        </td>

                        {/* Rating CBX */}
                        <td className="py-3 px-3 text-center font-mono">
                          {cbxRating > 0 ? (
                            <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {cbxRating}
                            </span>
                          ) : (
                            <span className="text-stone-400">-</span>
                          )}
                        </td>

                        {/* FIDE ID */}
                        <td className="py-3 px-3 font-mono text-xs text-stone-800">
                          {player.fideId ? (
                            <span className="font-bold">{player.fideId}</span>
                          ) : (
                            <span className="text-stone-400">-</span>
                          )}
                        </td>

                        {/* CBX ID */}
                        <td className="py-3 px-3 font-mono text-xs text-stone-800">
                          {player.cbxId ? (
                            <span className="font-bold">{player.cbxId}</span>
                          ) : (
                            <span className="text-stone-400">-</span>
                          )}
                        </td>

                        {/* Profile Links */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {fideProfileUrl ? (
                              <a
                                href={fideProfileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Abrir perfil oficial FIDE de ${player.title} ${player.name} (${player.fideId || ''})`}
                                className="hover:scale-110 transition-transform cursor-pointer"
                              >
                                <img 
                                  src="https://www.fide.com/img/logo1.png" 
                                  alt="FIDE" 
                                  width="20" 
                                  height="20" 
                                  className="inline-block"
                                />
                              </a>
                            ) : null}

                            {cbxProfileUrl ? (
                              <a
                                href={cbxProfileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Abrir perfil oficial CBX de ${player.title} ${player.name} (${player.cbxId || ''})`}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200 hover:scale-105 transition-transform cursor-pointer"
                              >
                                CBX
                              </a>
                            ) : null}

                            {!fideProfileUrl && !cbxProfileUrl && (
                              <span className="text-xs text-stone-400 font-mono">-</span>
                            )}
                          </div>
                        </td>

                        {/* Ações / Ver Perfil Completo */}
                        <td className="py-3 px-4 text-center">
                          {onViewPlayer ? (
                            <button
                              type="button"
                              onClick={() => onViewPlayer(player)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-700 font-semibold text-xs transition-colors cursor-pointer border border-stone-200 shadow-2xs"
                              title={`Ver perfil completo e histórico de rating de ${player.title} ${player.name}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Perfil</span>
                            </button>
                          ) : (
                            <span className="text-stone-400 font-mono">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Bar (Traz sob demanda com opções de itens por página) */}
        {totalCount > 0 && (
          <div className="px-4 sm:px-6 py-3 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            {/* Left: Range and Items Per Page */}
            <div className="flex items-center gap-3">
              <span className="text-stone-600 font-medium">
                Mostrando <span className="font-bold text-stone-900">{totalCount > 0 ? startIndex + 1 : 0}</span> a{' '}
                <span className="font-bold text-stone-900">{endIndex}</span> de{' '}
                <span className="font-bold text-stone-900">{totalCount}</span> atletas titulados
              </span>

              <div className="flex items-center gap-1.5 border-l border-stone-200 pl-3">
                <span className="text-stone-500 text-[11px]">Por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-stone-900 cursor-pointer shadow-2xs"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Right: Page Navigation Buttons */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {/* First Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={validCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700 transition-colors cursor-pointer"
                  title="Primeira página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Prev Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700 transition-colors cursor-pointer"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Numeric Page Buttons */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((pageNumber) => {
                      return (
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        Math.abs(pageNumber - validCurrentPage) <= 1
                      );
                    })
                    .map((pageNumber, idx, arr) => {
                      const prevPage = arr[idx - 1];
                      const showEllipsis = prevPage && pageNumber - prevPage > 1;

                      return (
                        <React.Fragment key={pageNumber}>
                          {showEllipsis && (
                            <span className="px-1 text-stone-400 font-mono text-xs">...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(pageNumber)}
                            className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                              validCurrentPage === pageNumber
                                ? 'bg-stone-900 text-white shadow-2xs'
                                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
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
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validCurrentPage === totalPages}
                  className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700 transition-colors cursor-pointer"
                  title="Próxima página"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={validCurrentPage === totalPages}
                  className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700 transition-colors cursor-pointer"
                  title="Última página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <div className="text-xs text-stone-600">
            Titulações oficiais reconhecidas pela <b className="text-stone-800">FIDE</b> (Federação Internacional de Xadrez) e pela <b className="text-stone-800">CBX</b> (Confederação Brasileira de Xadrez).
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors shadow-xs cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
