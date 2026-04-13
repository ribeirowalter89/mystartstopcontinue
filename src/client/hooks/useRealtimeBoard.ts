import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BoardColumn,
  BoardMeta,
  Card,
  ClientEvent,
  ParticipantPresence,
  Profile,
  ServerEvent
} from "../../shared/types";
import { WS_BASE_URL } from "../lib/config";
import { getOwnerToken } from "../lib/storage";

interface RealtimeBoardState {
  board: BoardMeta | null;
  cards: Card[];
  presence: ParticipantPresence[];
  connected: boolean;
  isOwner: boolean;
  userVotesUsed: number;
  userVotesByCard: Record<string, boolean>;
  error: string | null;
}

const INITIAL_STATE: RealtimeBoardState = {
  board: null,
  cards: [],
  presence: [],
  connected: false,
  isOwner: false,
  userVotesUsed: 0,
  userVotesByCard: {},
  error: null
};

function sortCards(cards: Card[]): Card[] {
  const columnOrder: Record<BoardColumn, number> = {
    start: 0,
    stop: 1,
    continue: 2
  };

  return [...cards].sort((a, b) => {
    const columnCompare = columnOrder[a.column] - columnOrder[b.column];
    if (columnCompare !== 0) {
      return columnCompare;
    }
    return a.position - b.position;
  });
}

export function useRealtimeBoard(boardId: string, profile: Profile | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<RealtimeBoardState>(INITIAL_STATE);

  const sendEvent = useCallback((event: ClientEvent) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    ws.send(JSON.stringify(event));
  }, []);

  useEffect(() => {
    if (!boardId || !profile) {
      return;
    }

    const socket = new WebSocket(`${WS_BASE_URL}/ws`);
    wsRef.current = socket;

    socket.onopen = () => {
      setState((current) => ({ ...current, connected: true, error: null }));
      sendEvent({
        type: "JOIN_BOARD",
        payload: {
          boardId,
          userId: profile.userId,
          displayName: profile.displayName,
          color: profile.color,
          ownerToken: getOwnerToken(boardId) ?? undefined
        }
      });
    };

    socket.onclose = () => {
      setState((current) => ({ ...current, connected: false }));
    };

    socket.onerror = () => {
      setState((current) => ({
        ...current,
        connected: false,
        error: "Connection error. Please refresh the page."
      }));
    };

    socket.onmessage = (rawEvent) => {
      const event = JSON.parse(rawEvent.data) as ServerEvent;

      setState((current) => {
        switch (event.type) {
          case "BOARD_STATE":
            return {
              ...current,
              board: event.payload.board,
              cards: sortCards(event.payload.cards),
              presence: event.payload.presence,
              userVotesUsed: event.payload.userVotesUsed,
              userVotesByCard: event.payload.userVotesByCard,
              isOwner: event.payload.isOwner
            };
          case "CARD_CREATED":
            return {
              ...current,
              cards: sortCards([...current.cards.filter((card) => card.id !== event.payload.card.id), event.payload.card])
            };
          case "CARD_UPDATED":
            return {
              ...current,
              cards: sortCards(
                current.cards.map((card) => (card.id === event.payload.card.id ? event.payload.card : card))
              )
            };
          case "CARD_DELETED": {
            const nextVotesByCard = { ...current.userVotesByCard };
            delete nextVotesByCard[event.payload.cardId];
            return {
              ...current,
              cards: current.cards.filter((card) => card.id !== event.payload.cardId),
              userVotesByCard: nextVotesByCard,
              userVotesUsed: Object.values(nextVotesByCard).filter(Boolean).length
            };
          }
          case "CARD_MOVED":
            return {
              ...current,
              cards: sortCards(
                current.cards.map((card) => (card.id === event.payload.card.id ? event.payload.card : card))
              )
            };
          case "VOTE_UPDATED":
            return {
              ...current,
              cards: current.cards.map((card) =>
                card.id === event.payload.cardId ? { ...card, votes: event.payload.votes } : card
              )
            };
          case "USER_VOTE_STATE":
            return {
              ...current,
              userVotesUsed: event.payload.userVotesUsed,
              userVotesByCard: event.payload.userVotesByCard
            };
          case "BOARD_SETTINGS_UPDATED":
            if (!current.board) {
              return current;
            }
            return {
              ...current,
              board: {
                ...current.board,
                settings: event.payload.settings
              }
            };
          case "PRESENCE_UPDATE":
            return {
              ...current,
              presence: event.payload.presence
            };
          case "ERROR":
            return {
              ...current,
              error: event.payload.message
            };
          default:
            return current;
        }
      });
    };

    return () => {
      socket.close();
    };
  }, [boardId, profile, sendEvent]);

  const createCard = useCallback(
    (column: BoardColumn, text: string) => {
      if (!profile) {
        return;
      }
      sendEvent({
        type: "CREATE_CARD",
        payload: { boardId, column, text, authorName: profile.displayName }
      });
    },
    [boardId, profile, sendEvent]
  );

  const updateCard = useCallback(
    (cardId: string, text: string) => {
      sendEvent({ type: "UPDATE_CARD", payload: { boardId, cardId, text } });
    },
    [boardId, sendEvent]
  );

  const deleteCard = useCallback(
    (cardId: string) => {
      sendEvent({ type: "DELETE_CARD", payload: { boardId, cardId } });
    },
    [boardId, sendEvent]
  );

  const moveCard = useCallback(
    (cardId: string, column: BoardColumn) => {
      sendEvent({ type: "MOVE_CARD", payload: { boardId, cardId, column } });
    },
    [boardId, sendEvent]
  );

  const toggleVote = useCallback(
    (cardId: string) => {
      if (!profile) {
        return;
      }
      sendEvent({
        type: "TOGGLE_VOTE",
        payload: { boardId, cardId, userId: profile.userId }
      });
    },
    [boardId, profile, sendEvent]
  );

  const toggleVoting = useCallback(
    (votingEnabled: boolean) => {
      sendEvent({
        type: "TOGGLE_VOTING",
        payload: {
          boardId,
          votingEnabled
        }
      });
    },
    [boardId, sendEvent]
  );

  const clearError = useCallback(() => {
    setState((current) => ({ ...current, error: null }));
  }, []);

  return useMemo(
    () => ({
      ...state,
      createCard,
      updateCard,
      deleteCard,
      moveCard,
      toggleVote,
      toggleVoting,
      clearError
    }),
    [clearError, createCard, deleteCard, moveCard, state, toggleVote, toggleVoting, updateCard]
  );
}
