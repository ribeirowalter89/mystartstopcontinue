export const BOARD_COLUMNS = ["start", "stop", "continue"] as const;

export type BoardColumn = (typeof BOARD_COLUMNS)[number];

export interface BoardSettings {
  maxVotesPerUser: number;
  votingEnabled: boolean;
}

export interface BoardMeta {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  settings: BoardSettings;
}

export interface Card {
  id: string;
  boardId: string;
  column: BoardColumn;
  text: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  votes: number;
  position: number;
}

export interface ParticipantPresence {
  userId: string;
  displayName: string;
  color: string;
}

export interface BoardState {
  board: BoardMeta;
  cards: Card[];
  presence: ParticipantPresence[];
  userVotesUsed: number;
  userVotesByCard: Record<string, boolean>;
  isOwner: boolean;
}

export interface Profile {
  userId: string;
  displayName: string;
  color: string;
}

export type ClientEvent =
  | {
      type: "JOIN_BOARD";
      payload: {
        boardId: string;
        userId: string;
        displayName: string;
        color: string;
        ownerToken?: string;
      };
    }
  | {
      type: "CREATE_CARD";
      payload: { boardId: string; column: BoardColumn; text: string; authorName: string };
    }
  | {
      type: "UPDATE_CARD";
      payload: { boardId: string; cardId: string; text: string };
    }
  | {
      type: "DELETE_CARD";
      payload: { boardId: string; cardId: string };
    }
  | {
      type: "MOVE_CARD";
      payload: { boardId: string; cardId: string; column: BoardColumn };
    }
  | {
      type: "TOGGLE_VOTE";
      payload: { boardId: string; cardId: string; userId: string };
    }
  | {
      type: "TOGGLE_VOTING";
      payload: { boardId: string; votingEnabled: boolean };
    };

export type ServerEvent =
  | { type: "BOARD_STATE"; payload: BoardState }
  | { type: "CARD_CREATED"; payload: { card: Card } }
  | { type: "CARD_UPDATED"; payload: { card: Card } }
  | { type: "CARD_DELETED"; payload: { cardId: string } }
  | { type: "CARD_MOVED"; payload: { card: Card } }
  | { type: "VOTE_UPDATED"; payload: { cardId: string; votes: number } }
  | {
      type: "USER_VOTE_STATE";
      payload: { userVotesUsed: number; userVotesByCard: Record<string, boolean> };
    }
  | { type: "BOARD_SETTINGS_UPDATED"; payload: { settings: BoardSettings } }
  | { type: "PRESENCE_UPDATE"; payload: { presence: ParticipantPresence[] } }
  | { type: "ERROR"; payload: { message: string } };

export interface CreateBoardInput {
  title: string;
  description?: string;
  maxVotesPerUser: number;
}

export interface CreateBoardResponse {
  boardId: string;
  board: BoardMeta;
  ownerToken: string;
  link: string;
}
