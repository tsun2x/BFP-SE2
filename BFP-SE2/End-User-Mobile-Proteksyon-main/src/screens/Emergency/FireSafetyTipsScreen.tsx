import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NODE_API_URL } from '../../config';

export const FireSafetyTipsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [categories, setCategories] = useState<any[]>([]);
  const [tips, setTips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [catRes, tipRes] = await Promise.all([
        fetch(`${NODE_API_URL}/api/public/safety-tip-categories`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
        fetch(`${NODE_API_URL}/api/public/safety-tips`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
      ]);
      const catJson = await catRes.json();
      const tipJson = await tipRes.json();
      if (catJson.success) setCategories(catJson.data || []);
      if (tipJson.success) setTips(tipJson.data || []);
    } catch (e) {
      console.error('[SafetyTips] fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const getTipsForCategory = (catId: number) => tips.filter((t) => t.category_id === catId);

  const handleCategoryPress = (cat: any) => {
    setSelectedCategory(cat);
    setShowModal(true);
  };

  const renderCategoryCard = ({ item }: { item: any }) => {
    const catTips = getTipsForCategory(item.id);
    return (
      <TouchableOpacity style={styles.tipCard} onPress={() => handleCategoryPress(item)} activeOpacity={0.8}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.categoryImage} resizeMode="cover" />
        ) : (
          <View style={[styles.iconBox, { backgroundColor: (item.color || '#E53935') + '20' }]}>
            <Ionicons name="shield-checkmark" size={32} color={item.color || '#E53935'} />
          </View>
        )}
        <Text style={styles.tipLabel}>{item.name}</Text>
        <Text style={styles.tipCount}>{catTips.length} tips</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={16} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fire Safety Resources</Text>
          <Text style={styles.sectionSubtitle}>Digital brochures, infographics, and practical tips on fire prevention and emergency preparedness.</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#E53935" style={{ marginTop: 40 }} />
        ) : categories.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#999' }}>No safety resources available yet.</Text>
        ) : (
          <View style={styles.categoriesContainer}>
            <FlatList data={categories} renderItem={renderCategoryCard} keyExtractor={(item) => String(item.id)} numColumns={2} scrollEnabled={false} />
          </View>
        )}
      </ScrollView>

      <Modal visible={showModal} transparent={true} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { backgroundColor: (selectedCategory?.color || '#E53935') + '20' }]}>
                <Ionicons name="shield-checkmark" size={24} color={selectedCategory?.color || '#E53935'} />
              </View>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>{selectedCategory?.name}</Text>
                <Text style={styles.modalSubtitle}>Safety Tips</Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.tipsList}>
              {selectedCategory && getTipsForCategory(selectedCategory.id).map((tip: any) => (
                <View key={tip.id} style={styles.tipItem}>
                  {tip.image_url ? (
                    <Image source={{ uri: tip.image_url }} style={{ width: '100%', height: 150, borderRadius: 8, marginBottom: 8 }} resizeMode="cover" />
                  ) : null}
                  <Text style={styles.tipTaskTitle}>{tip.task}</Text>
                  <Text style={styles.tipText}>{tip.description}</Text>
                </View>
              ))}
              {selectedCategory && getTipsForCategory(selectedCategory.id).length === 0 && (
                <Text style={{ textAlign: 'center', color: '#999', padding: 20 }}>No tips in this category yet.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollView: { flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  headerRow: { marginBottom: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#B71C1C', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start' },
  backText: { color: '#ffffff', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  sectionHeader: { marginBottom: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, color: '#555' },
  categoriesContainer: { marginBottom: 24 },
  tipCard: { flex: 1, marginHorizontal: 4, marginVertical: 8, alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  iconBox: { width: 80, height: 80, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  categoryImage: { width: 80, height: 80, borderRadius: 12, marginBottom: 12 },
  tipLabel: { fontSize: 14, fontWeight: '600', color: '#333', textAlign: 'center', marginBottom: 4 },
  tipCount: { fontSize: 12, color: '#666', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, maxHeight: '80%', width: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  modalTitleContainer: { flex: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 2 },
  modalSubtitle: { fontSize: 12, color: '#666' },
  tipsList: { padding: 20 },
  tipItem: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', paddingBottom: 16 },
  tipTaskTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 },
  tipText: { fontSize: 14, color: '#555', lineHeight: 20 },
});
