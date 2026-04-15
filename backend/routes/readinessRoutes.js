import express from "express";
import { supabase } from "../supabaseClient.js";
import { authenticateToken } from "../middleware/auth.js";
import {
  requireRoles,
  isAdminUser,
  getUserStationId,
} from "../middleware/role.js";

const router = express.Router();

function normalizeEquipmentChecklist(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return {};
    }
  }

  return value;
}

// Submit station readiness (by officer assigned to that station)
router.post(
  "/station-readiness",
  authenticateToken,
  requireRoles(["admin", "substation_admin", "driver"]),
  async (req, res) => {
    try {
      const { status, readinessPercentage, equipmentChecklist } = req.body;
      const userId = req.user.id;
      const isAdmin = isAdminUser(req.user);
      const assignedStationId = getUserStationId(req.user);

      console.log(
        "[POST /station-readiness] User:",
        userId,
        "Station:",
        assignedStationId,
        "Status:",
        status,
      );

      // Validate required fields
      if (!status || readinessPercentage === undefined) {
        return res.status(400).json({
          message: "Status and readiness percentage are required",
        });
      }

      // Validate user is assigned to a station (admins are allowed to submit as well, but still must be station-scoped)
      if (!assignedStationId) {
        console.log(
          "[POST /station-readiness] User not assigned to any station",
        );
        return res.status(403).json({
          message: "You are not assigned to any station",
        });
      }

      // Admins still submit for their own station; no cross-station submission via this endpoint
      if (isAdmin && !assignedStationId) {
        return res
          .status(400)
          .json({ message: "Admin has no assigned station" });
      }

      try {
        console.log("[POST /station-readiness] Inserting readiness record...");

        const { data: result, error: insertErr } = await supabase
          .from("station_readiness")
          .insert([
            {
              station_id: assignedStationId,
              submitted_by_user_id: userId,
              status,
              readiness_percentage: readinessPercentage,
              equipment_checklist:
                normalizeEquipmentChecklist(equipmentChecklist),
            },
          ])
          .select("readiness_id")
          .single();

        if (insertErr) {
          console.error("[POST /station-readiness] Insert error:", insertErr);
          throw insertErr;
        }

        console.log(
          "[POST /station-readiness] Insert success, ID:",
          result?.readiness_id,
        );
        res.status(201).json({
          message: "Station readiness submitted successfully",
          readinessId: result?.readiness_id || null,
          stationId: assignedStationId,
          status,
          readinessPercentage,
        });
      } catch (error) {
        throw error;
      }
    } catch (error) {
      console.error("[POST /station-readiness] Error:", error);
      res.status(500).json({
        message: "Failed to submit station readiness",
        error: error.message,
        details: error.details || error,
      });
    }
  },
);

// Get latest readiness for a specific station
router.get(
  "/station-readiness/:stationId",
  authenticateToken,
  requireRoles(["admin", "substation_admin", "driver"]),
  async (req, res) => {
    try {
      const { stationId } = req.params;

      const isAdmin = isAdminUser(req.user);
      const assignedStationId = getUserStationId(req.user);

      if (!isAdmin) {
        if (!assignedStationId) {
          return res
            .status(403)
            .json({ message: "You are not assigned to any station" });
        }
        if (String(stationId) !== String(assignedStationId)) {
          return res.status(403).json({
            message: "Forbidden: station is not assigned to your account",
          });
        }
      }

      const { data: station, error: stationErr } = await supabase
        .from("fire_stations")
        .select("station_id, station_name")
        .eq("station_id", stationId)
        .maybeSingle();

      if (stationErr) throw stationErr;

      const { data: currentStatus, error: readinessErr } = await supabase
        .from("station_current_status")
        .select(
          "readiness_status, readiness_percentage, equipment_checklist, last_readiness_submission_at",
        )
        .eq("station_id", stationId)
        .maybeSingle();

      if (readinessErr) throw readinessErr;

      if (!station) {
        return res.json({
          readinessId: null,
          stationId: Number(stationId),
          stationName: null,
          status: "NOT_READY",
          readinessPercentage: 0,
          equipmentChecklist: {},
          submittedBy: "N/A",
          submittedAt: null,
        });
      }

      res.json({
        readinessId: null,
        stationId: station.station_id,
        stationName: station.station_name || null,
        status: currentStatus?.readiness_status || "NOT_READY",
        readinessPercentage: currentStatus?.readiness_percentage || 0,
        equipmentChecklist: normalizeEquipmentChecklist(
          currentStatus?.equipment_checklist,
        ),
        submittedBy: "N/A",
        submittedAt: currentStatus?.last_readiness_submission_at || null,
      });
    } catch (error) {
      console.error("Get station readiness error:", error);
      res.status(500).json({
        message: "Failed to fetch station readiness",
        error: error.message,
      });
    }
  },
);

