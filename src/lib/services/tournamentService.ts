import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Tournament, TournamentStanding } from '../../types/chess';
import { INITIAL_TOURNAMENTS } from '../sampleData';

const COLLECTION_NAME = 'tournaments';

export const tournamentService = {
  subscribeTournaments(
    onSuccess: (tournaments: Tournament[]) => void,
    onError?: (error: Error) => void
  ) {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('startDate', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const tournaments: Tournament[] = [];
          snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data() as Omit<Tournament, 'id'>;
            tournaments.push({
              id: docSnapshot.id,
              ...data,
            });
          });
          onSuccess(tournaments);
        },
        (error) => {
          console.warn('Firestore onSnapshot tournament error:', error.message);
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

  async getTournaments(): Promise<Tournament[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('startDate', 'desc'));
      const snapshot = await getDocs(q);
      const tournaments: Tournament[] = [];
      snapshot.forEach((docSnapshot) => {
        tournaments.push({
          id: docSnapshot.id,
          ...(docSnapshot.data() as Omit<Tournament, 'id'>),
        });
      });
      return tournaments;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
      return [];
    }
  },

  async addTournament(tournament: Omit<Tournament, 'id'>): Promise<string> {
    try {
      const cleanedData: Record<string, any> = {
        name: tournament.name.trim(),
        city: tournament.city?.trim() || '',
        state: (tournament.state || '').trim().toUpperCase(),
        startDate: tournament.startDate,
        endDate: tournament.endDate || '',
        rounds: Number(tournament.rounds) || 5,
        timeControl: tournament.timeControl || 'Pensado (90m+30s)',
        type: tournament.type || 'standard',
        status: tournament.status || 'Planejado',
        arbiters: tournament.arbiters?.trim() || '',
        organizer: tournament.organizer?.trim() || '',
        chessResultsUrl: tournament.chessResultsUrl?.trim() || '',
        participants: tournament.participants || [],
        standings: tournament.standings || [],
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

  async updateTournament(id: string, tournament: Partial<Tournament>): Promise<void> {
    const path = `${COLLECTION_NAME}/${id}`;
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updatedData: Record<string, any> = {
        ...tournament,
        updatedAt: new Date().toISOString(),
      };
      delete updatedData.id;
      await updateDoc(docRef, updatedData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  async updateStandings(id: string, standings: TournamentStanding[]): Promise<void> {
    const path = `${COLLECTION_NAME}/${id}`;
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        standings,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  async deleteTournament(id: string): Promise<void> {
    const path = `${COLLECTION_NAME}/${id}`;
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  },

  async seedInitialTournaments(): Promise<number> {
    try {
      const existing = await this.getTournaments();
      if (existing.length > 0) return 0;
      let count = 0;
      for (const t of INITIAL_TOURNAMENTS) {
        await this.addTournament(t);
        count++;
      }
      return count;
    } catch (error) {
      console.error('Seed tournaments error:', error);
      return 0;
    }
  }
};
