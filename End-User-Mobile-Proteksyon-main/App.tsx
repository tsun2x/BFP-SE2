import React from "react";
import {
  LogBox,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
} from "react-native";
import { NavigationContainer, Theme } from "@react-navigation/native";
import { navigationRef } from "./src/utils/navigation";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import type { NavigationContainerProps } from "@react-navigation/native";

// Twilio Voice requires a dev build (npx expo run:android). Suppress the
// "native bridge unavailable" crash log when running in Expo Go.
LogBox.ignoreLogs([
  "[TwilioVoice]",
  "Cannot read property 'voice_register'",
  "TwilioVoice",
]);
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { LoginScreen } from "./src/screens/Auth/LoginScreen";
import { RegisterScreen } from "./src/screens/Auth/RegisterScreen";
import { VerifyOtpScreen } from "./src/screens/Auth/VerifyOtpScreen";
import { ForgotPasswordScreen } from "./src/screens/Auth/ForgotPasswordScreen";
import { HomeScreen } from "./src/screens/Home/HomeScreen";
import { EmergencyCallScreen } from "./src/screens/Emergency/EmergencyCallScreen";
import { NewsRoomScreen } from "./src/screens/News/NewsRoomScreen";
import { ArticleScreen } from "./src/screens/News/ArticleScreen";
import { SettingsScreen } from "./src/screens/Settings/SettingsScreen";
import { EmergencyHomeScreen } from "./src/screens/Emergency/EmergencyHomeScreen";
import { MapScreen } from "./src/screens/Emergency/MapScreen";
import { EmergencyHotlinesScreen } from "./src/screens/Emergency/EmergencyHotlinesScreen";
import { FireSafetyTipsScreen } from "./src/screens/Emergency/FireSafetyTipsScreen";
import { FireTruckTrackingScreen } from "./src/screens/Emergency/FireTruckTrackingScreen";
import AboutScreen from "./src/screens/About/AboutScreen";
import HelpScreen from "./src/screens/Help/HelpScreen";
import { TrackingScreen } from "./src/screens/Firetruck/TrackingScreen";
import { CallTestScreen } from "./src/screens/Emergency/CallTestScreen";
import {
  UiPreferencesProvider,
  useUiPreferences,
} from "./src/context/UiPreferencesContext";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const { darkModeEnabled, palette, fontScale } = useUiPreferences();
  const insets = useSafeAreaInsets();
  const [showEmergencyConfirmModal, setShowEmergencyConfirmModal] =
    React.useState(false);

  const renderTab = (route: any, index: number) => {
    const { options } = descriptors[route.key];
    const label =
      options.tabBarLabel !== undefined
        ? options.tabBarLabel
        : options.title !== undefined
          ? options.title
          : route.name;

    const isFocused = state.index === index;

    const onPress = () => {
      if (route.name === "Emergency") {
        setShowEmergencyConfirmModal(true);
        return;
      }

      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    let iconName: keyof typeof Ionicons.glyphMap = "home";
    if (route.name === "Emergency") iconName = "alert-circle";
    if (route.name === "NewsRoom") iconName = "newspaper";

    // Special case for Emergency tab
    if (route.name === "Emergency") {
      return (
        <View key={route.key} style={tabStyles.centerButtonContainer}>
          <TouchableOpacity
            onPress={onPress}
            style={tabStyles.centerButton}
            activeOpacity={0.85}
          >
            <View style={tabStyles.centerButtonInner}>
              <Ionicons name="call" size={26} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text
            style={[
              tabStyles.centerLabel,
              {
                color: darkModeEnabled ? "#ffffff" : "#E53935",
                fontSize: 10 * fontScale,
              },
            ]}
          >
            Emergency Call
          </Text>
        </View>
      );
    }

    return (
      <View key={route.key} style={tabStyles.tabContainer}>
        <TouchableOpacity
          onPress={onPress}
          style={[tabStyles.tabItem, isFocused && tabStyles.tabItemFocused]}
          activeOpacity={0.7}
        >
          <Ionicons
            name={iconName}
            size={20}
            color={
              isFocused
                ? "#E53935"
                : darkModeEnabled
                  ? "rgba(255,255,255,0.6)"
                  : "#677085"
            }
          />
          <Text
            style={[
              tabStyles.tabLabel,
              isFocused && tabStyles.tabLabelFocused,
              {
                color: isFocused
                  ? "#E53935"
                  : darkModeEnabled
                    ? "rgba(255,255,255,0.5)"
                    : "#677085",
                fontSize: 9 * fontScale,
              },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      <View
        style={[
          tabStyles.wrapper,
          {
            backgroundColor: darkModeEnabled
              ? "rgba(26, 26, 26, 0.98)"
              : palette.cardBg,
            borderTopWidth: 1,
            borderTopColor: darkModeEnabled
              ? "rgba(255,255,255,0.08)"
              : palette.border,
          },
        ]}
      >
        <View
          style={[
            tabStyles.innerBar,
            {
              backgroundColor: darkModeEnabled
                ? "rgba(26, 26, 26, 0.95)"
                : palette.cardBg,
              paddingBottom: 10 + insets.bottom,
            },
          ]}
        >
          {state.routes.map((route, index) => (
            <React.Fragment key={route.key}>
              {renderTab(route, index)}
            </React.Fragment>
          ))}
        </View>
      </View>

      <Modal
        visible={showEmergencyConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmergencyConfirmModal(false)}
      >
        <View style={tabStyles.modalOverlay}>
          <View style={tabStyles.confirmModalCard}>
            <View style={tabStyles.confirmIconWrap}>
              <Ionicons name="alert-circle" size={48} color="#E53935" />
            </View>
            <Text style={tabStyles.confirmTitle}>
              Emergency Call Confirmation
            </Text>
            <Text style={tabStyles.confirmMessage}>
              Are you sure you want to call emergency services?
            </Text>
            <Text style={tabStyles.confirmSubtext}>
              This will immediately alert the nearest fire station and start the
              emergency call process.
            </Text>

            <View style={tabStyles.confirmActionRow}>
              <TouchableOpacity
                style={tabStyles.confirmCancelButton}
                onPress={() => setShowEmergencyConfirmModal(false)}
              >
                <Text style={tabStyles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={tabStyles.confirmCallButton}
                onPress={() => {
                  setShowEmergencyConfirmModal(false);
                  navigation.navigate("Emergency", {
                    startCallNowAt: Date.now(),
                  });
                }}
              >
                <Text style={tabStyles.confirmCallText}>Yes, Call Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Emergency"
        component={EmergencyCallScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="NewsRoom"
        component={NewsRoomScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { darkModeEnabled, palette } = useUiPreferences();
  const { token, isHydrating } = useAuth();

  const navTheme = React.useMemo<Theme>(
    () => ({
      dark: darkModeEnabled,
      colors: {
        primary: "#E53935",
        background: palette.pageBg,
        card: palette.cardBg,
        text: palette.textPrimary,
        border: palette.border,
        notification: "#E53935",
      },
      fonts: {
        regular: { fontFamily: "System", fontWeight: "400" },
        medium: { fontFamily: "System", fontWeight: "500" },
        bold: { fontFamily: "System", fontWeight: "700" },
        heavy: { fontFamily: "System", fontWeight: "800" },
      },
    }),
    [darkModeEnabled, palette],
  );

  return (
    <>
      {isHydrating ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: palette.pageBg,
          }}
        >
          <Text style={{ color: palette.textPrimary, fontSize: 16 }}>
            Restoring session...
          </Text>
        </View>
      ) : (
        <NavigationContainer ref={navigationRef} theme={navTheme}>
          <Stack.Navigator>
            {token ? (
              <>
                <Stack.Screen
                  name="MainTabs"
                  component={MainTabs}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Article"
                  component={ArticleScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Settings"
                  component={SettingsScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="EmergencyHotlines"
                  component={EmergencyHotlinesScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="About"
                  component={AboutScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Help"
                  component={HelpScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Tracking"
                  component={TrackingScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="MapScreen"
                  component={MapScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="FireTruckTracking"
                  component={MapScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="FireSafetyTips"
                  component={FireSafetyTipsScreen}
                  options={{ headerShown: false }}
                />
              </>
            ) : (
              <>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
                <Stack.Screen
                  name="ForgotPassword"
                  component={ForgotPasswordScreen}
                  options={{ headerShown: false }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <UiPreferencesProvider>
        <AppNavigator />
      </UiPreferencesProvider>
    </AuthProvider>
  );
};

const tabStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e7e7e7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 3,
  },
  tabContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  innerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "rgba(26, 26, 26, 0.95)",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    backgroundColor: "transparent",
    minHeight: 44,
  },
  tabItemFocused: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    transform: [{ scale: 1.0 }],
  },
  tabLabel: {
    fontSize: 9,
    marginTop: 2,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "500",
  },
  tabLabelFocused: {
    color: "#E53935",
    fontWeight: "600",
  },
  sideTab: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  sideIconWrapper: {
    width: 40,
    height: 28,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  sideIconWrapperActive: {
    backgroundColor: "#7f1010",
  },
  sideLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  centerButtonContainer: {
    alignItems: "center",
    justifyContent: "flex-start",
    minWidth: 104,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E53935",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  centerButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#D32F2F",
    justifyContent: "center",
    alignItems: "center",
  },
  centerLabel: {
    fontSize: 10,
    color: "#E53935",
    marginTop: 4,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  confirmModalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
  },
  confirmIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(229, 57, 53, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2e3138",
    textAlign: "center",
    marginBottom: 14,
  },
  confirmMessage: {
    fontSize: 19,
    color: "#4b4f58",
    textAlign: "center",
    lineHeight: 32,
    marginBottom: 10,
  },
  confirmSubtext: {
    fontSize: 15,
    color: "#7a7f89",
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 24,
  },
  confirmActionRow: {
    width: "100%",
    flexDirection: "row",
    gap: 14,
  },
  confirmCancelButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#f2f2f4",
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmCallButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#E53935",
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmCancelText: {
    fontSize: 17,
    color: "#61656f",
    fontWeight: "700",
  },
  confirmCallText: {
    fontSize: 17,
    color: "#fff",
    fontWeight: "700",
  },
});

export default App;
