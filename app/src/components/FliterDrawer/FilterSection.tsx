import React from 'react';
import { View, Text } from 'react-native';

import styles from './styles';
import OptionButton from './OptionButton';

interface FilterSectionProps {
  title: string;
  options: string[];
  selected: string | null | Set<string>;
  onSelect: (option: string) => void;
  isSingleSelect?: boolean;
  isRow?: boolean;
}

export default function FilterSection({
  title,
  options,
  selected,
  onSelect,
  isSingleSelect = false,
  isRow = false,
}: FilterSectionProps) {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.optionsContainer, isRow && styles.optionsRowContainer]}>
        {options.map((option) => (
          <OptionButton
            key={option}
            option={option}
            isSelected={
              isSingleSelect
                ? selected === option
                : (selected as Set<string>).has(option)
            }
            onPress={() => onSelect(option)}
            isRow={isRow}
          />
        ))}
      </View>
    </View>
  );
}