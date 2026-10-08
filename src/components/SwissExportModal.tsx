import React, { useState, useMemo } from 'react';
import { Player, SwissExportConfig, SwissRatingModality } from '../types/chess';
import { 
  exportToSwissManager, 
  exportToSwissManagerExcel,
  exportToSwissManagerXML,
  generateSwissManagerXMLString,
  formatSwissBirthday,
  parsePlayerNames,
  formatSwissXmlBirthday
} from '../lib/exportUtils';
import { 
  X, 
  Download, 
  Settings2, 
  FileCode, 
  FileSpreadsheet, 
  HelpCircle, 
  Eye, 
  Check,
  Copy
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
  const [previewMode, setPreviewMode] = useState<'xlsx' | 'xml'>('xlsx');
  const [copied, setCopied] = useState(false);

  const [config, setConfig] = useState<SwissExportConfig>({
    delimiter: ';',
    includeHeader: true,
    format: 'xlsx',
    fideRatingModality: 'standard',
    cbxRatingModality: 'standard',
    fields: {
      id: true,
      fideId: true,
      cbxId: true,
      name: true,
      title: true,
      gender: true,
      birthDate: true,
      country: true,
      state: true,
      k: true,
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

  // Live preview generator for top rows
  const previewContent = useMemo(() => {
    if (targetPlayers.length === 0) return 'Nenhum jogador selecionado para visualização.';

    if (previewMode === 'xml') {
      const samplePlayers = targetPlayers.slice(0, 3);
      const xml = generateSwissManagerXMLString(samplePlayers, config);
      if (targetPlayers.length > 3) {
        return xml.replace(
          '</Players>',
          `  <!-- ... mais ${targetPlayers.length - 3} jogadores (${targetPlayers.length} no total) -->\n</Players>`
        );
      }
      return xml;
    }

    const delimiter = config.delimiter;
    const headers: string[] = [];
    if (config.fields.id) headers.push('ID_No');
    if (config.fields.fideId) headers.push('FideID');
    if (config.fields.cbxId) headers.push('CBX_ID');
    if (config.fields.name) headers.push('NAME');
    if (config.fields.title) headers.push('TITLE');
    if (config.fields.gender) headers.push('SEX');
    if (config.fields.birthDate) headers.push('BIRTHDAY');
    if (config.fields.country) headers.push('FED');
    if (config.fields.state) headers.push('STATE');

    const fideModality = config.fideRatingModality ?? 'standard';
    if (fideModality !== 'none') {
      headers.push('IntRating');
    }

    const cbxModality = config.cbxRatingModality ?? 'standard';
    if (cbxModality !== 'none') {
      headers.push('NatRating');
    }

    if (config.fields.k ?? true) {
      headers.push('K');
    }

    if (config.fields.club) headers.push('CLUB');

    const sampleRows = targetPlayers.slice(0, 3).map((p, index) => {
      const rowValues: string[] = [];
      if (config.fields.id) rowValues.push(String(index + 1));
      if (config.fields.fideId) rowValues.push(p.fideId || '');
      if (config.fields.cbxId) rowValues.push(p.cbxId || '');
      if (config.fields.name) rowValues.push(p.name || '');
      if (config.fields.title) rowValues.push(p.title === 'Sem Título' ? '' : p.title || '');
      if (config.fields.gender) rowValues.push(p.gender === 'F' ? 'w' : 'm');
      if (config.fields.birthDate) {
        rowValues.push(formatSwissBirthday(p.birthDate));
      }
      if (config.fields.country) rowValues.push(p.country === 'Brasil' ? 'BRA' : p.country || 'BRA');
      if (config.fields.state) rowValues.push(p.state || '');

      // IntRating (FIDE)
      if (fideModality !== 'none') {
        let r = 0;
        if (fideModality === 'standard') r = p.ratingFideStandard || p.ratingFide || 0;
        else if (fideModality === 'rapid') r = p.ratingFideRapid || 0;
        else if (fideModality === 'blitz') r = p.ratingFideBlitz || 0;
        rowValues.push(String(r));
      }

      // NatRating (CBX)
      if (cbxModality !== 'none') {
        let r = 0;
        if (cbxModality === 'standard') r = p.ratingCbxStandard || p.ratingCbx || 0;
        else if (cbxModality === 'rapid') r = p.ratingCbxRapid || 0;
        else if (cbxModality === 'blitz') r = p.ratingCbxBlitz || 0;
        rowValues.push(String(r));
      }

      // Coluna K (vazia)
      if (config.fields.k ?? true) {
        rowValues.push('');
      }

      if (config.fields.club) rowValues.push(p.club || '');
      return rowValues.join(delimiter);
    });

    const lines = config.includeHeader ? [headers.join(delimiter), ...sampleRows] : sampleRows;
    return lines.join('\n');
  }, [targetPlayers, config, previewMode]);

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

  const handleExportXML = () => {
    const filename = `swiss_manager_${new Date().toISOString().slice(0, 10)}.xml`;
    exportToSwissManagerXML(targetPlayers, config, filename);
    onClose();
  };

  const handleExportXLSX = () => {
    const filename = `swiss_manager_${new Date().toISOString().slice(0, 10)}.xlsx`;
    exportToSwissManagerExcel(targetPlayers, config, filename);
    onClose();
  };

  const handleCopyPreview = () => {
    if (!previewContent) return;
    navigator.clipboard.writeText(previewContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fieldLabels: { key: keyof typeof config.fields; label: string; desc: string }[] = [
    { key: 'id', label: 'ID Sequencial (ID_No)', desc: 'Coluna ID_No' },
    { key: 'fideId', label: 'ID FIDE', desc: 'Coluna FideID' },
    { key: 'cbxId', label: 'ID CBX', desc: 'Coluna CBX_ID' },
    { key: 'name', label: 'Nome Completo', desc: 'Coluna NAME' },
    { key: 'title', label: 'Titulação', desc: 'Coluna TITLE' },
    { key: 'gender', label: 'Gênero (m / w)', desc: 'Coluna SEX' },
    { key: 'birthDate', label: 'Nascimento (DD.MM.YYYY)', desc: 'Coluna BIRTHDAY' },
    { key: 'country', label: 'País / FED', desc: 'Coluna FED' },
    { key: 'state', label: 'Estado / UF', desc: 'Coluna STATE' },
    { key: 'k', label: 'Coluna K (vazia)', desc: 'Coluna K' },
    { key: 'club', label: 'Clube', desc: 'Coluna CLUB' },
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
                Gere planilha Excel (.xlsx) compatível com o Swiss-Manager: ID_No, FideID, IntRating, NatRating, coluna K e data DD.MM.YYYY
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
          
          {/* 1. Scope Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
              1. Jogadores a Exportar
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
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
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
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

          {/* 2. Ratings Selector: Only 1 FIDE (IntRating) and 1 CBX (NatRating) */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-900">
                2. Seleção de Ratings (1 FIDE e 1 CBX)
              </label>
              <span className="text-[11px] text-stone-500 font-medium">
                Padrão oficial Swiss-Manager
              </span>
            </div>
            <p className="text-[11px] text-stone-600">
              O rating FIDE selecionado será gravado na coluna <strong className="font-mono text-stone-900">IntRating</strong> e o rating CBX na coluna <strong className="font-mono text-stone-900">NatRating</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Rating FIDE -> IntRating */}
              <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <img src="https://www.fide.com/img/logo1.png" width="16" height="16" alt="FIDE" className="shrink-0" />
                    <span className="text-xs font-bold text-stone-900">Rating FIDE</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-100 text-stone-700 border border-stone-200">
                    Coluna IntRating
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'standard', label: 'Standard (Clássico)' },
                    { id: 'rapid', label: 'Rápido' },
                    { id: 'blitz', label: 'Blitz' },
                    { id: 'none', label: 'Não incluir' },
                  ].map((opt) => {
                    const isSelected = (config.fideRatingModality ?? 'standard') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setConfig({ ...config, fideRatingModality: opt.id as SwissRatingModality })}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-stone-900 text-white border-stone-900 shadow-2xs font-bold'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rating CBX -> NatRating */}
              <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <img src="https://cbx.org.br/files/textos/003659/000965.jpg" width="16" height="16" alt="CBX" className="shrink-0 rounded-xs" />
                    <span className="text-xs font-bold text-stone-900">Rating CBX</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200">
                    Coluna NatRating
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'standard', label: 'Standard (Clássico)' },
                    { id: 'rapid', label: 'Rápido' },
                    { id: 'blitz', label: 'Blitz' },
                    { id: 'none', label: 'Não incluir' },
                  ].map((opt) => {
                    const isSelected = (config.cbxRatingModality ?? 'standard') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setConfig({ ...config, cbxRatingModality: opt.id as SwissRatingModality })}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-stone-900 text-white border-stone-900 shadow-2xs font-bold'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Fields Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                3. Campos do Jogador (Colunas de Cadastro)
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => selectAllFields(true)}
                  className="text-stone-700 hover:text-stone-900 underline font-medium cursor-pointer"
                >
                  Marcar Todos
                </button>
                <span className="text-stone-300">|</span>
                <button
                  type="button"
                  onClick={() => selectAllFields(false)}
                  className="text-stone-700 hover:text-stone-900 underline font-medium cursor-pointer"
                >
                  Desmarcar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-stone-50 border border-stone-200">
              {fieldLabels.map(({ key, label }) => {
                const checked = !!config.fields[key];
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

          {/* 4. Live Preview Box */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs font-bold text-stone-700 mb-1.5">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-stone-600" />
                <span>Pré-visualização:</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('xlsx')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      previewMode === 'xlsx'
                        ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                        : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    Colunas XLSX
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('xml')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      previewMode === 'xml'
                        ? 'bg-white text-amber-900 shadow-2xs font-extrabold'
                        : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    XML Swiss-Manager
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPreview}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                  title="Copiar texto da pré-visualização"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <pre className="p-3 bg-stone-950 text-stone-200 rounded-xl text-[11px] font-mono overflow-x-auto whitespace-pre leading-relaxed border border-stone-800 max-h-56 overflow-y-auto select-all">
              {previewContent}
            </pre>
            <p className="text-[10px] text-stone-600 mt-1 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 shrink-0" />{' '}
              {previewMode === 'xml'
                ? 'Estrutura XML oficial do Swiss-Manager com tags <Players> e <Player ... /> (atributos PlayerUniqueId, Lastname, Firstname, Federation, FIDEId, Rating, NatId, NatRating, Birthday, Gender, Title).'
                : 'Planilha Excel (.xlsx) oficial: colunas mapeadas conforme os campos e ratings selecionados acima.'}
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 border border-stone-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleExportXML}
              disabled={targetPlayers.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
              title="Exportar arquivo XML (<Players><Player .../></Players>)"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-700" />
              <span>Exportar XML</span>
            </button>

            <button
              type="button"
              onClick={handleExportXLSX}
              disabled={targetPlayers.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              title="Exportar planilha Excel (.xlsx) com os campos e ratings selecionados"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar XLSX</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
