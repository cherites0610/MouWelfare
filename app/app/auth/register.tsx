import { registerApi } from '@/src/api/userApi';
import { COLORS } from '@/src/utils/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
  Alert,         // 臨時用於按鈕點擊提示
  Keyboard
} from 'react-native';

// 獲取螢幕寬度，可用於響應式設計
const { width } = Dimensions.get('window');

export default function Register() {
  const [passwordVisible, setPasswordVisible] = useState(false); // 狀態：控制密碼是否可見
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const route = useRouter();

  // 臨時的按鈕處理函數
  const handleLogin = async () => {
    route.navigate("/auth/login")
  };

  const handleRegister = async () => {
    if (!account || !password || !email) {
      Alert.alert("錯誤", "請填寫所有欄位");
      return;
    }

    Keyboard.dismiss();

    try {
      console.log('Calling register function...'); // Log: 準備呼叫 API
      const result = await registerApi({
        account: account, // 將 username 傳遞給 API 的 account 欄位
        password: password,
        email: email
      });

      if (result) { // 你需要根據實際的 result 結構來判斷是否成功
        Alert.alert("註冊成功", `帳號: ${account}\n郵箱: ${email}`);
        // 可以在成功後導航
        route.navigate("/auth/verify");
      } else {
        // 從 result 中獲取錯誤訊息，如果有的話
        Alert.alert("註冊失敗");
      }

    } catch (error) {
      console.error("Error during registration:", error); // Log: 捕捉到的錯誤
      // 顯示一個通用的錯誤訊息
      Alert.alert("註冊出錯", "發生預期外的錯誤，請檢查網路或稍後再試。");
    }
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
        <View style={{
          width: '85%', // 主要內容區域寬度
          alignItems: 'center', // 內部元件水平居中
        }}>
          {/* --- 標題 --- */}
          <Text style={styles.title}>Register</Text>

          {/* --- 帳號輸入框 --- */}
          <View style={styles.inputContainer}>
            <Ionicons name="home" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="帳號"
              placeholderTextColor="#aaa"
              keyboardType="default" // 或 default
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

          {/* --- 郵箱輸入框 --- */}
          <View style={styles.inputContainer}>
            <Ionicons name="home" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="郵箱"
              placeholderTextColor="#aaa"
              keyboardType="email-address" // 或 default
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* --- 登入按鈕 --- */}
          <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <Text style={styles.registerButtonText}>註冊</Text>
          </TouchableOpacity>
        </View>

        <View style={{ alignSelf: 'center', marginBottom: 10, justifyContent: 'center' }}>
          <Text style={styles.orText}>or</Text>
          {/* --- 創建帳號連結 --- */}
          <TouchableOpacity onPress={handleLogin}>
            <Text style={styles.loginLinkText}>登入</Text>
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
}

// --- 樣式表 ---
const styles = StyleSheet.create({
  // ---- ScrollView & Container Styles ----
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 30,
  },

  // ---- Logo Style ----
  logo: {
    width: '100%',
    height: width * 0.5,
    marginBottom: 20,
  },

  // ---- Content Area Styles ----
  contentArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // 這個 View 控制輸入框和註冊按鈕的寬度
  formContainer: {
    width: '85%',
    alignItems: 'center',
    marginTop: 10,
  },

  // ---- Title Style ----
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
  },

  // ---- Input Styles ----
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
  },

  // ---- Button Styles ----
  registerButton: {
    width: '100%',
    backgroundColor: COLORS.background,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonText: { // 改名
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // ---- Bottom Link Area Styles ----
  bottomLinkContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  orText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  loginLinkText: { // 改名
    color: COLORS.primary,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});