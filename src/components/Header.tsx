import React from 'react';
import { 
  Trophy, 
  Users, 
  Swords, 
  ShieldCheck, 
  LogIn, 
  LogOut, 
  FileSpreadsheet, 
  FileText,
  Download,
  Plus
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'players' | 'tournaments' | 'admin';
  setActiveTab: (tab: 'dashboard' | 'players' | 'tournaments' | 'admin') => void;
  isAdmin: boolean;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenSwissModal: () => void;
  onOpenAddPlayer: () => void;
  totalPlayers: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isAdmin,
  onOpenLogin,
  onLogout,
  onOpenSwissModal,
  onOpenAddPlayer,
  totalPlayers,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Brand / Logo */}
          <div 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-stone-900 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              {/* Chess Knight SVG */}
              <svg 
                className="w-6 h-6 fill-current" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M19 22H5V20H19V22M17.16 8.27C17.07 8.04 16.92 7.84 16.71 7.71C16.5 7.57 16.26 7.5 16 7.5H15.5C15.22 7.5 15 7.28 15 7C15 5.9 14.1 5 13 5C12.38 5 11.83 5.28 11.47 5.72L9.41 7.78C9.15 8.04 9 8.39 9 8.76V10.5C9 10.78 8.78 11 8.5 11C8.22 11 8 10.78 8 10.5V7C8 6.45 7.55 6 7 6S6 6.45 6 7V11.23C4.81 12.08 4 13.43 4 15V19H20V15C20 12.33 18.84 9.94 17.16 8.27Z"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-stone-900 font-sans">
                  ChessRegistry
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                  FBX / FIDE
                </span>
              </div>
              <p className="text-xs text-stone-700 hidden sm:block">
                Cadastro Nacional de Jogadores & Torneios
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-stone-100/80 p-1 rounded-xl border border-stone-200/80">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200 font-semibold'
                  : 'text-stone-700 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              <Trophy className="w-4 h-4 text-stone-600" />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('players')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'players'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200 font-semibold'
                  : 'text-stone-700 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              <Users className="w-4 h-4 text-stone-600" />
              Jogadores
              <span className="text-xs px-1.5 py-0.2 rounded-full bg-stone-200/70 text-stone-700 font-mono">
                {totalPlayers}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('tournaments')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'tournaments'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200 font-semibold'
                  : 'text-stone-700 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              <Swords className="w-4 h-4 text-stone-600" />
              Torneios
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'admin'
                    ? 'bg-stone-900 text-white shadow-xs font-semibold'
                    : 'text-stone-800 hover:text-stone-950 hover:bg-stone-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Admin
              </button>
            )}
          </nav>

          {/* Quick Actions & Admin Login */}
          <div className="flex items-center gap-2">
            {/* Swiss-Manager Export button */}
            <button
              onClick={onOpenSwissModal}
              title="Exportar para o Swiss-Manager"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-stone-900" />
              Swiss-Manager
            </button>

            {isAdmin ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenAddPlayer}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Jogador</span>
                </button>
                <button
                  onClick={onLogout}
                  title="Encerrar sessão de Administrador"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-stone-600 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 rounded-lg text-xs font-medium transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white shadow-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-stone-100 text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-2.5 py-1 rounded-md font-medium ${
              activeTab === 'dashboard' ? 'bg-stone-900 text-white' : 'text-stone-600'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`px-2.5 py-1 rounded-md font-medium ${
              activeTab === 'players' ? 'bg-stone-900 text-white' : 'text-stone-600'
            }`}
          >
            Jogadores ({totalPlayers})
          </button>
          <button
            onClick={() => setActiveTab('tournaments')}
            className={`px-2.5 py-1 rounded-md font-medium ${
              activeTab === 'tournaments' ? 'bg-stone-900 text-white' : 'text-stone-600'
            }`}
          >
            Torneios
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-2.5 py-1 rounded-md font-medium ${
                activeTab === 'admin' ? 'bg-stone-900 text-amber-400' : 'text-stone-800'
              }`}
            >
              Admin
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
