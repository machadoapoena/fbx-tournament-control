/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Player, Tournament, RatingHistoryEntry } from './types/chess';
import { playerService } from './lib/services/playerService';
import { tournamentService } from './lib/services/tournamentService';
import { testConnection } from './lib/firebase';
import { INITIAL_PLAYERS, INITIAL_TOURNAMENTS } from './lib/sampleData';

import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { PublicPlayerTable } from './components/PublicPlayerTable';
import { AdminPlayerManager } from './components/AdminPlayerManager';
import { PlayerFormModal } from './components/PlayerFormModal';
import { SwissExportModal } from './components/SwissExportModal';
import { TournamentManager } from './components/TournamentManager';
import { LoginModal } from './components/LoginModal';
import { PlayerProfileModal } from './components/PlayerProfileModal';

import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  Trophy,
  Users
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'players' | 'tournaments' | 'admin'>('dashboard');
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSavingPlayer, setIsSavingPlayer] = useState(false);

  // Admin authentication state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('chess_admin_auth') === 'true';
  });

  // Modal states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPlayerFormOpen, setIsPlayerFormOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isSwissModalOpen, setIsSwissModalOpen] = useState(false);
  const [swissSelectedIds, setSwissSelectedIds] = useState<string[]>([]);
  const [selectedProfilePlayer, setSelectedProfilePlayer] = useState<Player | null>(null);

  // Filter pass-through from stats cards
  const [appliedFilter, setAppliedFilter] = useState<{ type: 'gender' | 'title' | 'state'; value: string } | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // 1. Initial Firestore subscriptions
  useEffect(() => {
    testConnection();

    // Subscribe to Players
    const unsubPlayers = playerService.subscribePlayers(
      (data) => {
        if (data.length === 0) {
          // If Firestore is empty on first boot, auto-populate with seed players
          playerService.seedInitialData().then((count) => {
            if (count > 0) {
              showToast(`${count} jogadores iniciais sincronizados com o Firebase.`);
            }
          });
        }
        setPlayers(data);
        setLoading(false);
      },
      (error) => {
        console.warn('Subscription notice:', error.message);
        setLoading(false);
      }
    );

    // Subscribe to Tournaments
    const unsubTournaments = tournamentService.subscribeTournaments(
      (data) => {
        if (data.length === 0) {
          tournamentService.seedInitialTournaments();
        }
        setTournaments(data);
      },
      (error) => {
        console.warn('Tournaments subscription notice:', error.message);
      }
    );

    return () => {
      unsubPlayers();
      unsubTournaments();
    };
  }, []);

  // Admin Login / Logout
  const handleLoginSuccess = () => {
    setIsAdmin(true);
    localStorage.setItem('chess_admin_auth', 'true');
    setActiveTab('admin');
    showToast('Acesso de Administrador concedido com sucesso!', 'success');
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('chess_admin_auth');
    if (activeTab === 'admin') {
      setActiveTab('dashboard');
    }
    showToast('Sessão administrativa encerrada.');
  };

  // Seed Data Trigger
  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const count = await playerService.seedInitialData();
      await tournamentService.seedInitialTournaments();
      showToast(`Base alimentada com ${count} jogadores e torneios de exemplo!`, 'success');
    } catch (error) {
      showToast('Erro ao carregar dados iniciais.', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  // Player Form Actions (Create & Edit)
  const handleOpenAddPlayer = () => {
    setEditingPlayer(null);
    setIsPlayerFormOpen(true);
  };

  const handleOpenEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setIsPlayerFormOpen(true);
  };

  const handleSavePlayer = async (playerData: Omit<Player, 'id'>) => {
    setIsSavingPlayer(true);
    try {
      if (editingPlayer?.id) {
        await playerService.updatePlayer(editingPlayer.id, playerData);
        showToast(`Jogador "${playerData.name}" atualizado com sucesso!`, 'success');
      } else {
        await playerService.addPlayer(playerData);
        showToast(`Jogador "${playerData.name}" cadastrado com sucesso no Firebase!`, 'success');
      }
      setIsPlayerFormOpen(false);
      setEditingPlayer(null);
    } catch (error) {
      console.error(error);
      showToast('Erro ao salvar os dados do jogador no Firebase.', 'error');
    } finally {
      setIsSavingPlayer(false);
    }
  };

  const handleDeletePlayer = async (id: string, name: string) => {
    try {
      await playerService.deletePlayer(id);
      showToast(`Jogador "${name}" excluído com sucesso.`, 'info');
    } catch (error) {
      showToast('Erro ao excluir o jogador do Firebase.', 'error');
    }
  };

  const handleUpdatePlayerHistory = async (
    playerId: string, 
    cbxHistory: RatingHistoryEntry[], 
    fideHistory: RatingHistoryEntry[]
  ) => {
    try {
      await playerService.updatePlayer(playerId, { cbxHistory, fideHistory });
      setSelectedProfilePlayer(prev => (prev && prev.id === playerId ? { ...prev, cbxHistory, fideHistory } : prev));
      showToast('Histórico oficial do jogador salvo com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar histórico do jogador:', error);
      showToast('Erro ao salvar histórico do jogador.', 'error');
    }
  };

  // Tournament Actions
  const handleAddTournament = async (tData: Omit<Tournament, 'id'>) => {
    try {
      await tournamentService.addTournament(tData);
      showToast(`Torneio "${tData.name}" cadastrado com sucesso!`, 'success');
    } catch (error) {
      showToast('Erro ao cadastrar torneio.', 'error');
    }
  };

  const handleUpdateTournament = async (id: string, tData: Partial<Tournament>) => {
    try {
      await tournamentService.updateTournament(id, tData);
      showToast('Dados do torneio atualizados.', 'success');
    } catch (error) {
      showToast('Erro ao atualizar dados do torneio.', 'error');
    }
  };

  const handleDeleteTournament = async (id: string) => {
    try {
      await tournamentService.deleteTournament(id);
      showToast('Torneio removido com sucesso.', 'info');
    } catch (error) {
      showToast('Erro ao excluir torneio.', 'error');
    }
  };

  const handleUpdateStandings = async (id: string, standings: any[]) => {
    try {
      await tournamentService.updateStandings(id, standings);
      showToast('Classificação e pontuações atualizadas!', 'success');
    } catch (error) {
      showToast('Erro ao atualizar pontuações.', 'error');
    }
  };

  // Filter navigation from stats charts to players table
  const handleSelectFilterFromStats = (type: 'gender' | 'title' | 'state', value: string) => {
    setAppliedFilter({ type, value });
    setActiveTab('players');
  };

  // Open Swiss-Manager Export Modal with pre-selected IDs
  const handleOpenSwissModalWithSelected = (selectedIds: string[]) => {
    setSwissSelectedIds(selectedIds);
    setIsSwissModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex flex-col selection:bg-stone-900 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 fade-in">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold border ${
              toast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-800'
                : toast.type === 'info'
                ? 'bg-stone-900 text-white border-stone-800'
                : 'bg-stone-900 text-emerald-400 border-stone-800'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-300" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onOpenSwissModal={() => {
          setSwissSelectedIds([]);
          setIsSwissModalOpen(true);
        }}
        onOpenAddPlayer={handleOpenAddPlayer}
        totalPlayers={players.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-stone-900 animate-spin" />
            <p className="text-xs text-stone-700 font-medium">
              Carregando base de enxadristas do Firebase...
            </p>
          </div>
        ) : (
          <>
            {/* View 1: Dashboard / Overview */}
            {activeTab === 'dashboard' && (
              <StatsOverview
                players={players}
                tournaments={tournaments}
                onSelectFilter={handleSelectFilterFromStats}
                onNavigateToPlayers={() => setActiveTab('players')}
                onNavigateToTournaments={() => setActiveTab('tournaments')}
              />
            )}

            {/* View 2: Public Players Table */}
            {activeTab === 'players' && (
              <PublicPlayerTable
                players={players}
                isAdmin={isAdmin}
                onOpenSwissModalWithSelected={handleOpenSwissModalWithSelected}
                initialFilter={appliedFilter}
                onClearInitialFilter={() => setAppliedFilter(null)}
                onViewPlayer={(p) => setSelectedProfilePlayer(p)}
                tournaments={tournaments}
              />
            )}

            {/* View 3: Tournaments Management */}
            {activeTab === 'tournaments' && (
              <TournamentManager
                tournaments={tournaments}
                players={players}
                isAdmin={isAdmin}
                onAddTournament={handleAddTournament}
                onUpdateTournament={handleUpdateTournament}
                onDeleteTournament={handleDeleteTournament}
                onUpdateStandings={handleUpdateStandings}
                onViewPlayer={(p) => setSelectedProfilePlayer(p)}
              />
            )}

            {/* View 4: Admin Panel (Protected) */}
            {activeTab === 'admin' && (
              <AdminPlayerManager
                players={players}
                onAddPlayer={handleOpenAddPlayer}
                onEditPlayer={handleOpenEditPlayer}
                onDeletePlayer={handleDeletePlayer}
                onSeedData={handleSeedData}
                isSeeding={isSeeding}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-700">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-stone-900 font-sans">ChessRegistry</span>
            <span>•</span>
            <span>Sistema Oficial de Cadastro de Jogadores de Xadrez & Torneios</span>
          </div>

          <div className="flex items-center gap-4 text-stone-700">
            <span>Compatível com Swiss-Manager</span>
            <span>•</span>
            <span>Sincronizado via Firebase Firestore</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccessLogin={handleLoginSuccess}
      />

      <PlayerFormModal
        isOpen={isPlayerFormOpen}
        onClose={() => {
          setIsPlayerFormOpen(false);
          setEditingPlayer(null);
        }}
        onSave={handleSavePlayer}
        initialData={editingPlayer}
        isSaving={isSavingPlayer}
      />

      <SwissExportModal
        isOpen={isSwissModalOpen}
        onClose={() => setIsSwissModalOpen(false)}
        players={players}
        selectedPlayerIds={swissSelectedIds}
      />

      {selectedProfilePlayer && (
        <PlayerProfileModal
          player={selectedProfilePlayer}
          isOpen={!!selectedProfilePlayer}
          onClose={() => setSelectedProfilePlayer(null)}
          onUpdatePlayerHistory={handleUpdatePlayerHistory}
          tournaments={tournaments}
        />
      )}
    </div>
  );
}
