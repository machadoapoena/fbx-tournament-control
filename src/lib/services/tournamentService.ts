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

function cleanStandingForFirestore(s: TournamentStanding): Record<string, any> {
  const item: Record<string, any> = {
    playerId: s.playerId ? String(s.playerId).trim() : '',
    playerName: s.playerName ? String(s.playerName).trim() : '',
    points: typeof s.points === 'number' && !isNaN(s.points) ? Number(s.points) : 0,
    rank: typeof s.rank === 'number' && !isNaN(s.rank) ? Number(s.rank) : 1,
  };

  if (s.title && String(s.title).trim()) item.title = String(s.title).trim();
  if (s.fideId && String(s.fideId).trim()) item.fideId = String(s.fideId).trim();
  if (s.cbxId && String(s.cbxId).trim()) item.cbxId = String(s.cbxId).trim();
  if (s.buchholz !== undefined && s.buchholz !== null && !isNaN(Number(s.buchholz))) {
    item.buchholz = Number(s.buchholz);
  }
  if (s.sonnebornBerger !== undefined && s.sonnebornBerger !== null && !isNaN(Number(s.sonnebornBerger))) {
    item.sonnebornBerger = Number(s.sonnebornBerger);
  }
  if (s.wins !== undefined && s.wins !== null && !isNaN(Number(s.wins))) {
    item.wins = Number(s.wins);
  }
  if (s.genderRank !== undefined && s.genderRank !== null && !isNaN(Number(s.genderRank))) {
    item.genderRank = Number(s.genderRank);
  }
  if (s.fideRating !== undefined && s.fideRating !== null && !isNaN(Number(s.fideRating)) && Number(s.fideRating) > 0) {
    item.fideRating = Number(s.fideRating);
  }
  if (s.cbxRating !== undefined && s.cbxRating !== null && !isNaN(Number(s.cbxRating)) && Number(s.cbxRating) > 0) {
    item.cbxRating = Number(s.cbxRating);
  }

  return item;
}

function cleanPayloadForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => cleanPayloadForFirestore(item));
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = cleanPayloadForFirestore(value);
    }
  }
  return result;
}

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
        ratedFide: tournament.ratedFide !== false,
        ratedCbx: tournament.ratedCbx !== false,
        rankingType: tournament.rankingType || (tournament.genderSeparated ? 'gender_separated' : 'absolute'),
        genderSeparated: tournament.genderSeparated === true || tournament.rankingType === 'gender_separated',
        status: tournament.status || 'Planejado',
        arbiters: tournament.arbiters?.trim() || '',
        organizer: tournament.organizer?.trim() || '',
        chessResultsUrl: tournament.chessResultsUrl?.trim() || '',
        participants: tournament.participants || [],
        standings: (tournament.standings || []).map(cleanStandingForFirestore),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanPayloadForFirestore(cleanedData));
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
      const rawData: Record<string, any> = {
        ...tournament,
        updatedAt: new Date().toISOString(),
      };
      delete rawData.id;
      if (tournament.standings) {
        rawData.standings = tournament.standings.map(cleanStandingForFirestore);
      }
      const updatedData = cleanPayloadForFirestore(rawData);
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
      const cleanedStandings = (standings || []).map(cleanStandingForFirestore);
      await updateDoc(docRef, {
        standings: cleanedStandings,
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
