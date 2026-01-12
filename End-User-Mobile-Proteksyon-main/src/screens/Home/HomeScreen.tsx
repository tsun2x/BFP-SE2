import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { LocationPermissionModal } from '../../components/LocationPermissionModal';
import { SafeAreaView } from 'react-native-safe-area-context';

const featuredNews = [
  {
    id: '1',
    title: '3-Alarm Fire Controlled in ZC',
    date: 'October 08, 2025',
    imageUrl: 'https://via.placeholder.com/600x300',
  },
  {
    id: '2',
    title: 'Kitchen Fire Contained in San Pedro Residence',
    date: 'October 15, 2025',
    imageUrl: 'https://via.placeholder.com/600x300',
  },
];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Show location modal when dashboard first loads
  useEffect(() => {
    // Show location modal after a short delay to allow screen to render
    const timer = setTimeout(() => {
      setShowLocationModal(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleHamburgerMenu = (item: string) => {
    setShowHamburgerMenu(false);
    
    switch(item) {
      case 'profile':
        navigation.navigate('Profile');
        break;
      case 'settings':
        Alert.alert('Settings', 'Settings screen coming soon!');
        break;
      case 'help':
        navigation.navigate('Help');
        break;
      case 'location':
        setShowLocationModal(true);
        break;
      case 'about':
        navigation.navigate('About');
        break;
      case 'logout':
        Alert.alert(
          'Logout',
          'Are you sure you want to logout?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', onPress: () => navigation.replace('Login') }
          ]
        );
        break;
    }
  };

  const handleNotificationPress = (notification: any) => {
    setShowNotifications(false);
    Alert.alert('Notification', notification.message);
  };

  const handleLocationGranted = () => {
    setShowLocationModal(false);
    Alert.alert('Location Enabled', 'Location services are now enabled for better emergency response.');
  };

  const handleLocationDenied = () => {
    setShowLocationModal(false);
    Alert.alert('Location Disabled', 'Some features may be limited without location access.');
  };

  const notifications = [
    { id: '1', message: 'Emergency alert: Fire incident reported nearby', time: '2 min ago' },
    { id: '2', message: 'BFP announcement: Scheduled drill tomorrow', time: '1 hour ago' },
    { id: '3', message: 'Safety tip: Check your smoke detectors', time: '3 hours ago' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        {/* Hero Section with Header */}
        <View style={styles.heroWrapper}>
          <LinearGradient
            colors={['#7A001F', '#A30025', '#C9002F']}
            style={styles.heroBackground}
          >
            <ImageBackground
              source={{ uri: 'https://www.transparenttextures.com/patterns/diagonal-stripes.png' }}
              style={styles.heroOverlay}
              resizeMode="repeat"
            >
              {/* Header */}
              <View style={styles.heroHeaderRow}>
                <TouchableOpacity 
                  style={styles.menuButton}
                  onPress={() => setShowHamburgerMenu(true)}
                >
                  <Ionicons name="menu" size={22} color="#fff" />
                </TouchableOpacity>
                
                {/* Right side container with notification and logo */}
                <View style={styles.rightHeaderContainer}>
                  <TouchableOpacity 
                    style={styles.notificationButton}
                    onPress={() => setShowNotifications(true)}
                  >
                    <Ionicons name="notifications" size={22} color="#fff" />
                    <View style={styles.notificationDot} />
                  </TouchableOpacity>
                  
                  {/* Mini Logo */}
                  <View style={styles.miniLogo}>
                    <Image
                      source={require('../../../assets/proteksyon.png')}
                      style={styles.miniLogoImage}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              </View>

              {/* Hero Title */}
              <View style={styles.heroTextBlock}>
                <Text style={styles.heroTitle}>Proteksyon</Text>
                <Text style={styles.heroSubtitle}>BFP Emergency Response App</Text>
              </View>

              {/* Search bar */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search emergency services..."
                  placeholderTextColor="#999"
                />
              </View>
            </ImageBackground>
          </LinearGradient>
        </View>

        {/* Firetruck Tracking Section */}
        <View style={styles.sectionWrapper}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>FIRETRUCK TRACKING</Text>
            <Ionicons name="location" size={16} color="#E53935" style={styles.sectionIcon} />
          </View>
          
          <TouchableOpacity
            style={styles.mapPlaceholder}
            onPress={() => navigation.navigate('FireTruckTracking')}
          >
            <View style={styles.mapContent}>
              <Ionicons name="map" size={48} color="#ccc" />
              <Text style={styles.mapText}>Live Firetruck Tracking</Text>
              <Text style={styles.mapSubtext}>Monitor emergency vehicles in real-time</Text>
              
              {/* Mock firetruck positions */}
              <View style={styles.firetruckMarker}>
                <Ionicons name="car" size={20} color="#E53935" />
              </View>
              <View style={[styles.firetruckMarker, { top: '40%', left: '60%' }]}>
                <Ionicons name="car" size={20} color="#E53935" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent News Section */}
        <View style={styles.sectionWrapper}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>RECENT NEWS</Text>
            <Ionicons name="newspaper" size={16} color="#FFB300" style={styles.sectionIcon} />
          </View>

          {featuredNews.map((news) => (
            <TouchableOpacity
              key={news.id}
              style={styles.newsCard}
              onPress={() => navigation.navigate('Article', { articleId: news.id })}
            >
              <Image
                source={{ uri: news.imageUrl }}
                style={styles.newsImage}
                resizeMode="cover"
              />
              <View style={styles.newsTextBlock}>
                <Text style={styles.newsTitle} numberOfLines={2}>
                  {news.title}
                </Text>
                <Text style={styles.newsDate}>{news.date}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionWrapper}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
            <Ionicons name="flash" size={16} color="#E53935" style={styles.sectionIcon} />
          </View>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('FireSafetyTips')}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="shield-checkmark" size={24} color="#fff" />
              </View>
              <Text style={styles.quickActionText}>Safety Tips</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('FireTruckTracking')}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="location" size={24} color="#fff" />
              </View>
              <Text style={styles.quickActionText}>Live Tracking</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('NewsRoom')}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="newspaper" size={24} color="#fff" />
              </View>
              <Text style={styles.quickActionText}>News Room</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('EmergencyHotlines')}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="call" size={24} color="#fff" />
              </View>
              <Text style={styles.quickActionText}>Emergency Contacts</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Hamburger Menu Modal */}
      <Modal
        visible={showHamburgerMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowHamburgerMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowHamburgerMenu(false)}
        >
          <View style={styles.hamburgerMenu}>
            <View style={styles.hamburgerHeader}>
              <Text style={styles.hamburgerTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setShowHamburgerMenu(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => handleHamburgerMenu('profile')}>
              <Ionicons name="person" size={20} color="#555" />
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => handleHamburgerMenu('settings')}>
              <Ionicons name="settings" size={20} color="#555" />
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => handleHamburgerMenu('help')}>
              <Ionicons name="help-circle" size={20} color="#555" />
              <Text style={styles.menuItemText}>Help & FAQ</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => handleHamburgerMenu('about')}>
              <Ionicons name="information-circle" size={20} color="#555" />
              <Text style={styles.menuItemText}>About BFP</Text>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity style={styles.menuItem} onPress={() => handleHamburgerMenu('logout')}>
              <Ionicons name="log-out" size={20} color="#E53935" />
              <Text style={[styles.menuItemText, { color: '#E53935' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notifications Dropdown */}
      <Modal
        visible={showNotifications}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNotifications(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNotifications(false)}
        >
          <View style={styles.notificationDropdown}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Ionicons name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            
            {notifications.map((notification) => (
              <TouchableOpacity 
                key={notification.id}
                style={styles.notificationItem}
                onPress={() => handleNotificationPress(notification)}
              >
                <View style={styles.notificationIcon}>
                  <Ionicons name="notifications" size={16} color="#E53935" />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationMessage}>{notification.message}</Text>
                  <Text style={styles.notificationTime}>{notification.time}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Location Permission Modal */}
      <LocationPermissionModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onGrant={handleLocationGranted}
        onDeny={handleLocationDenied}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    paddingBottom: 100, // Reduced padding since nav bar handles safe area
  },
  heroWrapper: {
    width: '100%',
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: '#000',
  },
  heroBackground: {
    width: '100%',
    height: 280,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  logoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E53935',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5252',
  },
  rightHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  miniLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniLogoImage: {
    width: 24,
    height: 24,
  },
  heroTextBlock: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  sectionWrapper: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30, // Add more bottom spacing between sections
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#333',
    marginRight: 8,
  },
  sectionIcon: {
    marginTop: 2,
  },
  mapPlaceholder: {
    backgroundColor: '#fff',
    borderRadius: 12,
    height: 200,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mapContent: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
  },
  mapSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  firetruckMarker: {
    position: 'absolute',
    top: '30%',
    left: '25%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  newsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  newsImage: {
    width: '100%',
    height: 150,
  },
  newsTextBlock: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  newsDate: {
    fontSize: 12,
    color: '#777',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  hamburgerMenu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  hamburgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  hamburgerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
  emergencyContactsSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginTop: 16,
  },
  emergencyContactsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E53935',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  emergencyButtonIcon: {
    marginRight: 12,
  },
  emergencyButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emergencyButtonArrow: {
    marginLeft: 12,
  },
  notificationDropdown: {
    position: 'absolute',
    right: 16,
    top: 80,
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 11,
    color: '#999',
  },
});
