interface ToastProps {
  message: string;
  onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <span>{message}</span>
        <button onClick={onClose} className="text-rose-700 hover:text-rose-900" aria-label="Close error">
          x
        </button>
      </div>
    </div>
  );
}
