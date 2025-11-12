import React, { useCallback, useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ListRenderItem,
} from "react-native";
import styles from "./styles";

interface FilterModalProps {
  visible: boolean;
  title: string;
  items: string[];
  selectedItems: string[] | string;
  setSelectedItems: (items: string[] | string) => void;
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
  const [tempSelectedItems, setTempSelectedItems] = useState<string[] | string>(
    selectedItems
  );

  useEffect(() => {
    if (visible) {
      setTempSelectedItems(selectedItems);
    }
  }, [visible, selectedItems]);

  const toggleSelection = useCallback(
    (item: string) => {
      if (Array.isArray(tempSelectedItems)) {
        const selectedSet = new Set(tempSelectedItems);
        const isSelected = selectedSet.has(item);
        if (isSelected) {
          selectedSet.delete(item);
        } else {
          selectedSet.add(item);
        }
        const updatedItems = Array.from(selectedSet);
        setTempSelectedItems(updatedItems);
      } else {
        const updatedItem = tempSelectedItems === item ? "" : item;
        setTempSelectedItems(updatedItem);
      }
    },
    [tempSelectedItems]
  );

  const renderDropdownItem = useCallback<ListRenderItem<string>>(
    ({ item }) => {
      const isSelected = Array.isArray(tempSelectedItems)
        ? tempSelectedItems.includes(item)
        : tempSelectedItems === item;

      return (
        <TouchableOpacity
          style={styles.dropdownItem}
          onPress={() => toggleSelection(item)}
        >
          <Text style={styles.dropdownText}>
            {item} {isSelected ? "✓" : ""}
          </Text>
        </TouchableOpacity>
      );
    },
    [tempSelectedItems, toggleSelection]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 50,
      offset: 50 * index,
      index,
    }),
    []
  );

  const handleClose = () => {
    setSelectedItems(tempSelectedItems);
    onClose();
  };

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
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={renderDropdownItem}
            getItemLayout={getItemLayout}
            extraData={tempSelectedItems}
            initialNumToRender={21}
            maxToRenderPerBatch={5}
            windowSize={5}
          />
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>確認</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default FilterModal;
