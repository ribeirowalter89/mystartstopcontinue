import cors from "cors";
import express from "express";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { BoardService } from "./domain/board-service";
import { createApiRouter } from "./http/routes";
import { InMemoryBoardRepository } from "./persistence/in-memory-board-repository";
import { BoardRepository } from "./persistence/board-repository";
import { PostgresBoardRepository } from "./persistence/postgres-board-repository";
import { RealtimeGateway } from "./transport/ws-gateway";

async function createBoardRepository(): Promise<BoardRepository> {
  const persistenceDriver = (process.env.PERSISTENCE_DRIVER || "memory").toLowerCase();

  if (persistenceDriver === "postgres") {
    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error("POSTGRES_URL is required when PERSISTENCE_DRIVER=postgres.");
    }

    const pool = new Pool({
      connectionString
    });
    const repository = new PostgresBoardRepository(pool);
    await repository.init();
    return repository;
  }

  return new InMemoryBoardRepository();
}

export async function buildApp() {
  const app = express();
  const httpServer = createServer(app);

  const boardRepository = await createBoardRepository();
  const boardService = new BoardService(boardRepository);
  new RealtimeGateway(httpServer, boardService);

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173"
    })
  );
  app.use(express.json());

  app.use("/api", createApiRouter(boardService));

  const clientDistPath = path.resolve(__dirname, "../client");
  const clientIndexPath = path.join(clientDistPath, "index.html");
  const hasClientBuild = fs.existsSync(clientIndexPath);

  if (hasClientBuild) {
    app.use(express.static(clientDistPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/ws")) {
        return next();
      }
      res.sendFile(clientIndexPath);
      return undefined;
    });
  }

  return { app, httpServer };
}
