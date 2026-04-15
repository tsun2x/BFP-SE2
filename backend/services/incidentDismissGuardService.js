const DEFAULT_DISMISS_COOLDOWN_MS = 30_000;

// Keyed by `${alarmId}:${dispatcherUserId}` -> expiresAt epoch ms
const dismissedIncidentByDispatcher = new Map();

function toAlarmId(value) {
  return Number(value || 0) || null;
}

function toDispatcherUserId(value) {
  return Number(value || 0) || null;
}

function buildKey(alarmId, dispatcherUserId) {
  return `${alarmId}:${dispatcherUserId}`;
}

function pruneExpiredForKey(alarmId, dispatcherUserId) {
  const key = buildKey(alarmId, dispatcherUserId);
  const expiresAt = Number(dismissedIncidentByDispatcher.get(key) || 0) || 0;
  if (!expiresAt) {
    return false;
  }

  if (Date.now() < expiresAt) {
    return true;
  }

  dismissedIncidentByDispatcher.delete(key);
  return false;
}

export function markIncidentDismissedByDispatcher({
  alarmId,
  dispatcherUserId,
  cooldownMs = DEFAULT_DISMISS_COOLDOWN_MS,
}) {
  const normalizedAlarmId = toAlarmId(alarmId);
  const normalizedDispatcherUserId = toDispatcherUserId(dispatcherUserId);
  const normalizedCooldownMs = Math.max(1_000, Number(cooldownMs || 0) || DEFAULT_DISMISS_COOLDOWN_MS);

  if (!normalizedAlarmId || !normalizedDispatcherUserId) {
    return false;
  }

  const expiresAt = Date.now() + normalizedCooldownMs;
  dismissedIncidentByDispatcher.set(
    buildKey(normalizedAlarmId, normalizedDispatcherUserId),
    expiresAt,
  );

  return true;
}

export function clearIncidentDismissedByDispatcher({ alarmId, dispatcherUserId }) {
  const normalizedAlarmId = toAlarmId(alarmId);
  const normalizedDispatcherUserId = toDispatcherUserId(dispatcherUserId);

  if (!normalizedAlarmId || !normalizedDispatcherUserId) {
    return false;
  }

  return dismissedIncidentByDispatcher.delete(
    buildKey(normalizedAlarmId, normalizedDispatcherUserId),
  );
}

export function isIncidentDismissedByDispatcher({ alarmId, dispatcherUserId }) {
  const normalizedAlarmId = toAlarmId(alarmId);
  const normalizedDispatcherUserId = toDispatcherUserId(dispatcherUserId);

  if (!normalizedAlarmId || !normalizedDispatcherUserId) {
    return false;
  }

  return pruneExpiredForKey(normalizedAlarmId, normalizedDispatcherUserId);
}

export function emitIncomingIncidentWithDismissGuard({
  io,
  targetRoom,
  payload,
  dispatchGroup,
}) {
  if (!io || !targetRoom) {
    return { deliveredCount: 0, skippedCount: 0 };
  }

  const roomMembers = io?.sockets?.adapter?.rooms?.get(targetRoom);
  if (!roomMembers || roomMembers.size === 0) {
    return { deliveredCount: 0, skippedCount: 0 };
  }

  const alarmId = toAlarmId(payload?.alarmId);
  let deliveredCount = 0;
  let skippedCount = 0;

  for (const socketId of roomMembers) {
    const socket = io?.sockets?.sockets?.get(socketId);
    if (!socket) continue;

    const dispatcherUserId = toDispatcherUserId(socket?._dispatcherUserId);

    if (alarmId && dispatcherUserId) {
      const suppressed = isIncidentDismissedByDispatcher({
        alarmId,
        dispatcherUserId,
      });
      if (suppressed) {
        skippedCount += 1;
        continue;
      }
    }

    io.to(socketId).emit("incoming-incident", {
      ...payload,
      dispatchGroup,
    });
    deliveredCount += 1;
  }

  return { deliveredCount, skippedCount };
}
