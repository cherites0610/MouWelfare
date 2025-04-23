import { loginApi, LoginResponse } from '@/src/api/userApi';
import { COLORS } from '@/src/utils/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView, // 使用 ScrollView 防止內容超出螢幕
  Dimensions,   // 用於獲取螢幕寬度
  Platform,     // 可能需要針對不同平台微調
  Alert         // 臨時用於按鈕點擊提示
} from 'react-native';

import { login } from '@/src/store/slices/userSlice';
import { setAuthToken, updateConfig, writeConfig } from '@/src/store/slices/configSlice';
import { AppDispatch } from '@/src/store';
// 獲取螢幕寬度，可用於響應式設計
const { width } = Dimensions.get('window');

export default function Login() {
  const [passwordVisible, setPasswordVisible] = useState(false); // 狀態：控制密碼是否可見
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const dispatch = useDispatch<AppDispatch>();

  const handleLogin = async () => {
    setIsLoading(true); // <--- 開始載入

    const result = await loginApi({ account: account, password: password });
    
    if (result.status_code == 200) {
      router.replace('/home');
      const loginResponse = result.data as LoginResponse;
      dispatch(login(loginResponse.user)); // 假設 login action 存在於 userSlice
      dispatch(setAuthToken(loginResponse.token));
    } else if (result.status_code == 401) {
      Alert.alert("該賬號還未驗證", "請先驗證郵箱")
      router.push(`/auth/verify/${result.data}`)
    } else {
      Alert.alert("登入失敗", result.message);
    }

    setIsLoading(false)
  }

  const handleVisitorLogin = () => {
    router.replace("/home")
  };

  const handleForgotPassword = () => {
    router.navigate("/auth/forgetPassword")
  };

  const handleCreateAccount = () => {
    router.navigate("/auth/register")
  };


  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      scrollEnabled={false}>
      {/* --- Logo 圖片 --- */}
      <Image
        source={require('@/assets/images/login.jpg')} // 確認路徑正確
        style={styles.logo}
        resizeMode="cover" // 或 'contain'，根據圖片調整
      />

      {/* --- 主要內容區域 --- */}
      <View style={styles.contentArea}>
        <View>

        </View>
        {/* --- 標題 --- */}
        <Text style={styles.title}>Login</Text>

        {/* --- 帳號輸入框 --- */}
        <View style={styles.inputContainer}>
          <Ionicons name="home" size={20} color="#888" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="帳號"
            placeholderTextColor="#aaa"
            keyboardType="email-address" // 或 default
            autoCapitalize="none"
            value={account}
            onChangeText={setAccount}
          />
        </View>

        {/* --- 密碼輸入框 --- */}
        <View style={styles.inputContainer}>
          <Ionicons name="home" size={22} color="#888" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="密碼"
            placeholderTextColor="#aaa"
            secureTextEntry={!passwordVisible} // 根據狀態決定是否隱藏密碼
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
            <Ionicons
              name={passwordVisible ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        {/* --- 忘記密碼連結 --- */}
        <TouchableOpacity style={styles.forgotPasswordContainer} onPress={handleForgotPassword}>
          <Text style={styles.forgotPasswordText}>忘記密碼？</Text>
        </TouchableOpacity>

        {/* --- 登入按鈕 --- */}
        <TouchableOpacity disabled={isLoading} style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>登入</Text>
        </TouchableOpacity>

        {/* --- 訪客登入連結 --- */}
        <TouchableOpacity onPress={handleVisitorLogin}>
          <Text style={styles.visitorLoginText}>訪客登入</Text>
        </TouchableOpacity>


        <TouchableOpacity onPress={handleCreateAccount}>
          <Text style={styles.createAccountText}>創建帳號</Text>
        </TouchableOpacity>


      </View>
    </ScrollView>
  );
}

// --- 樣式表 ---
const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#fff', // 背景設為白色
  },
  container: {
    flexGrow: 1, // 允許內容增長
    alignItems: 'center', // 主軸居中（垂直方向，因為 flexGrow: 1）
    paddingBottom: 30, // 底部留一些空間
  },
  logo: {
    width: '100%',
    height: width * 0.5, // 圖片高度設為寬度的一半，可自行調整比例
    // 如果圖片本身比例不對，可能需要調整 resizeMode 或 height
    marginBottom: 20,
  },
  contentArea: {
    width: '85%', // 主要內容區域寬度
    alignItems: 'center', // 內部元件水平居中
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30, // 標題下方間距
    marginTop: 10, // 標題上方間距
  },
  inputContainer: {
    flexDirection: 'row', // 圖示和輸入框水平排列
    alignItems: 'center', // 垂直居中對齊
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd', // 邊框顏色淺一點
    borderRadius: 25, // 圓角
    marginBottom: 15, // 輸入框間距
    paddingHorizontal: 15, // 左右內邊距
    backgroundColor: '#fff', // 背景白色
  },
  inputIcon: {
    marginRight: 10, // 圖示右邊距
  },
  input: {
    flex: 1, // 佔據剩餘空間
    height: '100%', // 高度撐滿容器
    fontSize: 16,
    color: '#333',
  },
  forgotPasswordContainer: {
    width: '100%',
    alignItems: 'flex-end', // 文字靠右
    marginBottom: 25, // 與下方按鈕的間距
  },
  forgotPasswordText: {
    color: '#666', // 文字顏色
    fontSize: 14,
  },
  loginButton: {
    width: '100%',
    backgroundColor: COLORS.background, // 主要按鈕的綠色 (可調整為圖片中的準確顏色)
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center', // 文字居中
    marginBottom: 20, // 按鈕下方間距
  },
  loginButtonText: {
    color: '#fff', // 文字白色
    fontSize: 16,
    fontWeight: 'bold',
  },
  visitorLoginText: {
    color: '#666', // 文字顏色
    fontSize: 14,
    marginTop: 5, // 與上方按鈕的微小間距
  },
  otherLoginContainer: {
    alignItems: 'center', // 內容居中
    width: '100%',
    marginBottom: 10, // 與下方 "or" 的間距
    marginTop: 100
  },
  otherLoginText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 15, // 與下方按鈕行的間距
  },
  socialButtonContainer: {
    flexDirection: 'row', // 按鈕水平排列
    justifyContent: 'center', // 按鈕之間居中
    marginBottom: 15, // 與下方 "or" 的間距
  },
  socialButton: {
    width: 44,
    height: 44,
    borderRadius: 22, // 圓形按鈕
    backgroundColor: COLORS.background, // 與主按鈕相同的綠色
    justifyContent: 'center', // 圖示垂直居中
    alignItems: 'center', // 圖示水平居中
    marginHorizontal: 15, // 按鈕左右間距
  },
  orText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 0, // 與下方創建帳號連結的間距
  },
  createAccountText: {
    marginTop: 5,
    color: '#666',
    fontSize: 14,
  },
});