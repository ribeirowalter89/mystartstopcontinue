import { nanoid } from "nanoid";
import {
  BOARD_COLUMNS,
  BoardColumn,
  BoardMeta,
  BoardState,
  Card,
  CreateBoardInput,
  ParticipantPresence
} from "../../shared/types";
import { BoardRecord, BoardRepository } from "../persistence/board-repository";
import { DomainError } from "./errors";

interface VoteToggleResult {
  card: Card;
  userVotesUsed: number;
  userVotesByCard: Record<string, boolean>;
}

interface BoardStateOptions {
  boardId: string;
  userId: string;
  presence: ParticipantPresence[];
  isOwner: boolean;
}

export class BoardService {
  constructor(private readonly boardRepository: BoardRepository) {}

  async createBoard(input: CreateBoardInput): Promise<{ board: BoardMeta; ownerToken: string }> {
    const title = input.title.trim();
    if (!title) {
      throw new DomainError("Board title is required.");
    }

    const maxVotesPerUser = Number.isFinite(input.maxVotesPerUser)
      ? Math.max(1, Math.min(10, Math.floor(input.maxVotesPerUser)))
      : 3;

    const now = new Date().toISOString();
    const boardId = nanoid(8);
    const ownerToken = nanoid(24);

    const board: BoardRecord = {
      id: boardId,
      title,
      description: input.description?.trim() || undefined,
      createdAt: now,
      settings: {
        maxVotesPerUser,
        votingEnabled: false
      },
      ownerToken,
      cards: new Map(),
      votesByCard: new Map(),
      votesByUser: new Map()
    };

    await this.boardRepository.create(board);

    return { board: this.toBoardMeta(board), ownerToken };
  }

  async getBoardMeta(boardId: string): Promise<BoardMeta> {
    return this.toBoardMeta(await this.requireBoard(boardId));
  }

  async isOwner(boardId: string, ownerToken?: string): Promise<boolean> {
    if (!ownerToken) {
      return false;
    }
    const board = await this.requireBoard(boardId);
    return board.ownerToken === ownerToken;
  }

  async getBoardState(options: BoardStateOptions): Promise<BoardState> {
    const board = await this.requireBoard(options.boardId);
    const userVotesByCard = this.getUserVotesByCard(board, options.userId);

    return {
      board: this.toBoardMeta(board),
      cards: this.sortCards(board),
      presence: options.presence,
      userVotesUsed: this.getVotesUsed(board, options.userId),
      userVotesByCard,
      isOwner: options.isOwner
    };
  }

  async createCard(boardId: string, column: BoardColumn, text: string, authorName: string): Promise<Card> {
    const board = await this.requireBoard(boardId);
    if (!BOARD_COLUMNS.includes(column)) {
      throw new DomainError("Invalid column.");
    }

    const normalizedText = text.trim();
    if (!normalizedText) {
      throw new DomainError("Card text is required.");
    }

    const now = new Date().toISOString();
    const cardId = nanoid(10);

    const card: Card = {
      id: cardId,
      boardId,
      column,
      text: normalizedText,
      authorName: authorName.trim() || "Anonymous",
      createdAt: now,
      updatedAt: now,
      votes: 0,
      position: this.nextPosition(board, column)
    };

    board.cards.set(card.id, card);
    await this.boardRepository.update(board);
    return card;
  }

  async updateCard(boardId: string, cardId: string, text: string): Promise<Card> {
    const board = await this.requireBoard(boardId);
    const card = this.requireCard(board, cardId);
    const normalizedText = text.trim();
    if (!normalizedText) {
      throw new DomainError("Card text is required.");
    }

    const updated: Card = {
      ...card,
      text: normalizedText,
      updatedAt: new Date().toISOString()
    };

    board.cards.set(cardId, updated);
    await this.boardRepository.update(board);
    return updated;
  }

  async deleteCard(boardId: string, cardId: string): Promise<void> {
    const board = await this.requireBoard(boardId);
    if (!board.cards.has(cardId)) {
      throw new DomainError("Card not found.", 404);
    }

    board.cards.delete(cardId);

    const voters = board.votesByCard.get(cardId) ?? new Set<string>();
    for (const voterId of voters) {
      const votedCards = board.votesByUser.get(voterId);
      votedCards?.delete(cardId);
      if (votedCards && votedCards.size === 0) {
        board.votesByUser.delete(voterId);
      }
    }
    board.votesByCard.delete(cardId);

    await this.boardRepository.update(board);
  }

