import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Single featured news item for now; later this can be dynamic from backend
const featuredNews = {
  title: 'Kitchen Fire Contained in San Pedro Residence',
  date: 'October 15, 2025',
  imageUrl: 'https://via.placeholder.com/600x300',
};

export const EmergencyHomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  return (
    <ScrollView style={styles.container}>
      {/* Hero with background image and overlay */}
      <View style={styles.heroWrapper}>
        <ImageBackground
          source={{ uri: 'https://via.placeholder.com/800x400' }}
          style={styles.heroBackground}
        >
          <View style={styles.heroOverlay}>
            <View style={styles.heroHeaderRow}>
              <TouchableOpacity style={styles.menuButton}>
                <Ionicons name="menu" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>LOGO</Text>
              </View>
            </View>

            <View style={styles.heroTextBlock}>
              <Text style={styles.heroTitle}>BFP</Text>
              <Text style={styles.heroTitle}>Emergency</Text>
              <Text style={styles.heroTitle}>Response App</Text>
            </View>

            {/* Search bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </ImageBackground>
      </View>

      {/* Latest news section */}
      <View style={styles.sectionWrapper}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>LATEST NEWS &amp; UPDATES</Text>
          <Ionicons name="alert" size={16} color="#FFB300" style={styles.sectionIcon} />
        </View>

        <View style={styles.newsCard}>
          <Image
            source={{ uri: featuredNews.imageUrl }}
            style={styles.newsImage}
            resizeMode="cover"
          />
          <View style={styles.newsTextBlock}>
            <Text style={styles.newsTitle} numberOfLines={2}>
              "{featuredNews.title}"
            </Text>
            <Text style={styles.newsDate}>{featuredNews.date}</Text>
          </View>
        </View>
      </View>

      {/* Two large tiles row */}
      <View style={styles.tilesRow}>
        <TouchableOpacity
          style={styles.tileCard}
          onPress={() => navigation.navigate('FireSafetyTips')}
        >
          <Image
            source={{ uri: 'https://via.placeholder.com/300x200?text=Fire+Safety' }}
            style={styles.tileImage}
            resizeMode="cover"
          />
          <View style={styles.tileTextBlock}>
            <Text style={styles.tileTitle}>LEARN FIRE SAFETY TIPS</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tileCard}
          onPress={() => navigation.navigate('EmergencyHotlines')}
        >
          <Image
            source={{ uri: 'https://via.placeholder.com/300x200?text=Hotlines' }}
            style={styles.tileImage}
            resizeMode="cover"
          />
          <View style={styles.tileTextBlock}>
            <Text style={styles.tileTitle}>EMERGENCY HOT LINES</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    height: 220,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 16,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E53935',
  },
  heroTextBlock: {
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 36,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  sectionWrapper: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#333',
    marginRight: 6,
  },
  sectionIcon: {
    marginTop: 1,
  },
  newsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
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
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  newsDate: {
    fontSize: 11,
    color: '#777',
  },
  tilesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  tileCard: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
  },
  tileImage: {
    width: '100%',
    height: 110,
  },
  tileTextBlock: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tileTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
});
