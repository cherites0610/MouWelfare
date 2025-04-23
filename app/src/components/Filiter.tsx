import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { getTextByLocation, getTextByService, LocationNum, ServiceNum } from '../utils/getTextByNumber';
import { COLORS } from '../utils/colors';


let regions: string[] = []
for (let i = 1; i < LocationNum; i++) {
  regions.push(getTextByLocation(i))
}
const services: string[] = []
for (let i = 1; i < ServiceNum; i++) {
  services.push(getTextByService(i))
}
const familyTypes: string[] = ["測試"]

const FilterBar = ({openFiliterDrawe}:{openFiliterDrawe:Function}) => {
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [familyModalVisible, setFamilyModalVisible] = useState(false);

  const [selectedRegions, setSelectedRegions] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedFamilies, setSelectedFamilies] = useState([]);

  // Toggle selection for multi-select
  const toggleSelection = (item: string, selectedItems: string[], setSelectedItems: Function) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter((i) => i !== item));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  // Render dropdown item
  const renderDropdownItem = (item: string, selectedItems: string[], setSelectedItems: Function) => (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => toggleSelection(item, selectedItems, setSelectedItems)}
    >
      <Text style={styles.dropdownText}>
        {item} {selectedItems.includes(item) ? '✓' : ''}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.filterBar}>
      {/* Region Dropdown */}
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setRegionModalVisible(true)}
      >
        <Text style={styles.buttonText}>
          地區{selectedRegions.length > 0 ? ` (${selectedRegions.length})` : ''}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      {/* Service Dropdown */}
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setServiceModalVisible(true)}
      >
        <Text style={styles.buttonText}>
          服務{selectedServices.length > 0 ? ` (${selectedServices.length})` : ''}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      {/* Family Dropdown */}
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setFamilyModalVisible(true)}
      >
        <Text style={styles.buttonText}>
          家庭{selectedFamilies.length > 0 ? ` (${selectedFamilies.length})` : ''}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      {/* Filter Button */}
      <TouchableOpacity 
        style={styles.filterIconButton}
        onPress={() => openFiliterDrawe()}
        >
        <Text style={styles.buttonText}>篩選</Text>
      </TouchableOpacity>

      {/* Region Modal */}
      <Modal
        visible={regionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRegionModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>選擇地區</Text>
            <FlatList
              data={regions}
              keyExtractor={(item) => item}
              renderItem={({ item }) =>
                renderDropdownItem(item, selectedRegions, setSelectedRegions)
              }
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setRegionModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>關閉</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Service Modal */}
      <Modal
        visible={serviceModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setServiceModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>選擇服務</Text>
            <FlatList
              data={services}
              keyExtractor={(item) => item}
              renderItem={({ item }) =>
                renderDropdownItem(item, selectedServices, setSelectedServices)
              }
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setServiceModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>關閉</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Family Modal */}
      <Modal
        visible={familyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFamilyModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>選擇家庭</Text>
            <FlatList
              data={familyTypes}
              keyExtractor={(item) => item}
              renderItem={({ item }) =>
                renderDropdownItem(item, selectedFamilies, setSelectedFamilies)
              }
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setFamilyModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>關閉</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    height: 50
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 5,
    backgroundColor: '#fff',
    borderColor: '#ddd'
  },
  filterIconButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginLeft: 10,
    borderColor: '#ddd',
  },
  buttonText: {
    fontSize: 16,
    color: '#333',
  },
  arrow: {
    marginLeft: 5,
    fontSize: 12,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 20,
    maxHeight: '50%',
  },
  modalTitle: {
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "center"
  },
  dropdownItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  closeButton: {
    marginTop: 10,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default FilterBar;