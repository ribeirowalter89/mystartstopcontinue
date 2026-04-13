import { Pool } from "pg";
import { BoardSettings, Card } from "../../shared/types";
import { BoardRecord, BoardRepository } from "./board-repository";

interface SerializedBoardRecord {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  settings: BoardSettings;
  ownerToken: string;
  cards: Card[];
  votesByUser: Record<string, string[]>;
  votesByCard: Record<string, string[]>;
}

export class PostgresBoardRepository implements BoardRepository {
  constructor(private readonly pool: Pool) {}

  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY,
        state JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  async create(board: BoardRecord): Promise<void> {
    const serialized = this.serialize(board);
    await this.pool.query(
      `
        INSERT INTO boards (id, state)
        VALUES ($1, $2::jsonb)
      `,
      [board.id, JSON.stringify(serialized)]
    );
  }

  async get(boardId: string): Promise<BoardRecord | undefined> {
    const result = await this.pool.query<{ state: SerializedBoardRecord }>(
      `SELECT state FROM boards WHERE id = $1 LIMIT 1`,
      [boardId]
    );

    if (result.rowCount === 0) {
      return undefined;
    }

    return this.deserialize(result.rows[0].state);
  }

  async update(board: BoardRecord): Promise<void> {
    const serialized = this.serialize(board);
    await this.pool.query(
      `
        UPDATE boards
        SET state = $2::jsonb, updated_at = NOW()
        WHERE id = $1
      `,
      [board.id, JSON.stringify(serialized)]
    );
  }

  private serialize(board: BoardRecord): SerializedBoardRecord {
    return {
      id: board.id,
      title: board.title,
      description: board.description,
      createdAt: board.createdAt,
      settings: board.settings,
      ownerToken: board.ownerToken,
      cards: Array.from(board.cards.values()),
      votesByUser: this.serializeMapOfSets(board.votesByUser),
      votesByCard: this.serializeMapOfSets(board.votesByCard)
    };
  }

  private deserialize(serialized: SerializedBoardRecord): BoardRecord {
    return {
      id: serialized.id,
      title: serialized.title,
      description: serialized.description,
      createdAt: serialized.createdAt,
      settings: serialized.settings,
      ownerToken: serialized.ownerToken,
      cards: new Map(serialized.cards.map((card) => [card.id, card])),
      votesByUser: this.deserializeMapOfSets(serialized.votesByUser),
      votesByCard: this.deserializeMapOfSets(serialized.votesByCard)
    };
  }

  private serializeMapOfSets(source: Map<string, Set<string>>): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [key, value] of source.entries()) {
      result[key] = Array.from(value);
    }
    return result;
  }

  private deserializeMapOfSets(source: Record<string, string[]>): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>();
    for (const [key, values] of Object.entries(source ?? {})) {
      result.set(key, new Set(values));
    }
    return result;
  }
}
