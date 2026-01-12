import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/utils/navigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NavigationContainerProps } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoginScreen } from './src/screens/Auth/LoginScreen';
import { RegisterScreen } from './src/screens/Auth/RegisterScreen';
import { VerifyOtpScreen } from './src/screens/Auth/VerifyOtpScreen';
import { HomeScreen } from './src/screens/Home/HomeScreen';
import { EmergencyCallScreen } from './src/screens/Emergency/EmergencyCallScreen';
import { NewsRoomScreen } from './src/screens/News/NewsRoomScreen';
import { ArticleScreen } from './src/screens/News/ArticleScreen';
import { ProfileScreen } from './src/screens/Profile/ProfileScreen';
import { EmergencyHomeScreen } from './src/screens/Emergency/EmergencyHomeScreen';
import { MapScreen } from './src/screens/Emergency/MapScreen';
import { EmergencyHotlinesScreen } from './src/screens/Emergency/EmergencyHotlinesScreen';
import { FireSafetyTipsScreen } from './src/screens/Emergency/FireSafetyTipsScreen';
import { FireTruckTrackingScreen } from './src/screens/Emergency/FireTruckTrackingScreen';
import { EmergencyCallModal } from './src/components/EmergencyCallModal';
import AboutScreen from './src/screens/About/AboutScreen';
import HelpScreen from './src/screens/Help/HelpScreen';
import { TrackingScreen } from './src/screens/Firetruck/TrackingScreen';
import { CallTestScreen } from './src/screens/Emergency/CallTestScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const [showEmergencyModal, setShowEmergencyModal] = React.useState(false);
  const insets = useSafeAreaInsets();

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
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        // For development: navigate into the full Emergency screen
        // instead of opening the EmergencyCallModal so we can access
        // the in-screen WebRTC test entry.
        navigation.navigate(route.name);
      }
    };

    let iconName: keyof typeof Ionicons.glyphMap = 'home';
    if (route.name === 'Emergency') iconName = 'alert-circle';
    if (route.name === 'NewsRoom') iconName = 'newspaper';

    // Special case for Emergency tab
    if (route.name === 'Emergency') {
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
          <Text style={tabStyles.centerLabel}>Emergency Call</Text>
        </View>
      );
    }

    return (
      <View key={route.key} style={tabStyles.tabContainer}>
        <TouchableOpacity
          onPress={onPress}
          style={[
            tabStyles.tabItem,
            isFocused && tabStyles.tabItemFocused,
          ]}
          activeOpacity={0.7}
        >
          <Ionicons
            name={iconName}
            size={20}
            color={isFocused ? '#E53935' : 'rgba(255,255,255,0.6)'}
          />
          <Text
            style={[
              tabStyles.tabLabel,
              isFocused && tabStyles.tabLabelFocused,
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
      <View style={[tabStyles.wrapper, { paddingBottom: insets.bottom }]}>
        <View style={tabStyles.innerBar}>
          {state.routes.map((route, index) => (
            <React.Fragment key={route.key}>
              {renderTab(route, index)}
            </React.Fragment>
          ))}
        </View>
      </View>
      <EmergencyCallModal
        visible={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
      />
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

const App: React.FC = () => {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
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
          name="Profile"
          component={ProfileScreen}
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
          component={FireTruckTrackingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FireSafetyTips"
          component={FireSafetyTipsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CallTest"
          component={CallTestScreen}
          options={{ headerShown: true, title: 'WebRTC Call Test' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const tabStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  tabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginHorizontal: 0,
    marginBottom: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    backgroundColor: 'transparent',
    minHeight: 44,
  },
  tabItemFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ scale: 1.0 }],
  },
  tabLabel: {
    fontSize: 9,
    marginTop: 2,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  tabLabelFocused: {
    color: '#E53935',
    fontWeight: '600',
  },
  sideTab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  sideIconWrapper: {
    width: 40,
    height: 28,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideIconWrapperActive: {
    backgroundColor: '#7f1010',
  },
  sideLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  centerButtonContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  centerButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLabel: {
    fontSize: 9,
    color: '#ffffff',
    marginTop: 3,
    fontWeight: '500',
  },
});

export default App;