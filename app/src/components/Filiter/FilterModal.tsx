import React, { useCallback, useMemo } from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, ListRenderItem } from 'react-native';
import styles from './styles';

interface FilterModalProps {
  visible: boolean;
  title: string;
  items: string[];
  selectedItems: string[] | string;
  setSelectedItems: Function
  onClose: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  title,
  items,
  selectedItems,
  setSelectedItems,
  onClose,
}) => {
  const toggleSelection = (item: string) => {
    if (Array.isArray(selectedItems)) {
      const selectedSet = new Set(selectedItems);
      const isSelected = selectedSet.has(item);
      if (isSelected) {
        selectedSet.delete(item);
      } else {
        selectedSet.add(item);
      }
      const updatedItems = Array.from(selectedSet);
      setSelectedItems(updatedItems)
    } else {
      const updatedItem = selectedItems === item ? '' : item;
      setSelectedItems(updatedItem);
    }
  }

  // Optimize renderDropdownItem
  const renderDropdownItem = useCallback<ListRenderItem<string>>(
    ({ item }) => {
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
            keyExtractor={(item, index) => `${item}-${index}`} // 確保 key 唯一
            renderItem={renderDropdownItem}
            getItemLayout={getItemLayout}
            extraData={selectedItems}
            initialNumToRender={10} // Optimize for large lists
            maxToRenderPerBatch={5} // 限制每批渲染數量
            windowSize={5} // 優化視窗大小
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