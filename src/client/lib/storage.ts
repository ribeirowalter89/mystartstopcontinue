import { Profile } from "../../shared/types";

const PROFILE_KEY = "ssc_profile";
const RECENT_BOARDS_KEY = "ssc_recent_boards";

export interface RecentBoardEntry {
  boardId: string;
  title: string;
  visitedAt: string;
}

export function getProfile(): Profile | null {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as Profile;
  } catch (_error) {
    return null;
  }
}

export function saveProfile(profile: Profile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getOwnerToken(boardId: string): string | null {
  return localStorage.getItem(`ssc_owner_${boardId}`);
}

export function saveOwnerToken(boardId: string, ownerToken: string): void {
  localStorage.setItem(`ssc_owner_${boardId}`, ownerToken);
}

export function getRecentBoards(): RecentBoardEntry[] {
  const raw = localStorage.getItem(RECENT_BOARDS_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as RecentBoardEntry[];
  } catch (_error) {
    return [];
  }
}

export function addRecentBoard(boardId: string, title: string): void {
  const nextEntry: RecentBoardEntry = {
    boardId,
    title,
    visitedAt: new Date().toISOString()
  };
  const filtered = getRecentBoards().filter((entry) => entry.boardId !== boardId);
  const next = [nextEntry, ...filtered].slice(0, 8);
  localStorage.setItem(RECENT_BOARDS_KEY, JSON.stringify(next));
}

export function generateRandomColor(): string {
  const colors = [
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ef4444",
    "#14b8a6"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
