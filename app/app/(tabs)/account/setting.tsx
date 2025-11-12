import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActionSheetIOS,
  Linking,
  Alert,
} from "react-native";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/src/utils/colors";
import { AppDispatch, RootState } from "@/src/store";
import { useDispatch, useSelector } from "react-redux";
import {
  setAuthToken,
  updateConfig,
  writeConfig,
} from "@/src/store/slices/configSlice";
import { getLineLoginUrl } from "@/src/api/userApi";
import { useRouter } from "expo-router";
import { logout } from "@/src/store/slices/userSlice";

export default function Setting() {
  const iconSize = 25;
  // 直接從 Redux 獲取狀態
  const { autoFilterUserData, elderlyMode, authToken } = useSelector(
    (state: RootState) => state.config
  );
  const { user } = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch<AppDispatch>();

  const route = useRouter();

  // Switch 的事件處理函式
  const handleOldModeChange = (newValue: boolean) => {
    dispatch(updateConfig({ elderlyMode: newValue }));
    dispatch(writeConfig()); // 傳遞 payload
  };

  const handleAutoSelectChange = (newValue: boolean) => {
    dispatch(updateConfig({ autoFilterUserData: newValue }));
    dispatch(writeConfig());
  };

  const linkLine = () => {
    if (user?.line_id) {
      Alert.alert("已經連接過Line帳戶了", "請先解除連接");
      return;
    }

    getLineLoginUrl(authToken).then((url) => {
      Linking.openURL(url);
    });
  };

  return (
    <View style={styles.container}>
      {/* 連結帳戶 */}
      <TouchableOpacity style={styles.row} onPress={linkLine}>
        <Ionicons
          name="link"
          size={iconSize}
          color="#444"
          style={styles.icon}
        />
        <Text style={styles.text}>連結Line帳戶</Text>
      </TouchableOpacity>

      {/* 自動篩選用戶資料 */}
      <View style={styles.row}>
        <Ionicons
          name="card"
          size={iconSize}
          color="#444"
          style={styles.icon}
        />
        <Text style={styles.text}>自動篩選用戶資料</Text>
        <View style={{ flex: 1 }} />
        <Switch
          value={autoFilterUserData} // <--- 直接使用 Redux state
          onValueChange={handleAutoSelectChange} // <--- 使用處理函式
          trackColor={{ false: "#ccc", true: COLORS.background }}
          thumbColor={autoFilterUserData ? "#fff" : "#888"} // <--- 使用 Redux state
        />
      </View>

      <TouchableOpacity
        style={[styles.bottomButton]}
        activeOpacity={0.8}
        onPress={() => {
          route.replace("/home");
          dispatch(logout());
          dispatch(setAuthToken(""));
          dispatch(writeConfig());
        }}
      >
        <Text style={styles.bottomButtonText}>登出</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
  },
  icon: {
    marginRight: 12,
  },
  text: {
    fontSize: 20,
    color: "#222",
  },
  bottomButton: {
    position: "absolute",
    bottom: 30,
    width: "90%",
    alignSelf: "center",
    paddingVertical: 14,
    marginHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  bottomButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
