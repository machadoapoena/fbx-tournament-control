import React, { useState, useMemo } from 'react';
import { Player, SwissExportConfig } from '../types/chess';
import { exportToSwissManager } from '../lib/exportUtils';
import { 
  X, 
  Download, 
  Settings2, 
  CheckSquare, 
  Square, 
  FileCode, 
  HelpCircle,
  Eye
} from 'lucide-react';

interface SwissExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  selectedPlayerIds: string[];
}

export const SwissExportModal: React.FC<SwissExportModalProps> = ({
  isOpen,
  onClose,
  players,
  selectedPlayerIds,
}) => {
  const [exportScope, setExportScope] = useState<'all' | 'selected'>(
    selectedPlayerIds.length > 0 ? 'selected' : 'all'
  );

  const [config, setConfig] = useState<SwissExportConfig>({
    delimiter: ';',
    includeHeader: true,
    format: 'swiss_txt',
    fields: {
      id: true,
      name: true,
      fideId: true,
      cbxId: true,
      title: true,
      gender: true,
      birthDate: true,
      country: true,
      state: true,
      ratingFide: true,
      ratingFideRapid: true,
      ratingFideBlitz: true,
      ratingCbx: true,
      ratingCbxRapid: true,
      ratingCbxBlitz: true,
      club: true,
    },
  });

  const targetPlayers = useMemo(() => {
    if (exportScope === 'selected' && selectedPlayerIds.length > 0) {
      const set = new Set(selectedPlayerIds);
      return players.filter((p) => set.has(p.id || p.fideId || p.name));
    }
    return players;
  }, [exportScope, selectedPlayerIds, players]);

  // Live preview generator for top 3 rows
  const previewContent = useMemo(() => {
    if (targetPlayers.length === 0) return 'Nenhum jogador selecionado para visualização.';

    const delimiter = config.delimiter;
    const headers: string[] = [];
    if (config.fields.id) headers.push('ID');
    if (config.fields.fideId) headers.push('FIDE_ID');
    if (config.fields.cbxId) headers.push('CBX_ID');
    if (config.fields.name) headers.push('NAME');
    if (config.fields.title) headers.push('TITLE');
    if (config.fields.gender) headers.push('SEX');
    if (config.fields.birthDate) headers.push('BIRTHDAY');
    if (config.fields.country) headers.push('FED');
    if (config.fields.state) headers.push('STATE');
    if (config.fields.ratingFide) headers.push('RATING_FIDE_STD');
    if (config.fields.ratingFideRapid) headers.push('RATING_FIDE_RAP');
    if (config.fields.ratingFideBlitz) headers.push('RATING_FIDE_BLZ');
    if (config.fields.ratingCbx) headers.push('RATING_CBX_STD');
    if (config.fields.ratingCbxRapid) headers.push('RATING_CBX_RAP');
    if (config.fields.ratingCbxBlitz) headers.push('RATING_CBX_BLZ');
    if (config.fields.club) headers.push('CLUB');

    const sampleRows = targetPlayers.slice(0, 3).map((p, index) => {
      const rowValues: string[] = [];
      if (config.fields.id) rowValues.push(String(index + 1));
      if (config.fields.fideId) rowValues.push(p.fideId || '');
      if (config.fields.cbxId) rowValues.push(p.cbxId || '');
      if (config.fields.name) rowValues.push(p.name || '');
      if (config.fields.title) rowValues.push(p.title === 'Sem Título' ? '' : p.title);
      if (config.fields.gender) rowValues.push(p.gender === 'F' ? 'w' : 'm');
      if (config.fields.birthDate) {
        rowValues.push(p.birthDate ? p.birthDate.replace(/-/g, '/') : '');
      }
      if (config.fields.country) rowValues.push(p.country === 'Brasil' ? 'BRA' : p.country);
      if (config.fields.state) rowValues.push(p.state || '');
      if (config.fields.ratingFide) rowValues.push(String(p.ratingFideStandard || p.ratingFide || 0));
      if (config.fields.ratingFideRapid) rowValues.push(String(p.ratingFideRapid || 0));
      if (config.fields.ratingFideBlitz) rowValues.push(String(p.ratingFideBlitz || 0));
      if (config.fields.ratingCbx) rowValues.push(String(p.ratingCbxStandard || p.ratingCbx || 0));
      if (config.fields.ratingCbxRapid) rowValues.push(String(p.ratingCbxRapid || 0));
      if (config.fields.ratingCbxBlitz) rowValues.push(String(p.ratingCbxBlitz || 0));
      if (config.fields.club) rowValues.push(p.club || '');
      return rowValues.join(delimiter);
    });

    const lines = config.includeHeader ? [headers.join(delimiter), ...sampleRows] : sampleRows;
    return lines.join('\n');
  }, [targetPlayers, config]);

  if (!isOpen) return null;

  const toggleField = (fieldKey: keyof typeof config.fields) => {
    setConfig((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldKey]: !prev.fields[fieldKey],
      },
    }));
  };

  const selectAllFields = (select: boolean) => {
    setConfig((prev) => {
      const updated = { ...prev.fields };
      (Object.keys(updated) as (keyof typeof updated)[]).forEach((k) => {
        updated[k] = select;
      });
      return { ...prev, fields: updated };
    });
  };

  const handleDownload = () => {
    const ext = config.format === 'csv' ? 'csv' : config.format === 'fide_dat' ? 'dat' : 'txt';
    const filename = `swiss_manager_import_${new Date().toISOString().slice(0, 10)}.${ext}`;
    exportToSwissManager(targetPlayers, config, filename);
    onClose();
  };

  const fieldLabels: { key: keyof typeof config.fields; label: string; desc: string }[] = [
    { key: 'id', label: 'ID Sequencial (#)', desc: 'Número sequencial' },
    { key: 'name', label: 'Nome Completo', desc: 'Nome do enxadrista' },
    { key: 'fideId', label: 'ID FIDE', desc: 'Código internacional' },
    { key: 'cbxId', label: 'ID CBX', desc: 'Código nacional' },
    { key: 'title', label: 'Titulação', desc: 'GM, IM, FM, WGM, etc.' },
    { key: 'gender', label: 'Gênero (m / w)', desc: 'm/w para o Swiss-Manager' },
    { key: 'birthDate', label: 'Data Nascimento', desc: 'YYYY/MM/DD' },
    { key: 'country', label: 'País / FED', desc: 'BRA / Origem' },
    { key: 'state', label: 'Estado / UF', desc: 'Sigla estadual' },
    { key: 'ratingFide', label: 'FIDE Standard', desc: 'Elo Clássico' },
    { key: 'ratingFideRapid', label: 'FIDE Rapid', desc: 'Elo Rápido' },
    { key: 'ratingFideBlitz', label: 'FIDE Blitz', desc: 'Elo Relâmpago' },
    { key: 'ratingCbx', label: 'CBX Standard', desc: 'Elo Nacional Pensado' },
    { key: 'ratingCbxRapid', label: 'CBX Rapid', desc: 'Elo Nacional Rápido' },
    { key: 'ratingCbxBlitz', label: 'CBX Blitz', desc: 'Elo Nacional Blitz' },
    { key: 'club', label: 'Clube', desc: 'Agremiação' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-800 text-white flex items-center justify-center">
              <FileCode className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold font-sans">
                Exportar para Swiss-Manager
              </h2>
              <p className="text-[11px] text-stone-300">
                Selecione os campos desejados incluindo ratings Standard, Rapid e Blitz
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
              1. Jogadores a Exportar
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  exportScope === 'all'
                    ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                    : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                }`}
              >
                <div className="text-xs font-bold">Todos os Jogadores</div>
                <div className={`text-[11px] mt-0.5 ${exportScope === 'all' ? 'text-stone-300' : 'text-stone-700'}`}>
                  {players.length} enxadristas cadastrados na base
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportScope('selected')}
                disabled={selectedPlayerIds.length === 0}
                className={`p-3 rounded-xl border text-left transition-all ${
                  exportScope === 'selected'
                    ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                    : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                <div className="text-xs font-bold">Apenas Jogadores Selecionados</div>
                <div className={`text-[11px] mt-0.5 ${exportScope === 'selected' ? 'text-stone-300' : 'text-stone-700'}`}>
                  {selectedPlayerIds.length} selecionados na tabela
                </div>
              </button>
            </div>
          </div>

          {/* Fields Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                2. Campos para Exportação (FIDE & CBX)
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => selectAllFields(true)}
                  className="text-stone-700 hover:text-stone-900 underline font-medium"
                >
                  Marcar Todos
                </button>
                <span className="text-stone-300">|</span>
                <button
                  type="button"
                  onClick={() => selectAllFields(false)}
                  className="text-stone-700 hover:text-stone-900 underline font-medium"
                >
                  Desmarcar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-stone-50 border border-stone-200">
              {fieldLabels.map(({ key, label }) => {
                const checked = config.fields[key];
                return (
                  <label
                    key={key}
                    onClick={() => toggleField(key)}
                    className="flex items-center gap-2 text-xs text-stone-800 cursor-pointer select-none py-1 hover:text-stone-950"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="rounded border-stone-300 text-stone-900 focus:ring-stone-900 cursor-pointer"
                    />
                    <span className="font-medium text-[11px]">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Delimiter & Format Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Delimitador
              </label>
              <select
                value={config.delimiter}
                onChange={(e) =>
                  setConfig({ ...config, delimiter: e.target.value as ';' | ',' | '\t' })
                }
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 font-mono"
              >
                <option value=";">Ponto e vírgula (;)</option>
                <option value=",">Vírgula (,)</option>
                <option value="&#9;">Tabulação [TAB]</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Linha de Cabeçalho
              </label>
              <select
                value={config.includeHeader ? 'yes' : 'no'}
                onChange={(e) =>
                  setConfig({ ...config, includeHeader: e.target.value === 'yes' })
                }
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
              >
                <option value="yes">Incluir cabeçalho</option>
                <option value="no">Sem cabeçalho</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Formato do Arquivo
              </label>
              <select
                value={config.format}
                onChange={(e) =>
                  setConfig({ ...config, format: e.target.value as 'swiss_txt' | 'csv' | 'fide_dat' })
                }
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 font-mono"
              >
                <option value="swiss_txt">Texto Swiss-Manager (.txt)</option>
                <option value="csv">Planilha CSV (.csv)</option>
                <option value="fide_dat">Arquivo FIDE (.dat)</option>
              </select>
            </div>
          </div>

          {/* Live Preview Box */}
          <div>
            <div className="flex items-center gap-1 text-xs font-bold text-stone-700 mb-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>Pré-visualização do Arquivo Gerado:</span>
            </div>
            <pre className="p-3 bg-stone-950 text-stone-200 rounded-xl text-[11px] font-mono overflow-x-auto whitespace-pre leading-relaxed border border-stone-800">
              {previewContent}
            </pre>
            <p className="text-[10px] text-stone-600 mt-1 flex items-center gap-1">
              <HelpCircle className="w-3 h-3" /> Compatível com importação no Swiss-Manager através de <i>"Importar dados" &gt; "Importar jogadores"</i>.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 border border-stone-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={targetPlayers.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar {targetPlayers.length} Jogador(es)</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
