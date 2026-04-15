import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useMission, STATUS_PHASES } from "../context/MissionContext";

type Coords = { latitude: number; longitude: number };

const FALLBACK_MAPTILER_KEY = "ps9iKxuRKLZ3RNwtUPip";
const MAPTILER_API_KEY =
  process.env.EXPO_PUBLIC_MAPTILER_API_KEY || FALLBACK_MAPTILER_KEY;

const haversineKm = (a: Coords, b: Coords) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

function buildMapHtml(
  apiKey: string,
  currentCoords: Coords | null,
  incidentCoords: Coords | null,
  activeAlarmId: number | null,
  incidentLabel: string | null,
) {
  const payload = {
    currentCoords,
    incidentCoords,
    activeAlarmId,
    incidentLabel,
    fallbackCenter: { latitude: 6.9214, longitude: 122.079 },
  };

  const serialized = JSON.stringify(payload).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: #f4f4f4;
      }
      .leaflet-container {
        font-family: Arial, sans-serif;
      }
      .label {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 999px;
        color: #fff;
        border: 2px solid #fff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.22);
        font-size: 18px;
      }
      .truck { background: #1e88e5; }
      .incident { background: #d32f2f; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const DATA = ${serialized};
      const map = L.map("map", { zoomControl: true });

      L.tileLayer(
        "https://api.maptiler.com/maps/openstreetmap/{z}/{x}/{y}.jpg?key=${apiKey}",
        {
          attribution: "&copy; OpenStreetMap contributors &copy; MapTiler",
          maxZoom: 19,
        }
      ).addTo(map);

      const bounds = [];
      const truckIcon = L.divIcon({
        html: '<div class="label truck" title="Firetruck">&#128658;</div>',
        className: "",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const incidentIcon = L.divIcon({
        html: '<div class="label incident" title="Incident">&#128293;</div>',
        className: "",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      if (DATA.currentCoords) {
        const p = [DATA.currentCoords.latitude, DATA.currentCoords.longitude];
        bounds.push(p);
        L.marker(p, { icon: truckIcon })
          .addTo(map)
          .bindPopup("<strong>Your Firetruck</strong><br/>Current GPS position");
      }

      if (DATA.incidentCoords) {
        const p = [DATA.incidentCoords.latitude, DATA.incidentCoords.longitude];
        bounds.push(p);
        const title = DATA.activeAlarmId
          ? "Incident #" + DATA.activeAlarmId
          : "Incident location";
        const subtitle = DATA.incidentLabel || "Dispatch target";
        L.marker(p, { icon: incidentIcon })
          .addTo(map)
          .bindPopup("<strong>" + title + "</strong><br/>" + subtitle);
      }

      if (DATA.currentCoords && DATA.incidentCoords) {
        L.polyline(
          [
            [DATA.currentCoords.latitude, DATA.currentCoords.longitude],
            [DATA.incidentCoords.latitude, DATA.incidentCoords.longitude],
          ],
          {
            color: "#1976d2",
            weight: 5,
            opacity: 0.85,
          }
        ).addTo(map);
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [30, 30] });
      } else {
        map.setView([DATA.fallbackCenter.latitude, DATA.fallbackCenter.longitude], 12);
      }
    </script>
  </body>
</html>`;
}

const MapScreen = () => {
  const { fireStatus, activeAlarmId, incidentTarget, handleStatusChange } =
    useMission();

  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<Coords | null>(null);
  const [currentSpeedMps, setCurrentSpeedMps] = useState<number | null>(null);

  const watchRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    const startWatch = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError("Location permission denied.");
          setLoadingLocation(false);
          return;
        }

        const firstFix = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setCurrentCoords({
          latitude: firstFix.coords.latitude,
          longitude: firstFix.coords.longitude,
        });
        setCurrentSpeedMps(firstFix.coords.speed ?? null);
        setLoadingLocation(false);

        watchRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 4000,
            distanceInterval: 5,
          },
          (next) => {
            setCurrentCoords({
              latitude: next.coords.latitude,
              longitude: next.coords.longitude,
            });
            setCurrentSpeedMps(next.coords.speed ?? null);
          },
        );
      } catch (error: any) {
        setLocationError(error?.message || "Failed to get GPS location.");
        setLoadingLocation(false);
      }
    };

    startWatch();

    return () => {
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
    };
  }, []);

  const incidentCoords = useMemo(() => {
    if (!incidentTarget?.latitude || !incidentTarget?.longitude) return null;
    return {
      latitude: incidentTarget.latitude,
      longitude: incidentTarget.longitude,
    } as Coords;
  }, [incidentTarget]);

  const distanceKm =
    currentCoords && incidentCoords
      ? haversineKm(currentCoords, incidentCoords)
      : null;

  const etaMinutes = useMemo(() => {
    if (!distanceKm) return null;

    const speedKmh =
      currentSpeedMps && currentSpeedMps > 1
        ? currentSpeedMps * 3.6
        : 35;

    const mins = (distanceKm / speedKmh) * 60;
    return Math.max(1, Math.round(mins));
  }, [distanceKm, currentSpeedMps]);

  const mapHtml = useMemo(
    () =>
      buildMapHtml(
        MAPTILER_API_KEY,
        currentCoords,
        incidentCoords,
        activeAlarmId,
        incidentTarget?.locationText || null,
      ),
    [currentCoords, incidentCoords, activeAlarmId, incidentTarget],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mission Map</Text>
        <Text style={styles.headerSubtitle}>
          Live GPS, incident pin, route, ETA, and status controls
        </Text>
      </View>

      <View style={styles.mapWrap}>
        {loadingLocation ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#B71C1C" size="large" />
            <Text style={styles.centerStateText}>Getting current GPS...</Text>
          </View>
        ) : locationError ? (
          <View style={styles.centerState}>
            <Ionicons name="alert-circle" size={38} color="#B71C1C" />
            <Text style={styles.centerStateText}>{locationError}</Text>
          </View>
        ) : !MAPTILER_API_KEY ? (
          <View style={styles.centerState}>
            <Ionicons name="key" size={38} color="#B71C1C" />
            <Text style={styles.centerStateText}>
              Map key missing. Set EXPO_PUBLIC_MAPTILER_API_KEY.
            </Text>
          </View>
        ) : (
          <WebView
            originWhitelist={["*"]}
            source={{ html: mapHtml }}
            style={styles.map}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
          />
        )}
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>ETA</Text>
          <Text style={styles.metricValue}>
            {etaMinutes ? `${etaMinutes} min` : "--"}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Distance</Text>
          <Text style={styles.metricValue}>
            {distanceKm ? `${distanceKm.toFixed(2)} km` : "--"}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Status</Text>
          <Text style={styles.metricValue}>{fireStatus}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.controlsRow}
      >
        {STATUS_PHASES.map((phase) => {
          const isActive = fireStatus === phase.key;
          return (
            <TouchableOpacity
              key={phase.key}
              style={[
                styles.statusChip,
                { borderColor: phase.color },
                isActive && { backgroundColor: phase.color },
              ]}
              onPress={() => handleStatusChange(phase.key)}
            >
              <Ionicons
                name={phase.icon as any}
                size={16}
                color={isActive ? "#fff" : phase.color}
              />
              <Text
                style={[
                  styles.statusChipText,
                  { color: isActive ? "#fff" : phase.color },
                ]}
              >
                {phase.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 46,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ececec",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#B71C1C" },
  headerSubtitle: { marginTop: 4, fontSize: 12, color: "#666" },
  mapWrap: {
    margin: 12,
    borderRadius: 12,
    overflow: "hidden",
    height: 340,
    backgroundColor: "#fff",
  },
  map: { flex: 1 },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  centerStateText: {
    marginTop: 10,
    textAlign: "center",
    color: "#444",
    fontWeight: "600",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#ececec",
  },
  metricLabel: { fontSize: 11, color: "#777", marginBottom: 4 },
  metricValue: { fontSize: 15, fontWeight: "800", color: "#2f2f2f" },
  controlsRow: {
    paddingHorizontal: 12,
    paddingBottom: 18,
    gap: 8,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
});

export default MapScreen;
