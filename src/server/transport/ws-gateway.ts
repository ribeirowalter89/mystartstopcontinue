import { IncomingMessage } from "http";
import { nanoid } from "nanoid";
import { WebSocket, WebSocketServer } from "ws";
import { BoardService } from "../domain/board-service";
import { DomainError } from "../domain/errors";
import { ClientEvent, ParticipantPresence, ServerEvent } from "../../shared/types";

interface ClientSession {
  socketId: string;
  boardId: string;
  userId: string;
  displayName: string;
  color: string;
  isOwner: boolean;
  ownerToken?: string;
}

export class RealtimeGateway {
  private readonly webSocketServer: WebSocketServer;
  private readonly sessionsBySocket = new Map<WebSocket, ClientSession>();
  private readonly roomSockets = new Map<string, Set<WebSocket>>();
  private readonly roomPresence = new Map<string, Map<string, ParticipantPresence>>();

  // To swap transport later (Firebase/Supabase Realtime), keep BoardService as the single source
  // of domain rules and map realtime events to the same method calls used below.
  constructor(server: import("http").Server, private readonly boardService: BoardService) {
    this.webSocketServer = new WebSocketServer({
      server,
      path: "/ws"
    });

    this.webSocketServer.on("connection", (socket, request) => {
      this.handleConnection(socket, request);
    });
  }

  private handleConnection(socket: WebSocket, _request: IncomingMessage): void {
    socket.on("message", (message) => {
      void this.handleMessage(socket, message.toString());
    });

    socket.on("close", () => {
      this.handleDisconnection(socket);
    });
  }

  private async handleMessage(socket: WebSocket, rawMessage: string): Promise<void> {
    let event: ClientEvent;
    try {
      event = JSON.parse(rawMessage) as ClientEvent;
    } catch (_error) {
      this.send(socket, { type: "ERROR", payload: { message: "Invalid message payload." } });
      return;
    }

    try {
      switch (event.type) {
        case "JOIN_BOARD":
          await this.handleJoinBoard(socket, event);
          break;
        case "CREATE_CARD":
          await this.handleCreateCard(socket, event);
          break;
        case "UPDATE_CARD":
          await this.handleUpdateCard(socket, event);
          break;
        case "DELETE_CARD":
          await this.handleDeleteCard(socket, event);
          break;
        case "MOVE_CARD":
          await this.handleMoveCard(socket, event);
          break;
        case "TOGGLE_VOTE":
          await this.handleToggleVote(socket, event);
          break;
        case "TOGGLE_VOTING":
          await this.handleToggleVoting(socket, event);
          break;
        default:
          this.send(socket, { type: "ERROR", payload: { message: "Unsupported event type." } });
      }
    } catch (error) {
      if (error instanceof DomainError) {
        this.send(socket, { type: "ERROR", payload: { message: error.message } });
        return;
      }
      this.send(socket, { type: "ERROR", payload: { message: "Unexpected realtime error." } });
    }
  }

  private handleJoinBoard(
    socket: WebSocket,
    event: Extract<ClientEvent, { type: "JOIN_BOARD" }>
  ): Promise<void> {
    return this.handleJoinBoardAsync(socket, event);
  }

  private async handleJoinBoardAsync(
    socket: WebSocket,
    event: Extract<ClientEvent, { type: "JOIN_BOARD" }>
  ): Promise<void> {
    const { boardId, userId, displayName, color, ownerToken } = event.payload;
    const isOwner = await this.boardService.isOwner(boardId, ownerToken);

    const session: ClientSession = {
      socketId: nanoid(12),
      boardId,
      userId,
      displayName: displayName.trim() || "Anonymous",
      color: color || "#64748b",
      isOwner,
      ownerToken
    };

    this.sessionsBySocket.set(socket, session);

    if (!this.roomSockets.has(boardId)) {
      this.roomSockets.set(boardId, new Set());
    }
    this.roomSockets.get(boardId)?.add(socket);

    if (!this.roomPresence.has(boardId)) {
      this.roomPresence.set(boardId, new Map());
    }
    this.roomPresence.get(boardId)?.set(session.socketId, {
      userId: session.userId,
      displayName: session.displayName,
      color: session.color
    });

    const presence = this.getPresenceForBoard(boardId);
    const boardState = await this.boardService.getBoardState({
      boardId,
      userId,
      presence,
      isOwner
    });
    this.send(socket, { type: "BOARD_STATE", payload: boardState });
    this.broadcast(boardId, { type: "PRESENCE_UPDATE", payload: { presence } });
  }

  private handleCreateCard(
    socket: WebSocket,
    event: Extract<ClientEvent, { type: "CREATE_CARD" }>
  ): Promise<void> {
    return this.handleCreateCardAsync(socket, event);
  }

  private async handleCreateCardAsync(
    socket: WebSocket,
    event: Extract<ClientEvent, { type: "CREATE_CARD" }>
  ): Promise<void> {
    const session = this.requireSession(socket, event.payload.boardId);
    const card = await this.boardService.createCard(
      session.boardId,
      event.payload.column,
      event.payload.text,
      event.payload.authorName
    );
    this.broadcast(session.boardId, { type: "CARD_CREATED", payload: { card } });
  }

  private handleUpdateCard(
    socket: WebSocket,
    event: Extract<ClientEvent, { type: "UPDATE_CARD" }>
  ): Promise<void> {
    return this.handleUpdateCardAsync(socket, event);
  }

