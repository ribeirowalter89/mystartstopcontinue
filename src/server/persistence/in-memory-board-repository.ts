import { BoardRecord, BoardRepository } from "./board-repository";

export class InMemoryBoardRepository implements BoardRepository {
  private readonly boards = new Map<string, BoardRecord>();

  async create(board: BoardRecord): Promise<void> {
    this.boards.set(board.id, board);
  }

  async get(boardId: string): Promise<BoardRecord | undefined> {
    return this.boards.get(boardId);
  }

  async update(board: BoardRecord): Promise<void> {
    this.boards.set(board.id, board);
  }
}
