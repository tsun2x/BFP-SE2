// src/screens/Emergency/MapScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { goBack } from "../../utils/navigation";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { API_URL } from "../../config";
import { useUiPreferences } from "../../context/UiPreferencesContext";

// MapTiler Configuration
const MAPTILER_API_KEY = "ps9iKxuRKLZ3RNwtUPip"; // Updated MapTiler API key

type FiretruckLocation = {
  latitude: number | string;
  longitude: number | string;
  last_online?: string | null;
  recorded_at?: string | null;
  [key: string]: unknown;
};

type FireStation = {
  [key: string]: unknown;
};

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTruckCoordinate(truck: FiretruckLocation) {
  const latitude = toNumber(truck.latitude);
  const longitude = toNumber(truck.longitude);

  if (latitude == null || longitude == null) {
    return null;
  }

  return { latitude, longitude };
}

function getStationCoordinate(station: FireStation) {
  const latitude = toNumber(station.latitude);
  const longitude = toNumber(station.longitude);

  if (latitude == null || longitude == null) {
    return null;
  }

  return { latitude, longitude };
}

function buildMapHtml(
  region: { latitude: number; longitude: number },
  firetrucks: FiretruckLocation[],
  fireStations: FireStation[],
) {
  const data = {
    region,
    firetrucks: firetrucks
      .map((truck, index) => {
        const coordinate = getTruckCoordinate(truck);
        if (!coordinate) return null;

        return {
          id: String(truck.truck_id || index),
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          title: `Firetruck ${truck.truck_id || ""}`.trim(),
          subtitle: String(
            truck.last_online || truck.recorded_at || "Live location",
          ),
        };
      })
      .filter(Boolean),
    fireStations: fireStations
      .map((station, index) => {
        const coordinate = getStationCoordinate(station);
        if (!coordinate) return null;

        return {
          id: String(station.station_id || index),
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          title: String(station.station_name || "Fire Station"),
          subtitle: String(
            station.address || station.contact_number || "Station location",
          ),
        };
      })
      .filter(Boolean),
  };

  const serialized = JSON.stringify(data).replace(/</g, "\\u003c");

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
      .map-label {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 999px;
        color: #fff;
        font-size: 17px;
        border: 2px solid #fff;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);
      }
      .truck-label {
        background: #8b0000;
      }
      .station-label {
        background: #c62828;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const DATA = ${serialized};
      const map = L.map('map', { zoomControl: true });

      L.tileLayer(
        'https://api.maptiler.com/maps/openstreetmap/{z}/{x}/{y}.jpg?key=${MAPTILER_API_KEY}',
        {
          attribution: '&copy; OpenStreetMap contributors &copy; MapTiler',
          maxZoom: 19,
        }
      ).addTo(map);

      const bounds = [];
      const truckIcon = L.divIcon({
        html: '<div class="map-label truck-label" title="Firetruck">🚒</div>',
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const stationIcon = L.divIcon({
        html: '<div class="map-label station-label" title="Fire Station">🏢</div>',
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      (DATA.firetrucks || []).forEach((truck) => {
        const point = [truck.latitude, truck.longitude];
        bounds.push(point);
        L.marker(point, { icon: truckIcon })
          .addTo(map)
          .bindPopup('<strong>' + truck.title + '</strong><br />' + truck.subtitle);
      });

      (DATA.fireStations || []).forEach((station) => {
        const point = [station.latitude, station.longitude];
        bounds.push(point);
        L.marker(point, { icon: stationIcon })
          .addTo(map)
          .bindPopup('<strong>' + station.title + '</strong><br />' + station.subtitle);
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [28, 28] });
      } else {
        map.setView([DATA.region.latitude, DATA.region.longitude], 12);
      }
    </script>
  </body>
</html>`;
}

export const MapScreen = () => {
  const { darkModeEnabled, palette, fontScale } = useUiPreferences();
  const [firetrucks, setFiretrucks] = useState<FiretruckLocation[]>([]);
  const [fireStations, setFireStations] = useState<FireStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [region, setRegion] = useState({
    latitude: 6.9214, // Zamboanga City coordinates
    longitude: 122.079,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  const handleBack = () => {
    goBack();
  };

  // Fetch firetruck locations from Node backend
  const fetchFiretruckLocations = async () => {
    try {
      // Node-only data flow: primary civilian endpoint, fallback to active status endpoint.
      const primaryUrl = `${API_URL}/api/firetruck-locations`;
      console.log("Fetching trucks from", primaryUrl);

      let list: FiretruckLocation[] = [];

      const primaryResponse = await fetch(primaryUrl);
      if (primaryResponse.ok) {
        const primaryJson = await primaryResponse.json();
        if (Array.isArray(primaryJson?.locations)) {
          list = primaryJson.locations;
        } else if (Array.isArray(primaryJson?.data)) {
          list = primaryJson.data;
        } else if (Array.isArray(primaryJson)) {
          list = primaryJson;
        }
      }

      // Fallback for environments where only status endpoint has fresh rows.
      if (list.length === 0) {
        const fallbackUrl = `${API_URL}/api/firetrucks/active`;
        console.log("Primary endpoint empty, falling back to", fallbackUrl);
        const fallbackResponse = await fetch(fallbackUrl);
        if (fallbackResponse.ok) {
          const fallbackJson = await fallbackResponse.json();
          const raw = Array.isArray(fallbackJson?.data)
            ? fallbackJson.data
            : Array.isArray(fallbackJson)
              ? fallbackJson
              : [];

          list = raw
            .map((item) => ({
              ...item,
              latitude: item.latitude,
              longitude: item.longitude,
              recorded_at: item.updated_at || item.recorded_at || null,
            }))
            .filter((item) => toNumber(item.latitude) != null && toNumber(item.longitude) != null);
        }
      }

      // Normalize to include last_online for UI (use recorded_at when available)
      list = list.map((item) => ({
        ...item,
        last_online: item.last_online || item.recorded_at || null,
      }));

      setFiretrucks(list);
      setError(null);

      if (list.length > 0) {
        const firstTruck = list[0];
        const lat = Number(firstTruck.latitude);
        const lng = Number(firstTruck.longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
          setRegion((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
          }));
        }

        // Record the last time we heard from any truck (use last_online from API)
        if (firstTruck.last_online) {
          setLastUpdated(firstTruck.last_online);
        }
      }
    } catch (err) {
      console.error("Error fetching firetruck locations:", err);
      setError("Failed to load firetruck locations.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFireStations = async () => {
    try {
      const url = `${API_URL}/api/firestations`;
      console.log("Fetching stations from", url);
      const response = await fetch(url);
      const json = await response.json();

      const list = Array.isArray(json?.stations)
        ? json.stations
        : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
            ? json
            : [];

      setFireStations(list);
    } catch (err) {
      console.error("Error fetching fire stations:", err);
    }
  };

  // Poll periodically to keep locations live
  useEffect(() => {
    fetchFiretruckLocations(); // initial
    fetchFireStations();

    const intervalId = setInterval(() => {
      fetchFiretruckLocations();
      fetchFireStations();
    }, 5000); // every 5 seconds

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchFiretruckLocations(), fetchFireStations()]);
    } finally {
      setRefreshing(false);
    }
  };

  const mapHtml = buildMapHtml(region, firetrucks, fireStations);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: palette.pageBg }]}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.pageBg }]}>
      <StatusBar barStyle="light-content" backgroundColor="#8B0000" />
      <SafeAreaView edges={["top"]} style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Firetruck Tracker</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={[styles.container, { backgroundColor: palette.pageBg }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#8B0000"]}
            tintColor="#8B0000"
          />
        }
      >
        <View style={styles.externalMapContainer}>
          <Text style={[styles.externalMapText, { color: palette.textPrimary, fontSize: 14 * fontScale }]}>
            The live map is shown below inside the app. Pull down to refresh
            truck and station positions.
          </Text>
        </View>

        <View style={[styles.mapCard, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
          <WebView
            originWhitelist={["*"]}
            source={{ html: mapHtml }}
            style={styles.map}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
          />

          <View
            style={[
              styles.mapSummaryRow,
              { backgroundColor: darkModeEnabled ? "#2a2121" : "#fff7f7" },
            ]}
          >
            <Text style={[styles.mapSummaryText, { fontSize: 13 * fontScale }]}>
              Active trucks: {firetrucks.length}
            </Text>
            <Text style={[styles.mapSummaryText, { fontSize: 13 * fontScale }]}>
              Stations: {fireStations.length}
            </Text>
          </View>
        </View>

        {error && (
          <View
            style={[
              styles.errorContainer,
              { backgroundColor: darkModeEnabled ? "rgba(255, 82, 82, 0.12)" : "rgba(255, 0, 0, 0.1)" },
            ]}
          >
            <Text style={[styles.errorText, { fontSize: 14 * fontScale }]}>{error}</Text>
          </View>
        )}

        <View style={[styles.legend, { borderTopColor: palette.border }]}>
          <View style={styles.legendItem}>
            <Ionicons name="flame" size={20} color="#8B0000" />
            <Text style={[styles.legendText, { color: palette.textPrimary, fontSize: 14 * fontScale }]}>Firetruck</Text>
          </View>
          <View style={styles.legendItem}>
            <Ionicons name="home" size={20} color="#D32F2F" />
            <Text style={[styles.legendText, { color: palette.textPrimary, fontSize: 14 * fontScale }]}>Fire Station</Text>
          </View>
          <View style={styles.legendItem}>
            <Ionicons name="medical" size={20} color="#C62828" />
            <Text style={[styles.legendText, { color: palette.textPrimary, fontSize: 14 * fontScale }]}>Hospital (map icon)</Text>
          </View>
          <View style={styles.legendItem}>
            <Ionicons name="business" size={20} color="#757575" />
            <Text style={[styles.legendText, { color: palette.textPrimary, fontSize: 14 * fontScale }]}>Buildings/Landmarks</Text>
          </View>
          <Text style={[styles.legendNote, { color: palette.textSecondary, fontSize: 12 * fontScale }]}> 
            Tip: zoom in to reveal more labels for roads, hospitals, and nearby buildings.
          </Text>
          {lastUpdated && (
            <Text style={[styles.lastUpdated, { color: palette.textSecondary, fontSize: 12 * fontScale }]}>
              {firetrucks.length > 0
                ? `Active: last updated ${lastUpdated}`
                : `Inactive: last updated ${lastUpdated}`}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  headerContainer: {
    backgroundColor: "#8B0000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
    marginLeft: -24, // Offset for the back button
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerRight: {
    width: 40,
  },
  map: {
    width: "100%",
    height: 500,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  externalMapContainer: {
    padding: 16,
  },
  externalMapText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 12,
  },
  mapCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
  },
  mapSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff7f7",
  },
  mapSummaryText: {
    color: "#8B0000",
    fontSize: 13,
    fontWeight: "600",
  },
  truckMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  stationMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  speedBadge: {
    position: "absolute",
    bottom: -5,
    right: -5,
    backgroundColor: "#8B0000",
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  speedText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  errorContainer: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#D32F2F",
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
  },
  legend: {
    flexDirection: "column",
    alignItems: "flex-start",
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
  },
  legendNote: {
    fontSize: 12,
    color: "#666",
  },
  lastUpdated: {
    fontSize: 12,
    color: "#666",
  },
  attributionContainer: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  attributionText: {
    fontSize: 10,
    color: "#333",
    textDecorationLine: "underline",
  },
});

export default MapScreen;
