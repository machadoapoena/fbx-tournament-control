import { Player, Tournament, TournamentStanding } from '../types/chess';

const STOP_WORDS = new Set(['de', 'da', 'do', 'dos', 'das', 'del', 'd', 'e']);

/**
 * Normalizes a name string: lowercases, removes diacritics/accents, trims, collapses spaces.
 */
export function normalizeName(name?: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Extracts significant words (tokens with 3+ characters not in common stop words).
 */
export function extractSignificantTokens(name?: string): string[] {
  const norm = normalizeName(name);
  if (!norm) return [];
  return norm
    .split(/[\s,]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

/**
 * Determines whether a tournament standing corresponds to a given registered player.
 * Prevents false positives caused by accidental duplicate/placeholder FIDE/CBX IDs.
 */
export function doesStandingMatchPlayer(
  standing: {
    playerId?: string;
    playerName?: string;
    fideId?: string;
    cbxId?: string;
  },
  player: Player
): boolean {
  if (!player || !standing) return false;

  // 1. Direct ID match (highest certainty)
  if (player.id && standing.playerId && player.id === standing.playerId) {
    return true;
  }

  const normStandingName = normalizeName(standing.playerName);
  const normPlayerName = normalizeName(player.name);

  // 2. Exact or accent-insensitive name match
  if (normStandingName && normPlayerName && normStandingName === normPlayerName) {
    return true;
  }

  // 3. Name format reversal (e.g. "Ferreira, Lucca" vs "Lucca Ferreira")
  if (normStandingName && normStandingName.includes(',')) {
    const parts = normStandingName.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 2) {
      const reversed = `${parts[1]} ${parts[0]}`;
      if (reversed === normPlayerName) {
        return true;
      }
    }
  }

  // If both have different non-empty player IDs from the database, do not match across players
  if (
    player.id &&
    standing.playerId &&
    player.id !== standing.playerId &&
    // Allow seed IDs or generated IDs to match by name
    !standing.playerId.startsWith('seed-') &&
    !standing.playerId.startsWith('p-') &&
    standing.playerId.length > 10 // typical Firestore doc ID
  ) {
    // If standing has an explicit Firestore ID of another player, only accept if name also strictly matches
    return false;
  }

  // 4. Federation IDs match (FIDE or CBX)
  // CRITICAL: We only accept a federation ID match if names are compatible!
  // If the names have ZERO significant tokens in common (e.g. "Maria Luísa" vs "Lucca"),
  // they MUST NOT match, preventing duplicate ID false positives.
  const cleanPlayerFide = (player.fideId || '').trim();
  const cleanStandingFide = (standing.fideId || '').trim();
  const fideMatches =
    cleanPlayerFide.length > 0 &&
    cleanPlayerFide !== '0' &&
    cleanPlayerFide.toLowerCase() !== 'sem fide' &&
    cleanStandingFide.length > 0 &&
    cleanPlayerFide.toLowerCase() === cleanStandingFide.toLowerCase();

  const cleanPlayerCbx = (player.cbxId || '').trim();
  const cleanStandingCbx = (standing.cbxId || '').trim();
  const cbxMatches =
    cleanPlayerCbx.length > 0 &&
    cleanPlayerCbx !== '0' &&
    cleanStandingCbx.length > 0 &&
    cleanPlayerCbx.toLowerCase() === cleanStandingCbx.toLowerCase();

  if (fideMatches || cbxMatches) {
    // Check name compatibility
    if (!normStandingName || !normPlayerName) {
      return true;
    }

    const standingTokens = extractSignificantTokens(normStandingName);
    const playerTokens = extractSignificantTokens(normPlayerName);

    // If both names have tokens, ensure at least one significant token overlaps
    if (standingTokens.length > 0 && playerTokens.length > 0) {
      const sharesToken = standingTokens.some((t) => playerTokens.includes(t));
      if (sharesToken) {
        return true;
      }
      // If tokens do not overlap at all, reject to prevent false positive
      return false;
    }

    return true;
  }

  return false;
}

/**
 * Checks if a player is already enrolled or present in the given tournament.
 */
export function isPlayerEnrolledInTournament(
  player: Player,
  tournament?: Tournament | null
): boolean {
  if (!player || !tournament) return false;

  // 1. Check participants list
  const participants = tournament.participants || [];
  if (player.id && participants.includes(player.id)) {
    return true;
  }
  if (player.name) {
    const normName = normalizeName(player.name);
    if (participants.some((pId) => normalizeName(pId) === normName)) {
      return true;
    }
  }

  // 2. Check standings list
  const standings = tournament.standings || [];
  return standings.some((st) => doesStandingMatchPlayer(st, player));
}

/**
 * Finds the corresponding registered player from a list of players for a given standing.
 * Uses hierarchical matching (ID first, exact name second, reverse name third, federation ID fourth).
 */
export function findMatchingPlayer(
  standing: {
    playerId?: string;
    playerName?: string;
    fideId?: string;
    cbxId?: string;
  },
  players: Player[]
): Player | undefined {
  if (!standing || !players || players.length === 0) return undefined;

  // 1. Exact ID
  if (standing.playerId) {
    const byId = players.find((p) => p.id === standing.playerId);
    if (byId) return byId;
  }

  // 2. Exact normalized name
  const normStandingName = normalizeName(standing.playerName);
  if (normStandingName) {
    const byName = players.find((p) => normalizeName(p.name) === normStandingName);
    if (byName) return byName;

    // Check reversed name if applicable
    if (normStandingName.includes(',')) {
      const parts = normStandingName.split(',').map((s) => s.trim()).filter(Boolean);
      if (parts.length === 2) {
        const reversed = `${parts[1]} ${parts[0]}`;
        const byReversed = players.find((p) => normalizeName(p.name) === reversed);
        if (byReversed) return byReversed;
      }
    }
  }

  // 3. Match with doesStandingMatchPlayer
  return players.find((p) => doesStandingMatchPlayer(standing, p));
}
