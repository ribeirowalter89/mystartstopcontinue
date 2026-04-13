import { BoardMeta, ParticipantPresence } from "../../shared/types";
import { AvatarStack } from "./AvatarStack";

interface BoardTopBarProps {
  board: BoardMeta;
  participants: ParticipantPresence[];
  isOwner: boolean;
  onToggleVoting: (votingEnabled: boolean) => void;
}

export function BoardTopBar({ board, participants, isOwner, onToggleVoting }: BoardTopBarProps) {
  return (
    <header className="sticky top-0 z-20 mb-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{board.title}</h1>
          {board.description ? <p className="mt-1 text-sm text-slate-600">{board.description}</p> : null}
          <p className="mt-2 text-xs text-slate-500">
            Voting limit: {board.settings.maxVotesPerUser} per person
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          <AvatarStack participants={participants} />
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                board.settings.votingEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
              }`}
            >
              {board.settings.votingEnabled ? "Voting active" : "Voting paused"}
            </span>
            {isOwner ? (
              <button
                type="button"
                onClick={() => onToggleVoting(!board.settings.votingEnabled)}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-indigo-700"
              >
                {board.settings.votingEnabled ? "End voting" : "Start voting"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
