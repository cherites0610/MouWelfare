import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView, // 使用 ScrollView 避免內容超出螢幕
  SafeAreaView, // 確保內容在安全區域內
} from 'react-native';
import { COLORS } from '../utils/colors';
import { rgbaColor } from 'react-native-reanimated/lib/typescript/Colors';

// 定義選項內容
const ageOptions = ['20歲以下', '20歲--65歲', '65歲以上'];
const genderOptions = ['男性', '女性'];
const incomeOptions = ['中低收入戶', '低收入戶']; // 假設可多選
const identityOptions = ['榮民', '身心障礙者', '原住民', '外籍配偶家庭']; // 假設可多選

export default function FilterDrawer({closeDrawer}:{closeDrawer:Function}) {
  // --- State Management ---
  // 單選用 string | null
  const [selectedAge, setSelectedAge] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  // 多選用 Set<string>
  const [selectedIncome, setSelectedIncome] = useState<Set<string>>(new Set());
  const [selectedIdentity, setSelectedIdentity] = useState<Set<string>>(new Set());

  // --- Handlers ---
  const handleSingleSelect = (
    option: string,
    currentSelection: string | null,
    setter: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    // 如果點擊已選中的，取消選擇；否則設為新選項
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

  const handleConfirm = () => {
    // 在這裡處理確認按鈕的邏輯，例如：
    console.log('篩選條件:', {
      age: selectedAge,
      gender: selectedGender,
      income: Array.from(selectedIncome),
      identity: Array.from(selectedIdentity),
    });
    // 可能需要關閉 Drawer 或將篩選條件傳遞出去
    closeDrawer()
  };

  // --- Render Helper ---
  // 建立一個可重複使用的選項渲染元件 (可選，但讓程式碼更清晰)
  const renderOption = (
    option: string,
    isSelected: boolean,
    onPress: () => void,
    isRow: boolean = false // 判斷是否為橫向排列 (for 性別)
  ) => (
    <TouchableOpacity
      key={option}
      style={[
        styles.optionButton,
        isSelected && styles.selectedOptionButton,
        isRow && styles.optionButtonRow, // 橫向排列時增加右邊距
      ]}
      onPress={onPress}
      activeOpacity={0.7}>
      <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>
        {option}
      </Text>
    </TouchableOpacity>
  );

  return (
    // 使用 SafeAreaView 和 ScrollView
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.mainTitle}>篩選條件</Text>

        {/* --- 年齡區塊 (單選) --- */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>年齡</Text>
          <View style={styles.optionsContainer}>
            {ageOptions.map((option) =>
              renderOption(
                option,
                selectedAge === option,
                () => handleSingleSelect(option, selectedAge, setSelectedAge)
              )
            )}
          </View>
        </View>

        {/* --- 性別區塊 (單選) --- */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>性別</Text>
          {/* 橫向排列 */}
          <View style={[styles.optionsContainer, styles.optionsRowContainer]}>
            {genderOptions.map((option) =>
              renderOption(
                option,
                selectedGender === option,
                () => handleSingleSelect(option, selectedGender, setSelectedGender),
                true // 標記為橫向排列
              )
            )}
          </View>
        </View>

        {/* --- 收入區塊 (多選) --- */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>收入</Text>
          <View style={styles.optionsContainer}>
            {incomeOptions.map((option) =>
              renderOption(
                option,
                selectedIncome.has(option),
                () => handleMultiSelect(option, selectedIncome, setSelectedIncome)
              )
            )}
          </View>
        </View>

        {/* --- 身分別區塊 (多選) --- */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>身分別</Text>
          <View style={styles.optionsContainer}>
            {identityOptions.map((option) =>
              renderOption(
                option,
                selectedIdentity.has(option),
                () => handleMultiSelect(option, selectedIdentity, setSelectedIdentity)
              )
            )}
          </View>
        </View>
      </ScrollView>

      {/* --- 確認按鈕 (固定在底部) --- */}
      <View style={styles.footer}>
         {/* 這個清除按鈕是從圖片推測的，如果不需要可以移除 */}
         <TouchableOpacity
            style={[styles.actionButton, styles.clearButton]}
            onPress={() => {
                setSelectedAge(null);
                setSelectedGender(null);
                setSelectedIncome(new Set());
                setSelectedIdentity(new Set());
            }}
            activeOpacity={0.7}>
            <Text style={styles.clearButtonText}>清除</Text>
          </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.confirmButton]}
          onPress={handleConfirm}
          activeOpacity={0.8}>
          <Text style={styles.confirmButtonText}>確認</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  scrollContainer: {
    paddingHorizontal: 20, // 左右內邊距
    paddingTop: 20,       // 頂部內邊距
    paddingBottom: 100,   // 底部內邊距 (為按鈕區域留出空間)
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 25,
    color: '#333',
  },
  sectionContainer: {
    marginBottom: 20, // 每個區塊的下邊距
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600', // slightly bold
    marginBottom: 12,
    color: '#444',
  },
  optionsContainer: {
    flexDirection: 'column', // 預設垂直排列
  },
  optionsRowContainer: {
    flexDirection: 'row', // 性別選項橫向排列
    flexWrap: 'wrap', // 如果選項太多可以換行
  },
  optionButton: {
    backgroundColor: '#f0f0f0', // 未選中背景色
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15, // 圓角
    borderWidth: 1,
    borderColor: '#e0e0e0', // 未選中邊框色
    marginBottom: 10, // 選項間距
    alignItems: 'center', // 文字置中
  },
  optionButtonRow: {
    marginRight: 10, // 橫向排列時的右邊距
    // 可以考慮設定固定寬度或最小寬度，讓橫向排列更好看
    // minWidth: 80,
  },
  selectedOptionButton: {
    backgroundColor: COLORS.background, // 選中背景色 (淡藍色)
    opacity: 0.7,
    borderColor: 'rgba(62,142,67,1)',    // 選中邊框色 (藍色)
  },
  optionText: {
    fontSize: 14,
    color: '#555',
  },
  selectedOptionText: {
    color: "black", // 選中文字顏色 (藍色)
    fontWeight: '500',
  },
  footer: {
    position: 'absolute', // 固定在底部
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row', // 按鈕橫向排列
    backgroundColor: '#fafafa', // 背景色
    paddingVertical: 15,    // 上下內邊距
    paddingHorizontal: 20, // 左右內邊距
    borderTopWidth: 1,     // 頂部邊框線
    borderColor: '#eee',
    // alignItems: 'center', // 如果只有一個按鈕可以取消註解這行
    justifyContent: 'space-between', // 讓按鈕分開
  },
  actionButton: {
    flex: 1, // 讓按鈕平分寬度
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5, // 按鈕間的水平距離
  },
  confirmButton: {
    backgroundColor: COLORS.background, // 確認按鈕背景色 (圖片中的綠色)
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
    clearButton: {
    backgroundColor: '#f5f5f5', // 清除按鈕背景色
    borderWidth: 1,
    borderColor: '#ccc',
  },
  clearButtonText: {
    color: '#777', // 清除按鈕文字顏色
    fontSize: 16,
    fontWeight: 'bold',
  },
});