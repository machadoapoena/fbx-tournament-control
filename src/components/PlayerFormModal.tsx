import React, { useState, useEffect } from 'react';
import { Player, ChessTitle, Gender, ScrapedRatingsResult } from '../types/chess';
import { calculateAge, getAgeCategory } from '../lib/exportUtils';
import { playerService } from '../lib/services/playerService';
import { 
  X, 
  Save, 
  User, 
  Globe, 
  Award, 
  Calendar, 
  Link as LinkIcon, 
  Sparkles,
  MapPin,
  Building,
  Check,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  TrendingUp,
  ClipboardPaste,
  ExternalLink
} from 'lucide-react';

interface PlayerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (playerData: Omit<Player, 'id'>) => Promise<void>;
  initialData?: Player | null;
  isSaving: boolean;
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO', 'OUTRO'
];

const TITLES: { code: ChessTitle; label: string }[] = [
  { code: 'Sem Título', label: 'Sem Título' },
  { code: 'GM', label: 'GM - Grande Mestre' },
  { code: 'IM', label: 'IM / MI - Mestre Internacional' },
  { code: 'FM', label: 'FM / MF - Mestre FIDE' },
  { code: 'CM', label: 'CM - Candidato a Mestre' },
  { code: 'WGM', label: 'WGM - Grande Mestre Feminina' },
  { code: 'WIM', label: 'WIM - Mestre Internacional Feminina' },
  { code: 'WFM', label: 'WFM - Mestre FIDE Feminina' },
  { code: 'WCM', label: 'WCM - Candidata a Mestre Feminina' },
  { code: 'MN', label: 'MN - Mestre Nacional' },
  { code: 'CMN', label: 'CMN - Candidato a Mestre Nacional' },
  { code: 'AIM', label: 'AIM - Arena International Master' },
  { code: 'AFM', label: 'AFM - Arena FIDE Master' },
  { code: 'AGM', label: 'AGM - Arena Grandmaster' },
  { code: 'ACM', label: 'ACM - Arena Candidate Master' },
  { code: 'NM', label: 'NM - National Master' }
];

