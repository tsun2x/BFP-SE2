import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const AboutScreen: React.FC = () => {
  const navigation = useNavigation();

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
        <Text style={styles.headerTitle}>About</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Logo Placeholder */}
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>APP</Text>
          </View>
          <Text style={styles.appName}>Emergency Response App</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This App</Text>
          <Text style={styles.sectionText}>
            A comprehensive emergency response application designed to provide quick access to fire safety information, emergency contacts, and real-time updates. Developed in partnership with the Bureau of Fire Protection to enhance public safety and emergency preparedness.
          </Text>
        </View>

        {/* BFP Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.bfpLogo}>
              <Text style={styles.bfpText}>BFP</Text>
            </View>
            <Text style={styles.sectionTitle}>Bureau of Fire Protection</Text>
          </View>
          <Text style={styles.sectionText}>
            The Bureau of Fire Protection (BFP) is the government agency responsible for fire prevention, suppression, and emergency response services in the Philippines. Committed to saving lives and protecting property through professional firefighting and fire prevention services.
          </Text>
          <View style={styles.bfpServices}>
            <View style={styles.serviceItem}>
              <Ionicons name="flame" size={16} color="#E53935" />
              <Text style={styles.serviceText}>Fire Prevention</Text>
            </View>
            <View style={styles.serviceItem}>
              <Ionicons name="water" size={16} color="#E53935" />
              <Text style={styles.serviceText}>Emergency Response</Text>
            </View>
            <View style={styles.serviceItem}>
              <Ionicons name="shield-checkmark" size={16} color="#E53935" />
              <Text style={styles.serviceText}>Public Safety</Text>
            </View>
          </View>
        </View>

        {/* Developers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Development Team</Text>
          <View style={styles.developerContainer}>
            <View style={styles.developerCard}>
              <View style={styles.developerAvatar}>
                <Ionicons name="code" size={24} color="#fff" />
              </View>
              <View style={styles.developerInfo}>
                <Text style={styles.developerName}>Your Development Team</Text>
                <Text style={styles.developerRole}>Mobile App Developers</Text>
                <Text style={styles.developerDescription}>
                  Dedicated team of developers committed to creating innovative solutions for public safety and emergency response.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactItem}>
            <Ionicons name="call" size={20} color="#E53935" />
            <Text style={styles.contactText}>BFP Zamboanga Emergency: 160-000-00</Text>
          </View>
          <View style={styles.contactItem}>
            <Ionicons name="globe" size={20} color="#E53935" />
            <Text style={styles.contactText}>www.bfp.gov.ph</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2025 Emergency Response App
          </Text>
          <Text style={styles.footerSubtext}>
            Developed in partnership with BFP
          </Text>
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingBottom: 100,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bfpLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#B71C1C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bfpText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 16,
  },
  bfpServices: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  serviceItem: {
    alignItems: 'center',
    flex: 1,
  },
  serviceText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  developerContainer: {
    marginTop: 8,
  },
  developerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  developerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  developerInfo: {
    flex: 1,
  },
  developerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  developerRole: {
    fontSize: 12,
    color: '#E53935',
    marginBottom: 8,
  },
  developerDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 11,
    color: '#999',
  },
});

export default AboutScreen;
