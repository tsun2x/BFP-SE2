import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const fireIncidents = [
  {
    id: '1',
    title: '3-Alarm Fire Controlled in ZC',
    date: 'October 08, 2025',
    imageUrl: 'https://via.placeholder.com/800x400?text=Fire+1',
  },
  {
    id: '2',
    title: 'Grass Fire Spreads Near Vacant Lot in San Pedro',
    date: 'October 12, 2025',
    imageUrl: 'https://via.placeholder.com/800x400?text=Fire+2',
  },
  {
    id: '3',
    title: 'Kitchen Fire Contained in San Pedro Residence',
    date: 'October 15, 2025',
    imageUrl: 'https://via.placeholder.com/800x400?text=Fire+3',
  },
];

export const NewsRoomScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const handleArticlePress = (articleId: string) => {
    navigation.navigate('Article', { articleId });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* Red header banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Welcome to the News Room</Text>
          <Text style={styles.bannerSubtitle}>
            Stay updated on incidents, and BFP announcements.
          </Text>
        </View>

        {/* Section with search */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Fire Incidents</Text>

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search"
                placeholderTextColor="#999"
              />
            </View>

            <TouchableOpacity style={styles.filterButton}>
              <Ionicons name="funnel" size={18} color="#555" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Card list */}
        <View style={styles.listWrapper}>
          {fireIncidents.map((incident) => (
            <TouchableOpacity
              key={incident.id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => handleArticlePress(incident.id)}
            >
              <Image
                source={{ uri: incident.imageUrl }}
                style={styles.cardImage}
                resizeMode="cover"
              />

              <View style={styles.cardOverlay}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {incident.title}
                </Text>
                <Text style={styles.cardDate}>{incident.date}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',  // 🔥 Match login header style
  },

  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 60,
    backgroundColor: '#f5f5f5', // So content has correct BG below banner
  },
  banner: {
    backgroundColor: '#860d0dff',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  sectionHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 10,
    height: 34,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#333',
  },
  filterButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  cardImage: {
    width: '100%',
    height: 150,
  },
  cardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  cardDate: {
    fontSize: 11,
    color: '#f5f5f5',
  },
});

