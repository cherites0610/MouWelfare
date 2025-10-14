import React, { useEffect, useState,useCallback } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import FilterSection from './FilterSection';
import FilterFooter from './FilterFooter';
import { ageOptions, genderOptions, incomeOptions, identityOptions } from './constants';
import styles from './styles';
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/src/store';
import { setIdentities, setAge, setGender, setIncome, resetFilters } from '@/src/store/slices/filiterSlice';
import { updateConfig, writeConfig } from '@/src/store/slices/configSlice';

export default function FilterDrawer({ closeDrawer }: { closeDrawer: Function }) {
  const dispatch = useDispatch<AppDispatch>();
  const globalFilters = useSelector((state: RootState) => state.filiter);
  const { autoFilterUserData } = useSelector((state: RootState) => state.config);
  // State Management
  const [selectedAge, setSelectedAge] = useState<string | null>(globalFilters.age);
    const [selectedGender, setSelectedGender] = useState<string | null>(globalFilters.gender);
    const [selectedIncome, setSelectedIncome] = useState<string[]>(globalFilters.income);
    const [selectedIdentity, setSelectedIdentity] = useState<string[]>(globalFilters.identities);
  // const { autoFilterUserData } = useSelector((state: RootState) => state.config)
  // const { user } = useSelector((state: RootState) => state.user)
  // const dispatcher = useDispatch<AppDispatch>()
const handleToggleAutoFilter = useCallback(() => {
    // dispatch 一個 action 來更新 Redux state (新值是當前值的相反)
    dispatch(updateConfig({ autoFilterUserData: !autoFilterUserData }));
    // dispatch 另一個 action 來將設定持久化 (寫入本地儲存)
    dispatch(writeConfig());
  }, [autoFilterUserData, dispatch]);
useEffect(() => {
        // 當 globalFilters 物件發生任何變化時，這個 effect 就會重新執行
        // 我們在這裡強制將全局狀態同步到本地狀態
        setSelectedAge(globalFilters.age);
        setSelectedGender(globalFilters.gender);
        setSelectedIncome(globalFilters.income);
        setSelectedIdentity(globalFilters.identities);

    }, [globalFilters]);
    const handleSingleSelect = (option: string, currentSelection: string | null,setter: React.Dispatch<React.SetStateAction<string | null>>) => {
        setter(currentSelection === option ? null : option);
    };

    // 處理手動多選
    const handleMultiSelect = (option: string,currentSelection: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
        const newSelection = [...currentSelection];
        const index = newSelection.indexOf(option);
        if (index > -1) {
            newSelection.splice(index, 1); // 移除
        } else {
            newSelection.push(option); // 新增
        }
        setter(newSelection);
    };

    const handleClear = () => {
        setSelectedAge(null);
        setSelectedGender(null);
        setSelectedIncome([]);
        setSelectedIdentity([]);
        // (可選) 如果希望清除後立即影響列表，而不是等確認
        // dispatch(resetFilters()); 
    };

    // 步驟 3: handleConfirm 負責將所有本地狀態 dispatch 到 Redux
    const handleConfirm = () => {
        // 為每個篩選類別分發對應的 action
        dispatch(setAge(selectedAge));
        dispatch(setGender(selectedGender));
        dispatch(setIncome(selectedIncome));
        dispatch(setIdentities(selectedIdentity));
        closeDrawer();
    };
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <FilterSection
          title="年齡"
          options={ageOptions}
          selected={selectedAge ? [selectedAge] : []}
          onSelect={(option) => handleSingleSelect(option, selectedAge, setSelectedAge)}
          isSingleSelect
        />
        <FilterSection
          title="性別"
          options={genderOptions}
          selected={selectedGender ? [selectedGender] : []}
          onSelect={(option) => handleSingleSelect(option, selectedGender, setSelectedGender)}
          isSingleSelect
          isRow
        />
        <FilterSection
          title="收入"
          options={incomeOptions}
          selected={selectedIncome}
          onSelect={(option) => handleMultiSelect(option, selectedIncome, setSelectedIncome)}
        />
        <FilterSection
          title="身分別"
          options={identityOptions}
          selected={selectedIdentity}
          onSelect={(option) => handleMultiSelect(option, selectedIdentity, setSelectedIdentity)}
        />
      </ScrollView>
      <FilterFooter onClear={handleClear} onConfirm={handleConfirm} isAutoFilterSelected={autoFilterUserData} onToggleAutoFilter={handleToggleAutoFilter}/>
    </SafeAreaView>
  );
}