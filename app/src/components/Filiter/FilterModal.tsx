import React, { useCallback, useMemo } from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, ListRenderItem } from 'react-native';
import styles from './styles';

interface FilterModalProps {
  visible: boolean;
  title: string;
  items: string[];
  selectedItems: string[];
  setSelectedItems: React.Dispatch<React.SetStateAction<string[]>>;
  onChange?: (items: string[]) => void;
  onClose: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  title,
  items,
  selectedItems,
  setSelectedItems,
  onChange,
  onClose,
}) => {
  // Optimize toggleSelection
  const toggleSelection = useCallback(
    (item: string) => {
      setSelectedItems((prev) => {
        const selectedSet = new Set(prev);
        const isSelected = selectedSet.has(item);
        if (isSelected) {
          selectedSet.delete(item);
        } else {
          selectedSet.add(item);
        }
        const updatedItems = Array.from(selectedSet);
        setTimeout(() => onChange?.(updatedItems), 0);
        return updatedItems;
      });
    },
    [setSelectedItems, onChange]
  );

  // Optimize renderDropdownItem
  const renderDropdownItem = useMemo<ListRenderItem<string>>(
    () => ({ item }) => {
      const isSelected = selectedItems.includes(item);
      return (
        <TouchableOpacity
          style={styles.dropdownItem}
          onPress={() => toggleSelection(item)}
        >
          <Text style={styles.dropdownText}>
            {item} {isSelected ? '✓' : ''}
          </Text>
        </TouchableOpacity>
      );
    },
    [selectedItems, toggleSelection]
  );

  // FlatList getItemLayout
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 50,
      offset: 50 * index,
      index,
    }),
    []
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <FlatList
            data={items}
            keyExtractor={(item) => item}
            renderItem={renderDropdownItem}
            getItemLayout={getItemLayout}
            extraData={selectedItems}
            initialNumToRender={10} // Optimize for large lists
          />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>關閉</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default FilterModal;