import { ParticipantPresence } from "../../shared/types";

interface AvatarStackProps {
  participants: ParticipantPresence[];
}

export function AvatarStack({ participants }: AvatarStackProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {participants.map((participant) => (
          <div
            key={participant.userId}
            title={participant.displayName}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white shadow-sm"
            style={{ backgroundColor: participant.color }}
          >
            {participant.displayName.slice(0, 1).toUpperCase()}
          </div>
        ))}
      </div>
      <span className="text-sm text-slate-600">{participants.length} online</span>
    </div>
  );
}
