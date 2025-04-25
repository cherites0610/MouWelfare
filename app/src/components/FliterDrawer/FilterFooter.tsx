import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import styles from './styles';


interface FilterFooterProps {
  onClear: () => void;
  onConfirm: () => void;
}

export default function FilterFooter({ onClear, onConfirm }: FilterFooterProps) {
  return (
    <View style={styles.footer}>
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
  );
}