  private async handleUpdateCardAsync(
    socket: WebSocket,
    event: Extract<ClientEvent, { type: "UPDATE_CARD" }>
  ): Promise<void> {
    const session = this.requireSession(socket, event.payload.boardId);
    const card = await this.boardService.updateCard(session.boardId, event.payload.cardId, event.payload.text);
    this.broadcast(session.boardId, { type: "CARD_UPDATED", payload: { card } });
  }

  private handleDeleteCard(
    socket: WebSocket,
    event: Extract<ClientEvent, { type: "DELETE_CARD" }>
  ): Promise<void> {
    return this.handleDeleteCardAsync(socket, event);
  }

  private async handleDeleteCardAsync(
    socket: WebSocket,
    event: Extract<ClientEvent, { type: "DELETE_CARD" }>
  ): Promise<void> {
    const session = this.requireSession(socket, event.payload.boardId);
    await this.boardService.deleteCard(session.boardId, event.payload.cardId);
    this.broadcast(session.boardId, { type: "CARD_DELETED", payload: { cardId: event.payload.cardId } });

    await this.sendVoteStateToRoom(session.boardId);
  }

  private async handleMoveCard(socket: WebSocket, event: Extract<ClientEvent, { type: "MOVE_CARD" }>): Promise<void> {
    const session = this.requireSession(socket, event.payload.boardId);
    const card = await this.boardService.moveCard(session.boardId, event.payload.cardId, event.payload.column);
    this.broadcast(session.boardId, { type: "CARD_MOVED", payload: { card } });
  }

  private handleToggleVote(
    socket: WebSocket,
    event: Extract<ClientEvent, { type: "TOGGLE_VOTE" }>
  ): Promise<void> {
    return this.handleToggleVoteAsync(socket, event);
  }

  private async handleToggleVoteAsync(
    socket: WebSocket,
    event: Extract<ClientEvent, { type: "TOGGLE_VOTE" }>
  ): Promise<void> {
    const session = this.requireSession(socket, event.payload.boardId);
    const result = await this.boardService.toggleVote(session.boardId, event.payload.cardId, session.userId);

    this.broadcast(session.boardId, {
      type: "VOTE_UPDATED",
      payload: { cardId: result.card.id, votes: result.card.votes }
    });
    this.send(socket, {
      type: "USER_VOTE_STATE",
      payload: { userVotesUsed: result.userVotesUsed, userVotesByCard: result.userVotesByCard }
    });
  }

  private handleToggleVoting(
    socket: WebSocket,
    event: Extract<ClientEvent, { type: "TOGGLE_VOTING" }>
  ): Promise<void> {
    return this.handleToggleVotingAsync(socket, event);
  }

  private async handleToggleVotingAsync(
    socket: WebSocket,
    event: Extract<ClientEvent, { type: "TOGGLE_VOTING" }>
  ): Promise<void> {
    const session = this.requireSession(socket, event.payload.boardId);
    const board = await this.boardService.toggleVoting(
      session.boardId,
      event.payload.votingEnabled,
      session.ownerToken
    );

    this.broadcast(session.boardId, {
      type: "BOARD_SETTINGS_UPDATED",
      payload: { settings: board.settings }
    });
  }

  private handleDisconnection(socket: WebSocket): void {
    const session = this.sessionsBySocket.get(socket);
    if (!session) {
      return;
    }

    this.sessionsBySocket.delete(socket);
    this.roomSockets.get(session.boardId)?.delete(socket);
    if (this.roomSockets.get(session.boardId)?.size === 0) {
      this.roomSockets.delete(session.boardId);
    }

    this.roomPresence.get(session.boardId)?.delete(session.socketId);
    if (this.roomPresence.get(session.boardId)?.size === 0) {
      this.roomPresence.delete(session.boardId);
    }

    const presence = this.getPresenceForBoard(session.boardId);
    this.broadcast(session.boardId, { type: "PRESENCE_UPDATE", payload: { presence } });
  }

  private requireSession(socket: WebSocket, boardId: string): ClientSession {
    const session = this.sessionsBySocket.get(socket);
    if (!session) {
      throw new DomainError("You must join a board first.", 401);
    }
    if (session.boardId !== boardId) {
      throw new DomainError("Payload board does not match current connection.", 400);
    }
    return session;
  }

  private getPresenceForBoard(boardId: string): ParticipantPresence[] {
    const presenceMap = this.roomPresence.get(boardId);
    if (!presenceMap) {
      return [];
    }

    const uniqueByUser = new Map<string, ParticipantPresence>();
    for (const entry of presenceMap.values()) {
      if (!uniqueByUser.has(entry.userId)) {
        uniqueByUser.set(entry.userId, entry);
      }
    }
    return Array.from(uniqueByUser.values());
  }

  private async sendVoteStateToRoom(boardId: string): Promise<void> {
    const sockets = this.roomSockets.get(boardId);
    if (!sockets) {
      return;
    }

    for (const socket of sockets) {
      const session = this.sessionsBySocket.get(socket);
      if (!session) {
        continue;
      }

      const voteState = await this.boardService.getUserVoteState(boardId, session.userId);
      this.send(socket, { type: "USER_VOTE_STATE", payload: voteState });
    }
  }

  private broadcast(boardId: string, message: ServerEvent): void {
    const sockets = this.roomSockets.get(boardId);
    if (!sockets) {
      return;
    }
    for (const socket of sockets) {
      this.send(socket, message);
    }
  }

  private send(socket: WebSocket, message: ServerEvent): void {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify(message));
  }
}
