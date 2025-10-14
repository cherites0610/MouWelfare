import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import styles from './styles';
import OptionButton from './OptionButton'; 


interface FilterFooterProps {
  onClear: () => void;
  onConfirm: () => void;
  isAutoFilterSelected: boolean; // 新增：接收「自動套用」是否被選中
  onToggleAutoFilter: () => void; // 新增：處理點擊「自動套用」的函式
}

export default function FilterFooter({ onClear, onConfirm,isAutoFilterSelected,onToggleAutoFilter, }: FilterFooterProps) {
  return (
    <View style={styles.footer}>
      <OptionButton
        option="自動套用個人資料"
        isSelected={isAutoFilterSelected}
        onPress={onToggleAutoFilter}
      />
      <View style={styles.actionButtonsContainer}>
      <TouchableOpacity
        style={[styles.actionButton, styles.clearButton]}
        onPress={onClear}
        activeOpacity={0.7}
      >
        <Text style={styles.clearButtonText}>清除</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.confirmButton]}
        onPress={onConfirm}
        activeOpacity={0.8}
      >
        <Text style={styles.confirmButtonText}>確認</Text>
      </TouchableOpacity>
    </View>
    </View>
  );
}