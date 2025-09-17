import { performAction, sendVerifyCodeApi, updatePasswordAPI, verifyCodeApi } from '@/src/api/userApi';
import { COLORS } from '@/src/utils/colors';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView, // 使用 ScrollView 防止內容超出螢幕
  Dimensions,   // 用於獲取螢幕寬度
  Alert,         // 臨時用於按鈕點擊提示
} from 'react-native';

// 獲取螢幕寬度，可用於響應式設計
const { width } = Dimensions.get('window');

export default function Verify() {
  const router = useRouter();
  const [verificationCode, setVerificationCode] = useState('');
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isVerify, setIsVerify] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false); // 狀態：控制密碼是否可見
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');

  const handleVerify = async () => {
    try {
      const result = await verifyCodeApi(email, verificationCode, 'changePassword')
      setIsVerify(true)
      setToken(result.data)
      Alert.alert(result.message)
    } catch (err: any) {
      Alert.alert(err.message)
    }
  };

  const handlerUpdatePassword = async () => {
    try {
      await performAction(token, 'changePassword', password)
      router.replace("/auth/login")
      Alert.alert("修改成功")
    } catch (err: any) {
      Alert.alert(err.message)
    }
  }

  useEffect(() => {
    let timer: number;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0 && isSending) {
      setIsSending(false);
    }
    return () => clearInterval(timer);
  }, [countdown, isSending]);

  const handleSendVerificationCode = async () => {
    if (!email) {
      Alert.alert('錯誤', '請輸入郵箱');
      return;
    }

    if (isSending) return;

    setIsSending(true);
    setCountdown(60);

    try {
      const result = await sendVerifyCodeApi(email, 'changePassword')
      Alert.alert('成功', '驗證碼已發送至您的郵箱');
    } catch (err: any) {
      Alert.alert('錯誤', err.message || '無法發送驗證碼');
      setIsSending(false);
      setCountdown(0);
    }
  };


  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      scrollEnabled={false}>
      {/* --- Logo 圖片 --- */}
      <Image
        source={require('@/assets/images/login.jpeg')} // 確認路徑正確
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
          <Text style={styles.title}>忘記密碼</Text>

          {/* --- 郵箱輸入框 --- */}
          <View style={styles.inputContainer}>
            <Ionicons name="home" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              editable={!isVerify}
              style={styles.input}
              placeholder="郵箱"
              placeholderTextColor="#aaa"
              keyboardType="email-address" // 或 default
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Verification Code Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              editable={!isVerify}
              style={styles.input}
              placeholder="驗證碼"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
              value={verificationCode}
              onChangeText={setVerificationCode}
            />
            <TouchableOpacity
              onPress={handleSendVerificationCode}
              disabled={isSending || isVerify}
              style={styles.sendButton}
            >
              <Text style={styles.sendButtonText}>
                {!isVerify ? (isSending ? `重新發送 (${countdown}s)` : '發送驗證碼') : ("已驗證")}
              </Text>
            </TouchableOpacity>
          </View>

          {isVerify ? (
            <>
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
            </>
          ) : (<></>)}


          {!isVerify ? (
            <TouchableOpacity style={styles.verifyButton} onPress={handleVerify}>
              <Text style={styles.verifyButtonText}>驗證</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.verifyButton} onPress={handlerUpdatePassword}>
              <Text style={styles.verifyButtonText}>更改</Text>
            </TouchableOpacity>
          )}
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
  sendButton: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
  },
  sendButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
    padding: 12,
    marginRight: 8,
  },

  // ---- Button Styles ----
  verifyButton: {
    width: '100%',
    backgroundColor: COLORS.background,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  verifyButtonText: { // 改名
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});