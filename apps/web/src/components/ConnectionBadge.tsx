import type { SocketStatus } from '../lib/socket';

const LABEL: Record<SocketStatus, string> = {
  connecting: 'Conectando…',
  connected: 'Ao vivo',
  disconnected: 'Offline',
};

export function ConnectionBadge({ status }: { status: SocketStatus }) {
  return (
    <span className={`status-badge status-${status}`} role="status" aria-live="polite">
      <span className="status-dot" aria-hidden="true" />
      {LABEL[status]}
    </span>
  );
}
