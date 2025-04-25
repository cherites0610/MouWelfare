import React, { useState, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import FilterButton from './FilterButton';
import styles from './styles';
import FilterModal from './FilterModal';
import { regions, services, familyTypes } from './constants';

interface FilterBarProps {
  openFilterDrawer: () => void;
  onRegionsChange?: (regions: string[]) => void;
  onServicesChange?: (services: string[]) => void;
  onFamiliesChange?: (families: string[]) => void;
}

const FilterBar: React.FC<FilterBarProps> = React.memo(
  ({ openFilterDrawer, onRegionsChange, onServicesChange, onFamiliesChange }) => {
    const [regionModalVisible, setRegionModalVisible] = useState(false);
    const [serviceModalVisible, setServiceModalVisible] = useState(false);
    const [familyModalVisible, setFamilyModalVisible] = useState(false);

    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);

    // Memoize static data to prevent recalculation
    const filterData = useMemo(
      () => ({
        regions: { items: regions, selected: selectedRegions, setSelected: setSelectedRegions, onChange: onRegionsChange },
        services: { items: services, selected: selectedServices, setSelected: setSelectedServices, onChange: onServicesChange },
        families: { items: familyTypes, selected: selectedFamilies, setSelected: setSelectedFamilies, onChange: onFamiliesChange },
      }),
      [
        selectedRegions,
        selectedServices,
        selectedFamilies,
        onRegionsChange,
        onServicesChange,
        onFamiliesChange,
      ]
    );

    // Toggle modal visibility
    const toggleModal = useCallback((key: keyof typeof filterData, visible: boolean) => {
      switch (key) {
        case 'regions':
          setRegionModalVisible(visible);
          break;
        case 'services':
          setServiceModalVisible(visible);
          break;
        case 'families':
          setFamilyModalVisible(visible);
          break;
      }
    }, []);

    return (
      <View style={styles.filterBar}>
        <FilterButton
          label="地區"
          selectedCount={selectedRegions.length}
          onPress={() => toggleModal('regions', true)}
        />
        <FilterButton
          label="服務"
          selectedCount={selectedServices.length}
          onPress={() => toggleModal('services', true)}
        />
        <FilterButton
          label="家庭"
          selectedCount={selectedFamilies.length}
          onPress={() => toggleModal('families', true)}
        />
        <FilterButton label="篩選" onPress={openFilterDrawer} isIconButton />

        <FilterModal
          visible={regionModalVisible}
          title="選擇地區"
          items={filterData.regions.items}
          selectedItems={filterData.regions.selected}
          setSelectedItems={filterData.regions.setSelected}
          onChange={filterData.regions.onChange}
          onClose={() => toggleModal('regions', false)}
        />
        <FilterModal
          visible={serviceModalVisible}
          title="選擇服務"
          items={filterData.services.items}
          selectedItems={filterData.services.selected}
          setSelectedItems={filterData.services.setSelected}
          onChange={filterData.services.onChange}
          onClose={() => toggleModal('services', false)}
        />
        <FilterModal
          visible={familyModalVisible}
          title="選擇家庭"
          items={filterData.families.items}
          selectedItems={filterData.families.selected}
          setSelectedItems={filterData.families.setSelected}
          onChange={filterData.families.onChange}
          onClose={() => toggleModal('families', false)}
        />
      </View>
    );
  }
);

export default FilterBar;