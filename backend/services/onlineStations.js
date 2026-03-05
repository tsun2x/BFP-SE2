// ── Online Station Tracking ───────────────────────────────────────────
// Tracks which stations have an active admin socket connection.
// A station is "online" when at least one admin/substation_admin socket
// is connected and has emitted 'station-online' with their stationId.

// Map<stationId, Set<socketId>>
const onlineMap = new Map();

/**
 * Mark a station as online (called when a station admin socket connects).
 */
export function stationConnected(stationId, socketId) {
  if (!stationId) return;
  const id = Number(stationId);
  if (!onlineMap.has(id)) {
    onlineMap.set(id, new Set());
  }
  onlineMap.get(id).add(socketId);
  console.log(`[OnlineStations] Station ${id} connected (socket ${socketId}). Total sockets: ${onlineMap.get(id).size}`);
}

/**
 * Remove a socket from the station's online set.
 * If no sockets remain, the station goes offline.
 */
export function stationDisconnected(stationId, socketId) {
  if (!stationId) return;
  const id = Number(stationId);
  const sockets = onlineMap.get(id);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      onlineMap.delete(id);
      console.log(`[OnlineStations] Station ${id} is now OFFLINE`);
    } else {
      console.log(`[OnlineStations] Station ${id} socket removed (${socketId}). Remaining: ${sockets.size}`);
    }
  }
}

/**
 * Remove a socket from ALL stations (used on disconnect when stationId is unknown).
 */
export function socketDisconnected(socketId) {
  for (const [stationId, sockets] of onlineMap.entries()) {
    if (sockets.has(socketId)) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        onlineMap.delete(stationId);
        console.log(`[OnlineStations] Station ${stationId} is now OFFLINE (socket ${socketId} disconnected)`);
      }
    }
  }
}

/**
 * Check if a station is online.
 */
export function isStationOnline(stationId) {
  const sockets = onlineMap.get(Number(stationId));
  return sockets ? sockets.size > 0 : false;
}

/**
 * Get set of all online station IDs.
 */
export function getOnlineStationIds() {
  return new Set(onlineMap.keys());
}

/**
 * Get a summary for the API/debugging.
 */
export function getOnlineStationsSummary() {
  const result = [];
  for (const [stationId, sockets] of onlineMap.entries()) {
    result.push({ stationId, connections: sockets.size });
  }
  return result;
}
