import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';

const mockArticles = {
  '1': {
    id: '1',
    title: '3-Alarm Fire Controlled in ZC',
    date: 'October 08, 2025',
    author: 'BFP News Team',
    imageUrl: 'https://via.placeholder.com/800x400/e0e0e0/666666?text=Article+Image',
    content: `A massive 3-alarm fire broke out in the commercial district of Zamboanga City earlier today...`,
    category: 'Fire Incident',
    readTime: '3 min read',
  },
  '2': {
    id: '2',
    title: 'Kitchen Fire Contained in San Pedro Residence',
    date: 'October 15, 2025',
    author: 'BFP News Team',
    imageUrl: 'https://via.placeholder.com/800x400/e0e0e0/666666?text=Article+Image',
    content: `A kitchen fire was successfully contained at a residential property in San Pedro...`,
    category: 'Residential Fire',
    readTime: '2 min read',
  },
};

export const ArticleScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { articleId } = route.params || {};

  const article = mockArticles[articleId as keyof typeof mockArticles];

  if (!article) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Article not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Article</Text>

        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="bookmark-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="share-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 140 }} // 💥 Prevent overlapping with bottom tabs
      >
        {/* Hero Image */}
        <View style={styles.heroImageContainer}>
          <Image
            source={{ uri: article.imageUrl }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* Article Content */}
        <View style={styles.articleContent}>
          <View style={styles.articleMeta}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{article.category}</Text>
            </View>
            <Text style={styles.readTime}>{article.readTime}</Text>
          </View>

          <Text style={styles.articleTitle}>{article.title}</Text>

          <View style={styles.articleInfo}>
            <View style={styles.authorInfo}>
              <Ionicons name="person-outline" size={16} color="#666" />
              <Text style={styles.articleAuthor}>By {article.author}</Text>
            </View>

            <View style={styles.dateInfo}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.articleDate}>{article.date}</Text>
            </View>
          </View>

          <Text style={styles.articleText}>{article.content}</Text>

          {/* Related Articles */}
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>Related Articles</Text>

            <TouchableOpacity style={styles.relatedCard}>
              <Image
                source={{ uri: 'https://via.placeholder.com/100x60/e0e0e0/666666?text=Related' }}
                style={styles.relatedImage}
              />
              <View style={styles.relatedContent}>
                <Text style={styles.relatedArticleTitle}>
                  BFP Conducts Fire Safety Drill
                </Text>
                <Text style={styles.relatedArticleDate}>October 10, 2025</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.relatedCard}>
              <Image
                source={{ uri: 'https://via.placeholder.com/100x60/e0e0e0/666666?text=Related' }}
                style={styles.relatedImage}
              />
              <View style={styles.relatedContent}>
                <Text style={styles.relatedArticleTitle}>
                  New Fire Station Opens in District
                </Text>
                <Text style={styles.relatedArticleDate}>October 12, 2025</Text>
              </View>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },

  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  content: {
    flex: 1,
  },

  heroImageContainer: {
    width: '100%',
    height: 250,
  },

  heroImage: {
    width: '100%',
    height: '100%',
  },

  articleContent: {
    padding: 20,
    backgroundColor: '#fff',
  },

  articleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  categoryBadge: {
    backgroundColor: '#E53935',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },

  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  readTime: {
    fontSize: 12,
    color: '#666',
  },

  articleTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
    marginBottom: 16,
  },

  articleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  articleAuthor: {
    fontSize: 14,
    color: '#666',
  },

  articleDate: {
    fontSize: 14,
    color: '#666',
  },

  articleText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 32,
  },

  relatedSection: {
    marginBottom: 32,
  },

  relatedTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },

  relatedCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },

  relatedImage: {
    width: 100,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },

  relatedContent: {
    flex: 1,
    justifyContent: 'center',
  },

  relatedArticleTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },

  relatedArticleDate: {
    fontSize: 12,
    color: '#666',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorText: {
    fontSize: 18,
    marginBottom: 20,
  },

  backButtonText: {
    color: '#E53935',
    fontSize: 16,
    fontWeight: '600',
  },
});
