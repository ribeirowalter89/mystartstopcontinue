import { Response, Router } from "express";
import { BoardService } from "../domain/board-service";
import { DomainError } from "../domain/errors";
import { CreateBoardInput, CreateBoardResponse } from "../../shared/types";

export function createApiRouter(boardService: BoardService): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  router.post("/boards", async (req, res) => {
    try {
      const payload = req.body as Partial<CreateBoardInput>;
      const input: CreateBoardInput = {
        title: payload.title ?? "",
        description: payload.description,
        maxVotesPerUser: payload.maxVotesPerUser ?? 3
      };
      const { board, ownerToken } = await boardService.createBoard(input);

      const response: CreateBoardResponse = {
        boardId: board.id,
        board,
        ownerToken,
        link: `${req.protocol}://${req.get("host")}/board/${board.id}`
      };

      res.status(201).json(response);
    } catch (error) {
      handleHttpError(error, res);
    }
  });

  router.get("/boards/:boardId", async (req, res) => {
    try {
      const board = await boardService.getBoardMeta(req.params.boardId);
      res.json({ board });
    } catch (error) {
      handleHttpError(error, res);
    }
  });

  return router;
}

function handleHttpError(error: unknown, res: Response) {
  if (error instanceof DomainError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  res.status(500).json({ message: "Unexpected server error." });
}
