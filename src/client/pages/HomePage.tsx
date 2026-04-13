import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../lib/config";
import { getRecentBoards, saveOwnerToken } from "../lib/storage";
import { CreateBoardResponse } from "../../shared/types";

export function HomePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxVotesPerUser, setMaxVotesPerUser] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recentBoards = useMemo(() => getRecentBoards(), []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Please provide a board title.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          maxVotesPerUser
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message || "Failed to create board.");
      }

      const payload = (await response.json()) as CreateBoardResponse;
      saveOwnerToken(payload.boardId, payload.ownerToken);
      navigate(`/board/${payload.boardId}`);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unexpected error.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl p-6">
      <section className="rounded-3xl bg-gradient-to-r from-cyan-500 to-blue-600 p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Start Stop Continue Board</h1>
        <p className="mt-3 max-w-2xl text-sm text-blue-50">
          Run collaborative retrospectives with live cards, drag-and-drop and dot voting in real time.
        </p>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.3fr,0.7fr]">
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Create new board</h2>

          <label className="mt-4 block text-sm font-medium text-slate-700">Title</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-emerald-200 focus:ring"
            placeholder="Sprint 24 retrospective"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={80}
          />

          <label className="mt-4 block text-sm font-medium text-slate-700">Description (optional)</label>
          <textarea
            className="mt-1 h-24 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 outline-none ring-emerald-200 focus:ring"
            placeholder="What should we improve this sprint?"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={240}
          />

          <label className="mt-4 block text-sm font-medium text-slate-700">Max votes per user</label>
          <input
            type="number"
            min={1}
            max={10}
            className="mt-1 w-32 rounded-lg border border-slate-300 px-3 py-2 outline-none ring-emerald-200 focus:ring"
            value={maxVotesPerUser}
            onChange={(event) => setMaxVotesPerUser(Number(event.target.value))}
          />

          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

          <button
            disabled={loading}
            type="submit"
            className="mt-5 rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create new board"}
          </button>
        </form>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent boards</h2>
          <div className="mt-4 space-y-3">
            {recentBoards.length === 0 ? (
              <p className="text-sm text-slate-500">No boards yet on this browser.</p>
            ) : (
              recentBoards.map((board) => (
                <Link
                  key={board.boardId}
                  to={`/board/${board.boardId}`}
                  className="block rounded-xl border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <p className="font-medium text-slate-800">{board.title}</p>
                  <p className="text-xs text-slate-500">
                    Last open: {new Date(board.visitedAt).toLocaleString()}
                  </p>
                </Link>
              ))
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
