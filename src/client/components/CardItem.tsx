import { FormEvent, useState } from "react";
import { Card } from "../../shared/types";

interface CardItemProps {
  card: Card;
  toneClassName: string;
  hasVoted: boolean;
  canVote: boolean;
  votingEnabled: boolean;
  onVote: (cardId: string) => void;
  onDelete: (cardId: string) => void;
  onUpdate: (cardId: string, text: string) => void;
  onDragStart: (cardId: string) => void;
}

export function CardItem({
  card,
  toneClassName,
  hasVoted,
  canVote,
  votingEnabled,
  onVote,
  onDelete,
  onUpdate,
  onDragStart
}: CardItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card.text);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = draft.trim();
    if (!normalized) {
      return;
    }
    onUpdate(card.id, normalized);
    setEditing(false);
  };

  return (
    <div
      draggable
      onDragStart={() => onDragStart(card.id)}
      className={`cursor-grab rounded-xl border border-slate-300 p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing ${toneClassName}`}
    >
      {editing ? (
        <form onSubmit={submit}>
          <textarea
            className="h-24 w-full resize-none rounded border border-slate-300 bg-white p-2 text-sm outline-none ring-emerald-200 focus:ring"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="submit"
              className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(card.text);
                setEditing(false);
              }}
              className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="whitespace-pre-wrap text-sm text-slate-900">{card.text}</p>
          <p className="mt-2 text-xs text-slate-600">by {card.authorName}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={!votingEnabled || (!canVote && !hasVoted)}
              onClick={() => onVote(card.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                hasVoted
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              }`}
            >
              {hasVoted ? "Voted" : "Vote"} ({card.votes})
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(card.id)}
                className="rounded border border-rose-300 bg-white px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
