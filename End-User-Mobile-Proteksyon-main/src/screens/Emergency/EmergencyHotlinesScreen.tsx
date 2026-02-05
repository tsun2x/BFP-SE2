import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const hotlines = [
  {
    id: '1',
    name: 'BFP Zamboanga Central',
    phone: '0935-123-4567',
    area: 'Tetuan',
    type: 'Fire station',
  },
  {
    id: '2',
    name: 'BFP Ayala Substation',
    phone: '0936-876-3210',
    area: 'Ayala',
    type: 'Fire Station',
  },
  {
    id: '3',
    name: 'Zamboanga City Medical Center',
    phone: 'xxxxxxx937',
    area: 'Veterans Ave',
    type: 'Medical',
  },
];

export const EmergencyHotlinesScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }} // 🔥 FIXES scroll cutoff
      >
        {/* Back button */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={16} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Card with hotlines */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Emergency Hotlines</Text>
          </View>

          {hotlines.map((item, index) => (
            <View key={item.id} style={styles.hotlineRow}>
              <View style={styles.hotlineLeft}>
                <Text style={styles.hotlineName}>{item.name}</Text>
                <Text style={styles.hotlinePhone}>{item.phone}</Text>
                <Text style={styles.hotlineArea}>{item.area}</Text>
              </View>

              <View style={styles.hotlineRight}>
                <Text style={styles.hotlineType}>{item.type}</Text>
              </View>

              {index < hotlines.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16, // 🔥 FIXED for proper scrolling
  },
  headerRow: {
    marginBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B71C1C',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  backText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  searchWrapper: {
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 10,
    height: 34,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#333',
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  cardHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C62828',
  },
  hotlineRow: {
    paddingVertical: 8,
  },
  hotlineLeft: {
    flexDirection: 'column',
  },
  hotlineName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
  },
  hotlinePhone: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 2,
  },
  hotlineArea: {
    fontSize: 11,
    color: '#777',
    marginTop: 2,
  },
  hotlineRight: {
    position: 'absolute',
    right: 0,
    top: 10,
  },
  hotlineType: {
    fontSize: 12,
    color: '#444',
  },
  rowDivider: {
    marginTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
});
