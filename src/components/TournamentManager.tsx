import React, { useState } from 'react';
import { Tournament, TournamentStanding, Player, SwissExportConfig, TournamentCategory } from '../types/chess';
import { 
  exportTournamentStandingsToPDF, 
  exportToSwissManagerExcel,
  exportToSwissManagerXML,
  formatDisplayDate 
} from '../lib/exportUtils';
import { 
  isPlayerEnrolledInTournament, 
  findMatchingPlayer, 
  normalizeName,
  computeStandingsGenderRanks 
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
    ratedFide: true,
    ratedCbx: true,
    rankingType: 'absolute',
    genderSeparated: false,
    status: 'Planejado',
    arbiters: '',
    organizer: '',
    chessResultsUrl: '',
    participants: [],
    standings: [],
  });

  const [ratingLoadFeedback, setRatingLoadFeedback] = useState<string | null>(null);

  // Helper functions to check rating affiliations
  const isTournamentFideRated = (t?: Partial<Tournament> | null): boolean => {
    if (!t) return false;
    return t.ratedFide !== false;
  };

  const isTournamentCbxRated = (t?: Partial<Tournament> | null): boolean => {
    if (!t) return false;
    return t.ratedCbx !== false;
  };

  const isTournamentGenderSeparated = (t?: Partial<Tournament> | null): boolean => {
    if (!t) return false;
    return t.rankingType === 'gender_separated' || t.genderSeparated === true;
  };

  const getPlayerRatingForTournament = (
    player: Player,
    modality: TournamentCategory = 'standard',
    type: 'fide' | 'cbx'
  ): number | undefined => {
    if (type === 'fide') {
      if (modality === 'blitz') return player.ratingFideBlitz || undefined;
      if (modality === 'rapid') return player.ratingFideRapid || undefined;
      return player.ratingFideStandard || player.ratingFide || undefined;
    } else {
      if (modality === 'blitz') return player.ratingCbxBlitz || undefined;
      if (modality === 'rapid') return player.ratingCbxRapid || undefined;
      return player.ratingCbxStandard || player.ratingCbx || undefined;
    }
  };

  // Participant search & instant add state
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [isAddingPlayerId, setIsAddingPlayerId] = useState<string | null>(null);

  // Player removal confirmation state
  const [playerToRemove, setPlayerToRemove] = useState<TournamentStanding | null>(null);
  const [isRemovingPlayer, setIsRemovingPlayer] = useState(false);

  // Standings editor state
  const [editingStandings, setEditingStandings] = useState<TournamentStanding[]>([]);
  const [standingsGenderFilter, setStandingsGenderFilter] = useState<'all' | 'M' | 'F'>('all');

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
      ratedFide: true,
      ratedCbx: true,
      rankingType: 'absolute',
      genderSeparated: false,
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
      ratedFide: t.ratedFide !== false,
      ratedCbx: t.ratedCbx !== false,
      rankingType: t.rankingType || (t.genderSeparated ? 'gender_separated' : 'absolute'),
      genderSeparated: t.genderSeparated === true || t.rankingType === 'gender_separated',
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

  const displayedStandings = React.useMemo(() => {
    if (!activeTournament?.standings) return [];
    if (!isTournamentGenderSeparated(activeTournament) || standingsGenderFilter === 'all') {
      return activeTournament.standings;
    }
    return activeTournament.standings.filter((s) => {
      const matched = findMatchingPlayer(s, players);
      const isFemale = matched?.gender === 'F';
      return standingsGenderFilter === 'F' ? isFemale : !isFemale;
    });
  }, [activeTournament, standingsGenderFilter, players]);

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
      const modality = activeTournament.type || 'standard';
      const isFide = activeTournament.ratedFide !== false;
      const isCbx = activeTournament.ratedCbx !== false;

      const fideRtg = isFide ? getPlayerRatingForTournament(player, modality, 'fide') : undefined;
      const cbxRtg = isCbx ? getPlayerRatingForTournament(player, modality, 'cbx') : undefined;

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
        fideRating: fideRtg && fideRtg > 0 ? fideRtg : undefined,
        cbxRating: cbxRtg && cbxRtg > 0 ? cbxRtg : undefined,
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
    setRatingLoadFeedback(null);
    setIsScoreModalOpen(true);
  };

  const handleAutoLoadRatings = () => {
    if (!selectedTournament) return;
    const modality = selectedTournament.type || 'standard';
    const isFide = isTournamentFideRated(selectedTournament);
    const isCbx = isTournamentCbxRated(selectedTournament);

    let updatedCount = 0;

    const updatedStandings = editingStandings.map((st) => {
      const matched = findMatchingPlayer(st, players);
      if (!matched) return st;

      let newFideRating = st.fideRating;
      let newCbxRating = st.cbxRating;
      let changed = false;

      if (isFide && (!newFideRating || newFideRating === 0)) {
        const r = getPlayerRatingForTournament(matched, modality, 'fide');
        if (r && r > 0) {
          newFideRating = r;
          changed = true;
        }
      }

      if (isCbx && (!newCbxRating || newCbxRating === 0)) {
        const r = getPlayerRatingForTournament(matched, modality, 'cbx');
        if (r && r > 0) {
          newCbxRating = r;
          changed = true;
        }
      }

      if (changed) updatedCount++;

      const item: TournamentStanding = {
        playerId: st.playerId || '',
        playerName: st.playerName || '',
        points: typeof st.points === 'number' && !isNaN(st.points) ? Number(st.points) : 0,
        rank: typeof st.rank === 'number' && !isNaN(st.rank) ? Number(st.rank) : 1,
      };
      if (st.title && String(st.title).trim()) item.title = String(st.title).trim();
      if (st.fideId && String(st.fideId).trim()) item.fideId = String(st.fideId).trim();
      if (st.cbxId && String(st.cbxId).trim()) item.cbxId = String(st.cbxId).trim();
      if (st.buchholz !== undefined && st.buchholz !== null) item.buchholz = Number(st.buchholz);
      if (st.sonnebornBerger !== undefined && st.sonnebornBerger !== null) item.sonnebornBerger = Number(st.sonnebornBerger);
      if (st.wins !== undefined && st.wins !== null) item.wins = Number(st.wins);
      if (newFideRating && Number(newFideRating) > 0) item.fideRating = Number(newFideRating);
      if (newCbxRating && Number(newCbxRating) > 0) item.cbxRating = Number(newCbxRating);

      return item;
    });

    setEditingStandings(updatedStandings);

    if (updatedCount > 0) {
      setRatingLoadFeedback(`${updatedCount} atleta(s) tiveram seus ratings carregados com sucesso.`);
    } else {
      setRatingLoadFeedback('Todos os atletas já possuem rating preenchido ou não possuem rating cadastrado nesta modalidade.');
    }
    setTimeout(() => setRatingLoadFeedback(null), 4000);
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

    const isGenderSeparated = selectedTournament.rankingType === 'gender_separated' || selectedTournament.genderSeparated === true;
    let maleCount = 0;
    let femaleCount = 0;

    const sanitized: TournamentStanding[] = sorted.map((st) => {
      const matched = findMatchingPlayer(st, players);
      const isFemale = matched?.gender === 'F';
      let genderRank: number | undefined;

      if (isGenderSeparated) {
        if (isFemale) {
          femaleCount++;
          genderRank = femaleCount;
        } else {
          maleCount++;
          genderRank = maleCount;
        }
      }

      const item: TournamentStanding = {
        playerId: st.playerId || '',
        playerName: st.playerName || '',
        points: typeof st.points === 'number' && !isNaN(st.points) ? Number(st.points) : 0,
        rank: typeof st.rank === 'number' && !isNaN(st.rank) ? Number(st.rank) : 1,
      };
      if (genderRank !== undefined) item.genderRank = genderRank;
      if (st.title && String(st.title).trim()) item.title = String(st.title).trim();
      if (st.fideId && String(st.fideId).trim()) item.fideId = String(st.fideId).trim();
      if (st.cbxId && String(st.cbxId).trim()) item.cbxId = String(st.cbxId).trim();
      if (st.buchholz !== undefined && st.buchholz !== null && !isNaN(Number(st.buchholz))) {
        item.buchholz = Number(st.buchholz);
      }
      if (st.sonnebornBerger !== undefined && st.sonnebornBerger !== null && !isNaN(Number(st.sonnebornBerger))) {
        item.sonnebornBerger = Number(st.sonnebornBerger);
      }
      if (st.wins !== undefined && st.wins !== null && !isNaN(Number(st.wins))) {
        item.wins = Number(st.wins);
      }
      if (st.fideRating !== undefined && st.fideRating !== null && !isNaN(Number(st.fideRating)) && Number(st.fideRating) > 0) {
        item.fideRating = Number(st.fideRating);
      }
      if (st.cbxRating !== undefined && st.cbxRating !== null && !isNaN(Number(st.cbxRating)) && Number(st.cbxRating) > 0) {
        item.cbxRating = Number(st.cbxRating);
      }
      return item;
    });

    await onUpdateStandings(selectedTournament.id, sanitized);
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
                        {isTournamentFideRated(t) && (
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              isSelected
                                ? 'bg-blue-950/70 text-blue-200 border-blue-800'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                            title="Válido para Rating FIDE"
                          >
                            <img src="https://www.fide.com/img/logo1.png" width="10" height="10" alt="FIDE" className="shrink-0" />
                            <span>FIDE</span>
                          </span>
                        )}
                        {isTournamentCbxRated(t) && (
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              isSelected
                                ? 'bg-emerald-950/70 text-emerald-200 border-emerald-800'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                            title="Válido para Rating CBX"
                          >
                            <img src="https://cbx.org.br/files/textos/003659/000965.jpg" width="10" height="10" alt="CBX" className="shrink-0 rounded-xs" />
                            <span>CBX</span>
                          </span>
                        )}
                        {isTournamentGenderSeparated(t) && (
                          <span
                            className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              isSelected
                                ? 'bg-purple-950/70 text-purple-200 border-purple-800'
                                : 'bg-purple-50 text-purple-800 border-purple-200'
                            }`}
                            title="Classificação separada por naipe"
                          >
                            Naipe
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-mono ${isSelected ? 'text-stone-300' : 'text-stone-700'}`}>
                        {formatDisplayDate(t.startDate)}
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
                <div className="flex flex-col gap-3 pb-5 border-b border-stone-100">
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
                      {isTournamentFideRated(activeTournament) && (
                        <span>
                          <img src="https://www.fide.com/img/logo1.png" width="25" alt="FIDE" className="shrink-0" />
                        </span>
                      )}
                      {isTournamentCbxRated(activeTournament) && (
                        <span>
                          <img src="https://cbx.org.br/files/textos/003659/000965.jpg" width="25"  alt="CBX" className="shrink-0 rounded-xs" />
                        </span>
                      )}
                      {isTournamentGenderSeparated(activeTournament) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200" title="Premiação e classificação separada por naipe masculino e feminino">
                          <Users className="w-3 h-3 text-purple-700" />
                          Separado por Naipe
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200" title="Premiação e classificação unificada">
                          <Trophy className="w-3 h-3 text-amber-500" />
                          Absoluto
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-extrabold text-stone-900 font-sans">
                      {activeTournament.name}
                    </h2>
                  </div>

                  {/* Actions placed below the tournament name */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
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
                      onClick={() => exportTournamentStandingsToPDF(activeTournament, players)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      title="Baixar lista de jogadores inscritos em PDF"
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
                      <span>Swiss-Manager (XLS)</span>
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
                          className="flex items-center gap-1 px-3 py-1.5 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-xl border border-stone-200 text-xs font-semibold transition-colors"
                          title="Editar dados do torneio"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmTournament(activeTournament)}
                          className="flex items-center gap-1 px-3 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 text-xs font-semibold transition-colors"
                          title="Excluir torneio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Tournament Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-stone-100 text-xs">
                  <div>
                    <span className="text-stone-700 block mb-0.5">Local</span>
                    <span className="font-bold text-stone-900 font-mono">
                      {activeTournament.city} - {activeTournament.state}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-700 block mb-0.5">Data de Início</span>
                    <span className="font-bold text-stone-900 font-mono">
                      {formatDisplayDate(activeTournament.startDate)}
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
                </div>

                {/* Standings Table Section */}
                <div className="pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <h3 className="font-bold text-sm text-stone-900">
                          Classificação Oficial
                        </h3>
                        <span className="text-xs font-mono text-stone-700">
                          ({(activeTournament.standings || []).length})
                        </span>
                      </div>

                      {/* Filter by gender when tournament is gender-separated */}
                      {isTournamentGenderSeparated(activeTournament) && (activeTournament.standings || []).length > 0 && (
                        <div className="inline-flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 ml-2">
                          <button
                            type="button"
                            onClick={() => setStandingsGenderFilter('all')}
                            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              standingsGenderFilter === 'all'
                                ? 'bg-stone-900 text-white shadow-2xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            Todos
                          </button>
                          <button
                            type="button"
                            onClick={() => setStandingsGenderFilter('M')}
                            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              standingsGenderFilter === 'M'
                                ? 'bg-sky-600 text-white shadow-2xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            <span>Masculino</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setStandingsGenderFilter('F')}
                            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              standingsGenderFilter === 'F'
                                ? 'bg-pink-600 text-white shadow-2xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            <span>Feminino</span>
                          </button>
                        </div>
                      )}
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
                            <th className="py-2.5 px-2 text-center w-12"></th>
                            <th className="py-2.5 px-3">Jogador</th>
                            {isTournamentFideRated(activeTournament) && (
                              <th className="py-2.5 px-3 text-center">
                                <span className="inline-flex items-center gap-1 justify-center">
                                  <img src="https://www.fide.com/img/logo1.png" width="13" height="13" alt="FIDE" className="shrink-0" />
                                 
                                </span>
                              </th>
                            )}
                            {isTournamentCbxRated(activeTournament) && (
                              <th className="py-2.5 px-3 text-center">
                                <span className="inline-flex items-center gap-1 justify-center">
                                  <img src="https://cbx.org.br/files/textos/003659/000965.jpg" width="13" height="13" alt="CBX" className="shrink-0 rounded-xs" />
                                  
                                </span>
                              </th>
                            )}
                            <th className="py-2.5 px-3">ID FIDE</th>
                            <th className="py-2.5 px-3">ID CBX</th>
                            <th className="py-2.5 px-3 text-right font-black">Pts</th>
                            {isAdmin && <th className="py-2.5 px-3 text-center w-12">Remover</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {displayedStandings.map((s, idx) => {
                            const matchedPlayer = findMatchingPlayer(s, players);
                            const isFemale = matchedPlayer?.gender === 'F';
                            const fideId = s.fideId || matchedPlayer?.fideId;
                            const cbxId = s.cbxId || matchedPlayer?.cbxId;
                            const hasFide = isTournamentFideRated(activeTournament);
                            const hasCbx = isTournamentCbxRated(activeTournament);
                            const isSeparated = isTournamentGenderSeparated(activeTournament);

                            const genderRank = (() => {
                              if (s.genderRank !== undefined && s.genderRank > 0) return s.genderRank;
                              if (!isSeparated) return s.rank || idx + 1;
                              const sameGenderList = (activeTournament.standings || []).filter(item => {
                                const m = findMatchingPlayer(item, players);
                                const mIsFemale = m?.gender === 'F';
                                return isFemale ? mIsFemale : !mIsFemale;
                              });
                              const foundIndex = sameGenderList.findIndex(item => (item.playerId && item.playerId === s.playerId) || item.playerName === s.playerName);
                              return foundIndex >= 0 ? foundIndex + 1 : (s.rank || idx + 1);
                            })();

                            const isGold = isSeparated ? genderRank === 1 : (s.rank === 1 || idx === 0);
                            const isSilver = isSeparated ? genderRank === 2 : (s.rank === 2 || idx === 1);
                            const isBronze = isSeparated ? genderRank === 3 : (s.rank === 3 || idx === 2);

                            return (
                            <tr
                              key={s.playerId || idx}
                              className={`hover:bg-stone-50 transition-colors ${
                                isGold ? 'bg-amber-50/40 font-semibold' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center font-mono font-bold">
                                {isSeparated ? (
                                  <div className="flex flex-col items-center justify-center">
                                    <div className="flex items-center gap-1">
                                      {isGold ? (
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-stone-900 text-[11px] font-bold shadow-2xs" title="1º Lugar no Naipe">
                                          1
                                        </span>
                                      ) : isSilver ? (
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-stone-300 text-stone-900 text-[11px] font-bold shadow-2xs" title="2º Lugar no Naipe">
                                          2
                                        </span>
                                      ) : isBronze ? (
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-700/60 text-white text-[11px] font-bold shadow-2xs" title="3º Lugar no Naipe">
                                          3
                                        </span>
                                      ) : (
                                        <span className="text-stone-700 font-bold">{genderRank}º</span>
                                      )}
                                      <span className={`text-[9px] font-bold px-1 rounded ${isFemale ? 'bg-pink-100 text-pink-800' : 'bg-sky-100 text-sky-800'}`}>
                                        {isFemale ? 'F' : 'M'}
                                      </span>
                                    </div>
                                    {s.rank && s.rank !== genderRank && (
                                      <span className="text-[9px] text-stone-500 font-normal mt-0.5">
                                        ({s.rank}º geral)
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  idx === 0 ? (
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
                                  )
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                {s.title && s.title !== 'Sem Título' ? (
                                  <span className="px-1.5 py-0.5 rounded bg-stone-900 text-white text-[10px] font-mono font-bold">
                                    {s.title}
                                  </span>
                                ) : (
                                  <span className="text-stone-300 font-mono">-</span>
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
                              {hasFide && (
                                <td className="py-2.5 px-3 text-center font-mono font-bold text-stone-800">
                                  {s.fideRating && s.fideRating > 0 ? (
                                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200/70 font-mono font-bold text-xs" title="Rating no torneio">
                                      {s.fideRating}
                                    </span>
                                  ) : (() => {
                                    const fallback = matchedPlayer ? getPlayerRatingForTournament(matchedPlayer, activeTournament.type, 'fide') : undefined;
                                    return fallback && fallback > 0 ? (
                                      <span className="text-stone-500 font-mono text-xs" title="Rating do cadastro do atleta">
                                        {fallback}
                                      </span>
                                    ) : (
                                      <span className="text-stone-400 font-mono">-</span>
                                    );
                                  })()}
                                </td>
                              )}
                              {hasCbx && (
                                <td className="py-2.5 px-3 text-center font-mono font-bold text-stone-800">
                                  {s.cbxRating && s.cbxRating > 0 ? (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200/70 font-mono font-bold text-xs" title="Rating no torneio">
                                      {s.cbxRating}
                                    </span>
                                  ) : (() => {
                                    const fallback = matchedPlayer ? getPlayerRatingForTournament(matchedPlayer, activeTournament.type, 'cbx') : undefined;
                                    return fallback && fallback > 0 ? (
                                      <span className="text-stone-500 font-mono text-xs" title="Rating do cadastro do atleta">
                                        {fallback}
                                      </span>
                                    ) : (
                                      <span className="text-stone-400 font-mono">-</span>
                                    );
                                  })()}
                                </td>
                              )}
                              <td className="py-2.5 px-3 font-mono text-stone-700">
                                {fideId ? (
                                  <a
                                    href={matchedPlayer?.fideUrl || `https://ratings.fide.com/profile/${fideId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:text-stone-950 font-bold hover:underline"
                                    title={`Abrir perfil FIDE de ${s.playerName} (${fideId})`}
                                  >
                                    {fideId}
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
                                    className="hover:text-stone-950 font-bold hover:underline"
                                    title={`Abrir perfil CBX de ${s.playerName} (${cbxId})`}
                                  >
                                    {cbxId}
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

              {/* Validade de Rating (FIDE / CBX / Ambos) */}
              <div>
                <label className="block font-semibold text-stone-800 mb-1.5">
                  Válido para Rating * <span className="text-[11px] font-normal text-stone-500">(Clique nas logos para ativar ou desativar)</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* FIDE Option */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, ratedFide: !formData.ratedFide })}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      formData.ratedFide
                        ? 'bg-blue-50/90 border-blue-500 text-blue-950 shadow-xs ring-2 ring-blue-500/20'
                        : 'bg-stone-50 border-stone-200 text-stone-400 hover:bg-stone-100 hover:border-stone-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center p-1 bg-white border transition-colors ${
                      formData.ratedFide ? 'border-blue-200 shadow-xs' : 'border-stone-200'
                    }`}>
                      <img
                        src="https://www.fide.com/img/logo1.png"
                        alt="FIDE"
                        className={`w-6 h-6 object-contain transition-all duration-200 ${
                          formData.ratedFide ? 'grayscale-0 opacity-100 scale-100' : 'grayscale opacity-35 scale-90'
                        }`}
                      />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-xs">Rating FIDE</span>
                        {formData.ratedFide && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </div>
                      <p className={`text-[10px] font-normal truncate ${formData.ratedFide ? 'text-blue-700' : 'text-stone-400'}`}>
                        {formData.ratedFide ? 'Homologado FIDE' : 'Não pontua FIDE'}
                      </p>
                    </div>
                  </button>

                  {/* CBX Option */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, ratedCbx: !formData.ratedCbx })}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      formData.ratedCbx
                        ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
                        : 'bg-stone-50 border-stone-200 text-stone-400 hover:bg-stone-100 hover:border-stone-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center p-1 bg-white border transition-colors ${
                      formData.ratedCbx ? 'border-emerald-200 shadow-xs' : 'border-stone-200'
                    }`}>
                      <img
                        src="https://cbx.org.br/files/textos/003659/000965.jpg"
                        alt="CBX"
                        className={`w-6 h-6 object-contain rounded-xs transition-all duration-200 ${
                          formData.ratedCbx ? 'grayscale-0 opacity-100 scale-100' : 'grayscale opacity-35 scale-90'
                        }`}
                      />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-xs">Rating CBX</span>
                        {formData.ratedCbx && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </div>
                      <p className={`text-[10px] font-normal truncate ${formData.ratedCbx ? 'text-emerald-700' : 'text-stone-400'}`}>
                        {formData.ratedCbx ? 'Homologado CBX' : 'Não pontua CBX'}
                      </p>
                    </div>
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500 px-1">
                  <span>
                    {formData.ratedFide && formData.ratedCbx ? (
                      <span className="text-stone-700 font-semibold">✓ Válido para ambos (FIDE + CBX)</span>
                    ) : formData.ratedFide ? (
                      <span className="text-blue-700 font-semibold">✓ Válido apenas para Rating Internacional (FIDE)</span>
                    ) : formData.ratedCbx ? (
                      <span className="text-emerald-700 font-semibold">✓ Válido apenas para Rating Nacional (CBX)</span>
                    ) : (
                      <span className="text-amber-700 font-semibold">Torneio não pontuável / amistoso</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Formato de Premiação / Classificação (Absoluto vs Separado por Naipe) */}
              <div>
                <label className="block font-semibold text-stone-800 mb-1.5">
                  Classificação e Premiação *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rankingType: 'absolute', genderSeparated: false })}
                    className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.rankingType !== 'gender_separated' && !formData.genderSeparated
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs ring-2 ring-stone-900/20'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs flex items-center gap-1.5">
                        <Trophy className={`w-3.5 h-3.5 ${formData.rankingType !== 'gender_separated' && !formData.genderSeparated ? 'text-amber-400' : 'text-stone-500'}`} />
                        Absoluto (Geral)
                      </span>
                      {formData.rankingType !== 'gender_separated' && !formData.genderSeparated && (
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className={`text-[10px] leading-tight ${
                      formData.rankingType !== 'gender_separated' && !formData.genderSeparated ? 'text-stone-300' : 'text-stone-500'
                    }`}>
                      Classificação unificada entre todos os atletas. Pódio único (1º, 2º e 3º).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rankingType: 'gender_separated', genderSeparated: true })}
                    className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.rankingType === 'gender_separated' || formData.genderSeparated
                        ? 'bg-purple-900 text-white border-purple-900 shadow-xs ring-2 ring-purple-600/30'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs flex items-center gap-1.5">
                        <Users className={`w-3.5 h-3.5 ${formData.rankingType === 'gender_separated' || formData.genderSeparated ? 'text-purple-300' : 'text-stone-500'}`} />
                        Separado por Naipe
                      </span>
                      {(formData.rankingType === 'gender_separated' || formData.genderSeparated) && (
                        <Check className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                      )}
                    </div>
                    <p className={`text-[10px] leading-tight ${
                      formData.rankingType === 'gender_separated' || formData.genderSeparated ? 'text-purple-200' : 'text-stone-500'
                    }`}>
                      Pódios e premiações independentes para o naipe Masculino e Feminino.
                    </p>
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

              {/* Validade de Rating (FIDE / CBX / Ambos) */}
              <div>
                <label className="block font-semibold text-stone-800 mb-1.5">
                  Válido para Rating * <span className="text-[11px] font-normal text-stone-500">(Clique nas logos para ativar ou desativar)</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* FIDE Option */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, ratedFide: !formData.ratedFide })}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      formData.ratedFide
                        ? 'bg-blue-50/90 border-blue-500 text-blue-950 shadow-xs ring-2 ring-blue-500/20'
                        : 'bg-stone-50 border-stone-200 text-stone-400 hover:bg-stone-100 hover:border-stone-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center p-1 bg-white border transition-colors ${
                      formData.ratedFide ? 'border-blue-200 shadow-xs' : 'border-stone-200'
                    }`}>
                      <img
                        src="https://www.fide.com/img/logo1.png"
                        alt="FIDE"
                        className={`w-6 h-6 object-contain transition-all duration-200 ${
                          formData.ratedFide ? 'grayscale-0 opacity-100 scale-100' : 'grayscale opacity-35 scale-90'
                        }`}
                      />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-xs">Rating FIDE</span>
                        {formData.ratedFide && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </div>
                      <p className={`text-[10px] font-normal truncate ${formData.ratedFide ? 'text-blue-700' : 'text-stone-400'}`}>
                        {formData.ratedFide ? 'Homologado FIDE' : 'Não pontua FIDE'}
                      </p>
                    </div>
                  </button>

                  {/* CBX Option */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, ratedCbx: !formData.ratedCbx })}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      formData.ratedCbx
                        ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
                        : 'bg-stone-50 border-stone-200 text-stone-400 hover:bg-stone-100 hover:border-stone-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center p-1 bg-white border transition-colors ${
                      formData.ratedCbx ? 'border-emerald-200 shadow-xs' : 'border-stone-200'
                    }`}>
                      <img
                        src="https://cbx.org.br/files/textos/003659/000965.jpg"
                        alt="CBX"
                        className={`w-6 h-6 object-contain rounded-xs transition-all duration-200 ${
                          formData.ratedCbx ? 'grayscale-0 opacity-100 scale-100' : 'grayscale opacity-35 scale-90'
                        }`}
                      />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-xs">Rating CBX</span>
                        {formData.ratedCbx && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </div>
                      <p className={`text-[10px] font-normal truncate ${formData.ratedCbx ? 'text-emerald-700' : 'text-stone-400'}`}>
                        {formData.ratedCbx ? 'Homologado CBX' : 'Não pontua CBX'}
                      </p>
                    </div>
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500 px-1">
                  <span>
                    {formData.ratedFide && formData.ratedCbx ? (
                      <span className="text-stone-700 font-semibold">✓ Válido para ambos (FIDE + CBX)</span>
                    ) : formData.ratedFide ? (
                      <span className="text-blue-700 font-semibold">✓ Válido apenas para Rating Internacional (FIDE)</span>
                    ) : formData.ratedCbx ? (
                      <span className="text-emerald-700 font-semibold">✓ Válido apenas para Rating Nacional (CBX)</span>
                    ) : (
                      <span className="text-amber-700 font-semibold">Torneio não pontuável / amistoso</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Formato de Premiação / Classificação (Absoluto vs Separado por Naipe) */}
              <div>
                <label className="block font-semibold text-stone-800 mb-1.5">
                  Classificação e Premiação *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rankingType: 'absolute', genderSeparated: false })}
                    className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.rankingType !== 'gender_separated' && !formData.genderSeparated
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs ring-2 ring-stone-900/20'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs flex items-center gap-1.5">
                        <Trophy className={`w-3.5 h-3.5 ${formData.rankingType !== 'gender_separated' && !formData.genderSeparated ? 'text-amber-400' : 'text-stone-500'}`} />
                        Absoluto (Geral)
                      </span>
                      {formData.rankingType !== 'gender_separated' && !formData.genderSeparated && (
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className={`text-[10px] leading-tight ${
                      formData.rankingType !== 'gender_separated' && !formData.genderSeparated ? 'text-stone-300' : 'text-stone-500'
                    }`}>
                      Classificação unificada entre todos os atletas. Pódio único com os 3 primeiros colocados gerais.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rankingType: 'gender_separated', genderSeparated: true })}
                    className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.rankingType === 'gender_separated' || formData.genderSeparated
                        ? 'bg-purple-900 text-white border-purple-900 shadow-xs ring-2 ring-purple-600/30'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs flex items-center gap-1.5">
                        <Users className={`w-3.5 h-3.5 ${formData.rankingType === 'gender_separated' || formData.genderSeparated ? 'text-purple-300' : 'text-stone-500'}`} />
                        Separado por Naipe
                      </span>
                      {(formData.rankingType === 'gender_separated' || formData.genderSeparated) && (
                        <Check className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                      )}
                    </div>
                    <p className={`text-[10px] leading-tight ${
                      formData.rankingType === 'gender_separated' || formData.genderSeparated ? 'text-purple-200' : 'text-stone-500'
                    }`}>
                      Pódios e premiações independentes para o naipe Masculino e Feminino.
                    </p>
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
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-stone-900">Lançamento de Pontuações & Colocações</h3>
                <p className="text-xs text-stone-700">Informe a colocação, pontuação e ratings do torneio para cada enxadrista</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoLoadRatings}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer hover:border-amber-300"
                  title="Carregar ratings FIDE e/ou CBX correspondentes aos atletas cadastrados"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Carregar Ratings</span>
                </button>
                <button onClick={() => setIsScoreModalOpen(false)}>
                  <X className="w-5 h-5 text-stone-600" />
                </button>
              </div>
            </div>

            {ratingLoadFeedback && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
                <span>{ratingLoadFeedback}</span>
                <button onClick={() => setRatingLoadFeedback(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="space-y-3">
              {editingStandings.map((st, idx) => {
                const matched = findMatchingPlayer(st, players);
                const isFemale = matched?.gender === 'F';
                const isFideRated = isTournamentFideRated(selectedTournament);
                const isCbxRated = isTournamentCbxRated(selectedTournament);

                return (
                <div key={st.playerId || idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isFemale ? 'text-pink-600' : 'text-stone-900'}`}>{st.playerName}</span>
                      {st.title && st.title !== 'Sem Título' && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-stone-900 text-white">
                          {st.title}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-stone-500">
                      {st.fideId && <span>FIDE: <strong className="text-stone-700">{st.fideId}</strong></span>}
                      {st.cbxId && <span>CBX: <strong className="text-stone-700">{st.cbxId}</strong></span>}
                    </div>
                  </div>

                  <div className={`grid gap-3 text-xs ${
                    isFideRated && isCbxRated
                      ? 'grid-cols-2 sm:grid-cols-4'
                      : isFideRated || isCbxRated
                      ? 'grid-cols-2 sm:grid-cols-3'
                      : 'grid-cols-2'
                  }`}>
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

                    {isFideRated && (
                      <div>
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-700 mb-1">
                          <img src="https://www.fide.com/img/logo1.png" width="13" height="13" alt="FIDE" className="shrink-0" />
                          <span>Rating FIDE</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="3500"
                          placeholder="Sem rating"
                          value={st.fideRating !== undefined && st.fideRating !== null && st.fideRating > 0 ? st.fideRating : ''}
                          onChange={(e) => {
                            const raw = e.target.value.trim();
                            const num = raw === '' ? 0 : parseInt(raw, 10);
                            const val = !isNaN(num) && num > 0 ? num : undefined;
                            setEditingStandings((prev) =>
                              prev.map((item, i) => {
                                if (i !== idx) return item;
                                const updated = { ...item };
                                if (val) updated.fideRating = val;
                                else delete updated.fideRating;
                                return updated;
                              })
                            );
                          }}
                          className="w-full p-2 bg-white border border-stone-200 rounded-lg font-mono font-semibold text-xs focus:ring-2 focus:ring-stone-900 focus:outline-hidden"
                        />
                      </div>
                    )}

                    {isCbxRated && (
                      <div>
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-700 mb-1">
                          <img src="https://cbx.org.br/files/textos/003659/000965.jpg" width="13" height="13" alt="CBX" className="shrink-0 rounded-xs" />
                          <span>Rating CBX</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="3500"
                          placeholder="Sem rating"
                          value={st.cbxRating !== undefined && st.cbxRating !== null && st.cbxRating > 0 ? st.cbxRating : ''}
                          onChange={(e) => {
                            const raw = e.target.value.trim();
                            const num = raw === '' ? 0 : parseInt(raw, 10);
                            const val = !isNaN(num) && num > 0 ? num : undefined;
                            setEditingStandings((prev) =>
                              prev.map((item, i) => {
                                if (i !== idx) return item;
                                const updated = { ...item };
                                if (val) updated.cbxRating = val;
                                else delete updated.cbxRating;
                                return updated;
                              })
                            );
                          }}
                          className="w-full p-2 bg-white border border-stone-200 rounded-lg font-mono font-semibold text-xs focus:ring-2 focus:ring-stone-900 focus:outline-hidden"
                        />
                      </div>
                    )}
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
          allPlayers={players}
        />
      )}
    </div>
  );
};
