import React, { useState, useMemo, useEffect } from 'react';
import { Player } from '../types/chess';
import { calculateAge } from '../lib/exportUtils';
import { 
  X, 
  Search, 
  ExternalLink, 
  Calendar, 
  Users, 
  Award, 
  Globe,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

interface AgeGroupPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupTitle: string;
  groupDesc: string;
  players: Player[];
}

export const AgeGroupPlayersModal: React.FC<AgeGroupPlayersModalProps> = ({
  isOpen,
  onClose,
  groupTitle,
  groupDesc,
  players,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  // Reset search and pagination when opening
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setCurrentPage(1);
    }
  }, [isOpen, groupTitle]);

  // Reset to page 1 on filter or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const filteredPlayers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return players;
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.fideId && p.fideId.toLowerCase().includes(term)) ||
        (p.cbxId && p.cbxId.toLowerCase().includes(term)) ||
        (p.state && p.state.toLowerCase().includes(term)) ||
        (p.club && p.club.toLowerCase().includes(term)) ||
        (p.title && p.title.toLowerCase().includes(term))
    );
  }, [players, searchTerm]);

  // Pagination calculations
  const totalCount = filteredPlayers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  const paginatedPlayers = useMemo(() => {
    return filteredPlayers.slice(startIndex, endIndex);
  }, [filteredPlayers, startIndex, endIndex]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Não informada';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-sans text-white">
                  {groupTitle}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-800 text-stone-300 border border-stone-700">
                  {groupDesc}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {players.length} {players.length === 1 ? 'enxadrista registrado' : 'enxadristas registrados'} nesta faixa etária
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            title="Fechar (ESC)"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Stats Bar */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por nome, ID, UF ou clube..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-stone-700 font-medium flex items-center gap-2">
            <span>
              Exibindo <span className="font-bold text-stone-900">{totalCount > 0 ? startIndex + 1 : 0}-{endIndex}</span> de{' '}
              <span className="font-bold text-stone-900">{totalCount}</span> atletas
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
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">
                Nenhum jogador encontrado
              </h3>
              <p className="text-xs text-stone-700 mt-1 max-w-sm mx-auto">
                {searchTerm
                  ? 'Nenhum atleta nesta categoria corresponde ao termo pesquisado.'
                  : 'Não há enxadristas cadastrados com data de nascimento correspondente a esta faixa etária.'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-3 px-3 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800 transition-colors"
                >
                  Limpar busca
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-100/75 text-[11px] font-bold text-stone-600 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                    <th className="py-3 px-4">Jogador / Nome</th>
                    <th className="py-3 px-3 text-center">Título</th>
                    <th className="py-3 px-3 text-center">Idade</th>
                    <th className="py-3 px-3 text-center">Data Nascimento</th>
                    <th className="py-3 px-3 text-center">UF</th>
                    <th className="py-3 px-3">ID FIDE</th>
                    <th className="py-3 px-3">ID CBX</th>
                    <th className="py-3 px-4 text-center">Links Oficiais</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginatedPlayers.map((player) => {
                    const age = calculateAge(player.birthDate);
                    const fideProfileUrl = player.fideUrl || (player.fideId ? `https://ratings.fide.com/profile/${player.fideId}` : '');
                    const cbxProfileUrl = player.cbxUrl || (player.cbxId ? `https://www.cbx.org.br/jogador/${player.cbxId}` : '');

                    return (
                      <tr key={player.id || player.name} className="hover:bg-stone-50/80 transition-colors">
                        {/* Player Name */}
                        <td className="py-3 px-4">
                          <div className={`font-bold text-sm ${player.gender === 'F' ? 'text-pink-600 font-semibold' : 'text-stone-900'}`}>
                            {player.name}
                          </div>
                        </td>

                        {/* Title */}
                        <td className="py-3 px-3 text-center">
                          {player.title && player.title !== 'Sem Título' ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-extrabold ${
                              player.title === 'GM'
                                ? 'bg-stone-900 text-amber-300 shadow-xs'
                                : player.title.startsWith('W')
                                ? 'bg-purple-900 text-purple-200'
                                : player.title === 'IM'
                                ? 'bg-stone-800 text-white'
                                : 'bg-stone-200 text-stone-800'
                            }`}>
                              {player.title}
                            </span>
                          ) : (
                            <span className="text-stone-600 text-xs">-</span>
                          )}
                        </td>

                        {/* Age */}
                        <td className="py-3 px-3 text-center font-mono font-bold text-stone-900 text-xs">
                          {age > 0 ? `${age} anos` : '-'}
                        </td>

                        {/* Birth Date */}
                        <td className="py-3 px-3 text-center font-mono text-stone-700 text-xs">
                          {formatDate(player.birthDate)}
                        </td>

                        {/* UF */}
                        <td className="py-3 px-3 text-center">
                          <span className="font-mono text-xs font-bold text-stone-800 px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">
                            {player.state || 'BRA'}
                          </span>
                        </td>

                        {/* FIDE ID */}
                        <td className="py-3 px-3 font-mono text-xs text-stone-800">
                          {player.fideId ? (
                            <span className="font-bold">{player.fideId}</span>
                          ) : (
                            <span className="text-stone-600">-</span>
                          )}
                        </td>

                        {/* CBX ID */}
                        <td className="py-3 px-3 font-mono text-xs text-stone-800">
                          {player.cbxId ? (
                            <span className="font-bold">{player.cbxId}</span>
                          ) : (
                            <span className="text-stone-600">-</span>
                          )}
                        </td>

                        {/* Profile Links */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {fideProfileUrl ? (
                              <a
                                href={fideProfileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Abrir perfil FIDE oficial de ${player.name} (${player.fideId || ''})`}
                              >
                                <span>
                                  <img src="https://www.fide.com/img/logo1.png" width="23px"/>
                                </span>
                              </a>
                            ) : null}

                            {cbxProfileUrl ? (
                              <a
                                href={cbxProfileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Abrir perfil CBX oficial de ${player.name} (${player.cbxId || ''})`}
                              >
                                <span>
                                  <img src="https://cbx.org.br/files/textos/003659/000965.jpg" width="23px"/>
                                </span>
                              </a>
                            ) : null}

                            {!fideProfileUrl && !cbxProfileUrl && (
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
        </div>

        {/* Pagination Bar */}
        {totalCount > 0 && (
          <div className="px-4 sm:px-6 py-3 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            {/* Left: Range and Items Per Page */}
            <div className="flex items-center gap-3">
              <span className="text-stone-600 font-medium">
                Mostrando <span className="font-bold text-stone-900">{totalCount > 0 ? startIndex + 1 : 0}</span> a{' '}
                <span className="font-bold text-stone-900">{endIndex}</span> de{' '}
                <span className="font-bold text-stone-900">{totalCount}</span> enxadristas
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
          <div className="text-xs text-stone-700">
            Dica: Clique no botão <span className="font-semibold text-stone-800">FIDE</span> ou <span className="font-semibold text-stone-800">CBX</span> para abrir a ficha oficial da federação.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors shadow-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
