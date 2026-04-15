import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NODE_API_URL } from '../../config';

const FALLBACK_CONTACTS = [
  {
    id: 'fallback-1',
    category: 'Fire Emergency',
    station: 'BFP Emergency Hotline',
    hotline: '160',
    location: 'National',
  },
  {
    id: 'fallback-2',
    category: 'Main Station',
    station: 'Central Fire Station (Main)',
    hotline: '(062) 991-3225',
    location: 'Zamboanga City',
  },
  {
    id: 'fallback-3',
    category: 'Emergency',
    station: 'BFP Operations Center',
    hotline: '0917-000-1600',
    location: 'Zamboanga Region',
  },
];

export const EmergencyHotlinesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchContacts(); }, []);

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${NODE_API_URL}/api/public/contacts`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      const json = await res.json();
      if (json.success) {
        const rows = Array.isArray(json.data) ? json.data : [];
        setContacts(rows.length > 0 ? rows : FALLBACK_CONTACTS);
      } else {
        setContacts(FALLBACK_CONTACTS);
      }
    } catch (e) {
      console.error('[Contacts] fetch error:', e);
      setContacts(FALLBACK_CONTACTS);
    } finally {
      setLoading(false);
    }
  };

  const filtered = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [c.category, c.station, c.hotline, c.location].some((v) => (v || '').toLowerCase().includes(q));
  });

  const handleCall = (phone: string) => {
    const cleaned = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleaned}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={16} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrapper}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#999" style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="Search" placeholderTextColor="#999" value={search} onChangeText={setSearch} />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#E53935" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Emergency Hotlines</Text>
            </View>
            {filtered.length === 0 ? (
              <Text style={{ textAlign: 'center', padding: 20, color: '#999' }}>No hotlines match your search.</Text>
            ) : (
              filtered.map((item, index) => (
                <TouchableOpacity key={item.id} style={styles.hotlineRow} onPress={() => handleCall(item.hotline)}>
                  <View style={styles.hotlineLeft}>
                    <Text style={styles.hotlineName}>{item.station}</Text>
                    <Text style={styles.hotlinePhone}>{item.hotline}</Text>
                    <Text style={styles.hotlineArea}>{item.location}</Text>
                  </View>
                  <View style={styles.hotlineRight}>
                    <Text style={styles.hotlineType}>{item.category}</Text>
                    <Ionicons name="call" size={18} color="#4CAF50" style={{ marginTop: 4 }} />
                  </View>
                  {index < filtered.length - 1 && <View style={styles.rowDivider} />}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  headerRow: { marginBottom: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#B71C1C', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start' },
  backText: { color: '#ffffff', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  searchWrapper: { marginBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 10, height: 34 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 13, color: '#333' },
  card: { borderRadius: 8, borderWidth: 1, borderColor: '#d0d0d0', backgroundColor: '#ffffff', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 },
  cardHeader: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e0e0e0', paddingBottom: 8, marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#C62828' },
  hotlineRow: { paddingVertical: 8 },
  hotlineLeft: { flexDirection: 'column' },
  hotlineName: { fontSize: 13, fontWeight: '600', color: '#222' },
  hotlinePhone: { fontSize: 12, color: '#D32F2F', marginTop: 2 },
  hotlineArea: { fontSize: 11, color: '#777', marginTop: 2 },
  hotlineRight: { position: 'absolute', right: 0, top: 10, alignItems: 'center' },
  hotlineType: { fontSize: 12, color: '#444' },
  rowDivider: { marginTop: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e0e0e0' },
});
