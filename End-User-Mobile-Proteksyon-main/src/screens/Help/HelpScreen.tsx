import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HelpScreen: React.FC = () => {
  const navigation = useNavigation();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const faqCategories = [
    {
      id: 'general',
      title: 'General',
      icon: 'help-circle-outline',
      color: '#2196F3',
      questions: [
        {
          question: 'What is this app for?',
          answer: 'This is an Emergency Response App developed in partnership with the Bureau of Fire Protection (BFP) to provide quick access to emergency services, safety information, and real-time updates.'
        },
        {
          question: 'Is this app free to use?',
          answer: 'Yes, this app is completely free to download and use. There are no hidden charges or premium features.'
        },
        {
          question: 'How do I contact support?',
          answer: 'You can contact support through the "Contact Us" section in the app or call BFP Zamboanga at 160-000-00 for emergency assistance.'
        }
      ]
    },
    {
      id: 'emergency',
      title: 'Emergency',
      icon: 'warning-outline',
      color: '#E53935',
      questions: [
        {
          question: 'What should I do in case of fire?',
          answer: '1. Stay calm and evacuate immediately\n2. Call BFP Zamboanga at 160-000-00\n3. Use stairs, not elevators\n4. Feel doors before opening\n5. Stay low if there\'s smoke'
        },
        {
          question: 'How do I report an emergency?',
          answer: 'Use the emergency call feature in the app or dial BFP Zamboanga at 160-000-00 for fire emergencies. Provide clear location and nature of emergency.'
        },
        {
          question: 'What information should I provide when calling?',
          answer: 'Your name, exact location, type of emergency, number of people involved, and any immediate dangers. Stay on the line until told to hang up.'
        }
      ]
    },
    {
      id: 'features',
      title: 'Features',
      icon: 'grid-outline',
      color: '#4CAF50',
      questions: [
        {
          question: 'How does the fire truck tracking work?',
          answer: 'The app shows real-time locations of nearby fire trucks and emergency vehicles. This helps you know when help is arriving and allows for better coordination.'
        },
        {
          question: 'Can I receive emergency alerts?',
          answer: 'Yes, enable notifications in your device settings to receive real-time emergency alerts and safety updates from BFP.'
        },
        {
          question: 'How do I use the safety tips feature?',
          answer: 'Navigate to Safety Tips from the home screen. Browse different categories like electrical fires, kitchen fires, and learn preventive measures.'
        }
      ]
    },
    {
      id: 'technical',
      title: 'Technical',
      icon: 'settings-outline',
      color: '#FF9800',
      questions: [
        {
          question: 'Why does the app need location access?',
          answer: 'Location access helps provide accurate emergency services, show nearby fire stations, and give location-specific safety information.'
        },
        {
          question: 'How do I enable notifications?',
          answer: 'Go to your device Settings > Notifications > Find our app > Enable notifications. This ensures you receive emergency alerts.'
        },
        {
          question: 'App is not working properly. What should I do?',
          answer: '1. Check your internet connection\n2. Restart the app\n3. Clear cache if needed\n4. Update to the latest version\n5. Contact support if issues persist'
        }
      ]
    },
    {
      id: 'account',
      title: 'Account',
      icon: 'person-outline',
      color: '#9C27B0',
      questions: [
        {
          question: 'How do I create an account?',
          answer: 'Tap on "Register" on the login screen. Fill in your details including name, email, and phone number. Verify your account through the confirmation message.'
        },
        {
          question: 'I forgot my password. How do I reset it?',
          answer: 'Tap "Forgot Password" on the login screen. Enter your registered email or phone number. Follow the instructions sent to you to reset your password.'
        },
        {
          question: 'How do I update my profile information?',
          answer: 'Go to Profile from the hamburger menu. Tap "Edit Profile" to update your personal information, emergency contacts, and preferences.'
        }
      ]
    }
  ];

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(q => 
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'How would you like to contact us?',
      [
        { text: 'Call BFP Zamboanga (160-000-00)', onPress: () => console.log('Call emergency') },
        { text: 'Email Support', onPress: () => console.log('Email support') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & FAQ</Text>
        <TouchableOpacity onPress={handleContactSupport}>
          <Ionicons name="call" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for help..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Help Section */}
        <View style={styles.quickHelpSection}>
          <Text style={styles.sectionTitle}>Quick Help</Text>
          <View style={styles.quickHelpGrid}>
            <TouchableOpacity style={styles.quickHelpCard}>
              <View style={[styles.quickHelpIcon, { backgroundColor: '#E53935' }]}>
                <Ionicons name="call" size={24} color="#fff" />
              </View>
              <Text style={styles.quickHelpTitle}>Emergency Call</Text>
              <Text style={styles.quickHelpSubtitle}>160-000-00</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickHelpCard}>
              <View style={[styles.quickHelpIcon, { backgroundColor: '#2196F3' }]}>
                <Ionicons name="map" size={24} color="#fff" />
              </View>
              <Text style={styles.quickHelpTitle}>Find Station</Text>
              <Text style={styles.quickHelpSubtitle}>Nearby BFP</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickHelpCard}>
              <View style={[styles.quickHelpIcon, { backgroundColor: '#4CAF50' }]}>
                <Ionicons name="shield-checkmark" size={24} color="#fff" />
              </View>
              <Text style={styles.quickHelpTitle}>Safety Tips</Text>
              <Text style={styles.quickHelpSubtitle}>Prevention</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Categories */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          {filteredCategories.map((category) => (
            <View key={category.id} style={styles.categoryCard}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category.id)}
              >
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                    <Ionicons name={category.icon as any} size={20} color="#fff" />
                  </View>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                </View>
                <Ionicons 
                  name={expandedCategory === category.id ? 'chevron-up-outline' : 'chevron-down-outline'} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
              
              {expandedCategory === category.id && (
                <View style={styles.questionsContainer}>
                  {category.questions.map((q, index) => (
                    <View key={index} style={styles.questionItem}>
                      <Text style={styles.questionText}>{q.question}</Text>
                      <Text style={styles.answerText}>{q.answer}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Still Need Help?</Text>
          <View style={styles.contactOptions}>
            <TouchableOpacity style={styles.contactOption} onPress={handleContactSupport}>
              <Ionicons name="call" size={20} color="#E53935" />
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Emergency Hotline</Text>
                <Text style={styles.contactDetail}>160-000-00</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.contactOption}>
              <Ionicons name="mail" size={20} color="#2196F3" />
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Email Support</Text>
                <Text style={styles.contactDetail}>support@bfp.gov.ph</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.contactOption}>
              <Ionicons name="globe" size={20} color="#4CAF50" />
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Website</Text>
                <Text style={styles.contactDetail}>www.bfp.gov.ph</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Need immediate assistance?</Text>
          <TouchableOpacity style={styles.emergencyButton} onPress={handleContactSupport}>
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={styles.emergencyButtonText}>Call Emergency Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#B71C1C',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 44,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  content: {
    flex: 1,
    paddingBottom: 100,
  },
  quickHelpSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  quickHelpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickHelpCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  quickHelpIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickHelpTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
  },
  quickHelpSubtitle: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  faqSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  questionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  questionItem: {
    marginBottom: 16,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  answerText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  contactSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  contactOptions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactInfo: {
    marginLeft: 12,
    flex: 1,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  contactDetail: {
    fontSize: 12,
    color: '#666',
  },
  footer: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  emergencyButton: {
    flexDirection: 'row',
    backgroundColor: '#E53935',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default HelpScreen;
