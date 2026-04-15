import { supabase } from "../config/database.js";

// ── Online Station Tracking ───────────────────────────────────────────
// Tracks which stations have an active admin socket connection.
// A station is "online" when at least one admin/substation_admin socket
// is connected and has emitted 'station-online' with their stationId.

// Map<stationId, Set<socketId>>
const onlineMap = new Map();
// Map<stationId, boolean>
const stationOnlineCache = new Map();
// Map<stationId, NodeJS.Timeout>
const stationSyncTimers = new Map();

const STATION_SYNC_DEBOUNCE_MS = 250;
const STATION_OFFLINE_GRACE_MS = 3000;

async function syncStationOnlineStatus(stationId) {
  const id = Number(stationId);
  const sockets = onlineMap.get(id);
  const shouldBeOnline = Boolean(sockets && sockets.size > 0);
  const cached = stationOnlineCache.get(id);

  if (cached === shouldBeOnline) {
    return;
  }

  try {
    await supabase
      .from("station_current_status")
      .update({ is_online: shouldBeOnline })
      .eq("station_id", id);

    stationOnlineCache.set(id, shouldBeOnline);
    console.log(
      `[OnlineStations] Updated database: Station ${id} is_online set to ${shouldBeOnline}`,
    );
  } catch (error) {
    console.error(
      `[OnlineStations] Failed to update database for station ${id}:`,
      error.message,
    );
  }
}

function scheduleStationSync(stationId, delayMs = STATION_SYNC_DEBOUNCE_MS) {
  const id = Number(stationId);
  const existingTimer = stationSyncTimers.get(id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(async () => {
    stationSyncTimers.delete(id);
    await syncStationOnlineStatus(id);
  }, delayMs);

  stationSyncTimers.set(id, timer);
}

/**
 * Mark a station as online (called when a station admin socket connects).
 * If this is the first connection, also update the database.
 */
export async function stationConnected(stationId, socketId) {
  if (!stationId) return;
  const id = Number(stationId);
  if (!onlineMap.has(id)) {
    onlineMap.set(id, new Set());
  }

  const sockets = onlineMap.get(id);
  const previousSize = sockets.size;
  sockets.add(socketId);

  console.log(
    `[OnlineStations] Station ${id} connected (socket ${socketId}). Total sockets: ${sockets.size}`,
  );

  // Sync immediately when first socket appears; debounced otherwise.
  scheduleStationSync(id, previousSize === 0 ? 0 : STATION_SYNC_DEBOUNCE_MS);
}

/**
 * Remove a socket from the station's online set.
 * If no sockets remain, the station goes offline and the database is updated.
 */
export async function stationDisconnected(stationId, socketId) {
  if (!stationId) return;
  const id = Number(stationId);
  const sockets = onlineMap.get(id);
  if (sockets) {
    const hadSocket = sockets.has(socketId);
    sockets.delete(socketId);
    if (sockets.size === 0) {
      onlineMap.delete(id);
      console.log(`[OnlineStations] Station ${id} is now OFFLINE`);
    } else {
      console.log(
        `[OnlineStations] Station ${id} socket removed (${socketId}). Remaining: ${sockets.size}`,
      );
    }

    if (hadSocket) {
      // Give a short grace window before marking offline to absorb reconnect churn.
      const delay = sockets.size === 0 ? STATION_OFFLINE_GRACE_MS : STATION_SYNC_DEBOUNCE_MS;
      scheduleStationSync(id, delay);
    }
  }
}

/**
 * Remove a socket from ALL stations (used on disconnect when stationId is unknown).
 */
export async function socketDisconnected(socketId) {
  for (const [stationId] of onlineMap.entries()) {
    await stationDisconnected(stationId, socketId);
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
