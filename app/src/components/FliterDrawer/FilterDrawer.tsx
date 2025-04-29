import React, { useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import FilterSection from './FilterSection';
import FilterFooter from './FilterFooter';
import { ageOptions, genderOptions, incomeOptions, identityOptions } from './constants';
import styles from './styles';
import { useDispatch } from 'react-redux'
import { AppDispatch } from '@/src/store';
import { setIdentities } from '@/src/store/slices/filiterSlice';

export default function FilterDrawer({ closeDrawer }: { closeDrawer: Function }) {
  // State Management
  const [selectedAge, setSelectedAge] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [selectedIncome, setSelectedIncome] = useState<Set<string>>(new Set());
  const [selectedIdentity, setSelectedIdentity] = useState<Set<string>>(new Set());
  const dispatcher = useDispatch<AppDispatch>()

  // Handlers
  const handleSingleSelect = (
    option: string,
    currentSelection: string | null,
    setter: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    setter(currentSelection === option ? null : option);
  };

  const handleMultiSelect = (
    option: string,
    currentSelection: Set<string>,
    setter: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => {
    const newSelection = new Set(currentSelection);
    if (newSelection.has(option)) {
      newSelection.delete(option);
    } else {
      newSelection.add(option);
    }
    setter(newSelection);
  };

  const handleClear = () => {
    setSelectedAge(null);
    setSelectedGender(null);
    setSelectedIncome(new Set());
    setSelectedIdentity(new Set());
  };

  const handleConfirm = () => {
    const income = Array.from(selectedIncome)
    const identity = Array.from(selectedIdentity)
    const temp = [];
    if (selectedAge) temp.push(selectedAge);
    if (selectedGender) temp.push(selectedGender);
    temp.push(...income, ...identity);
    dispatcher(setIdentities(temp))
    closeDrawer();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <FilterSection
          title="年齡"
          options={ageOptions}
          selected={selectedAge}
          onSelect={(option) => handleSingleSelect(option, selectedAge, setSelectedAge)}
          isSingleSelect
        />
        <FilterSection
          title="性別"
          options={genderOptions}
          selected={selectedGender}
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
      <FilterFooter onClear={handleClear} onConfirm={handleConfirm} />
    </SafeAreaView>
  );
}