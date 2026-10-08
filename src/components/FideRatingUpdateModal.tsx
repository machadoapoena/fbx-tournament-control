import React, { useState, useRef } from 'react';
import { Player } from '../types/chess';
import { playerService } from '../lib/services/playerService';
import { parseFideRatingFile, FideUpdateReportItem } from '../lib/fideFileParser';
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Users,
  RefreshCw,
  Search,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface FideRatingUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FideRatingUpdateModal: React.FC<FideRatingUpdateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Results
  const [report, setReport] = useState<FideUpdateReportItem[] | null>(null);
  const [totalScanned, setTotalScanned] = useState(0);
  const [totalFideEntries, setTotalFideEntries] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setErrorMsg(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleProcessFile = async () => {
    if (!file) {
      setErrorMsg('Por favor, selecione um arquivo TXT, XML ou CSV da FIDE.');
      return;
    }

    setIsProcessing(true);
    setProgressPercent(10);
    setProgressText('Lendo conteúdo do arquivo da FIDE...');
    setErrorMsg(null);

    try {
      // 1. Read file text
      const content = await file.text();
      setProgressPercent(35);
      setProgressText('Processando registros da FIDE...');

      const fideMap = parseFideRatingFile(content);
      setTotalFideEntries(fideMap.size);

      if (fideMap.size === 0) {
        throw new Error('Nenhum registro válido de jogador foi identificado no arquivo fornecido. Certifique-se de que é um arquivo oficial de ratings da FIDE.');
      }

      setProgressPercent(60);
      setProgressText('Buscando jogadores cadastrados no Firebase...');

      // 2. Fetch all registered players from Firestore
      const dbPlayers = await playerService.getPlayers();
      setTotalScanned(dbPlayers.length);

      if (dbPlayers.length === 0) {
        throw new Error('Nenhum jogador cadastrado no Firebase para atualizar.');
      }

      setProgressPercent(80);
      setProgressText('Cruzando dados e atualizando ratings no Firebase...');

      const updatedReport: FideUpdateReportItem[] = [];

      // 3. Match and update
      for (const player of dbPlayers) {
        const cleanFideId = player.fideId ? player.fideId.trim() : '';
        if (!cleanFideId) continue;

        const fideEntry = fideMap.get(cleanFideId);
        if (!fideEntry) continue;

        const oldStd = player.ratingFideStandard || player.ratingFide || 0;
        const oldRap = player.ratingFideRapid || 0;
        const oldBlz = player.ratingFideBlitz || 0;
        const oldTitle = player.title || '';

        const newStd = fideEntry.standardRating;
        const newRap = fideEntry.rapidRating;
        const newBlz = fideEntry.blitzRating;
        const newTitle = fideEntry.title || oldTitle;

        const stdChanged = newStd !== oldStd;
        const rapChanged = newRap !== oldRap;
        const blzChanged = newBlz !== oldBlz;
        const titleChanged = Boolean(fideEntry.title) && newTitle !== oldTitle;

        if (stdChanged || rapChanged || blzChanged || titleChanged) {
          const updatePayload: Partial<Player> = {};
          if (stdChanged) {
            updatePayload.ratingFideStandard = newStd;
            updatePayload.ratingFide = newStd;
          }
          if (rapChanged) updatePayload.ratingFideRapid = newRap;
          if (blzChanged) updatePayload.ratingFideBlitz = newBlz;
          if (titleChanged) updatePayload.title = newTitle as any;

          // Update Firestore
          if (player.id) {
            await playerService.updatePlayer(player.id, updatePayload);
          }

          updatedReport.push({
            playerId: player.id || cleanFideId,
            name: player.name,
            gender: player.gender,
            fideId: cleanFideId,
            oldStandard: oldStd,
            newStandard: newStd,
            oldRapid: oldRap,
            newRapid: newRap,
            oldBlitz: oldBlz,
            newBlitz: newBlz,
            oldTitle,
            newTitle,
            hasChanged: true,
          });
        }
      }

      setProgressPercent(100);
      setProgressText('Concluído!');
      setReport(updatedReport);
      onSuccess();
    } catch (err: any) {
      console.error('Error processing FIDE file:', err);
      setErrorMsg(err?.message || 'Erro ao processar o arquivo de ratings da FIDE.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setReport(null);
    setErrorMsg(null);
    setProgressPercent(0);
    setProgressText('');
  };

  const filteredReport = (report || []).filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return item.name.toLowerCase().includes(term) || item.fideId.includes(term);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-200 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Atualizar Ratings FIDE
                <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-mono border border-amber-400/30">
                  Via Arquivo Oficial
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Sincronize os ratings Standard, Rápido e Blitz dos jogadores cadastrados
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="font-bold block mb-0.5">Aviso</strong>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* VIEW 1: Upload Form */}
          {!report && (
            <div className="space-y-5">
              {/* Official Download Helper */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <span className="font-bold block">Onde baixar o arquivo oficial?</span>
                    <span className="text-amber-800 text-[11px]">
                      A FIDE disponibiliza mensalmente os arquivos <code className="bg-amber-100 px-1 py-0.2 rounded font-mono font-bold">ratings.txt</code> ou <code className="bg-amber-100 px-1 py-0.2 rounded font-mono font-bold">players_list_xml.xml</code>.
                    </span>
                  </div>
                </div>

                <a
                  href="https://ratings.fide.com/download.phtml"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-semibold text-xs transition-colors shrink-0"
                >
                  <span>Abrir FIDE Download</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Upload Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                  file
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-stone-300 hover:border-stone-900 bg-stone-50/50 hover:bg-stone-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.xml,.csv,.dat"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-14 h-14 mx-auto rounded-2xl bg-white border border-stone-200 shadow-xs flex items-center justify-center text-stone-700 mb-3">
                  {file ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  ) : (
                    <UploadCloud className="w-7 h-7 text-stone-600" />
                  )}
                </div>

                {file ? (
                  <div>
                    <span className="font-bold text-sm text-stone-900 block mb-1">
                      {file.name}
                    </span>
                    <span className="text-xs text-stone-600 font-mono">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • Pronto para processamento
                    </span>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-2">
                      Clique para trocar o arquivo
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold text-sm text-stone-900 block mb-1">
                      Arraste ou clique para selecionar o arquivo da FIDE
                    </span>
                    <p className="text-xs text-stone-600 max-w-md mx-auto">
                      Formatos suportados: <strong>.txt</strong> (ratings.txt, standard_rating_list.txt), <strong>.xml</strong> (players_list_xml.xml) ou <strong>.csv</strong>.
                    </p>
                  </div>
                )}
              </div>

              {/* Progress Indicator */}
              {isProcessing && (
                <div className="p-4 rounded-2xl bg-stone-900 text-white space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      {progressText}
                    </span>
                    <span className="font-mono text-amber-300">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: Results Summary Table */}
          {report && (
            <div className="space-y-5 animate-in fade-in">
              {/* Summary Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold font-mono">
                    {report.length}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">Ratings Atualizados</span>
                    <span className="text-[11px] text-emerald-700">Com alterações detectadas</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-800 text-white flex items-center justify-center font-bold font-mono">
                    {totalScanned}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 block">Jogadores no Banco</span>
                    <span className="text-[11px] text-stone-600">Verificados no Firebase</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold font-mono">
                    {totalFideEntries.toLocaleString('pt-BR')}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-sky-950 block">Registros no Arquivo</span>
                    <span className="text-[11px] text-sky-700">Base FIDE carregada</span>
                  </div>
                </div>
              </div>

              {/* Search bar inside report */}
              {report.length > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Filtrar enxadristas atualizados..."
                      className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                    />
                  </div>
                  <span className="text-xs font-mono text-stone-500">
                    {filteredReport.length} de {report.length}
                  </span>
                </div>
              )}

              {/* Updated Players Table */}
              {report.length === 0 ? (
                <div className="py-12 px-4 text-center bg-stone-50 rounded-2xl border border-stone-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-stone-900">Todos os ratings já estão em dia!</h4>
                  <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto">
                    Nenhum dos {totalScanned} jogadores cadastrados no Firebase apresentou variação de rating em relação ao arquivo da FIDE fornecido.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-100/70 border-b border-stone-200 text-[11px] font-bold text-stone-600 uppercase">
                        <th className="py-2.5 px-3">Jogador</th>
                        <th className="py-2.5 px-3 font-mono">ID FIDE</th>
                        <th className="py-2.5 px-3 font-mono text-center">Rtg. Standard</th>
                        <th className="py-2.5 px-3 font-mono text-center">Rtg. Rápido</th>
                        <th className="py-2.5 px-3 font-mono text-center">Rtg. Blitz</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredReport.map((item) => {
                        const stdDiff = item.newStandard - item.oldStandard;
                        const rapDiff = item.newRapid - item.oldRapid;
                        const blzDiff = item.newBlitz - item.oldBlitz;

                        return (
                          <tr key={item.playerId} className="hover:bg-stone-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-semibold">
                              <span className={item.gender === 'F' ? 'text-pink-600 font-bold' : 'text-stone-900'}>
                                {item.name}
                              </span>
                              {item.newTitle && item.newTitle !== item.oldTitle && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-100 text-amber-800 font-bold">
                                  Novo Título: {item.newTitle}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-stone-600">
                              {item.fideId}
                            </td>

                            {/* Standard */}
                            <td className="py-2.5 px-3 font-mono text-center">
                              {item.oldStandard !== item.newStandard ? (
                                <div className="inline-flex items-center gap-1">
                                  <span className="text-stone-400 line-through text-[11px]">{item.oldStandard > 0 ? item.oldStandard : '0'}</span>
                                  <ArrowRight className="w-3 h-3 text-stone-400" />
                                  <span className="font-bold text-stone-900">{item.newStandard > 0 ? item.newStandard : '0'}</span>
                                  {stdDiff !== 0 && (
                                    <span className={`text-[10px] font-bold px-1 rounded ${stdDiff > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                      {stdDiff > 0 ? `+${stdDiff}` : stdDiff}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-stone-700">{item.newStandard > 0 ? item.newStandard : '0'}</span>
                              )}
                            </td>

                            {/* Rapid */}
                            <td className="py-2.5 px-3 font-mono text-center">
                              {item.oldRapid !== item.newRapid ? (
                                <div className="inline-flex items-center gap-1">
                                  <span className="text-stone-400 line-through text-[11px]">{item.oldRapid > 0 ? item.oldRapid : '0'}</span>
                                  <ArrowRight className="w-3 h-3 text-stone-400" />
                                  <span className="font-bold text-stone-900">{item.newRapid > 0 ? item.newRapid : '0'}</span>
                                  {rapDiff !== 0 && (
                                    <span className={`text-[10px] font-bold px-1 rounded ${rapDiff > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                      {rapDiff > 0 ? `+${rapDiff}` : rapDiff}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-stone-700">{item.newRapid > 0 ? item.newRapid : '0'}</span>
                              )}
                            </td>

                            {/* Blitz */}
                            <td className="py-2.5 px-3 font-mono text-center">
                              {item.oldBlitz !== item.newBlitz ? (
                                <div className="inline-flex items-center gap-1">
                                  <span className="text-stone-400 line-through text-[11px]">{item.oldBlitz > 0 ? item.oldBlitz : '0'}</span>
                                  <ArrowRight className="w-3 h-3 text-stone-400" />
                                  <span className="font-bold text-stone-900">{item.newBlitz > 0 ? item.newBlitz : '0'}</span>
                                  {blzDiff !== 0 && (
                                    <span className={`text-[10px] font-bold px-1 rounded ${blzDiff > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                      {blzDiff > 0 ? `+${blzDiff}` : blzDiff}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-stone-700">{item.newBlitz > 0 ? item.newBlitz : '0'}</span>
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
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
          {report ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Carregar Outro Arquivo
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Concluir e Fechar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleProcessFile}
                disabled={!file || isProcessing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 text-amber-400" />
                    <span>Processar e Atualizar Ratings</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
