import { describe, expect, it } from "vitest";
import { BoardService } from "./board-service";
import { InMemoryBoardRepository } from "../persistence/in-memory-board-repository";

function setupBoard(maxVotesPerUser = 3) {
  const service = new BoardService(new InMemoryBoardRepository());
  return {
    service,
    create: () =>
      service.createBoard({
        title: "Retro",
        description: "Team retrospective",
        maxVotesPerUser
      })
  };
}

describe("BoardService", () => {
  it("enforces max votes per user", async () => {
    const { service, create } = setupBoard(1);
    const { board, ownerToken } = await create();
    await service.toggleVoting(board.id, true, ownerToken);
    const first = await service.createCard(board.id, "start", "Automate deploy", "Ana");
    const second = await service.createCard(board.id, "stop", "Large PRs", "Leo");

    await service.toggleVote(board.id, first.id, "u1");

    await expect(service.toggleVote(board.id, second.id, "u1")).rejects.toThrowError(
      "You reached the maximum number of votes."
    );
  });

  it("moves card between columns", async () => {
    const { service, create } = setupBoard();
    const { board } = await create();
    const card = await service.createCard(board.id, "start", "Write docs", "Ana");

    const moved = await service.moveCard(board.id, card.id, "continue");

    expect(moved.column).toBe("continue");
  });

  it("removes vote references when deleting a card", async () => {
    const { service, create } = setupBoard(3);
    const { board, ownerToken } = await create();
    await service.toggleVoting(board.id, true, ownerToken);
    const card = await service.createCard(board.id, "continue", "Pair programming", "Mia");

    await service.toggleVote(board.id, card.id, "u1");
    await service.deleteCard(board.id, card.id);

    const voteState = await service.getUserVoteState(board.id, "u1");
    expect(voteState.userVotesUsed).toBe(0);
    expect(voteState.userVotesByCard[card.id]).toBeUndefined();
  });
});
