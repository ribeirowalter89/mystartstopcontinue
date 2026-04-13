import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BOARD_COLUMNS, BoardColumn as BoardColumnKey, Card, Profile } from "../../shared/types";
import { BoardColumn } from "../components/BoardColumn";
import { BoardTopBar } from "../components/BoardTopBar";
import { NameModal } from "../components/NameModal";
import { Toast } from "../components/Toast";
import { useRealtimeBoard } from "../hooks/useRealtimeBoard";
import { addRecentBoard, generateRandomColor, getProfile, saveProfile } from "../lib/storage";

function createUserId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `user_${Math.random().toString(36).slice(2, 10)}`;
}

function groupByColumn(cards: Card[]): Record<BoardColumnKey, Card[]> {
  return BOARD_COLUMNS.reduce<Record<BoardColumnKey, Card[]>>(
    (acc, column) => {
      acc[column] = cards.filter((card) => card.column === column);
      return acc;
    },
    { start: [], stop: [], continue: [] }
  );
}

export function BoardPage() {
  const { boardId = "" } = useParams();
  const [profile, setProfile] = useState<Profile | null>(() => getProfile());
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const realtime = useRealtimeBoard(boardId, profile);

  useEffect(() => {
    if (realtime.board) {
      addRecentBoard(realtime.board.id, realtime.board.title);
    }
  }, [realtime.board]);

  const cardsByColumn = useMemo(() => groupByColumn(realtime.cards), [realtime.cards]);

  const canVoteMore =
    realtime.board ? realtime.userVotesUsed < realtime.board.settings.maxVotesPerUser : false;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#ecfeff,_#e2e8f0,_#f8fafc)] p-4 md:p-6">
      <NameModal
        open={!profile}
        onSubmit={(displayName) => {
          const nextProfile: Profile = {
            userId: createUserId(),
            displayName,
            color: generateRandomColor()
          };
          saveProfile(nextProfile);
          setProfile(nextProfile);
        }}
      />

      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700">
            Back
          </Link>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              realtime.connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {realtime.connected ? "Realtime connected" : "Connecting..."}
          </span>
        </div>

        {realtime.board ? (
          <>
            <BoardTopBar
              board={realtime.board}
              participants={realtime.presence}
              isOwner={realtime.isOwner}
              onToggleVoting={realtime.toggleVoting}
            />

            <section className="grid gap-4 md:grid-cols-3">
              <BoardColumn
                title="Start"
                column="start"
                cards={cardsByColumn.start}
                draggingCardId={draggingCardId}
                onDragStart={setDraggingCardId}
                onDropCard={(cardId, column) => {
                  realtime.moveCard(cardId, column);
                  setDraggingCardId(null);
                }}
                onCreateCard={realtime.createCard}
                onUpdateCard={realtime.updateCard}
                onDeleteCard={realtime.deleteCard}
                onVoteCard={realtime.toggleVote}
                votingEnabled={realtime.board.settings.votingEnabled}
                userVotesByCard={realtime.userVotesByCard}
                canVoteMore={canVoteMore}
              />
              <BoardColumn
                title="Stop"
                column="stop"
                cards={cardsByColumn.stop}
                draggingCardId={draggingCardId}
                onDragStart={setDraggingCardId}
                onDropCard={(cardId, column) => {
                  realtime.moveCard(cardId, column);
                  setDraggingCardId(null);
                }}
                onCreateCard={realtime.createCard}
                onUpdateCard={realtime.updateCard}
                onDeleteCard={realtime.deleteCard}
                onVoteCard={realtime.toggleVote}
                votingEnabled={realtime.board.settings.votingEnabled}
                userVotesByCard={realtime.userVotesByCard}
                canVoteMore={canVoteMore}
              />
              <BoardColumn
                title="Continue"
                column="continue"
                cards={cardsByColumn.continue}
                draggingCardId={draggingCardId}
                onDragStart={setDraggingCardId}
                onDropCard={(cardId, column) => {
                  realtime.moveCard(cardId, column);
                  setDraggingCardId(null);
                }}
                onCreateCard={realtime.createCard}
                onUpdateCard={realtime.updateCard}
                onDeleteCard={realtime.deleteCard}
                onVoteCard={realtime.toggleVote}
                votingEnabled={realtime.board.settings.votingEnabled}
                userVotesByCard={realtime.userVotesByCard}
                canVoteMore={canVoteMore}
              />
            </section>
          </>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
            Loading board <span className="font-mono">{boardId}</span>...
          </section>
        )}
      </div>

      {realtime.error ? <Toast message={realtime.error} onClose={realtime.clearError} /> : null}
    </main>
  );
}
