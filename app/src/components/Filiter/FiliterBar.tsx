import React, { useState, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import FilterButton from './FilterButton';
import styles from './styles';
import FilterModal from './FilterModal';
import { AppDispatch, RootState } from '@/src/store';
import { useSelector, useDispatch } from 'react-redux';
import { setCategories, setFamilies, setLocations } from '@/src/store/slices/filiterSlice';
import { getTextByLocation, getTextByService, LocationNum, ServiceNum } from '@/src/utils/getTextByNumber';

interface FilterBarProps {
  openFilterDrawer: () => void;
}

const FilterBar: React.FC<FilterBarProps> = React.memo(
  ({ openFilterDrawer }) => {

    const [regionModalVisible, setRegionModalVisible] = useState(false);
    const [serviceModalVisible, setServiceModalVisible] = useState(false);
    const [familyModalVisible, setFamilyModalVisible] = useState(false);

    const dispatch = useDispatch<AppDispatch>();
    const { familys: FAMILY } = useSelector((state: RootState) => state.family);
    const { locations, categories, families } = useSelector((state: RootState) => state.filiter)
    const setLocation = (locations: string[]) => {
      dispatch(setLocations(locations))
    }
    const setCategory = (locations: string[]) => {
      dispatch(setCategories(locations))
    }
    const setFamily = (familyies: string) => {
      dispatch(setFamilies(familyies))
    }

    const LOCATION: string[] = Array.from({ length: LocationNum - 1 }, (_, i) => getTextByLocation(i + 1));
    const CATEGORY: string[] = Array.from({ length: ServiceNum - 1 }, (_, i) => getTextByService(i + 1));

    // Toggle modal visibility
    const toggleModal = useCallback((key: "location" | "category" | "family", visible: boolean) => {
      switch (key) {
        case 'location':
          setRegionModalVisible(visible);
          break;
        case 'category':
          setServiceModalVisible(visible);
          break;
        case 'family':
          setFamilyModalVisible(visible);
          break;
      }
    }, []);

    return (
      <View style={styles.filterBar}>
        <FilterButton
        
          label="地區"
          selectedCount={locations.length}
          onPress={() => toggleModal('location', true)}
        />
        <FilterButton
          label="服務"
          selectedCount={categories.length}
          onPress={() => toggleModal('category', true)}
        />
        <FilterButton
          label="家庭"
          selectedCount={families===""?0:1}
          onPress={() => toggleModal('family', true)}
        />
        <FilterButton label="篩選" onPress={openFilterDrawer} isIconButton />

        <FilterModal
          visible={regionModalVisible}
          title="選擇地區"
          items={LOCATION}
          selectedItems={locations}
          setSelectedItems={setLocation}
          onClose={() => toggleModal('location', false)}
        />
        <FilterModal
          visible={serviceModalVisible}
          title="選擇服務"
          items={CATEGORY}
          selectedItems={categories}
          setSelectedItems={setCategory}
          // onChange={filterData.services.onChange}
          onClose={() => toggleModal('category', false)}
        />
        <FilterModal
          visible={familyModalVisible}
          title="選擇家庭"
          items={FAMILY.map((item) => item.name)}
          selectedItems={families}
          setSelectedItems={setFamily}
          // onChange={filterData.families.onChange}
          onClose={() => toggleModal('family', false)}
        />
      </View>
    );
  }
);

export default FilterBar;