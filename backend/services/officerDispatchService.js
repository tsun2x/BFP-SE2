import { supabase } from "../supabaseClient.js";

const TABLE = "officer_dispatch_status";

let officerDispatchSchemaAvailable = null;

function isMissingSchemaError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "42703" ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes(TABLE)
  );
}

async function hasOfficerDispatchSchema() {
  if (officerDispatchSchemaAvailable !== null) {
    return officerDispatchSchemaAvailable;
  }

  try {
    const { error } = await supabase.from(TABLE).select("user_id").limit(1);
    if (error) {
      if (isMissingSchemaError(error)) {
        officerDispatchSchemaAvailable = false;
        return false;
      }
      throw error;
    }

    officerDispatchSchemaAvailable = true;
    return true;
  } catch (error) {
    if (isMissingSchemaError(error)) {
      officerDispatchSchemaAvailable = false;
      return false;
    }
    throw error;
  }
}

export function getDispatchGroupForUser(user) {
  const role = String(user?.role || "").toLowerCase();
  const stationId =
    Number(user?.assignedStationId || user?.assigned_station_id || 0) || null;

  if (role === "admin") {
    return "main-admin";
  }

  if (stationId) {
    return `station-${stationId}`;
  }

  return null;
}

export function getOfficerRoomForUser(userId) {
  const numericUserId = Number(userId || 0) || null;
  return numericUserId ? `officer-${numericUserId}` : null;
}

export function getOfficerTwilioIdentity(user) {
  const role = String(user?.role || "").toLowerCase();
  const userId = Number(user?.id || user?.user_id || 0) || null;
  const stationId =
    Number(user?.assignedStationId || user?.assigned_station_id || 0) || null;

  if (!userId) return null;

  if (role === "admin") {
    return `ADM_MAIN_${userId}`;
  }

  if (stationId) {
    return `ADM_SUB_${stationId}_${userId}`;
  }

  return null;
}

export async function getPreferredOfficerTwilioIdentity(dispatchGroup) {
  if (!(await hasOfficerDispatchSchema())) {
    return { supported: false, identity: null };
  }

  if (!dispatchGroup) {
    return { supported: true, identity: null };
  }

  const query = supabase
    .from(TABLE)
    .select("user_id, station_id, role, is_busy, current_alarm_id, updated_at")
    .eq("dispatch_group", dispatchGroup)
    .eq("is_online", true)
    .eq("is_busy", false)
    .is("current_alarm_id", null)
    .order("updated_at", { ascending: true })
    .order("user_id", {
      ascending: true,
    });

  const { data: officers, error } = await query.limit(10);

  if (error) {
    if (isMissingSchemaError(error)) {
      officerDispatchSchemaAvailable = false;
      return { supported: false, identity: null };
    }
    throw error;
  }

  const preferred = (officers || [])[0] || null;

  if (!preferred) {
    return { supported: true, identity: null };
  }

  return {
    supported: true,
    identity: getOfficerTwilioIdentity({
      id: preferred.user_id,
      user_id: preferred.user_id,
      role: preferred.role,
      assignedStationId: preferred.station_id,
      assigned_station_id: preferred.station_id,
    }),
  };
}

