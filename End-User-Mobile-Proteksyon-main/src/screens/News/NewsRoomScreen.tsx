import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NODE_API_URL } from '../../config';

export const NewsRoomScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [articles, setArticles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const res = await fetch(`${NODE_API_URL}/api/public/news`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      const json = await res.json();
      if (json.success) setArticles(json.data || []);
    } catch (e) {
      console.error('[NewsRoom] fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = articles.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (a.title || '').toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q);
  });

  const handleArticlePress = (articleId: number) => {
    navigation.navigate('Article', { articleId });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Welcome to the News Room</Text>
          <Text style={styles.bannerSubtitle}>Stay updated on incidents, and BFP announcements.</Text>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Latest News</Text>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search"
                placeholderTextColor="#999"
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#E53935" style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#999' }}>No news articles found.</Text>
        ) : (
          <View style={styles.listWrapper}>
            {filtered.map((article) => (
              <TouchableOpacity
                key={article.id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => handleArticlePress(article.id)}
              >
                {article.headline_image ? (
                  <Image source={{ uri: article.headline_image }} style={styles.cardImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.cardImage, { backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="newspaper" size={40} color="#999" />
                  </View>
                )}
                <View style={styles.cardOverlay}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{article.title}</Text>
                  <Text style={styles.cardDate}>
                    {article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }) : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollView: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingBottom: 60, backgroundColor: '#f5f5f5' },
  banner: { backgroundColor: '#860d0dff', paddingTop: 56, paddingBottom: 20, paddingHorizontal: 16 },
  bannerTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff', marginBottom: 4 },
  bannerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  sectionHeaderRow: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 10, height: 34 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 13, color: '#333' },
  listWrapper: { paddingHorizontal: 16, paddingTop: 12 },
  card: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#ffffff', marginBottom: 12 },
  cardImage: { width: '100%', height: 150 },
  cardOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.45)' },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  cardDate: { fontSize: 11, color: '#f5f5f5' },
});
