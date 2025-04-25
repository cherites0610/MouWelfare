import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import styles from './styles';

interface OptionButtonProps {
  option: string;
  isSelected: boolean;
  onPress: () => void;
  isRow?: boolean;
}

export default function OptionButton({
  option,
  isSelected,
  onPress,
  isRow = false,
}: OptionButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.optionButton,
        isSelected && styles.selectedOptionButton,
        isRow && styles.optionButtonRow,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>
        {option}
      </Text>
    </TouchableOpacity>
  );
}