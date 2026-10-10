import React, { useState } from 'react';
import { Tournament, TournamentStanding, Player, SwissExportConfig } from '../types/chess';
import { 
  exportTournamentStandingsToPDF, 
  exportToSwissManagerExcel,
  exportToSwissManagerXML 
} from '../lib/exportUtils';
import { 
  isPlayerEnrolledInTournament, 
  findMatchingPlayer, 
  normalizeName 
} from '../lib/playerMatching';
import { 
  Swords, 
  Plus, 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Trophy, 
  FileText, 
  FileSpreadsheet,
  FileCode,
  Edit, 
  Trash2, 
  CheckCircle2, 
  UserPlus, 
  Save, 
  X,
  Sparkles,
  ChevronRight,
  Shield,
  ExternalLink,
  Globe,
  AlertCircle,
  Loader2,
  Zap,
  Timer,
  Search,
  Check,
  UserMinus,
  TrendingUp
} from 'lucide-react';
import { PlayerProfileModal } from './PlayerProfileModal';

interface TournamentManagerProps {
  tournaments: Tournament[];
  players: Player[];
  isAdmin: boolean;
  onAddTournament: (tournament: Omit<Tournament, 'id'>) => Promise<void>;
  onUpdateTournament: (id: string, tournament: Partial<Tournament>) => Promise<void>;
  onDeleteTournament: (id: string) => Promise<void>;
  onUpdateStandings: (id: string, standings: TournamentStanding[]) => Promise<void>;
  onViewPlayer?: (player: Player) => void;
}

