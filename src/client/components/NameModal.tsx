import { FormEvent, useState } from "react";

interface NameModalProps {
  open: boolean;
  onSubmit: (displayName: string) => void;
}

export function NameModal({ open, onSubmit }: NameModalProps) {
  const [displayName, setDisplayName] = useState("");

  if (!open) {
    return null;
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = displayName.trim();
    if (!normalized) {
      return;
    }
    onSubmit(normalized);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-slate-900">Choose your display name</h2>
        <p className="mt-2 text-sm text-slate-600">
          This will identify you in presence and card authorship.
        </p>
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-emerald-200 focus:ring"
          placeholder="Your name"
          maxLength={30}
          autoFocus
        />
        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700"
        >
          Enter board
        </button>
      </form>
    </div>
  );
}
