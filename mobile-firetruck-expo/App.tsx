// App.tsx
import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, TouchableOpacity, Text, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { MissionProvider, useMission } from "./src/context/MissionContext";

import HomeScreen from "./src/screens/HomeScreen";
import TrackingScreen from "./src/screens/TrackingScreen";
import MapScreen from "./src/screens/MapScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import LoginScreen from "./src/screens/LoginScreen";

type TabParamList = {
  Home: undefined;
  Tracking: undefined;
  Map: undefined;
  Profile: undefined;
};
const Tab = createBottomTabNavigator<TabParamList>();

const DriverDispatchOverlay = () => {
  const {
    pendingIncident,
    showDispatchAlert,
    isClaimingMission,
    dismissDispatchAlert,
    claimMission,
  } = useMission();

  if (!pendingIncident) return null;

  return (
    <Modal
      visible={showDispatchAlert}
      transparent
      animationType="fade"
      onRequestClose={dismissDispatchAlert}
    >
      <View style={styles.dispatchOverlay}>
        <View style={styles.dispatchCard}>
          <View style={styles.dispatchIconWrap}>
            <Ionicons name="notifications" size={30} color="#fff" />
          </View>
          <Text style={styles.dispatchTitle}>New Driver Dispatch</Text>
          <Text style={styles.dispatchSubtitle}>
            Incident #{pendingIncident.alarmId}
          </Text>
          <Text style={styles.dispatchDetail}>
            {pendingIncident.callerFullName || "Unknown caller"}
          </Text>
          <Text style={styles.dispatchDetail}>
            {pendingIncident.incidentType || "Fire"} •{" "}
            {pendingIncident.alarmLevel || "1st Alarm"}
          </Text>
          <Text style={styles.dispatchLocation}>
            {pendingIncident.location || "Unknown location"}
          </Text>
          {!!pendingIncident.narrative && (
            <Text style={styles.dispatchNarrative} numberOfLines={4}>
              {pendingIncident.narrative}
            </Text>
          )}
          <View style={styles.dispatchActions}>
            <TouchableOpacity
              style={styles.dispatchSecondaryButton}
              onPress={dismissDispatchAlert}
              disabled={isClaimingMission}
            >
              <Text style={styles.dispatchSecondaryText}>Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dispatchPrimaryButton,
                isClaimingMission && styles.dispatchPrimaryButtonDisabled,
              ]}
              onPress={claimMission}
              disabled={isClaimingMission}
            >
              <Text style={styles.dispatchPrimaryText}>
                {isClaimingMission ? "Claiming..." : "Accept Mission"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const TabBar = ({ state, navigation }: any) => (
  <View style={styles.tabBar}>
    {state.routes.map((route: any, index: number) => {
      const isFocused = state.index === index;
      return (
        <TouchableOpacity
          key={route.key}
          onPress={() => navigation.navigate(route.name)}
          style={styles.tabButton}
        >
          <Ionicons
            name={
              route.name === "Home"
                ? "home"
                : route.name === "Tracking"
                  ? "navigate"
                  : route.name === "Map"
                    ? "map"
                  : "person"
            }
            size={24}
            color={isFocused ? "#fff" : "#888"}
          />
          <Text style={[styles.tabText, isFocused && styles.tabTextFocused]}>
            {route.name}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const MainTabs = () => (
  <MissionProvider>
    <View style={styles.mainTabsContainer}>
      <Tab.Navigator
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Tracking" component={TrackingScreen} />
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
      <DriverDispatchOverlay />
    </View>
  </MissionProvider>
);

const AuthScreens = () => {
  return <LoginScreen />;
};

const RootNavigator = () => {
  const { user } = useAuth();
  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <AuthScreens />}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  mainTabsContainer: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    height: 60,
    backgroundColor: "#B71C1C",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    marginBottom: 35,
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  tabText: { fontSize: 12, color: "#888", marginTop: 4 },
  tabTextFocused: { color: "#fff", fontWeight: "600" },
  dispatchOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 18, 17, 0.72)",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  dispatchCard: {
    backgroundColor: "#fff8f6",
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: "#f0beb4",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  dispatchIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#B71C1C",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    alignSelf: "center",
  },
  dispatchTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#7D1717",
    textAlign: "center",
  },
  dispatchSubtitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#B71C1C",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  dispatchDetail: {
    fontSize: 15,
    color: "#2C2523",
    textAlign: "center",
    marginBottom: 6,
  },
  dispatchLocation: {
    fontSize: 14,
    color: "#675B57",
    textAlign: "center",
    marginTop: 4,
  },
  dispatchNarrative: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    color: "#514845",
    lineHeight: 20,
  },
  dispatchActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  dispatchSecondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d7c1bc",
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  dispatchPrimaryButton: {
    flex: 1.2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#B71C1C",
  },
  dispatchPrimaryButtonDisabled: {
    opacity: 0.7,
  },
  dispatchSecondaryText: {
    color: "#5A4E4A",
    fontWeight: "700",
    fontSize: 15,
  },
  dispatchPrimaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});
