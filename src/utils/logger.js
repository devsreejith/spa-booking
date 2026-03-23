const MAX_LOGS = 100;
let recentLogs = [];

export function getRecentLogs() {
  return recentLogs;
}

export function logEvent(type, payload) {
  const entry = { ts: new Date().toISOString(), type, payload };
  console.info('[LOG]', entry);
  recentLogs.unshift(entry);
  if (recentLogs.length > MAX_LOGS) recentLogs.pop();
}

export function logError(context, error) {
  const entry = { ts: new Date().toISOString(), context, error: error?.message || String(error) };
  console.error('[ERROR]', entry);
  recentLogs.unshift({ ...entry, type: 'ERROR' });
  if (recentLogs.length > MAX_LOGS) recentLogs.pop();
}
