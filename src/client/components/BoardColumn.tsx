import { FormEvent, useMemo, useState } from "react";
import { BoardColumn as BoardColumnKey, Card } from "../../shared/types";
import { CardItem } from "./CardItem";

interface BoardColumnProps {
  title: string;
  column: BoardColumnKey;
  cards: Card[];
  draggingCardId: string | null;
  onDragStart: (cardId: string) => void;
  onDropCard: (cardId: string, column: BoardColumnKey) => void;
  onCreateCard: (column: BoardColumnKey, text: string) => void;
  onUpdateCard: (cardId: string, text: string) => void;
  onDeleteCard: (cardId: string) => void;
  onVoteCard: (cardId: string) => void;
  votingEnabled: boolean;
  userVotesByCard: Record<string, boolean>;
  canVoteMore: boolean;
}

export function BoardColumn({
  title,
  column,
  cards,
  draggingCardId,
  onDragStart,
  onDropCard,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  onVoteCard,
  votingEnabled,
  userVotesByCard,
  canVoteMore
}: BoardColumnProps) {
  const [draft, setDraft] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const columnTone = useMemo(() => {
    if (column === "start") {
      return "from-emerald-50 to-emerald-100";
    }
    if (column === "stop") {
      return "from-rose-50 to-rose-100";
    }
    return "from-sky-50 to-sky-100";
  }, [column]);

  const cardTone = useMemo(() => {
    if (column === "start") {
      return "bg-yellow-100";
    }
    if (column === "stop") {
      return "bg-blue-100";
    }
    return "bg-green-100";
  }, [column]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = draft.trim();
    if (!normalized) {
      return;
    }
    onCreateCard(column, normalized);
    setDraft("");
  };

  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => {
        if (draggingCardId) {
          onDropCard(draggingCardId, column);
        }
        setDragOver(false);
      }}
      className={`min-h-[520px] rounded-2xl border border-slate-200 bg-gradient-to-b ${columnTone} p-4 shadow-sm transition ${
        dragOver ? "ring-2 ring-emerald-400 ring-offset-2" : ""
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <span className="rounded-full bg-white/80 px-2 py-1 text-xs font-medium text-slate-700">{cards.length}</span>
      </div>

      <form onSubmit={submit} className="mb-4">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Add something to ${title}`}
          className="h-20 w-full resize-none rounded-lg border border-slate-300 bg-white p-2 text-sm outline-none ring-emerald-200 focus:ring"
        />
        <button
          type="submit"
          className="mt-2 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Add card
        </button>
      </form>

      <div className="space-y-3">
        {cards.map((card) => {
          const hasVoted = Boolean(userVotesByCard[card.id]);
          return (
            <CardItem
              key={card.id}
              card={card}
              toneClassName={cardTone}
              hasVoted={hasVoted}
              canVote={canVoteMore}
              votingEnabled={votingEnabled}
              onVote={onVoteCard}
              onDelete={onDeleteCard}
              onUpdate={onUpdateCard}
              onDragStart={onDragStart}
            />
          );
        })}
      </div>
    </section>
  );
}
