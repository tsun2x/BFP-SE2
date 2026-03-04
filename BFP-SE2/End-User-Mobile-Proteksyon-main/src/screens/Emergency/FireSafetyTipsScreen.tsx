import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const safetyCategories = [
  {
    id: '1',
    title: 'Electrical Fires',
    icon: 'flash',
    color: '#F9A825',
    tips: [
      'Never overload electrical outlets',
      'Replace damaged cords immediately',
      'Keep electrical appliances away from water',
      'Use surge protectors for sensitive equipment',
      'Have your wiring inspected regularly'
    ]
  },
  {
    id: '2',
    title: 'Vehicle Fire',
    icon: 'car',
    color: '#C62828',
    tips: [
      'Keep a fire extinguisher in your vehicle',
      'Never smoke near fuel',
      'Watch for fuel leaks',
      'Maintain your vehicle regularly',
      'Turn off engine when refueling'
    ]
  },
  {
    id: '3',
    title: 'Chemical or Gas Fire',
    icon: 'beaker',
    color: '#1565C0',
    tips: [
      'Store chemicals in proper containers',
      'Keep flammable materials away from heat',
      'Ensure proper ventilation',
      'Use appropriate fire extinguishers',
      'Have emergency shower nearby'
    ]
  },
  {
    id: '4',
    title: 'Forest or Grass Fire',
    icon: 'leaf',
    color: '#2E7D32',
    tips: [
      'Clear dry vegetation around property',
      'Never leave campfires unattended',
      'Report suspicious smoke immediately',
      'Create fire breaks if possible',
      'Have evacuation plans ready'
    ]
  },
  {
    id: '5',
    title: 'Kitchen Fire',
    icon: 'restaurant',
    color: '#E65100',
    tips: [
      'Never leave cooking unattended',
      'Keep flammable items away from stove',
      'Clean grease buildup regularly',
      'Have a lid nearby to smother flames',
      'Know how to use a fire extinguisher'
    ]
  },
  {
    id: '6',
    title: 'Building Fire',
    icon: 'business',
    color: '#6A1B9A',
    tips: [
      'Know emergency exits',
      'Practice fire drills regularly',
      'Keep exit paths clear',
      'Install smoke detectors',
      'Have assembly points identified'
    ]
  },
];

const bfpEquipment = [
  {
    id: '1',
    name: 'Water Tank Truck',
    icon: 'bus',
    color: '#F57C00',
    description: 'Primary firefighting vehicle with large water capacity for extended operations.',
    capacity: '3,000-5,000 gallons',
    uses: ['Structure fires', 'Large outdoor fires', 'Industrial incidents']
  },
  {
    id: '2',
    name: 'Rescue Truck',
    icon: 'car',
    color: '#1976D2',
    description: 'Specialized vehicle for technical rescue and emergency medical response.',
    equipment: ['Jaws of Life', 'Medical supplies', 'Rescue tools'],
    uses: ['Vehicle accidents', 'Building collapses', 'Medical emergencies']
  },
  {
    id: '3',
    name: 'Fire Hose',
    icon: 'water',
    color: '#0288D1',
    description: 'High-pressure water delivery system for firefighting operations.',
    types: ['Attack lines', 'Supply lines', 'Booster lines'],
    pressure: '150-200 PSI'
  },
];