export async function upsertOfficerDispatchStatus({
  userId,
  stationId = null,
  role,
  dispatchGroup,
  isOnline = true,
  isBusy = false,
  currentAlarmId = null,
}) {
  if (!(await hasOfficerDispatchSchema())) {
    return { supported: false };
  }

  const numericUserId = Number(userId || 0) || null;
  if (!numericUserId || !dispatchGroup) {
    return { supported: true, updated: false };
  }

  const payload = {
    user_id: numericUserId,
    station_id: Number(stationId || 0) || null,
    role: String(role || "dispatcher").toLowerCase(),
    dispatch_group: dispatchGroup,
    is_online: Boolean(isOnline),
    is_busy: Boolean(isBusy),
    current_alarm_id: Number(currentAlarmId || 0) || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from(TABLE).upsert([payload], {
    onConflict: "user_id",
  });

  if (error) {
    if (isMissingSchemaError(error)) {
      officerDispatchSchemaAvailable = false;
      return { supported: false };
    }
    throw error;
  }

  return { supported: true, updated: true };
}

export async function markOfficerOffline(userId) {
  if (!(await hasOfficerDispatchSchema())) {
    return { supported: false };
  }

  const numericUserId = Number(userId || 0) || null;
  if (!numericUserId) {
    return { supported: true, updated: false };
  }

  const { error } = await supabase
    .from(TABLE)
    .update({
      is_online: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", numericUserId);

  if (error) {
    if (isMissingSchemaError(error)) {
      officerDispatchSchemaAvailable = false;
      return { supported: false };
    }
    throw error;
  }

  return { supported: true, updated: true };
}

export async function reserveAvailableOfficer({ dispatchGroup, alarmId }) {
  if (!(await hasOfficerDispatchSchema())) {
    return { supported: false, officer: null };
  }

  const numericAlarmId = Number(alarmId || 0) || null;
  if (!dispatchGroup || !numericAlarmId) {
    return { supported: true, officer: null };
  }

  const candidateQuery = supabase
    .from(TABLE)
    .select("user_id, station_id, role, dispatch_group, updated_at")
    .eq("dispatch_group", dispatchGroup)
    .eq("is_online", true)
    .eq("is_busy", false)
    .is("current_alarm_id", null)
    .order("updated_at", {
      ascending: true,
    }).order("user_id", { ascending: true });

  const { data: candidates, error } = await candidateQuery.limit(10);

  if (error) {
    if (isMissingSchemaError(error)) {
      officerDispatchSchemaAvailable = false;
      return { supported: false, officer: null };
    }
    throw error;
  }

  for (const candidate of candidates || []) {
    const { data: updated, error: reserveError } = await supabase
      .from(TABLE)
      .update({
        current_alarm_id: numericAlarmId,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", candidate.user_id)
      .eq("dispatch_group", dispatchGroup)
      .eq("is_online", true)
      .eq("is_busy", false)
      .is("current_alarm_id", null)
      .select("user_id, station_id, role, dispatch_group")
      .maybeSingle();

    if (reserveError) {
      if (isMissingSchemaError(reserveError)) {
        officerDispatchSchemaAvailable = false;
        return { supported: false, officer: null };
      }
      throw reserveError;
    }

    if (updated) {
      return { supported: true, officer: updated };
    }
  }

  return { supported: true, officer: null };
}

export async function markOfficerBusy({ userId, alarmId }) {
  if (!(await hasOfficerDispatchSchema())) {
    return { supported: false };
  }

  const numericUserId = Number(userId || 0) || null;
  const numericAlarmId = Number(alarmId || 0) || null;
  if (!numericUserId) {
    return { supported: true, updated: false };
  }

  const { error } = await supabase
    .from(TABLE)
    .update({
      is_busy: true,
      current_alarm_id: numericAlarmId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", numericUserId);

  if (error) {
    if (isMissingSchemaError(error)) {
      officerDispatchSchemaAvailable = false;
      return { supported: false };
    }
    throw error;
  }

  return { supported: true, updated: true };
}

export async function releaseOfficerByAlarm(alarmId) {
  if (!(await hasOfficerDispatchSchema())) {
    return { supported: false };
  }

  const numericAlarmId = Number(alarmId || 0) || null;
  if (!numericAlarmId) {
    return { supported: true, updated: false };
  }

  const { error } = await supabase
    .from(TABLE)
    .update({
      is_busy: false,
      current_alarm_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("current_alarm_id", numericAlarmId);

  if (error) {
    if (isMissingSchemaError(error)) {
      officerDispatchSchemaAvailable = false;
      return { supported: false };
    }
    throw error;
  }

  return { supported: true, updated: true };
}