// Get all stations with their latest readiness (for overview)
router.get(
  "/stations-readiness-overview",
  authenticateToken,
  requireRoles(["admin", "substation_admin", "driver"]),
  async (req, res) => {
    try {
      console.log("[GET /stations-readiness-overview] Starting...");

      const isAdmin = isAdminUser(req.user);
      const assignedStationId = getUserStationId(req.user);

      if (!isAdmin && !assignedStationId) {
        return res
          .status(403)
          .json({ message: "You are not assigned to any station" });
      }

      const { data: stations, error: stationsErr } = await supabase
        .from("fire_stations")
        .select("station_id, station_name")
        .order("station_name", { ascending: true });

      if (stationsErr) {
        console.error(
          "[GET /stations-readiness-overview] Stations error:",
          stationsErr,
        );
        throw stationsErr;
      }

      console.log(
        "[GET /stations-readiness-overview] Found stations:",
        stations?.length || 0,
      );

      const scopedStations = isAdmin
        ? stations || []
        : (stations || []).filter(
            (s) => String(s.station_id) === String(assignedStationId),
          );
      const stationIds = scopedStations.map((station) => station.station_id);

      const { data: currentStatuses, error: currentStatusesErr } =
        stationIds.length === 0
          ? { data: [], error: null }
          : await supabase
              .from("station_current_status")
              .select(
                "station_id, readiness_status, readiness_percentage, last_readiness_submission_at",
              )
              .in("station_id", stationIds);

      if (currentStatusesErr) {
        console.error(
          "[GET /stations-readiness-overview] Snapshot error:",
          currentStatusesErr,
        );
        throw currentStatusesErr;
      }

      const currentStatusMap = new Map();
      (currentStatuses || []).forEach((row) => {
        currentStatusMap.set(row.station_id, row);
      });

      const overview = scopedStations.map((station) => {
        const currentStatus = currentStatusMap.get(station.station_id);

        return {
          stationId: station.station_id,
          stationName: station.station_name,
          readinessStatus: currentStatus?.readiness_status || "UNKNOWN",
          readinessPercentage: currentStatus?.readiness_percentage || 0,
          lastSubmittedBy: "N/A",
          lastReadinessUpdate:
            currentStatus?.last_readiness_submission_at || null,
        };
      });

      console.log(
        "[GET /stations-readiness-overview] Success, returning",
        overview.length,
        "stations",
      );
      res.json({ overview });
    } catch (error) {
      console.error("[GET /stations-readiness-overview] Fatal error:", error);
      res.status(500).json({
        message: "Failed to fetch readiness overview",
        error: error.message,
      });
    }
  },
);

// CRUD endpoints for station checklist items