export const FireSafetyTipsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);

  const handleCategoryPress = (category: any) => {
    setSelectedCategory(category);
    setShowCategoryModal(true);
  };

  const handleEquipmentPress = (equipment: any) => {
    setSelectedEquipment(equipment);
    setShowEquipmentModal(true);
  };

  const renderCategoryCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.tipCard}
      onPress={() => handleCategoryPress(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon as any} size={32} color={item.color} />
      </View>
      <Text style={styles.tipLabel}>{item.title}</Text>
      <Text style={styles.tipCount}>{item.tips.length} tips</Text>
    </TouchableOpacity>
  );

  const renderEquipmentCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.equipmentCard}
      onPress={() => handleEquipmentPress(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.equipmentIconBox, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon as any} size={36} color={item.color} />
      </View>
      <View style={styles.equipmentInfo}>
        <Text style={styles.equipmentLabel}>{item.name}</Text>
        <Text style={styles.equipmentDescription} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
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

        {/* Fire safety tips heading */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fire Safety Tips</Text>
          <Text style={styles.sectionSubtitle}>
            Learn how to prevent and respond to different fire types.
          </Text>
        </View>

        {/* Categories Grid */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.categoriesTitle}>Safety Categories</Text>
          <FlatList
            data={safetyCategories}
            renderItem={renderCategoryCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
          />
        </View>

        {/* Equipment Section */}
        <View style={styles.equipmentSection}>
          <Text style={styles.sectionTitle}>BFP Equipment</Text>
          <Text style={styles.sectionSubtitle}>
            Learn about the equipment used by BFP firefighters.
          </Text>

          <FlatList
            data={bfpEquipment}
            renderItem={renderEquipmentCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>

      {/* Category Tips Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { backgroundColor: selectedCategory?.color + '20' }]}>
                <Ionicons name={selectedCategory?.icon as any} size={24} color={selectedCategory?.color} />
              </View>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>{selectedCategory?.title}</Text>
                <Text style={styles.modalSubtitle}>Safety Tips</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.tipsList}>
              {selectedCategory?.tips.map((tip: string, index: number) => {
                // Get appropriate icon based on tip content
                const getTipIcon = (tipText: string) => {
                  if (tipText.toLowerCase().includes('electrical') || tipText.toLowerCase().includes('outlet') || tipText.toLowerCase().includes('cord')) return 'flash';
                  if (tipText.toLowerCase().includes('extinguisher')) return 'flame';
                  if (tipText.toLowerCase().includes('smoke') || tipText.toLowerCase().includes('alarm')) return 'warning';
                  if (tipText.toLowerCase().includes('escape') || tipText.toLowerCase().includes('exit')) return 'exit';
                  if (tipText.toLowerCase().includes('door') || tipText.toLowerCase().includes('close')) return 'home';
                  if (tipText.toLowerCase().includes('water')) return 'water';
                  if (tipText.toLowerCase().includes('call') || tipText.toLowerCase().includes('phone')) return 'call';
                  if (tipText.toLowerCase().includes('fuel') || tipText.toLowerCase().includes('gas')) return 'flame';
                  if (tipText.toLowerCase().includes('chemical') || tipText.toLowerCase().includes('beaker')) return 'flask';
                  if (tipText.toLowerCase().includes('maintenance') || tipText.toLowerCase().includes('inspect')) return 'build';
                  if (tipText.toLowerCase().includes('kitchen') || tipText.toLowerCase().includes('cooking')) return 'restaurant';
                  if (tipText.toLowerCase().includes('blanket')) return 'bed';
                  if (tipText.toLowerCase().includes('stop') || tipText.toLowerCase().includes('drop')) return 'stop';
                  if (tipText.toLowerCase().includes('roll')) return 'refresh';
                  return 'checkmark-circle';
                };

                return (
                  <View key={index} style={styles.tipItem}>
                    <View style={styles.tipIcon}>
                      <Ionicons 
                        name={getTipIcon(tip)} 
                        size={20} 
                        color={selectedCategory.color} 
                      />
                    </View>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Equipment Details Modal */}
      <Modal
        visible={showEquipmentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEquipmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { backgroundColor: selectedEquipment?.color + '20' }]}>
                <Ionicons name={selectedEquipment?.icon as any} size={24} color={selectedEquipment?.color} />
              </View>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>{selectedEquipment?.name}</Text>
                <Text style={styles.modalSubtitle}>Equipment Details</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEquipmentModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.equipmentDetails}>
              <Text style={styles.equipmentDetailDescription}>
                {selectedEquipment?.description}
              </Text>

              {selectedEquipment?.capacity && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Capacity</Text>
                  <Text style={styles.detailSectionText}>{selectedEquipment.capacity}</Text>
                </View>
              )}

              {selectedEquipment?.uses && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Common Uses</Text>
                  {selectedEquipment.uses.map((use: string, index: number) => (
                    <Text key={index} style={styles.detailSectionText}>• {use}</Text>
                  ))}
                </View>
              )}

              {selectedEquipment?.equipment && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Equipment Includes</Text>
                  {selectedEquipment.equipment.map((item: string, index: number) => (
                    <Text key={index} style={styles.detailSectionText}>• {item}</Text>
                  ))}
                </View>
              )}

              {selectedEquipment?.pressure && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Operating Pressure</Text>
                  <Text style={styles.detailSectionText}>{selectedEquipment.pressure}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
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
  sectionHeader: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#555',
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  categoriesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  tipCard: {
    flex: 1,
    marginHorizontal: 4,
    marginVertical: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  tipCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  equipmentSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  equipmentCard: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  equipmentIconBox: {
    marginRight: 16,
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  equipmentInfo: {
    flex: 1,
  },
  equipmentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  equipmentDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    maxHeight: '80%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  tipsList: {
    padding: 20,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  equipmentDetails: {
    padding: 20,
  },
  equipmentDetailDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  detailSectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
});