export const PlayerFormModal: React.FC<PlayerFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSaving,
}) => {
  const [formData, setFormData] = useState<Omit<Player, 'id'>>({
    name: '',
    title: 'Sem Título',
    birthDate: '',
    gender: 'M',
    fideId: '',
    cbxId: '',
    country: 'Brasil',
    state: 'SP',
    fideUrl: '',
    cbxUrl: '',
    ratingFide: 0,
    ratingFideStandard: 0,
    ratingFideRapid: 0,
    ratingFideBlitz: 0,
    ratingCbx: 0,
    ratingCbxStandard: 0,
    ratingCbxRapid: 0,
    ratingCbxBlitz: 0,
    club: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isScraping, setIsScraping] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteSnippet, setPasteSnippet] = useState('');
  const [scrapeFeedback, setScrapeFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    details?: string;
  } | null>(null);

  useEffect(() => {
    if (initialData) {
      const initialFideId = initialData.fideId || '';
      const initialCbxId = initialData.cbxId || '';
      setFormData({
        name: initialData.name || '',
        title: initialData.title || 'Sem Título',
        birthDate: initialData.birthDate || '',
        gender: initialData.gender || 'M',
        fideId: initialFideId,
        cbxId: initialCbxId,
        country: initialData.country || 'Brasil',
        state: initialData.state || 'SP',
        fideUrl: initialData.fideUrl || (initialFideId.trim() ? `https://ratings.fide.com/profile/${initialFideId.trim()}` : ''),
        cbxUrl: initialData.cbxUrl || (initialCbxId.trim() ? `https://www.cbx.org.br/jogador/${initialCbxId.trim()}` : ''),
        ratingFide: initialData.ratingFideStandard || initialData.ratingFide || 0,
        ratingFideStandard: initialData.ratingFideStandard || initialData.ratingFide || 0,
        ratingFideRapid: initialData.ratingFideRapid || 0,
        ratingFideBlitz: initialData.ratingFideBlitz || 0,
        ratingCbx: initialData.ratingCbxStandard || initialData.ratingCbx || 0,
        ratingCbxStandard: initialData.ratingCbxStandard || initialData.ratingCbx || 0,
        ratingCbxRapid: initialData.ratingCbxRapid || 0,
        ratingCbxBlitz: initialData.ratingCbxBlitz || 0,
        club: initialData.club || '',
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        name: '',
        title: 'Sem Título',
        birthDate: '',
        gender: 'M',
        fideId: '',
        cbxId: '',
        country: 'Brasil',
        state: 'SP',
        fideUrl: '',
        cbxUrl: '',
        ratingFide: 0,
        ratingFideStandard: 0,
        ratingFideRapid: 0,
        ratingFideBlitz: 0,
        ratingCbx: 0,
        ratingCbxStandard: 0,
        ratingCbxRapid: 0,
        ratingCbxBlitz: 0,
        club: '',
        notes: '',
      });
    }
    setErrors({});
    setScrapeFeedback(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Auto generate URLs based on IDs
  const handleAutoFillFideUrl = () => {
    if (formData.fideId) {
      setFormData(prev => ({
        ...prev,
        fideUrl: `https://ratings.fide.com/profile/${(prev.fideId || '').trim()}`
      }));
    }
  };

  const handleAutoFillCbxUrl = () => {
    if (formData.cbxId) {
      setFormData(prev => ({
        ...prev,
        cbxUrl: `https://www.cbx.org.br/jogador/${(prev.cbxId || '').trim()}`
      }));
    }
  };

  // Local parser for direct HTML snippets
  const parseLocalSnippet = (snippet: string) => {
    const res: {
      fide?: { standard?: number; rapid?: number; blitz?: number; title?: ChessTitle; name?: string; country?: string };
      cbx?: { standard?: number; rapid?: number; blitz?: number; name?: string; state?: string };
    } = {};

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(snippet, 'text/html');

      // Helper to extract rating number
      const getNum = (text: string | null | undefined): number | null => {
        if (!text) return null;
        const clean = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const m = clean.match(/\b([4-9]\d{2}|[1-3]\d{3})\b/);
        if (m) {
          const val = parseInt(m[1], 10);
          if (val >= 400 && val <= 3800) return val;
        }
        return null;
      };

      // FIDE parser
      const fideData: { standard?: number; rapid?: number; blitz?: number; title?: ChessTitle; name?: string; country?: string } = {};

      const extractGameBlock = (selectors: string[]) => {
        for (const sel of selectors) {
          const els = doc.querySelectorAll(sel);
          for (let i = 0; i < els.length; i++) {
            const el = els[i];
            const ps = el.querySelectorAll('p');
            for (let j = 0; j < ps.length; j++) {
              const num = getNum(ps[j].textContent);
              if (num) return num;
            }
            const direct = getNum(el.textContent);
            if (direct) return direct;
          }
        }
        return null;
      };

      const stdVal = extractGameBlock(['.profile-standart.profile-game', '.profile-game.profile-standart', '.profile-standart', '.profile-standard', '[class*="profile-standart"]', '[class*="profile-standard"]']);
      if (stdVal) fideData.standard = stdVal;

      const rapVal = extractGameBlock(['.profile-rapid.profile-game', '.profile-game.profile-rapid', '.profile-rapid', '[class*="profile-rapid"]']);
      if (rapVal) fideData.rapid = rapVal;

      const blzVal = extractGameBlock(['.profile-blitz.profile-game', '.profile-game.profile-blitz', '.profile-blitz', '[class*="profile-blitz"]']);
      if (blzVal) fideData.blitz = blzVal;

      // Regex fallbacks on snippet text
      if (!fideData.standard) {
        const m = snippet.match(/profile-standar[td][^"']*["'][\s\S]*?<p[^>]*>\s*(\d{3,4})\s*<\/p>/i) ||
                  snippet.match(/class=["'][^"']*profile-standar[td][^"']*profile-game[^"']*["'][\s\S]*?<p[^>]*>\s*(\d{3,4})\s*<\/p>/i);
        if (m) fideData.standard = parseInt(m[1], 10);
      }
      if (!fideData.rapid) {
        const m = snippet.match(/profile-rapid[^"']*["'][\s\S]*?<p[^>]*>\s*(\d{3,4})\s*<\/p>/i) ||
                  snippet.match(/class=["'][^"']*profile-rapid[^"']*profile-game[^"']*["'][\s\S]*?<p[^>]*>\s*(\d{3,4})\s*<\/p>/i);
        if (m) fideData.rapid = parseInt(m[1], 10);
      }
      if (!fideData.blitz) {
        const m = snippet.match(/profile-blitz[^"']*["'][\s\S]*?<p[^>]*>\s*(\d{3,4})\s*<\/p>/i) ||
                  snippet.match(/class=["'][^"']*profile-blitz[^"']*profile-game[^"']*["'][\s\S]*?<p[^>]*>\s*(\d{3,4})\s*<\/p>/i);
        if (m) fideData.blitz = parseInt(m[1], 10);
      }

      if (fideData.standard || fideData.rapid || fideData.blitz) {
        res.fide = fideData;
      }

      // CBX parser
      const cbxTable = doc.querySelector('#ContentPlaceHolder1_gdvRating, table[id*="gdvRating"]');
      if (cbxTable) {
        const trs = cbxTable.querySelectorAll('tr');
        if (trs.length >= 2) {
          const tds = trs[1].querySelectorAll('td');
          if (tds.length >= 4) {
            res.cbx = {
              standard: getNum(tds[1].textContent) || undefined,
              rapid: getNum(tds[2].textContent) || undefined,
              blitz: getNum(tds[3].textContent) || undefined,
            };
          }
        }
      }
    } catch {
      // ignore
    }

    return res;
  };

  // Web Scraping Trigger for FIDE & CBX
  const handleScrapeRatings = async (rawSnippetToUse?: string) => {
    if (!rawSnippetToUse && !formData.fideId && !formData.fideUrl && !formData.cbxId && !formData.cbxUrl) {
      setScrapeFeedback({
        type: 'warning',
        message: 'Informe o ID CBX (ex: 82235) ou ID FIDE para atualizar os ratings.'
      });
      return;
    }

    setIsScraping(true);
    setScrapeFeedback(null);

    // If snippet was pasted, check local parse first for immediate response
    if (rawSnippetToUse) {
      const localResult = parseLocalSnippet(rawSnippetToUse);
      if (localResult.fide?.standard || localResult.fide?.rapid || localResult.fide?.blitz || localResult.cbx?.standard || localResult.cbx?.rapid || localResult.cbx?.blitz) {
        const updates: Partial<typeof formData> = {};
        const foundList: string[] = [];

        if (localResult.fide) {
          if (localResult.fide.standard) {
            updates.ratingFideStandard = localResult.fide.standard;
            updates.ratingFide = localResult.fide.standard;
            foundList.push(`FIDE Standard: ${localResult.fide.standard}`);
          }
          if (localResult.fide.rapid) {
            updates.ratingFideRapid = localResult.fide.rapid;
            foundList.push(`FIDE Rapid: ${localResult.fide.rapid}`);
          }
          if (localResult.fide.blitz) {
            updates.ratingFideBlitz = localResult.fide.blitz;
            foundList.push(`FIDE Blitz: ${localResult.fide.blitz}`);
          }
        }

        if (localResult.cbx) {
          if (localResult.cbx.standard) {
            updates.ratingCbxStandard = localResult.cbx.standard;
            updates.ratingCbx = localResult.cbx.standard;
            foundList.push(`CBX Clássico: ${localResult.cbx.standard}`);
          }
          if (localResult.cbx.rapid) {
            updates.ratingCbxRapid = localResult.cbx.rapid;
            foundList.push(`CBX Rápido: ${localResult.cbx.rapid}`);
          }
          if (localResult.cbx.blitz) {
            updates.ratingCbxBlitz = localResult.cbx.blitz;
            foundList.push(`CBX Blitz: ${localResult.cbx.blitz}`);
          }
        }

        setFormData(prev => ({ ...prev, ...updates }));
        setIsScraping(false);
        setScrapeFeedback({
          type: 'success',
          message: 'Ratings extraídos do HTML colado com sucesso!',
          details: foundList.join(' • '),
        });
        return;
      }
    }

    try {
      const result: ScrapedRatingsResult = await playerService.scrapeRatings({
        fideId: formData.fideId,
        fideUrl: formData.fideUrl,
        cbxId: formData.cbxId,
        cbxUrl: formData.cbxUrl,
        rawSnippet: rawSnippetToUse,
      });

      const updates: Partial<typeof formData> = {};
      const foundList: string[] = [];

      // Process CBX scraped data
      if (result.cbx) {
        if (result.cbx.standard) {
          updates.ratingCbxStandard = result.cbx.standard;
          updates.ratingCbx = result.cbx.standard;
          foundList.push(`CBX Clássico: ${result.cbx.standard}`);
        }
        if (result.cbx.rapid) {
          updates.ratingCbxRapid = result.cbx.rapid;
          foundList.push(`CBX Rápido: ${result.cbx.rapid}`);
        }
        if (result.cbx.blitz) {
          updates.ratingCbxBlitz = result.cbx.blitz;
          foundList.push(`CBX Blitz: ${result.cbx.blitz}`);
        }
        if (result.cbx.state && (!formData.state || formData.state === 'SP')) {
          updates.state = result.cbx.state;
        }
        if (result.cbx.club && !formData.club) {
          updates.club = result.cbx.club;
        }
        if (result.cbx.name && !formData.name) {
          updates.name = result.cbx.name;
        }
        if (!formData.cbxUrl && formData.cbxId) {
          updates.cbxUrl = `https://www.cbx.org.br/jogador/${formData.cbxId.trim()}`;
        }
      }

      // Process FIDE scraped data
      if (result.fide) {
        if (result.fide.standard) {
          updates.ratingFideStandard = result.fide.standard;
          updates.ratingFide = result.fide.standard;
          foundList.push(`FIDE Standard: ${result.fide.standard}`);
        }
        if (result.fide.rapid) {
          updates.ratingFideRapid = result.fide.rapid;
          foundList.push(`FIDE Rapid: ${result.fide.rapid}`);
        }
        if (result.fide.blitz) {
          updates.ratingFideBlitz = result.fide.blitz;
          foundList.push(`FIDE Blitz: ${result.fide.blitz}`);
        }
        if (result.fide.title && (!formData.title || formData.title === 'Sem Título')) {
          updates.title = result.fide.title as ChessTitle;
        }
        if (result.fide.name && !formData.name) {
          updates.name = result.fide.name;
        }
        if (result.fide.country && (!formData.country || formData.country === 'Brasil')) {
          updates.country = result.fide.country;
        }
        if (result.fide.gender && !formData.gender) {
          updates.gender = result.fide.gender === 'F' ? 'F' : 'M';
        }
        if (!formData.fideUrl && formData.fideId) {
          updates.fideUrl = `https://ratings.fide.com/profile/${formData.fideId.trim()}`;
        }
      }

      setFormData(prev => ({
        ...prev,
        ...updates,
      }));

      if (foundList.length > 0) {
        setScrapeFeedback({
          type: 'success',
          message: 'Ratings obtidos com sucesso!',
          details: foundList.join(' • '),
        });
      } else {
        const errorMsg = result.fide?.error || result.cbx?.error || 'Nenhum rating numérico extraído.';
        setScrapeFeedback({
          type: 'warning',
          message: `Consulta realizada. ${errorMsg}`,
          details: 'Você também pode colar o HTML da FIDE através do botão "Colar HTML" ou digitar os ratings.',
        });
      }
    } catch (err: any) {
      setScrapeFeedback({
        type: 'error',
        message: err.message || 'Erro ao realizar web scraping.',
      });
    } finally {
      setIsScraping(false);
    }
  };

  // Parse direct pasted snippet from FIDE / CBX
  const handleParseSnippet = () => {
    if (!pasteSnippet.trim()) return;
    handleScrapeRatings(pasteSnippet);
    setShowPasteModal(false);
    setPasteSnippet('');
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'O nome completo é obrigatório.';
    }
    if (!formData.birthDate) {
      newErrors.birthDate = 'A data de nascimento é obrigatória.';
    }
    if (!formData.country.trim()) {
      newErrors.country = 'O país é obrigatório.';
    }
    if (!formData.state) {
      newErrors.state = 'O estado é obrigatório.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSave(formData);
  };

  const age = formData.birthDate ? calculateAge(formData.birthDate) : null;
  const category = formData.birthDate ? getAgeCategory(formData.birthDate) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-stone-200 shadow-2xl overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-800 text-amber-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold font-sans">
                {initialData ? 'Editar Jogador' : 'Novo Jogador'}
              </h2>
              <p className="text-[11px] text-stone-300">
                Cadastro e ratings FIDE / CBX (Standard, Rápido e Blitz)
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

        {/* Web Scraping Action Banner */}
        <div className="bg-stone-100/90 border-b border-stone-200 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-stone-900 text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-stone-900 block">
                Auto-Ratings FIDE & CBX
              </span>
              <span className="text-[11px] text-stone-600">
                Busca automática de ratings via Web Scraping
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold border border-stone-300 shadow-xs transition-all"
              title="Colar HTML ou texto da FIDE/CBX para extração instantânea"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-stone-600" />
              <span>Colar HTML</span>
            </button>

            <button
              type="button"
              onClick={() => handleScrapeRatings()}
              disabled={isScraping}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
            >
              {isScraping ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5 text-amber-400" />
                  <span>Buscar Ratings</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback Message if Scraped */}
        {scrapeFeedback && (
          <div className={`px-6 py-2.5 text-xs flex items-start gap-2 border-b ${
            scrapeFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : scrapeFeedback.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}>
            {scrapeFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold">{scrapeFeedback.message}</span>
              {scrapeFeedback.details && (
                <span className="block mt-0.5 font-mono text-[11px] text-stone-700">
                  {scrapeFeedback.details}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Section 1: Informações Pessoais */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> 1. Dados Pessoais & Titulação
            </h3>

            {/* Nome Completo */}
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Nome Completo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Luis Paulo Supi, Juliana Terao..."
                className={`w-full px-3.5 py-2 text-sm bg-stone-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all ${
                  errors.name ? 'border-rose-400 bg-rose-50/40' : 'border-stone-200'
                }`}
              />
              {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
            </div>

            {/* Titulação, Gênero e Data de Nascimento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Titulação */}
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Titulação <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value as ChessTitle })}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                >
                  {TITLES.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gênero */}
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Gênero <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                >
                  <option value="M">Masculino (M)</option>
                  <option value="F">Feminino (F)</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              {/* Data Nascimento */}
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Data de Nascimento <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className={`w-full px-3 py-2 text-sm bg-stone-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 ${
                    errors.birthDate ? 'border-rose-400' : 'border-stone-200'
                  }`}
                />
                {errors.birthDate && <p className="text-[11px] text-rose-500 mt-1">{errors.birthDate}</p>}
              </div>
            </div>

            {/* Age helper chip */}
            {age !== null && (
              <div className="p-2.5 bg-stone-100 rounded-xl flex items-center justify-between text-xs text-stone-700">
                <span>Idade calculada: <b className="text-stone-900">{age} anos</b></span>
                <span className="px-2 py-0.5 rounded bg-white font-mono font-bold text-stone-800 border border-stone-200">
                  Categoria FIDE: {category}
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Filiação, IDs & URLs */}
          <div className="space-y-4 pt-3 border-t border-stone-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> 2. Federação, IDs e Links
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  País <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Ex: Brasil, Argentina, USA..."
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Estado / UF <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 font-mono font-bold"
                >
                  {BRAZILIAN_STATES.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* IDs FIDE e CBX */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  ID FIDE Oficial
                </label>
                <input
                  type="text"
                  value={formData.fideId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      fideId: val,
                      fideUrl: val.trim() ? `https://ratings.fide.com/profile/${val.trim()}` : ''
                    }));
                  }}
                  placeholder="Ex: 2119934"
                  className="w-full px-3.5 py-2 text-sm font-mono bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  ID CBX Oficial
                </label>
                <input
                  type="text"
                  value={formData.cbxId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      cbxId: val,
                      cbxUrl: val.trim() ? `https://www.cbx.org.br/jogador/${val.trim()}` : ''
                    }));
                  }}
                  placeholder="Ex: 82235"
                  className="w-full px-3.5 py-2 text-sm font-mono bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>

            {/* URLs FIDE e CBX (Preenchidas automaticamente a partir do ID e não editáveis) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  URL FIDE <span className="text-[10px] font-normal text-stone-500">(Automático pelo ID)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="url"
                    value={formData.fideUrl}
                    readOnly
                    placeholder="Gerado automaticamente a partir do ID FIDE"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-stone-100 text-stone-600 border border-stone-200 rounded-xl cursor-not-allowed select-all focus:outline-none"
                  />
                  {formData.fideUrl ? (
                    <a
                      href={formData.fideUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 border border-stone-200 rounded-xl transition-all inline-flex items-center justify-center shrink-0 shadow-2xs"
                      title="Abrir perfil FIDE em nova aba"
                    >
                      <ExternalLink className="w-4 h-4 text-stone-700" />
                    </a>
                  ) : (
                    <span
                      className="p-2 bg-stone-50 text-stone-300 border border-stone-100 rounded-xl inline-flex items-center justify-center shrink-0 cursor-not-allowed"
                      title="Informe o ID FIDE para habilitar o link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  URL CBX <span className="text-[10px] font-normal text-stone-500">(Automático pelo ID)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="url"
                    value={formData.cbxUrl}
                    readOnly
                    placeholder="Gerado automaticamente a partir do ID CBX"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-stone-100 text-stone-600 border border-stone-200 rounded-xl cursor-not-allowed select-all focus:outline-none"
                  />
                  {formData.cbxUrl ? (
                    <a
                      href={formData.cbxUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 border border-stone-200 rounded-xl transition-all inline-flex items-center justify-center shrink-0 shadow-2xs"
                      title="Abrir perfil CBX em nova aba"
                    >
                      <ExternalLink className="w-4 h-4 text-stone-700" />
                    </a>
                  ) : (
                    <span
                      className="p-2 bg-stone-50 text-stone-300 border border-stone-100 rounded-xl inline-flex items-center justify-center shrink-0 cursor-not-allowed"
                      title="Informe o ID CBX para habilitar o link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Ratings FIDE (Standard, Rapid, Blitz) */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-900">
                  Ratings FIDE
                </h4>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-stone-200 text-stone-800 font-bold">
                Internacional
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-800 mb-1">
                  Standard (Clássico)
                </label>
                <input
                  type="number"
                  min="0"
                  max="3500"
                  value={formData.ratingFideStandard || formData.ratingFide || ''}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 0;
                    setFormData({ ...formData, ratingFideStandard: v, ratingFide: v });
                  }}
                  placeholder="Ex: 2580"
                  className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-800 mb-1">
                  Rapid (Rápido)
                </label>
                <input
                  type="number"
                  min="0"
                  max="3500"
                  value={formData.ratingFideRapid || ''}
                  onChange={(e) => setFormData({ ...formData, ratingFideRapid: Number(e.target.value) || 0 })}
                  placeholder="Ex: 2540"
                  className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-800 mb-1">
                  Blitz (Relâmpago)
                </label>
                <input
                  type="number"
                  min="0"
                  max="3500"
                  value={formData.ratingFideBlitz || ''}
                  onChange={(e) => setFormData({ ...formData, ratingFideBlitz: Number(e.target.value) || 0 })}
                  placeholder="Ex: 2635"
                  className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Ratings CBX (Standard, Rapid, Blitz) */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-900">
                  Ratings CBX
                </h4>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-stone-200 text-stone-800 font-bold">
                Nacional (Brasil)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-800 mb-1">
                  Clássico (Standard)
                </label>
                <input
                  type="number"
                  min="0"
                  max="3500"
                  value={formData.ratingCbxStandard || formData.ratingCbx || ''}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 0;
                    setFormData({ ...formData, ratingCbxStandard: v, ratingCbx: v });
                  }}
                  placeholder="Ex: 1710"
                  className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-800 mb-1">
                  Rápido
                </label>
                <input
                  type="number"
                  min="0"
                  max="3500"
                  value={formData.ratingCbxRapid || ''}
                  onChange={(e) => setFormData({ ...formData, ratingCbxRapid: Number(e.target.value) || 0 })}
                  placeholder="Ex: 1728"
                  className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-800 mb-1">
                  Blitz
                </label>
                <input
                  type="number"
                  min="0"
                  max="3500"
                  value={formData.ratingCbxBlitz || ''}
                  onChange={(e) => setFormData({ ...formData, ratingCbxBlitz: Number(e.target.value) || 0 })}
                  placeholder="Ex: 1661"
                  className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Clube e Observações */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Clube / Agremiação
              </label>
              <input
                type="text"
                value={formData.club}
                onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                placeholder="Ex: Clube de Xadrez de Curitiba, CXSP..."
                className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Observações
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ex: Integrante da equipe..."
                className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>
          </div>

          {/* Footer Save Actions */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 border border-stone-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Salvando...' : initialData ? 'Atualizar Jogador' : 'Salvar Cadastro'}</span>
            </button>
          </div>
        </form>

        {/* Snippet / HTML Paste Sub-Modal */}
        {showPasteModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-xl w-full border border-stone-300 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardPaste className="w-5 h-5 text-stone-900" />
                  <h3 className="text-sm font-bold text-stone-900">
                    Colar HTML ou Texto do Perfil
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                Cole abaixo o trecho HTML da FIDE (ex: <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-800 font-mono text-[11px]">&lt;div class="profile-games"&gt;...&lt;/div&gt;</code>) ou a tabela da CBX para preencher os ratings Standard, Rapid e Blitz automaticamente:
              </p>

              <textarea
                rows={6}
                value={pasteSnippet}
                onChange={(e) => setPasteSnippet(e.target.value)}
                placeholder='Cole aqui o HTML do perfil FIDE ou CBX...'
                className="w-full p-3 text-xs font-mono bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleParseSnippet}
                  disabled={!pasteSnippet.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-lg shadow-xs disabled:opacity-50"
                >
                  Extrair Ratings
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
