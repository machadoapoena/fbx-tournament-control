import React, { useState, useMemo } from 'react';
import { Player } from '../types/chess';
import { calculateAge, exportPlayersToCSV, exportPlayersToPDF } from '../lib/exportUtils';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FileSpreadsheet, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Shield, 
  Sparkles, 
  ExternalLink,
  X,
  AlertCircle
} from 'lucide-react';

interface AdminPlayerManagerProps {
  players: Player[];
  onAddPlayer: () => void;
  onEditPlayer: (player: Player) => void;
  onDeletePlayer: (id: string, name: string) => void;
  onSeedData: () => Promise<void>;
  isSeeding: boolean;
}

export const AdminPlayerManager: React.FC<AdminPlayerManagerProps> = ({
  players,
  onAddPlayer,
  onEditPlayer,
  onDeletePlayer,
  onSeedData,
  isSeeding,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [deleteConfirmPlayer, setDeleteConfirmPlayer] = useState<{ id: string; name: string } | null>(null);

  // Filtered by search
  const filteredPlayers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return players;
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.fideId && p.fideId.toLowerCase().includes(term)) ||
        (p.cbxId && p.cbxId.toLowerCase().includes(term)) ||
        (p.state && p.state.toLowerCase().includes(term)) ||
        (p.club && p.club.toLowerCase().includes(term))
    );
  }, [players, searchTerm]);

  // Reset to page 1 on search or itemsPerPage change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredPlayers.length);
  const paginatedPlayers = filteredPlayers.slice(startIndex, startIndex + itemsPerPage);

  const handleExportCSV = () => {
    exportPlayersToCSV(filteredPlayers, 'cadastro_jogadores_admin.csv');
  };

  const handleExportPDF = () => {
    exportPlayersToPDF(filteredPlayers, 'Relatório Administrativo de Jogadores');
  };

  const confirmDelete = () => {
    if (deleteConfirmPlayer) {
      onDeletePlayer(deleteConfirmPlayer.id, deleteConfirmPlayer.name);
      setDeleteConfirmPlayer(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Header & Actions */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-stone-900 text-white">
                <Shield className="w-4 h-4 text-amber-400" />
              </div>
              <h1 className="text-xl font-extrabold text-stone-900 font-sans tracking-tight">
                Gestão de Jogadores
              </h1>
            </div>
            <p className="text-xs text-stone-700">
              Cadastre, edite e atualize ratings dos enxadristas federados.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {players.length === 0 && (
              <button
                onClick={onSeedData}
                disabled={isSeeding}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{isSeeding ? 'Carregando...' : 'Exemplos'}</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 transition-colors"
              title="Exportar listagem filtrada para CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 transition-colors"
              title="Exportar listagem filtrada para PDF"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>PDF</span>
            </button>

            <button
              onClick={onAddPlayer}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Jogador</span>
            </button>
          </div>
        </div>

        {/* Search row */}
        <div className="mt-5 pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por nome, FIDE ID, CBX ID ou UF..."
              className="w-full pl-10 pr-9 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all font-sans"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-stone-700 font-medium">
            Exibindo <b>{paginatedPlayers.length}</b> de <b>{filteredPlayers.length}</b> registros (10 por página)
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {paginatedPlayers.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-600 mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900">Nenhum jogador para exibir</h3>
            <p className="text-xs text-stone-700 mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'Nenhum resultado para os termos da busca.'
                : 'Nenhum jogador cadastrado no momento. Cadastre um novo jogador ou carregue os dados de exemplo.'}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={onAddPlayer}
                className="px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-stone-800 transition-colors"
              >
                Cadastrar Primeiro Jogador
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-100/70 text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Nome Completo</th>
                  <th className="py-3 px-3 text-center">Título</th>
                  <th className="py-3 px-3 text-center">Nascimento</th>
                  <th className="py-3 px-3 text-center">Sexo</th>
                  <th className="py-3 px-3 text-center">UF</th>
                  <th className="py-3 px-3">FIDE (Std / Rap / Blz)</th>
                  <th className="py-3 px-3">CBX (Std / Rap / Blz)</th>
                  <th className="py-3 px-3 text-center">Links</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {paginatedPlayers.map((player, index) => {
                  const globalIndex = startIndex + index + 1;
                  const age = calculateAge(player.birthDate);

                  const stdFide = player.ratingFideStandard || player.ratingFide || 0;
                  const rapFide = player.ratingFideRapid || 0;
                  const blzFide = player.ratingFideBlitz || 0;

                  const stdCbx = player.ratingCbxStandard || player.ratingCbx || 0;
                  const rapCbx = player.ratingCbxRapid || 0;
                  const blzCbx = player.ratingCbxBlitz || 0;

                  return (
                    <tr key={player.id || index} className="hover:bg-stone-50/80 transition-colors">
                      {/* Index */}
                      <td className="py-3.5 px-4 text-center font-mono text-stone-600 font-semibold">
                        {globalIndex}
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className={`font-bold text-sm ${player.gender === 'F' ? 'text-pink-600' : 'text-stone-900'}`}>
                          {player.name}
                        </div>
                      </td>

                      {/* Title */}
                      <td className="py-3.5 px-3 text-center">
                        {player.title && player.title !== 'Sem Título' ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                              player.title === 'GM'
                                ? 'bg-stone-900 text-amber-300'
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
                          <span className="text-stone-400 font-mono text-xs">-</span>
                        )}
                      </td>

                      {/* Birth / Age */}
                      <td className="py-3.5 px-3 text-center font-mono">
                        <div className="text-stone-900 font-medium">
                          {player.birthDate ? player.birthDate.split('-').reverse().join('/') : '-'}
                        </div>
                        <div className="text-[10px] text-stone-700">
                          {age > 0 ? `${age} anos` : ''}
                        </div>
                      </td>

                      {/* Gender */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] ${
                            player.gender === 'F'
                              ? 'bg-rose-50 text-rose-700'
                              : player.gender === 'M'
                              ? 'bg-sky-50 text-sky-700'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {player.gender}
                        </span>
                      </td>

                      {/* State */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-stone-800">
                        {player.state || '-'}
                      </td>

                      {/* Ratings FIDE */}
                      <td className="py-3.5 px-3 font-mono text-xs">
                        <div className="flex items-center gap-1">
                          <span
                            className={`inline-flex items-center justify-center min-w-[38px] px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              stdFide > 0
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-stone-100/70 text-stone-400 border border-stone-200/60 font-normal'
                            }`}
                            title={`FIDE Standard: ${stdFide > 0 ? stdFide : 'Sem rating'}`}
                          >
                            {stdFide > 0 ? stdFide : '-'}
                          </span>
                          <span
                            className={`inline-flex items-center justify-center min-w-[38px] px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              rapFide > 0
                                ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                : 'bg-stone-100/70 text-stone-400 border border-stone-200/60 font-normal'
                            }`}
                            title={`FIDE Rapid: ${rapFide > 0 ? rapFide : 'Sem rating'}`}
                          >
                            {rapFide > 0 ? rapFide : '-'}
                          </span>
                          <span
                            className={`inline-flex items-center justify-center min-w-[38px] px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              blzFide > 0
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-stone-100/70 text-stone-400 border border-stone-200/60 font-normal'
                            }`}
                            title={`FIDE Blitz: ${blzFide > 0 ? blzFide : 'Sem rating'}`}
                          >
                            {blzFide > 0 ? blzFide : '-'}
                          </span>
                        </div>
                      </td>

                      {/* Ratings CBX */}
                      <td className="py-3.5 px-3 font-mono text-xs">
                        <div className="flex items-center gap-1">
                          <span
                            className={`inline-flex items-center justify-center min-w-[38px] px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              stdCbx > 0
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-stone-100/70 text-stone-400 border border-stone-200/60 font-normal'
                            }`}
                            title={`CBX Standard: ${stdCbx > 0 ? stdCbx : 'Sem rating'}`}
                          >
                            {stdCbx > 0 ? stdCbx : '-'}
                          </span>
                          <span
                            className={`inline-flex items-center justify-center min-w-[38px] px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              rapCbx > 0
                                ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                : 'bg-stone-100/70 text-stone-400 border border-stone-200/60 font-normal'
                            }`}
                            title={`CBX Rapid: ${rapCbx > 0 ? rapCbx : 'Sem rating'}`}
                          >
                            {rapCbx > 0 ? rapCbx : '-'}
                          </span>
                          <span
                            className={`inline-flex items-center justify-center min-w-[38px] px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              blzCbx > 0
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-stone-100/70 text-stone-400 border border-stone-200/60 font-normal'
                            }`}
                            title={`CBX Blitz: ${blzCbx > 0 ? blzCbx : 'Sem rating'}`}
                          >
                            {blzCbx > 0 ? blzCbx : '-'}
                          </span>
                        </div>
                      </td>

                      {/* Links */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {player.fideUrl || player.fideId ? (
                            <a
                              href={player.fideUrl || `https://ratings.fide.com/profile/${player.fideId}`}
                              target="_blank"
                              rel="noreferrer"
                              title={`Perfil FIDE Oficial (${player.fideId || ''})`}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-sky-950 hover:bg-sky-800 text-amber-300 border border-sky-800 hover:border-amber-400/60 shadow-2xs transition-all hover:scale-110 cursor-pointer group"
                            >
                              <span className="text-[8px] font-mono font-black tracking-tighter leading-none text-amber-300">
                                FIDE
                              </span>
                            </a>
                          ) : null}
                          {player.cbxUrl || player.cbxId ? (
                            <a
                              href={player.cbxUrl || `https://www.cbx.org.br/jogador/${player.cbxId}`}
                              target="_blank"
                              rel="noreferrer"
                              title={`Perfil CBX Oficial (${player.cbxId || ''})`}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-950 hover:bg-emerald-800 text-yellow-300 border border-emerald-800 hover:border-yellow-400/60 shadow-2xs transition-all hover:scale-110 cursor-pointer group"
                            >
                              <span className="text-[8px] font-mono font-black tracking-tighter leading-none text-yellow-300">
                                CBX
                              </span>
                            </a>
                          ) : null}
                          {!player.fideUrl && !player.fideId && !player.cbxUrl && !player.cbxId && (
                            <span className="text-xs text-stone-400 font-mono">-</span>
                          )}
                        </div>
                      </td>

                      {/* Action buttons (Edit / Delete) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onEditPlayer(player)}
                            className="p-1.5 rounded-lg text-stone-700 hover:text-stone-950 hover:bg-stone-100 transition-colors"
                            title="Editar Dados do Jogador"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirmPlayer({
                                id: player.id || '',
                                name: player.name,
                              })
                            }
                            className="p-1.5 rounded-lg text-stone-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Excluir Jogador"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-stone-700 font-medium">
            <div>
              Mostrando <span className="font-bold text-stone-900">{filteredPlayers.length > 0 ? startIndex + 1 : 0}</span> a <span className="font-bold text-stone-900">{endIndex}</span> de <span className="font-bold text-stone-900">{filteredPlayers.length}</span> atletas
            </div>
            
            <div className="flex items-center gap-1.5 border-l border-stone-200 pl-4">
              <span className="text-stone-600">Por página:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 cursor-pointer shadow-2xs"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700"
              title="Primeira página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page number indicators */}
            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((pageNumber, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && pageNumber - prev > 1;
                  return (
                    <React.Fragment key={pageNumber}>
                      {showEllipsis && <span className="px-1 text-stone-600">...</span>}
                      <button
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all ${
                          currentPage === pageNumber
                            ? 'bg-stone-900 text-white shadow-xs'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700"
              title="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700"
              title="Última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend of Rating Modalities below Table */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-stone-900"></div>
          <span className="font-bold text-stone-900">Legenda das Modalidades de Rating (FIDE / CBX):</span>
        </div>

        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Std
            </span>
            <span className="text-stone-700 font-medium">Standard / Pensado</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-50 text-sky-800 border border-sky-200">
              Rap
            </span>
            <span className="text-stone-700 font-medium">Rápido (Rapid)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Confirmar Exclusão</h3>
                <p className="text-xs text-stone-700 mt-1">
                  Tem certeza de que deseja excluir o cadastro do jogador{' '}
                  <span className="font-bold text-stone-900">"{deleteConfirmPlayer.name}"</span>? Esta ação removerá os dados permanentemente do Firebase.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                onClick={() => setDeleteConfirmPlayer(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100 border border-stone-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs"
              >
                Excluir Jogador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
