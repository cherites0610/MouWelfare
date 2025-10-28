import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View,ToastAndroid,Platform   } from 'react-native';
import FilterButton from './FilterButton';
import styles from './styles';
import FilterModal from './FilterModal';
import { AppDispatch, RootState } from '@/src/store';
import { useSelector, useDispatch } from 'react-redux';
import { setCategories, setFamilies, setLocations } from '@/src/store/slices/filiterSlice';
import { getTextByLocation, getTextByService, LocationNum, ServiceNum } from '@/src/utils/getTextByNumber';
import { updateConfig, writeConfig } from '@/src/store/slices/configSlice';

interface FilterBarProps {
  openFilterDrawer: () => void;
}

const FilterBar: React.FC<FilterBarProps> = React.memo(
  ({ openFilterDrawer }) => {

    const { autoFilterUserData } = useSelector((state: RootState) => state.config)
    const { user } = useSelector((state: RootState) => state.user)
    const [regionModalVisible, setRegionModalVisible] = useState(false);
    const [serviceModalVisible, setServiceModalVisible] = useState(false);
    const [familyModalVisible, setFamilyModalVisible] = useState(false);

    const dispatch = useDispatch<AppDispatch>();
    const { familys: FAMILY } = useSelector((state: RootState) => state.family);
    const { locations, 
    categories, 
    family, 
    identities, 
    age, 
    gender, 
    income  } = useSelector((state: RootState) => state.filiter)
    const setLocation = (locations: string[]) => {
      // 🟡 手動干預 → 關閉自動套用
      if (autoFilterUserData) {
        dispatch(updateConfig({ autoFilterUserData: false }));
        dispatch(writeConfig());

        if (Platform.OS === 'android') {
          ToastAndroid.show('已切換為手動模式', ToastAndroid.SHORT);
        }
      }

      dispatch(setLocations(locations));
    };
  const setCategory = (categories: string[]) => {
    // if (autoFilterUserData) {
    //   dispatch(updateConfig({ autoFilterUserData: false }));
    //   dispatch(writeConfig());
    // }
    dispatch(setCategories(categories));
  };

  const setFamily = (families: string) => {
    // if (autoFilterUserData) {
    //   dispatch(updateConfig({ autoFilterUserData: false }));
    //   dispatch(writeConfig());
    // }
    dispatch(setFamilies(families));
  };


    // useEffect(() => {
    //   if (user?.location && autoFilterUserData) {
    //     setLocation([user.location.name])
    //   }
    // },[user,autoFilterUserData])



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
    const detailedFilterCount = 
       identities.length + 
       income.length +
      (age ? 1 : 0) +
       (gender ? 1 : 0);

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
          selectedCount={family === "" ? 0 : 1}
          onPress={() => toggleModal('family', true)}
        />
        
<FilterButton selectedCount={detailedFilterCount} label="篩選" onPress={openFilterDrawer} isIconButton />

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
          selectedItems={family}
          setSelectedItems={setFamily}
          // onChange={filterData.families.onChange}
          onClose={() => toggleModal('family', false)}
        />
      </View>
    );
  }
);

export default FilterBar;