  async moveCard(boardId: string, cardId: string, column: BoardColumn): Promise<Card> {
    const board = await this.requireBoard(boardId);
    const card = this.requireCard(board, cardId);
    if (!BOARD_COLUMNS.includes(column)) {
      throw new DomainError("Invalid column.");
    }

    const moved: Card = {
      ...card,
      column,
      position: this.nextPosition(board, column),
      updatedAt: new Date().toISOString()
    };
    board.cards.set(cardId, moved);
    await this.boardRepository.update(board);
    return moved;
  }

  async toggleVote(boardId: string, cardId: string, userId: string): Promise<VoteToggleResult> {
    const board = await this.requireBoard(boardId);
    const card = this.requireCard(board, cardId);

    if (!board.settings.votingEnabled) {
      throw new DomainError("Voting is currently disabled.");
    }

    const votesByUser = board.votesByUser.get(userId) ?? new Set<string>();
    const votesByCard = board.votesByCard.get(cardId) ?? new Set<string>();

    if (votesByUser.has(cardId)) {
      votesByUser.delete(cardId);
      votesByCard.delete(userId);
    } else {
      if (votesByUser.size >= board.settings.maxVotesPerUser) {
        throw new DomainError("You reached the maximum number of votes.");
      }
      votesByUser.add(cardId);
      votesByCard.add(userId);
    }

    if (votesByUser.size > 0) {
      board.votesByUser.set(userId, votesByUser);
    } else {
      board.votesByUser.delete(userId);
    }

    if (votesByCard.size > 0) {
      board.votesByCard.set(cardId, votesByCard);
    } else {
      board.votesByCard.delete(cardId);
    }

    const updatedCard: Card = { ...card, votes: votesByCard.size };
    board.cards.set(cardId, updatedCard);
    await this.boardRepository.update(board);

    return {
      card: updatedCard,
      userVotesUsed: votesByUser.size,
      userVotesByCard: this.getUserVotesByCard(board, userId)
    };
  }

  async toggleVoting(boardId: string, votingEnabled: boolean, ownerToken?: string): Promise<BoardMeta> {
    const board = await this.requireBoard(boardId);
    if (board.ownerToken !== ownerToken) {
      throw new DomainError("Only the board creator can toggle voting.", 403);
    }

    board.settings = {
      ...board.settings,
      votingEnabled
    };

    await this.boardRepository.update(board);
    return this.toBoardMeta(board);
  }

  async getUserVoteState(
    boardId: string,
    userId: string
  ): Promise<{ userVotesUsed: number; userVotesByCard: Record<string, boolean> }> {
    const board = await this.requireBoard(boardId);
    return {
      userVotesUsed: this.getVotesUsed(board, userId),
      userVotesByCard: this.getUserVotesByCard(board, userId)
    };
  }

  private sortCards(board: BoardRecord): Card[] {
    const byColumnOrder = new Map<BoardColumn, number>([
      ["start", 0],
      ["stop", 1],
      ["continue", 2]
    ]);

    return Array.from(board.cards.values()).sort((a, b) => {
      const columnCompare = (byColumnOrder.get(a.column) ?? 99) - (byColumnOrder.get(b.column) ?? 99);
      if (columnCompare !== 0) {
        return columnCompare;
      }
      return a.position - b.position;
    });
  }

  private toBoardMeta(board: BoardRecord): BoardMeta {
    return {
      id: board.id,
      title: board.title,
      description: board.description,
      createdAt: board.createdAt,
      settings: board.settings
    };
  }

  private nextPosition(board: BoardRecord, column: BoardColumn): number {
    const cardsInColumn = Array.from(board.cards.values()).filter((card) => card.column === column);
    if (cardsInColumn.length === 0) {
      return 1;
    }
    return Math.max(...cardsInColumn.map((card) => card.position)) + 1;
  }

  private getVotesUsed(board: BoardRecord, userId: string): number {
    return board.votesByUser.get(userId)?.size ?? 0;
  }

  private getUserVotesByCard(board: BoardRecord, userId: string): Record<string, boolean> {
    const cardIds = board.votesByUser.get(userId) ?? new Set<string>();
    return Array.from(cardIds).reduce<Record<string, boolean>>((acc, cardId) => {
      acc[cardId] = true;
      return acc;
    }, {});
  }

  private async requireBoard(boardId: string): Promise<BoardRecord> {
    const board = await this.boardRepository.get(boardId);
    if (!board) {
      throw new DomainError("Board not found.", 404);
    }
    return board;
  }

  private requireCard(board: BoardRecord, cardId: string): Card {
    const card = board.cards.get(cardId);
    if (!card) {
      throw new DomainError("Card not found.", 404);
    }
    return card;
  }
}
