import { BoardMeta, Card } from "../../shared/types";

export interface BoardRecord extends BoardMeta {
  ownerToken: string;
  cards: Map<string, Card>;
  votesByUser: Map<string, Set<string>>;
  votesByCard: Map<string, Set<string>>;
}

export interface BoardRepository {
  create(board: BoardRecord): Promise<void>;
  get(boardId: string): Promise<BoardRecord | undefined>;
  update(board: BoardRecord): Promise<void>;
}