export const TournamentManager: React.FC<TournamentManagerProps> = ({
  tournaments,
  players,
  isAdmin,
  onAddTournament,
  onUpdateTournament,
  onDeleteTournament,
  onUpdateStandings,
  onViewPlayer,
}) => {
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(
    tournaments.length > 0 ? tournaments[0] : null
  );

  const activeTournament = selectedTournament || (tournaments.length > 0 ? tournaments[0] : null);

  const [internalProfilePlayer, setInternalProfilePlayer] = useState<Player | null>(null);

  const handleViewPlayer = (player: Player) => {
    if (onViewPlayer) {
      onViewPlayer(player);
    } else {
      setInternalProfilePlayer(player);
    }
  };

  const handleViewPlayerFromStanding = (standing: TournamentStanding, matched?: Player | null) => {
    if (matched) {
      handleViewPlayer(matched);
      return;
    }

    const isFemale = standing.playerName.toLowerCase().includes('maria') ||
      standing.playerName.toLowerCase().includes('ana') ||
      standing.playerName.toLowerCase().includes('laura') ||
      standing.playerName.toLowerCase().includes('julia');

    const fallbackPlayer: Player = {
      id: standing.playerId || `p-${standing.fideId || standing.cbxId || standing.playerName}`,
      name: standing.playerName,
      title: (standing.title as any) || 'Sem Título',
      fideId: standing.fideId || '',
      cbxId: standing.cbxId || '',
      gender: isFemale ? 'F' : 'M',
      birthDate: '',
      country: 'BRA',
      state: activeTournament?.state || 'DF',
      ratingFideStandard: 0,
      ratingFideRapid: 0,
      ratingFideBlitz: 0,
      ratingCbxStandard: 0,
      ratingCbxRapid: 0,
      ratingCbxBlitz: 0,
      fideUrl: standing.fideId ? `https://ratings.fide.com/profile/${standing.fideId}` : '',
      cbxUrl: standing.cbxId ? `https://www.cbx.org.br/jogador/${standing.cbxId}` : '',
    };
    handleViewPlayer(fallbackPlayer);
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddParticipantsModalOpen, setIsAddParticipantsModalOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [deleteConfirmTournament, setDeleteConfirmTournament] = useState<Tournament | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Tournament Form state
  const [formData, setFormData] = useState<Omit<Tournament, 'id'>>({
    name: '',
    city: '',
    state: 'SP',
    startDate: '',
    endDate: '',
    rounds: 6,
    timeControl: 'Pensado (90m + 30s)',
    type: 'standard',
    status: 'Planejado',
    arbiters: '',
    organizer: '',
    chessResultsUrl: '',
    participants: [],
    standings: [],
  });

  // Participant search & instant add state
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [isAddingPlayerId, setIsAddingPlayerId] = useState<string | null>(null);

  // Player removal confirmation state
  const [playerToRemove, setPlayerToRemove] = useState<TournamentStanding | null>(null);
  const [isRemovingPlayer, setIsRemovingPlayer] = useState(false);

  // Standings editor state
  const [editingStandings, setEditingStandings] = useState<TournamentStanding[]>([]);

  // Update active tournament reference if list changes
  React.useEffect(() => {
    if (selectedTournament) {
      const found = tournaments.find((t) => t.id === selectedTournament.id);
      if (found) setSelectedTournament(found);
    } else if (tournaments.length > 0) {
      setSelectedTournament(tournaments[0]);
    }
  }, [tournaments]);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      city: '',
      state: 'SP',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      rounds: 6,
      timeControl: 'Pensado (90m + 30s)',
      type: 'standard',
      status: 'Planejado',
      arbiters: '',
      organizer: '',
      chessResultsUrl: '',
      participants: [],
      standings: [],
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (t: Tournament) => {
    setFormData({
      name: t.name,
      city: t.city,
      state: t.state,
      startDate: t.startDate,
      endDate: t.endDate || '',
      rounds: t.rounds,
      timeControl: t.timeControl,
      type: t.type || 'standard',
      status: t.status,
      arbiters: t.arbiters || '',
      organizer: t.organizer || '',
      chessResultsUrl: t.chessResultsUrl || '',
      participants: t.participants || [],
      standings: t.standings || [],
    });
    setIsEditModalOpen(true);
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    await onAddTournament(formData);
    setIsCreateModalOpen(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament?.id || !formData.name.trim()) return;
    await onUpdateTournament(selectedTournament.id, formData);
    setIsEditModalOpen(false);
  };

  const searchedPlayers = React.useMemo(() => {
    const term = playerSearchTerm.trim().toLowerCase();
    if (!term) return [];
    return players.filter((p) => p.name.toLowerCase().includes(term));
  }, [players, playerSearchTerm]);

  const handleOpenParticipantsModal = () => {
    if (!activeTournament) return;
    setPlayerSearchTerm('');
    setIsAddParticipantsModalOpen(true);
  };

  const handleInstantAddPlayer = async (player: Player) => {
    if (!activeTournament?.id) return;
    const pId = player.id || player.name;

    // Verify if already registered using robust helper
    const isAlreadyRegistered = isPlayerEnrolledInTournament(player, activeTournament);
    if (isAlreadyRegistered) return;

    setIsAddingPlayerId(player.id || pId);
    try {
      const currentStandings = activeTournament.standings || [];
      const newStanding: TournamentStanding = {
        playerId: player.id || pId,
        playerName: player.name,
        title: player.title,
        fideId: player.fideId || '',
        cbxId: player.cbxId || '',
        points: 0,
        rank: currentStandings.length + 1,
        buchholz: 0,
        sonnebornBerger: 0,
        wins: 0,
      };

      const currentParticipants = activeTournament.participants || [];
      const updatedParticipants = currentParticipants.includes(player.id || pId)
        ? currentParticipants
        : [...currentParticipants, player.id || pId];
      const updatedStandings = [...currentStandings, newStanding];

      await onUpdateTournament(activeTournament.id, {
        participants: updatedParticipants,
        standings: updatedStandings,
      });
    } finally {
      setIsAddingPlayerId(null);
    }
  };

  const handleConfirmRemovePlayer = async () => {
    if (!activeTournament?.id || !playerToRemove) return;
    setIsRemovingPlayer(true);
    try {
      const targetId = playerToRemove.playerId;
      const targetNameNorm = normalizeName(playerToRemove.playerName);

      const remainingParticipants = (activeTournament.participants || []).filter(
        (id) => id !== targetId && normalizeName(id) !== targetNameNorm
      );

      const remainingStandings = (activeTournament.standings || [])
        .filter((s) => {
          if (targetId && s.playerId && s.playerId === targetId) return false;
          if (s.playerName && normalizeName(s.playerName) === targetNameNorm) return false;
          return true;
        })
        .map((s, idx) => ({
          ...s,
          rank: s.rank !== undefined ? s.rank : idx + 1,
        }));

      await onUpdateTournament(activeTournament.id, {
        participants: remainingParticipants,
        standings: remainingStandings,
      });

      setPlayerToRemove(null);
    } finally {
      setIsRemovingPlayer(false);
    }
  };

  const handleOpenScoreModal = () => {
    if (!selectedTournament) return;
    const current = selectedTournament.standings || [];
    setEditingStandings(JSON.parse(JSON.stringify(current)));
    setIsScoreModalOpen(true);
  };

  const handleSaveScores = async () => {
    if (!selectedTournament?.id) return;
    // Sort standings by rank ascending, then points descending
    const sorted = [...editingStandings].sort((a, b) => {
      const rankA = a.rank !== undefined ? a.rank : 999;
      const rankB = b.rank !== undefined ? b.rank : 999;
      if (rankA !== rankB) return rankA - rankB;
      return b.points - a.points;
    });

    await onUpdateStandings(selectedTournament.id, sorted);
    setIsScoreModalOpen(false);
  };

  const handleConfirmDeleteTournament = async () => {
    if (!deleteConfirmTournament?.id) return;
    setIsDeleting(true);
    try {
      const deletedId = deleteConfirmTournament.id;
      await onDeleteTournament(deletedId);
      setDeleteConfirmTournament(null);
      if (selectedTournament?.id === deletedId) {
        const remaining = tournaments.filter((t) => t.id !== deletedId);
        setSelectedTournament(remaining.length > 0 ? remaining[0] : null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportSwissManager = (t: Tournament) => {
    const standings = t.standings || [];
    const participantIds = t.participants || [];

    const exportList: Player[] = [];

    if (standings.length > 0) {
      standings.forEach((s, idx) => {
        const matched = findMatchingPlayer(s, players);
        exportList.push({
          id: s.playerId || `p-${idx + 1}`,
          name: s.playerName,
          title: (s.title as any) || matched?.title || 'Sem Título',
          fideId: s.fideId || matched?.fideId,
          cbxId: s.cbxId || matched?.cbxId,
          gender: matched?.gender || 'M',
          birthDate: matched?.birthDate || '',
          country: matched?.country || 'BRA',
          state: matched?.state || t.state || '',
          ratingFideStandard: matched?.ratingFideStandard || matched?.ratingFide || 0,
          ratingFideRapid: matched?.ratingFideRapid || 0,
          ratingFideBlitz: matched?.ratingFideBlitz || 0,
          ratingCbxStandard: matched?.ratingCbxStandard || matched?.ratingCbx || 0,
          ratingCbxRapid: matched?.ratingCbxRapid || 0,
          ratingCbxBlitz: matched?.ratingCbxBlitz || 0,
          club: matched?.club || '',
        });
      });
    } else if (participantIds.length > 0) {
      participantIds.forEach((pId, idx) => {
        const matched = players.find((p) => (p.id || p.fideId || p.name) === pId);
        if (matched) {
          exportList.push(matched);
        } else {
          exportList.push({
            id: pId,
            name: pId,
            title: 'Sem Título',
            gender: 'M',
            birthDate: '',
            country: 'BRA',
            state: t.state,
          });
        }
      });
    }

    if (exportList.length === 0) {
      return;
    }

    const tType = t.type || 'standard';
    const config: SwissExportConfig = {
      delimiter: ';',
      includeHeader: true,
      format: 'xlsx',
      fideRatingModality: tType === 'rapid' ? 'rapid' : tType === 'blitz' ? 'blitz' : 'standard',
      cbxRatingModality: tType === 'rapid' ? 'rapid' : tType === 'blitz' ? 'blitz' : 'standard',
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
    };

    const safeName = t.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
    exportToSwissManagerExcel(exportList, config, `swiss_manager_${safeName}.xlsx`);
  };

  const handleExportSwissManagerXML = (t: Tournament) => {
    const standings = t.standings || [];
    const participantIds = t.participants || [];

    const exportList: Player[] = [];

    if (standings.length > 0) {
      standings.forEach((s, idx) => {
        const matched = findMatchingPlayer(s, players);
        exportList.push({
          id: s.playerId || `p-${idx + 1}`,
          name: s.playerName,
          title: (s.title as any) || matched?.title || 'Sem Título',
          fideId: s.fideId || matched?.fideId,
          cbxId: s.cbxId || matched?.cbxId,
          gender: matched?.gender || 'M',
          birthDate: matched?.birthDate || '',
          country: matched?.country || 'BRA',
          state: matched?.state || t.state || '',
          ratingFideStandard: matched?.ratingFideStandard || matched?.ratingFide || 0,
          ratingFideRapid: matched?.ratingFideRapid || 0,
          ratingFideBlitz: matched?.ratingFideBlitz || 0,
          ratingCbxStandard: matched?.ratingCbxStandard || matched?.ratingCbx || 0,
          ratingCbxRapid: matched?.ratingCbxRapid || 0,
          ratingCbxBlitz: matched?.ratingCbxBlitz || 0,
          club: matched?.club || '',
        });
      });
    } else if (participantIds.length > 0) {
      participantIds.forEach((pId, idx) => {
        const matched = players.find((p) => (p.id || p.fideId || p.name) === pId);
        if (matched) {
          exportList.push(matched);
        } else {
          exportList.push({
            id: pId,
            name: pId,
            title: 'Sem Título',
            gender: 'M',
            birthDate: '',
            country: 'BRA',
            state: t.state,
          });
        }
      });
    }

    if (exportList.length === 0) {
      return;
    }

    const tType = t.type || 'standard';
    const config: Partial<SwissExportConfig> = {
      fideRatingModality: tType === 'rapid' ? 'rapid' : tType === 'blitz' ? 'blitz' : 'standard',
      cbxRatingModality: tType === 'rapid' ? 'rapid' : tType === 'blitz' ? 'blitz' : 'standard',
    };

    const safeName = t.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
    exportToSwissManagerXML(exportList, config, `swiss_manager_${safeName}.xml`);
  };

  const getModalityBadge = (type?: string, isSelected?: boolean) => {
    switch (type) {
      case 'blitz':
        return {
          label: 'Blitz',
          icon: Zap,
          cardClass: isSelected
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            : 'bg-amber-50 text-amber-700 border-amber-200',
          headerClass: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'rapid':
        return {
          label: 'Rapid',
          icon: Timer,
          cardClass: isSelected
            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
            : 'bg-sky-50 text-sky-700 border-sky-200',
          headerClass: 'bg-sky-50 text-sky-800 border-sky-200',
        };
      case 'standard':
      default:
        return {
          label: 'Standard',
          icon: Trophy,
          cardClass: isSelected
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200',
          headerClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-stone-900 text-white">
                <Swords className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-extrabold text-stone-900 font-sans tracking-tight">
                Torneios
              </h1>
            </div>
            <p className="text-xs text-stone-700">
              Acompanhe competições, atletas inscritos e pontuações oficiais.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Torneio</span>
            </button>
          )}
      </div>

      {/* Main Tournaments Grid */}
      {tournaments.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-stone-200 shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-600 mb-3">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900">Nenhum torneio cadastrado</h3>
          <p className="text-xs text-stone-700 mt-1 max-w-sm mx-auto">
            Cadastre seu primeiro evento enxadrístico para associar participantes e gerenciar classificações.
          </p>
          {isAdmin && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-stone-800 transition-colors"
            >
              Criar Novo Torneio
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Tournaments List (4 Cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-700 px-1">
              Torneios Cadastrados ({tournaments.length})
            </div>

            <div className="space-y-2">
              {tournaments.map((t) => {
                const isSelected = activeTournament?.id === t.id;
                const modality = getModalityBadge(t.type, isSelected);
                const ModalityIcon = modality.icon;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTournament(t)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-stone-900 text-white border-stone-900 shadow-md scale-[1.01]'
                        : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-900 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full ${
                            t.status === 'Finalizado'
                              ? isSelected
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : t.status === 'Em Andamento'
                              ? isSelected
                                ? 'bg-amber-950 text-amber-300 border border-amber-700'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                              : isSelected
                              ? 'bg-stone-800 text-stone-300'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {t.status}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${modality.cardClass}`}>
                          <ModalityIcon className="w-2.5 h-2.5" />
                          {modality.label}
                        </span>
                      </div>
                      <span className={`text-xs font-mono ${isSelected ? 'text-stone-300' : 'text-stone-700'}`}>
                        {t.startDate}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm leading-tight mb-2 line-clamp-1">
                      {t.name}
                    </h3>

                    <div className="flex items-center justify-between text-xs">
                      <span className={`flex items-center gap-1 ${isSelected ? 'text-stone-300' : 'text-stone-700'}`}>
                        <MapPin className="w-3 h-3" /> {t.city} - {t.state}
                      </span>
                      <span className={`flex items-center gap-1 font-mono font-semibold ${isSelected ? 'text-stone-300' : 'text-stone-700'}`}>
                        <Users className="w-3 h-3" /> {(t.participants || []).length} jogadores
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Tournament Details & Standings (8 Cols) */}
          {activeTournament && (
            <div className="lg:col-span-8 space-y-6">
              
              {/* Active Tournament Card Details */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-stone-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-100 text-stone-800 border border-stone-200 uppercase">
                        {activeTournament.status}
                      </span>
                      {(() => {
                        const activeModality = getModalityBadge(activeTournament.type, false);
                        const ActiveIcon = activeModality.icon;
                        return (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${activeModality.headerClass}`}>
                            <ActiveIcon className="w-3 h-3" />
                            {activeModality.label}
                          </span>
                        );
                      })()}
                      <span className="text-xs text-stone-700">
                        {activeTournament.city} - {activeTournament.state}
                      </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-stone-900 font-sans">
                      {activeTournament.name}
                    </h2>
                  </div>

                  {/* Actions for Admin */}
                  <div className="flex flex-wrap items-center gap-2">
                    {activeTournament.chessResultsUrl && (
                      <a
                        href={activeTournament.chessResultsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-semibold transition-colors"
                        title="Ver no Chess-Results"
                      >
                        <Globe className="w-3.5 h-3.5 text-sky-600" />
                        <span>Chess-Results</span>
                        <ExternalLink className="w-3 h-3 text-sky-500" />
                      </a>
                    )}

                    <button
                      onClick={() => exportTournamentStandingsToPDF(activeTournament)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      title="Baixar classificação em PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-600" />
                      <span>PDF</span>
                    </button>

                    <button
                      onClick={() => handleExportSwissManager(activeTournament)}
                      disabled={(!activeTournament.standings || activeTournament.standings.length === 0) && (!activeTournament.participants || activeTournament.participants.length === 0)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      title="Exportar jogadores do torneio para planilha Excel (.xlsx) do Swiss-Manager"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Swiss-Manager (Excel)</span>
                    </button>

                    <button
                      onClick={() => handleExportSwissManagerXML(activeTournament)}
                      disabled={(!activeTournament.standings || activeTournament.standings.length === 0) && (!activeTournament.participants || activeTournament.participants.length === 0)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      title="Exportar jogadores do torneio para arquivo XML do Swiss-Manager (<Players><Player .../></Players>)"
                    >
                      <FileCode className="w-3.5 h-3.5 text-amber-600" />
                      <span>Swiss-Manager (XML)</span>
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(activeTournament)}
                          className="p-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors"
                          title="Editar dados do torneio"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmTournament(activeTournament)}
                          className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-stone-200 transition-colors"
                          title="Excluir torneio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Tournament Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-stone-100 text-xs">
                  <div>
                    <span className="text-stone-700 block mb-0.5">Data de Início</span>
                    <span className="font-bold text-stone-900 font-mono">
                      {activeTournament.startDate.split('-').reverse().join('/')}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-700 block mb-0.5">Rodadas</span>
                    <span className="font-bold text-stone-900 font-mono">
                      {activeTournament.rounds} Rodadas
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-700 block mb-0.5">Ritmo de Jogo</span>
                    <span className="font-bold text-stone-900 truncate block">
                      {activeTournament.timeControl}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-700 block mb-0.5">Organização</span>
                    <span className="font-bold text-stone-900 truncate block">
                      {activeTournament.organizer || 'FBX'}
                    </span>
                  </div>
                </div>

                {/* Standings Table Section */}
                <div className="pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <h3 className="font-bold text-sm text-stone-900">
                        Classificação Oficial
                      </h3>
                      <span className="text-xs font-mono text-stone-700">
                        ({(activeTournament.standings || []).length})
                      </span>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleOpenParticipantsModal}
                          className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold border border-stone-200 transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Inscrever</span>
                        </button>
                        <button
                          onClick={handleOpenScoreModal}
                          className="flex items-center gap-1 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Pontuações</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {(!activeTournament.standings || activeTournament.standings.length === 0) ? (
                    <div className="py-8 text-center bg-stone-50 rounded-xl border border-stone-200">
                      <p className="text-xs text-stone-700">
                        Nenhum jogador associado ou pontuação lançada neste torneio.
                      </p>
                      {isAdmin && (
                        <button
                          onClick={handleOpenParticipantsModal}
                          className="mt-2 text-xs font-bold text-stone-900 hover:underline inline-flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Associar enxadristas cadastrados
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-stone-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-stone-200 bg-stone-100 text-[11px] font-bold text-stone-600 uppercase">
                            <th className="py-2.5 px-3 w-12 text-center">Pos</th>
                            <th className="py-2.5 px-3">Jogador</th>
                            <th className="py-2.5 px-2 text-center">Título</th>
                            <th className="py-2.5 px-3">ID FIDE</th>
                            <th className="py-2.5 px-3">ID CBX</th>
                            <th className="py-2.5 px-3 text-right font-black">Pts</th>
                            {isAdmin && <th className="py-2.5 px-3 text-center w-12">Remover</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {activeTournament.standings.map((s, idx) => {
                            const matchedPlayer = findMatchingPlayer(s, players);
                            const isFemale = matchedPlayer?.gender === 'F';
                            const fideId = s.fideId || matchedPlayer?.fideId;
                            const cbxId = s.cbxId || matchedPlayer?.cbxId;

                            return (
                            <tr
                              key={s.playerId || idx}
                              className={`hover:bg-stone-50 transition-colors ${
                                idx === 0 ? 'bg-amber-50/40 font-semibold' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center font-mono font-bold">
                                {idx === 0 ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-stone-900 text-[11px]">
                                    1
                                  </span>
                                ) : idx === 1 ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-stone-300 text-stone-900 text-[11px]">
                                    2
                                  </span>
                                ) : idx === 2 ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-700/60 text-white text-[11px]">
                                    3
                                  </span>
                                ) : (
                                  s.rank || idx + 1
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <button
                                  type="button"
                                  onClick={() => handleViewPlayerFromStanding(s, matchedPlayer)}
                                  className={`font-bold flex items-center gap-1.5 text-left group hover:underline cursor-pointer transition-colors ${
                                    isFemale ? 'text-pink-600 hover:text-pink-700' : 'text-stone-900 hover:text-emerald-700'
                                  }`}
                                  title={`Ver perfil e histórico de rating de ${s.playerName}`}
                                >
                                  <span className="truncate">{s.playerName}</span>
                                  <TrendingUp className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-600 transition-colors opacity-70 group-hover:opacity-100 shrink-0" />
                                </button>
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                {s.title && s.title !== 'Sem Título' ? (
                                  <span className="px-1.5 py-0.5 rounded bg-stone-900 text-white text-[10px] font-mono">
                                    {s.title}
                                  </span>
                                ) : (
                                  <span className="text-stone-600">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-stone-700">
                                {fideId ? (
                                  <a
                                    href={matchedPlayer?.fideUrl || `https://ratings.fide.com/profile/${fideId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 hover:text-stone-950 font-bold hover:underline"
                                    title={`Abrir perfil FIDE de ${s.playerName} (${fideId})`}
                                  >
                                    <span>{fideId}</span>
                                    <img src="https://www.fide.com/img/logo1.png" width="16" height="16" alt="FIDE" className="inline-block shrink-0" />
                                  </a>
                                ) : (
                                  <span className="text-stone-400">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-stone-700">
                                {cbxId ? (
                                  <a
                                    href={matchedPlayer?.cbxUrl || `https://www.cbx.org.br/jogador/${cbxId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 hover:text-stone-950 font-bold hover:underline"
                                    title={`Abrir perfil CBX de ${s.playerName} (${cbxId})`}
                                  >
                                    <span>{cbxId}</span>
                                    <img src="https://cbx.org.br/files/textos/003659/000965.jpg" width="16" height="16" alt="CBX" className="inline-block shrink-0 rounded-xs" />
                                  </a>
                                ) : (
                                  <span className="text-stone-400">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-black text-stone-900 text-sm">
                                {s.points.toFixed(1)}
                              </td>
                              {isAdmin && (
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setPlayerToRemove(s)}
                                    title={`Remover ${s.playerName} do torneio`}
                                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Tournament */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-stone-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900">Cadastrar Novo Torneio</h3>
              <button onClick={() => setIsCreateModalOpen(false)}>
                <X className="w-5 h-5 text-stone-600" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-800 mb-1">Nome do Torneio *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Aberto do Brasil FBX 2026"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Ex: São Paulo"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    placeholder="SP"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              {/* Modalidade Tag Selector (Blitz, Rapid, Standard - Apenas 1) */}
              <div>
                <label className="block font-semibold text-stone-800 mb-1.5">
                  Modalidade do Torneio * <span className="text-[11px] font-normal text-stone-500">(Selecione apenas 1 opção)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'standard' })}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      formData.type === 'standard' || !formData.type
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-600/30'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Standard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'rapid' })}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      formData.type === 'rapid'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs ring-2 ring-sky-600/30'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Timer className="w-3.5 h-3.5" />
                    <span>Rapid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'blitz' })}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      formData.type === 'blitz'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-600/30'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Blitz</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Data de Início *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Rodadas</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.rounds}
                    onChange={(e) => setFormData({ ...formData, rounds: Number(e.target.value) || 5 })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Ritmo de Jogo</label>
                  <input
                    type="text"
                    value={formData.timeControl}
                    onChange={(e) => setFormData({ ...formData, timeControl: e.target.value })}
                    placeholder="Ex: Pensado 90+30, Rápido 15+10"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium"
                  >
                    <option value="Planejado">Planejado</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Finalizado">Finalizado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Árbitro(s)</label>
                  <input
                    type="text"
                    value={formData.arbiters}
                    onChange={(e) => setFormData({ ...formData, arbiters: e.target.value })}
                    placeholder="Ex: AI Fulano de Tal"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Organizador</label>
                  <input
                    type="text"
                    value={formData.organizer}
                    onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                    placeholder="Ex: FBX / Clube de Xadrez"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-800 mb-1">URL no Chess-Results</label>
                <input
                  type="url"
                  value={formData.chessResultsUrl}
                  onChange={(e) => setFormData({ ...formData, chessResultsUrl: e.target.value })}
                  placeholder="https://chess-results.com/tnr123456.aspx"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-stone-900 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  Salvar Torneio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Tournament */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-stone-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900">Editar Dados do Torneio</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-800 mb-1">Nome do Torneio *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Aberto do Brasil FBX 2026"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Ex: São Paulo"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    placeholder="SP"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono uppercase focus:ring-2 focus:ring-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Modalidade Tag Selector (Blitz, Rapid, Standard - Apenas 1) */}
              <div>
                <label className="block font-semibold text-stone-800 mb-1.5">
                  Modalidade do Torneio * <span className="text-[11px] font-normal text-stone-500">(Selecione apenas 1 opção)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'standard' })}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      formData.type === 'standard' || !formData.type
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-600/30'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Standard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'rapid' })}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      formData.type === 'rapid'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs ring-2 ring-sky-600/30'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Timer className="w-3.5 h-3.5" />
                    <span>Rapid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'blitz' })}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      formData.type === 'blitz'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-600/30'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Blitz</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Data de Início *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Data de Término</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Rodadas</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.rounds}
                    onChange={(e) => setFormData({ ...formData, rounds: Number(e.target.value) || 5 })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:ring-2 focus:ring-stone-900 focus:outline-hidden"
                  >
                    <option value="Planejado">Planejado</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Finalizado">Finalizado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-800 mb-1">Ritmo de Jogo</label>
                <input
                  type="text"
                  value={formData.timeControl}
                  onChange={(e) => setFormData({ ...formData, timeControl: e.target.value })}
                  placeholder="Ex: Pensado 90+30, Rápido 15+10, Blitz 3+2"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Árbitro(s)</label>
                  <input
                    type="text"
                    value={formData.arbiters}
                    onChange={(e) => setFormData({ ...formData, arbiters: e.target.value })}
                    placeholder="Ex: AI Fulano de Tal"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Organizador</label>
                  <input
                    type="text"
                    value={formData.organizer}
                    onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                    placeholder="Ex: FBX / Clube de Xadrez"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-800 mb-1">URL no Chess-Results</label>
                <input
                  type="url"
                  value={formData.chessResultsUrl}
                  onChange={(e) => setFormData({ ...formData, chessResultsUrl: e.target.value })}
                  placeholder="https://chess-results.com/tnr123456.aspx"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-stone-900 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enroll Players */}
      {isAddParticipantsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-stone-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-bold text-stone-900">Inscrever Jogadores no Torneio</h3>
                <p className="text-xs text-stone-600">Busque atletas cadastrados para inscrever imediatamente</p>
              </div>
              <button 
                onClick={() => setIsAddParticipantsModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5 text-stone-600" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                autoFocus
                value={playerSearchTerm}
                onChange={(e) => setPlayerSearchTerm(e.target.value)}
                placeholder="Pesquisar atleta por nome..."
                className="w-full pl-9 pr-9 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-stone-900 focus:bg-white focus:outline-hidden transition-all"
              />
              {playerSearchTerm && (
                <button
                  type="button"
                  onClick={() => setPlayerSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 rounded cursor-pointer"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Players Search Results / Empty State */}
            <div className="min-h-[180px] max-h-72 overflow-y-auto space-y-2 pr-0.5">
              {!playerSearchTerm.trim() ? (
                <div className="py-10 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200 flex flex-col items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-2">
                    <Search className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-stone-800">
                    Digite o nome do atleta para pesquisar
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5 max-w-xs">
                    Os atletas serão listados conforme a busca para você adicionar ao torneio com um clique.
                  </p>
                </div>
              ) : searchedPlayers.length === 0 ? (
                <div className="py-10 text-center bg-stone-50 rounded-xl border border-stone-200">
                  <p className="text-xs font-bold text-stone-700">
                    Nenhum atleta encontrado com o nome "{playerSearchTerm}"
                  </p>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Verifique se o nome foi digitado corretamente ou cadastre o jogador no sistema.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {searchedPlayers.map((p) => {
                    const pKey = p.id || p.name;
                    const isEnrolled = isPlayerEnrolledInTournament(p, activeTournament);
                    const isAddingThis = isAddingPlayerId === (p.id || pKey);

                    return (
                      <div
                        key={pKey}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50/70 border border-stone-200 hover:border-stone-300 transition-all text-xs"
                      >
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleViewPlayer(p)}
                              className={`font-bold truncate text-left hover:underline cursor-pointer flex items-center gap-1 group ${
                                p.gender === 'F' ? 'text-pink-600 hover:text-pink-700' : 'text-stone-900 hover:text-emerald-700'
                              }`}
                              title={`Ver perfil e histórico de rating de ${p.name}`}
                            >
                              <span className="truncate">{p.name}</span>
                              <TrendingUp className="w-3 h-3 text-stone-400 group-hover:text-emerald-600 shrink-0 opacity-70 group-hover:opacity-100" />
                            </button>
                            {p.title && p.title !== 'Sem Título' && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-stone-900 text-white">
                                {p.title}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-mono text-stone-500 mt-0.5">
                            {p.cbxId && <span>CBX: <strong className="text-stone-700">{p.cbxId}</strong></span>}
                            {p.fideId && <span>FIDE: <strong className="text-stone-700">{p.fideId}</strong></span>}
                            {p.state && <span className="font-semibold text-stone-700">{p.state}</span>}
                          </div>
                        </div>

                        <div>
                          {isEnrolled ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold select-none cursor-default">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Inscrito</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isAddingThis || !!isAddingPlayerId}
                              onClick={() => handleInstantAddPlayer(p)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isAddingThis ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <UserPlus className="w-3.5 h-3.5" />
                              )}
                              <span>Adicionar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer with only Close Button */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs">
              <span className="font-mono text-stone-500 text-[11px]">
                {(activeTournament?.standings || []).length} atleta(s) no torneio
              </span>
              <button
                type="button"
                onClick={() => setIsAddParticipantsModalOpen(false)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Scores / Standings */}
      {isScoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-stone-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-bold text-stone-900">Lançamento de Pontuações & Colocações</h3>
                <p className="text-xs text-stone-700">Informe a colocação (posição) e a pontuação de cada enxadrista</p>
              </div>
              <button onClick={() => setIsScoreModalOpen(false)}>
                <X className="w-5 h-5 text-stone-600" />
              </button>
            </div>

            <div className="space-y-3">
              {editingStandings.map((st, idx) => {
                const isFemale = players.find(p => p.id === st.playerId || p.name === st.playerName || (p.fideId && p.fideId === st.fideId))?.gender === 'F';
                return (
                <div key={st.playerId || idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold ${isFemale ? 'text-pink-600' : 'text-stone-900'}`}>{st.playerName}</span>
                    <span className="font-mono text-stone-700">{st.title && st.title !== 'Sem Título' ? st.title : 'S/T'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">Colocação (Posição)</label>
                      <input
                        type="number"
                        min="1"
                        value={st.rank !== undefined ? st.rank : idx + 1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 1;
                          setEditingStandings((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, rank: val } : item))
                          );
                        }}
                        className="w-full p-2 bg-white border border-stone-200 rounded-lg font-bold font-mono focus:ring-2 focus:ring-stone-900 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">Pontos (Pts)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={st.points}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setEditingStandings((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, points: val } : item))
                          );
                        }}
                        className="w-full p-2 bg-white border border-stone-200 rounded-lg font-black font-mono focus:ring-2 focus:ring-stone-900 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setIsScoreModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveScores}
                className="px-4 py-2 bg-stone-900 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                Salvar Pontuações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tournament Confirmation Modal */}
      {deleteConfirmTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-900">Confirmar Exclusão de Torneio</h3>
                <p className="text-xs text-stone-700 leading-relaxed">
                  Tem certeza de que deseja excluir o torneio{' '}
                  <span className="font-bold text-stone-900">"{deleteConfirmTournament.name}"</span>?
                </p>
                <p className="text-[11px] text-stone-500">
                  Esta ação removerá o torneio permanentemente, incluindo sua lista de inscritos e tabela de pontuação.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmTournament(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100 border border-stone-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteTournament}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? 'Excluindo...' : 'Excluir Torneio'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Player from Tournament Confirmation Modal */}
      {playerToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-900">Confirmar Remoção de Jogador</h3>
                <p className="text-xs text-stone-700 leading-relaxed">
                  Tem certeza de que deseja remover o jogador{' '}
                  <span className="font-bold text-stone-900">"{playerToRemove.playerName}"</span> deste torneio?
                </p>
                <p className="text-[11px] text-stone-500">
                  O atleta será retirado da lista de inscritos e sua pontuação neste torneio será excluída.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                disabled={isRemovingPlayer}
                onClick={() => setPlayerToRemove(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100 border border-stone-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRemovingPlayer}
                onClick={handleConfirmRemovePlayer}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isRemovingPlayer && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isRemovingPlayer ? 'Removendo...' : 'Remover do Torneio'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fallback Player Profile Modal if not handled externally */}
      {internalProfilePlayer && (
        <PlayerProfileModal
          player={internalProfilePlayer}
          isOpen={!!internalProfilePlayer}
          onClose={() => setInternalProfilePlayer(null)}
          tournaments={tournaments}
        />
      )}
    </div>
  );
};
