export type ChessTitle = 
  | 'GM' 
  | 'IM' 
  | 'FM' 
  | 'CM' 
  | 'WGM' 
  | 'WIM' 
  | 'WFM' 
  | 'WCM' 
  | 'MN' 
  | 'NM' 
  | 'CMN' 
  | 'AGM' 
  | 'AIM' 
  | 'AFM' 
  | 'ACM' 
  | 'Sem Título';

export type Gender = 'M' | 'F' | 'Outro';

export interface RatingHistoryEntry {
  period: string; // e.g. "Jul/2026", "Jun/2026", "2026-07"
  date?: string; // ISO date or YYYY-MM
  standard?: number | null;
  rapid?: number | null;
  blitz?: number | null;
}

export interface Player {
  id?: string;
  name: string;
  title: ChessTitle;
  birthDate: string; // YYYY-MM-DD
  gender: Gender;
  fideId?: string;
  cbxId?: string;
  country: string; // e.g. "Brasil", "BRA"
  state: string; // e.g. "SP", "RJ", "MG"
  fideUrl?: string;
  cbxUrl?: string;
  
  // Ratings FIDE (Internacional)
  ratingFide?: number; // Standard / Geral
  ratingFideStandard?: number;
  ratingFideRapid?: number;
  ratingFideBlitz?: number;

  // Ratings CBX (Nacional)
  ratingCbx?: number; // Standard / Geral
  ratingCbxStandard?: number;
  ratingCbxRapid?: number;
  ratingCbxBlitz?: number;

  // Rating Evolutions (Histórico)
  cbxHistory?: RatingHistoryEntry[];
  fideHistory?: RatingHistoryEntry[];

  club?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TournamentStanding {
  playerId: string;
  playerName: string;
  title?: string;
  fideId?: string;
  cbxId?: string;
  points: number;
  rank: number;
  buchholz?: number;
  sonnebornBerger?: number;
  wins?: number;
}

export type TournamentCategory = 'blitz' | 'rapid' | 'standard';

export interface Tournament {
  id?: string;
  name: string;
  city: string;
  state: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  rounds: number;
  timeControl: string;
  type?: TournamentCategory;
  status: 'Planejado' | 'Em Andamento' | 'Finalizado';
  arbiters?: string;
  organizer?: string;
  chessResultsUrl?: string;
  participants: string[]; // Player IDs
  standings?: TournamentStanding[];
  createdAt?: string;
  updatedAt?: string;
}

export type SwissRatingModality = 'standard' | 'rapid' | 'blitz' | 'none';

export interface SwissExportConfig {
  delimiter: ';' | ',' | '\t';
  includeHeader: boolean;
  format: 'xlsx' | 'xml' | 'swiss_txt' | 'csv' | 'fide_dat';
  fideRatingModality?: SwissRatingModality; // Exported as IntRating
  cbxRatingModality?: SwissRatingModality;  // Exported as NatRating
  fields: {
    id: boolean;
    name: boolean;
    fideId: boolean; // Exported as FideID
    cbxId: boolean;
    title: boolean;
    gender: boolean;
    birthDate: boolean; // Format DD.MM.YYYY
    country: boolean;
    state: boolean;
    ratingFide?: boolean;
    ratingFideRapid?: boolean;
    ratingFideBlitz?: boolean;
    ratingCbx?: boolean;
    ratingCbxRapid?: boolean;
    ratingCbxBlitz?: boolean;
    k?: boolean; // Empty column K for Swiss-Manager
    club: boolean;
  };
}

export interface ScrapedRatingsResult {
  fide: {
    standard: number | null;
    rapid: number | null;
    blitz: number | null;
    title: string | null;
    name: string | null;
    country: string | null;
    birthYear: number | null;
    gender: string | null;
    error: string | null;
  };
  cbx: {
    standard: number | null;
    rapid: number | null;
    blitz: number | null;
    title: string | null;
    name: string | null;
    state: string | null;
    club: string | null;
    error: string | null;
  };
}
