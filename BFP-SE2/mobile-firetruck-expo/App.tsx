// App.tsx
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';

type TabParamList = {
  Home: undefined;
  Tracking: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TabBar = ({ state, descriptors, navigation }: any) => (
  <View style={styles.tabBar}>
    {state.routes.map((route: any, index: number) => {
      const isFocused = state.index === index;
      const onPress = () => navigation.navigate(route.name);

      return (
        <TouchableOpacity
          key={route.key}
          onPress={onPress}
          style={styles.tabButton}
        >
          <Ionicons
            name={
              route.name === 'Home' ? 'home' :
              route.name === 'Tracking' ? 'navigate' : 'person'
            }
            size={24}
            color={isFocused ? '#fff' : '#888'}
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
  <Tab.Navigator
    tabBar={(props) => <TabBar {...props} />}
    screenOptions={{
      headerShown: false,
    }}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Tracking" component={TrackingScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const RootNavigator = () => {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <LoginScreen />}
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
  tabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#B71C1C',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    marginBottom: 35,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  tabTextFocused: {
    color: '#fff',
    fontWeight: '600',
  },
});