// Get all custom checklist items for a station
router.get(
  "/station-checklist-items/:stationId",
  authenticateToken,
  requireRoles(["admin", "substation_admin"]),
  async (req, res) => {
    try {
      const { stationId } = req.params;
      const isAdmin = isAdminUser(req.user);
      const assignedStationId = getUserStationId(req.user);

      if (!isAdmin) {
        if (!assignedStationId) {
          return res
            .status(403)
            .json({ message: "You are not assigned to any station" });
        }
        if (String(stationId) !== String(assignedStationId)) {
          return res.status(403).json({
            message: "Forbidden: station is not assigned to your account",
          });
        }
      }

      const { data: items, error } = await supabase
        .from("station_checklist_items")
        .select("*")
        .eq("station_id", stationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      res.json({ success: true, data: items || [] });
    } catch (error) {
      console.error("Get checklist items error:", error);
      res.status(500).json({
        message: "Failed to fetch checklist items",
        error: error.message,
      });
    }
  },
);

// Add a new checklist item
router.post(
  "/station-checklist-items",
  authenticateToken,
  requireRoles(["admin", "substation_admin"]),
  async (req, res) => {
    try {
      const { stationId, itemKey, itemLabel, category } = req.body;
      const assignedStationId = getUserStationId(req.user);
      const isAdmin = isAdminUser(req.user);

      if (!stationId || !itemKey || !itemLabel) {
        return res.status(400).json({
          message: "stationId, itemKey, and itemLabel are required",
        });
      }

      // Validate station access
      if (!isAdmin && String(stationId) !== String(assignedStationId)) {
        return res.status(403).json({
          message: "Forbidden: station is not assigned to your account",
        });
      }

      const { data: item, error } = await supabase
        .from("station_checklist_items")
        .insert([
          {
            station_id: stationId,
            item_key: itemKey,
            item_label: itemLabel,
            category: category || "equipment",
          },
        ])
        .select("*")
        .single();

      if (error) throw error;

      res.json({ success: true, data: item });
    } catch (error) {
      console.error("Add checklist item error:", error);
      res.status(500).json({
        message: "Failed to add checklist item",
        error: error.message,
      });
    }
  },
);

// Update a checklist item (itemId can be item_key or item_id)
router.put(
  "/station-checklist-items/:itemId",
  authenticateToken,
  requireRoles(["admin", "substation_admin"]),
  async (req, res) => {
    try {
      const { itemId } = req.params;
      const { itemLabel } = req.body;
      const assignedStationId = getUserStationId(req.user);
      const isAdmin = isAdminUser(req.user);

      if (!itemLabel) {
        return res.status(400).json({ message: "itemLabel is required" });
      }

      // Try lookup by item_id first, then by item_key + station_id
      let existingItem = null;
      const isNumeric = /^\d+$/.test(itemId);

      if (isNumeric) {
        const { data, error: fetchError } = await supabase
          .from("station_checklist_items")
          .select("*")
          .eq("item_id", itemId)
          .single();
        if (!fetchError) existingItem = data;
      }

      if (!existingItem) {
        const stationId = isAdmin ? null : assignedStationId;
        let query = supabase
          .from("station_checklist_items")
          .select("*")
          .eq("item_key", itemId);
        if (stationId) query = query.eq("station_id", stationId);
        const { data, error: fetchError } = await query.single();
        if (!fetchError) existingItem = data;
      }

      if (!existingItem) {
        return res.status(404).json({ message: "Checklist item not found" });
      }

      // Validate station access
      if (
        !isAdmin &&
        String(existingItem.station_id) !== String(assignedStationId)
      ) {
        return res.status(403).json({
          message: "Forbidden: station is not assigned to your account",
        });
      }

      const { data: item, error } = await supabase
        .from("station_checklist_items")
        .update({ item_label: itemLabel })
        .eq("item_id", existingItem.item_id)
        .select("*")
        .single();

      if (error) throw error;

      res.json({ success: true, data: item });
    } catch (error) {
      console.error("Update checklist item error:", error);
      res.status(500).json({
        message: "Failed to update checklist item",
        error: error.message,
      });
    }
  },
);

// Delete a checklist item (itemId can be item_key or item_id)
router.delete(
  "/station-checklist-items/:itemId",
  authenticateToken,
  requireRoles(["admin", "substation_admin"]),
  async (req, res) => {
    try {
      const { itemId } = req.params;
      const assignedStationId = getUserStationId(req.user);
      const isAdmin = isAdminUser(req.user);

      // Try lookup by item_id first, then by item_key + station_id
      let existingItem = null;
      const isNumeric = /^\d+$/.test(itemId);

      if (isNumeric) {
        const { data, error: fetchError } = await supabase
          .from("station_checklist_items")
          .select("*")
          .eq("item_id", itemId)
          .single();
        if (!fetchError) existingItem = data;
      }

      if (!existingItem) {
        const stationId = isAdmin ? null : assignedStationId;
        let query = supabase
          .from("station_checklist_items")
          .select("*")
          .eq("item_key", itemId);
        if (stationId) query = query.eq("station_id", stationId);
        const { data, error: fetchError } = await query.single();
        if (!fetchError) existingItem = data;
      }

      if (!existingItem) {
        return res.status(404).json({ message: "Checklist item not found" });
      }

      // Validate station access
      if (
        !isAdmin &&
        String(existingItem.station_id) !== String(assignedStationId)
      ) {
        return res.status(403).json({
          message: "Forbidden: station is not assigned to your account",
        });
      }

      const { error } = await supabase
        .from("station_checklist_items")
        .delete()
        .eq("item_id", existingItem.item_id);

      if (error) throw error;

      res.json({
        success: true,
        message: "Checklist item deleted successfully",
      });
    } catch (error) {
      console.error("Delete checklist item error:", error);
      res.status(500).json({
        message: "Failed to delete checklist item",
        error: error.message,
      });
    }
  },
);

export default router;
