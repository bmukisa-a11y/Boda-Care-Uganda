import React from 'react';
import { WifiOff, Clock } from 'lucide-react';

interface OfflineFreshnessBannerProps {
  isOffline: boolean;
  lastSyncedAt: string | null;
  contextLabel?: string;
}

export const OfflineFreshnessBanner: React.FC<OfflineFreshnessBannerProps> = ({
  isOffline,
  lastSyncedAt,
  contextLabel = 'Cached records',
}) => {
  if (!isOffline) return null;

  const formattedTime = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'initial cached snapshot';

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl bg-amber-50 border border-amber-300 px-4 py-3 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs"
    >
      <div className="flex items-start sm:items-center gap-2.5 text-xs">
        <WifiOff className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
        <span>
          <strong>Offline Snapshot:</strong> {contextLabel} may not reflect live updates until internet reconnects.
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 shrink-0">
        <Clock className="w-3.5 h-3.5" />
        <span>Last synced: {formattedTime}</span>
      </div>
    </div>
  );
};
