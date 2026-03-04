import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NODE_API_URL } from '../../config';

export const ArticleScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { articleId } = route.params || {};
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (articleId) fetchArticle();
  }, [articleId]);

  const fetchArticle = async () => {
    try {
      const res = await fetch(`${NODE_API_URL}/api/public/news/${articleId}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      const json = await res.json();
      if (json.success) setArticle(json.data);
    } catch (e) {
      console.error('[Article] fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.errorContainer}>
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Article not found</Text>
        <TouchableOpacity style={styles.backButtonAlt} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const authorText = Array.isArray(article.author) ? article.author.join(', ') : (article.author || 'BFP News Team');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Article</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.heroImageContainer}>
          {article.headline_image ? (
            <Image source={{ uri: article.headline_image }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="newspaper" size={60} color="#999" />
            </View>
          )}
        </View>

        <View style={styles.articleContent}>
          <Text style={styles.articleTitle}>{article.title}</Text>
          <View style={styles.articleInfo}>
            <View style={styles.authorInfo}>
              <Ionicons name="person-outline" size={16} color="#666" />
              <Text style={styles.articleAuthor}>By {authorText}</Text>
            </View>
            <View style={styles.dateInfo}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.articleDate}>
                {article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }) : ''}
              </Text>
            </View>
          </View>
          <Text style={styles.articleText}>{article.description}</Text>

          {article.additional_images && article.additional_images.length > 0 && (
            <View style={{ marginTop: 16 }}>
              {article.additional_images.map((img: string, idx: number) => (
                <Image key={idx} source={{ uri: img }} style={{ width: '100%', height: 200, borderRadius: 8, marginBottom: 8 }} resizeMode="cover" />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: 'transparent' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
  content: { flex: 1 },
  heroImageContainer: { width: '100%', height: 250 },
  heroImage: { width: '100%', height: '100%' },
  articleContent: { padding: 20, backgroundColor: '#fff' },
  articleTitle: { fontSize: 24, fontWeight: '800', color: '#333', marginBottom: 16 },
  articleInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  authorInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  articleAuthor: { fontSize: 14, color: '#666' },
  articleDate: { fontSize: 14, color: '#666' },
  articleText: { fontSize: 16, lineHeight: 24, color: '#333', marginBottom: 32 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, marginBottom: 20 },
  backButtonAlt: { padding: 10 },
  backButtonText: { color: '#E53935', fontSize: 16, fontWeight: '600' },
});
