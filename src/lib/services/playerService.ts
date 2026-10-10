import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getCountFromServer,
  QueryConstraint
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Player, ScrapedRatingsResult } from '../../types/chess';
import { INITIAL_PLAYERS } from '../sampleData';

const COLLECTION_NAME = 'players';

export interface FetchPlayersOptions {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  gender?: string;
  title?: string;
  state?: string;
}

export interface PaginatedPlayersResult {
  players: Player[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const playerService = {
  subscribePlayers(
    onSuccess: (players: Player[]) => void,
    onError?: (error: Error) => void
  ) {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const players: Player[] = [];
          snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data() as Omit<Player, 'id'>;
            players.push({
              id: docSnapshot.id,
              ...data,
            });
          });
          onSuccess(players);
        },
        (error) => {
          console.warn('Firestore onSnapshot notice:', error.message);
          if (onError) {
            try {
              handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
            } catch (err) {
              onError(err as Error);
            }
          }
        }
      );
      return unsubscribe;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
      return () => {};
    }
  },

  async getPlayers(): Promise<Player[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      const players: Player[] = [];
      snapshot.forEach((docSnapshot) => {
        players.push({
          id: docSnapshot.id,
          ...(docSnapshot.data() as Omit<Player, 'id'>),
        });
      });
      return players;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
      return [];
    }
  },

  async fetchPlayersPaginated(options: FetchPlayersOptions = {}): Promise<PaginatedPlayersResult> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.max(1, options.pageSize || 10);
    const { searchTerm, gender, title, state } = options;

    try {
      const constraints: QueryConstraint[] = [];

      if (gender && gender !== 'todos') {
        constraints.push(where('gender', '==', gender));
      }

      if (state && state !== 'todos') {
        constraints.push(where('state', '==', state.toUpperCase().trim()));
      }

      if (title && title !== 'todos') {
        if (title !== 'Sem Título') {
          constraints.push(where('title', '==', title));
        }
      }

      // Default order by name
      constraints.push(orderBy('name', 'asc'));

      let snapshot;
      try {
        const q = query(collection(db, COLLECTION_NAME), ...constraints);
        snapshot = await getDocs(q);
      } catch (queryErr) {
        // Fallback without compound constraints if Firestore index isn't ready
        console.warn('Falling back to base Firestore query:', queryErr);
        const fallbackQ = query(collection(db, COLLECTION_NAME));
        snapshot = await getDocs(fallbackQ);
      }

      let list: Player[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as Omit<Player, 'id'>;
        list.push({
          id: docSnapshot.id,
          ...data,
        });
      });

      // Filter "Sem Título" or fallback filters in memory if fallback query was used
      if (title === 'Sem Título') {
        list = list.filter((p) => !p.title || p.title === 'Sem Título' || (p.title as string).trim() === '');
      } else if (title && title !== 'todos') {
        list = list.filter((p) => p.title === title);
      }

      if (gender && gender !== 'todos') {
        list = list.filter((p) => p.gender === gender);
      }

      if (state && state !== 'todos') {
        const targetState = state.toUpperCase().trim();
        list = list.filter((p) => (p.state || '').toUpperCase().trim() === targetState);
      }

      // Filter by search term if provided
      if (searchTerm && searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase().trim();
        list = list.filter((player) => {
          return (
            player.name.toLowerCase().includes(term) ||
            (player.fideId && player.fideId.toLowerCase().includes(term)) ||
            (player.cbxId && player.cbxId.toLowerCase().includes(term)) ||
            (player.club && player.club.toLowerCase().includes(term)) ||
            (player.state && player.state.toLowerCase().includes(term))
          );
        });
      }

      // Sort alphabetically by name
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

      const totalCount = list.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const validPage = Math.min(page, totalPages);
      const startIndex = (validPage - 1) * pageSize;
      const paginatedPlayers = list.slice(startIndex, startIndex + pageSize);

      return {
        players: paginatedPlayers,
        totalCount,
        page: validPage,
        pageSize,
        totalPages,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
      return {
        players: [],
        totalCount: 0,
        page: 1,
        pageSize,
        totalPages: 1,
      };
    }
  },

  async getFilterOptions(): Promise<{ states: string[]; titles: string[] }> {
    try {
      const q = query(collection(db, COLLECTION_NAME));
      const snapshot = await getDocs(q);
      const stateSet = new Set<string>();
      const titleSet = new Set<string>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.state) {
          stateSet.add(String(data.state).toUpperCase().trim());
        }
        if (data.title) {
          titleSet.add(String(data.title).trim());
        }
      });

      const predefinedTitles = ['GM', 'IM', 'FM', 'CM', 'WGM', 'WIM', 'WFM', 'WCM', 'MN', 'NM', 'CMN', 'AGM', 'AIM', 'AFM', 'ACM', 'Sem Título'];
      const titles = predefinedTitles.filter((t) => t === 'Sem Título' || titleSet.has(t));

      return {
        states: Array.from(stateSet).filter(Boolean).sort(),
        titles: titles.length > 0 ? titles : predefinedTitles,
      };
    } catch (error) {
      console.warn('Could not fetch filter options:', error);
      return { states: [], titles: [] };
    }
  },

  async addPlayer(player: Omit<Player, 'id'>): Promise<string> {
    try {
      const stdFide = Number(player.ratingFideStandard || player.ratingFide || 0);
      const stdCbx = Number(player.ratingCbxStandard || player.ratingCbx || 0);

      const cleanedData: Record<string, any> = {
        name: player.name.trim(),
        title: player.title,
        birthDate: player.birthDate,
        gender: player.gender,
        country: player.country.trim() || 'Brasil',
        state: (player.state || '').trim().toUpperCase(),
        fideId: player.fideId ? player.fideId.trim() : '',
        cbxId: player.cbxId ? player.cbxId.trim() : '',
        fideUrl: player.fideUrl ? player.fideUrl.trim() : '',
        cbxUrl: player.cbxUrl ? player.cbxUrl.trim() : '',
        
        // FIDE Ratings
        ratingFide: stdFide,
        ratingFideStandard: stdFide,
        ratingFideRapid: player.ratingFideRapid ? Number(player.ratingFideRapid) : 0,
        ratingFideBlitz: player.ratingFideBlitz ? Number(player.ratingFideBlitz) : 0,

        // CBX Ratings
        ratingCbx: stdCbx,
        ratingCbxStandard: stdCbx,
        ratingCbxRapid: player.ratingCbxRapid ? Number(player.ratingCbxRapid) : 0,
        ratingCbxBlitz: player.ratingCbxBlitz ? Number(player.ratingCbxBlitz) : 0,

        club: player.club ? player.club.trim() : '',
        notes: player.notes ? player.notes.trim() : '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanedData);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
      throw error;
    }
  },

  async updatePlayer(id: string, player: Partial<Player>): Promise<void> {
    const path = `${COLLECTION_NAME}/${id}`;
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const stdFide = player.ratingFideStandard !== undefined ? Number(player.ratingFideStandard) : (player.ratingFide !== undefined ? Number(player.ratingFide) : undefined);
      const stdCbx = player.ratingCbxStandard !== undefined ? Number(player.ratingCbxStandard) : (player.ratingCbx !== undefined ? Number(player.ratingCbx) : undefined);

      const updatedData: Record<string, any> = {
        ...player,
        updatedAt: new Date().toISOString(),
      };

      if (stdFide !== undefined) {
        updatedData.ratingFide = stdFide;
        updatedData.ratingFideStandard = stdFide;
      }
      if (stdCbx !== undefined) {
        updatedData.ratingCbx = stdCbx;
        updatedData.ratingCbxStandard = stdCbx;
      }

      delete updatedData.id;
      await updateDoc(docRef, updatedData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  async deletePlayer(id: string): Promise<void> {
    const path = `${COLLECTION_NAME}/${id}`;
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  },

  async scrapeRatings(params: {
    fideId?: string;
    fideUrl?: string;
    cbxId?: string;
    cbxUrl?: string;
    rawSnippet?: string;
  }): Promise<ScrapedRatingsResult> {
    try {
      const response = await fetch('/api/scrape-ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('O serviço de consulta retornou uma resposta inválida. Utilize a opção "Colar HTML" ou digite os ratings.');
      }

      if (!response.ok) {
        throw new Error(`Falha ao conectar com o serviço de busca (Status ${response.status})`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Erro ao obter ratings da FIDE e CBX');
      }

      return data.data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message?.includes('fetch')) {
        throw new Error('Não foi possível conectar ao servidor de busca de ratings. Verifique a rede ou utilize "Colar HTML".');
      }
      throw err;
    }
  },

  async seedInitialData(): Promise<number> {
    try {
      const existing = await this.getPlayers();
      if (existing.length > 0) {
        return 0;
      }
      let count = 0;
      for (const player of INITIAL_PLAYERS) {
        await this.addPlayer(player);
        count++;
      }
      return count;
    } catch (error) {
      console.error('Seed error:', error);
      return 0;
    }
  }
};
