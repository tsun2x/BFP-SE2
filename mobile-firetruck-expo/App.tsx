import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import PersonalInfoScreen from './src/screens/PersonalInfoScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import PrivacySecurityScreen from './src/screens/PrivacySecurityScreen';

// Auth
import { AuthProvider, useAuth } from './src/context/AuthContext';

const Tab = createBottomTabNavigator();

/* ------------------ HAMBURGER MENU ------------------ */

const HamburgerMenu = ({ visible, onClose, navigation }: any) => {
  const handleProfilePress = () => {
    onClose();
    navigation.navigate('Profile');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: () => {
            onClose();
            // Handle logout logic here
            Alert.alert('Success', 'Logged out successfully');
          },
          style: 'destructive'
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={handleProfilePress}>
            <Ionicons name="person" size={24} color="#333" />
            <Text style={styles.menuText}>Profile Settings</Text>
          </TouchableOpacity>
          <View style={styles.menuSeparator} />
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color="#D32F2F" />
            <Text style={[styles.menuText, { color: '#D32F2F' }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

/* ------------------ CUSTOM TAB BAR ------------------ */

const TabBar = ({ state, navigation }: any) => {
  const [menuVisible, setMenuVisible] = React.useState(false);

  return (
    <>
      <View style={styles.tabBar}>
        {/* Tab Buttons */}
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;

          const onPress = () => {
            navigation.navigate(route.name);
          };

          const iconName =
            route.name === 'Home'
              ? 'home'
              : route.name === 'Chat'
              ? 'chatbubbles'
              : 'person';

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabButton}
            >
              <Ionicons
                name={iconName as any}
                size={24}
                color={isFocused ? '#D32F2F' : '#666'}
              />
              <Text
                style={[
                  styles.tabText,
                  isFocused && styles.tabTextFocused,
                ]}
              >
                {route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Hamburger Menu Modal */}
      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        navigation={navigation}
      />
    </>
  );
};

/* ------------------ TABS ------------------ */

const MainTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

/* ------------------ ROOT NAVIGATION ------------------ */

const RootNavigator = () => {
  const { user } = useAuth();

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <NavigationContainer>
      <MainTabs />
    </NavigationContainer>
  );
};

/* ------------------ APP ROOT ------------------ */

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

/* ------------------ STYLES ------------------ */

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 70,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  hamburgerButton: {
    position: 'absolute',
    left: 20,
    top: 23,
    zIndex: 1,
    padding: 5,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tabTextFocused: {
    color: '#D32F2F',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginTop: 60,
    marginLeft: 20,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    minWidth: 200,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    gap: 15,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  menuSeparator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 15,
  },
});