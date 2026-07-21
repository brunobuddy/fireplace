/**
 * Short, human relative time: "à l’instant", "5m", "3h", "hier", a weekday,
 * then a calendar date. `now` is injectable so it can be unit-tested. Shared
 * by every feature that stamps who-did-what (todos, projects, …).
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  if (Number.isNaN(diffMs)) {
    return '';
  }
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 7) {
    return then.toLocaleDateString('fr-FR', { weekday: 'short' });
  }
  return then.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
}
