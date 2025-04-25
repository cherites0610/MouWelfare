import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import styles from './styles';

interface FilterButtonProps {
  label: string;
  selectedCount?: number;
  onPress: () => void;
  isIconButton?: boolean;
}

const FilterButton: React.FC<FilterButtonProps> = ({
  label,
  selectedCount = 0,
  onPress,
  isIconButton = false,
}) => (
  <TouchableOpacity
    style={[styles.filterButton, isIconButton && styles.filterIconButton]}
    onPress={onPress}
  >
    <Text style={styles.buttonText}>
      {label}
      {selectedCount > 0 && !isIconButton ? ` (${selectedCount})` : ''}
    </Text>
    {!isIconButton && <Text style={styles.arrow}>▼</Text>}
  </TouchableOpacity>
);

export default FilterButton;