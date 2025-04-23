import { View, Text, TouchableOpacity, Switch, StyleSheet, ActionSheetIOS, Linking, Alert } from 'react-native'
import React, { useState } from 'react'
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/src/utils/colors';
import { AppDispatch, RootState } from '@/src/store';
import { useDispatch, useSelector } from 'react-redux'
import { updateConfig, writeConfig } from '@/src/store/slices/configSlice';
import { getLineLoginUrl } from '@/src/api/userApi';

export default function Setting() {
  const iconSize = 25;
  // 直接從 Redux 獲取狀態
  const { autoFilterUserData, elderlyMode, authToken } = useSelector((state: RootState) => state.config);
  const { user } = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch<AppDispatch>();

  // Switch 的事件處理函式
  const handleOldModeChange = (newValue: boolean) => {
    dispatch(updateConfig({ elderlyMode: newValue }));
    dispatch(writeConfig()); // 傳遞 payload
  };

  const handleAutoSelectChange = (newValue: boolean) => {
    dispatch(updateConfig({ autoFilterUserData: newValue }));
    dispatch(writeConfig());
  };

  const onPress = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['取消', '連接Line', 'Google登錄'],
        cancelButtonIndex: 0,
        userInterfaceStyle: 'dark',
      },
      buttonIndex => {
        if (buttonIndex === 0) {
          // cancel action
        } else if (buttonIndex === 1) {
          if (user?.line_id) {
            Alert.alert("已經連接過Line帳戶了", "請先解除連接");
            return;
          }

          getLineLoginUrl(authToken)
            .then((url) => {
              Linking.openURL(url);
            })
        } else if (buttonIndex === 2) {
          // GoogleSignIn()
          Alert.alert("功能未開發");
        }
      },
    );
  }


  return (
    <View style={styles.container}>
      {/* 連結帳戶 */}
      <TouchableOpacity style={styles.row} onPress={onPress}>
        <Ionicons name="link" size={iconSize} color="#444" style={styles.icon} />
        <Text style={styles.text}>連結帳戶</Text>
      </TouchableOpacity>

      {/* 老人模式 */}
      <View style={styles.row}>
        <Ionicons name="glasses" size={iconSize} color="#444" style={styles.icon} />
        <Text style={styles.text}>老人模式</Text>
        <View style={{ flex: 1 }} />
        <Switch
          value={elderlyMode} // <--- 直接使用 Redux state
          onValueChange={handleOldModeChange} // <--- 使用處理函式
          trackColor={{ false: '#ccc', true: COLORS.background }}
          thumbColor={elderlyMode ? '#fff' : '#888'} // <--- 使用 Redux state
        />
      </View>


      {/* 自動篩選用戶資料 */}
      <View style={styles.row}>
        <Ionicons name="card" size={iconSize} color="#444" style={styles.icon} />
        <Text style={styles.text}>自動篩選用戶資料</Text>
        <View style={{ flex: 1 }} />
        <Switch
          value={autoFilterUserData} // <--- 直接使用 Redux state
          onValueChange={handleAutoSelectChange} // <--- 使用處理函式
          trackColor={{ false: '#ccc', true: COLORS.background }}
          thumbColor={autoFilterUserData ? '#fff' : '#888'} // <--- 使用 Redux state
        />
      </View >
    </View >
  );
}
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    flex: 1
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  icon: {
    marginRight: 12,
  },
  text: {
    fontSize: 20,
    color: '#222',
  },
});