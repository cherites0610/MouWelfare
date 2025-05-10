
import { ageOptions, genderOptions } from '@/src/components/FliterDrawer/constants';
import { AppDispatch, RootState } from '@/src/store';
import { fetchUser } from '@/src/store/slices/userSlice';
import { COLORS } from '@/src/utils/colors';
import { getIdByIdentityText, getTextByIdentity } from '@/src/utils/getTextByNumber';
import { Redirect, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Button, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

export default function Profile() {
  const { user, status, error } = useSelector((state: RootState) => state.user)
  console.log(user);

  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.container}>
        {/* 內容區域 */}
        <View style={styles.content}>
          {/* 頭像 */}
          <Image
            source={{ uri: user?.avatar_url }}
            style={styles.avatar}
          />

          {/* 資料欄位 */}
          <View style={styles.infoBlock}>
            <Text style={styles.label}>
              姓名：<Text style={styles.value}>{user!.name}</Text>
            </Text>
            <Text style={styles.label}>
              帳號：<Text style={styles.value}>{user!.account}</Text>
            </Text>
            <Text style={styles.label}>
              郵箱：<Text style={styles.value}>{user!.email}</Text>
            </Text>
            <Text style={styles.label}>
              生日：<Text style={styles.value}>{user!.birthday}</Text>
            </Text>
            <Text style={styles.label}>
              性別：<Text style={styles.value}>{user!.gender}</Text>
            </Text>
            <Text style={styles.label}>
              地區：<Text style={styles.value}>{user!.location}</Text>
            </Text>
            <Text style={styles.label}>
              身份別：<Text style={styles.value}>{user!.identities?.filter((item) => {
                if ( (ageOptions.some((age) => age===item) || genderOptions.some((gender) => gender == item) )) {
                  return false
                  
                }else {
                  return true
                }
              }).join(',')}</Text>
            </Text>
          </View>
        </View>

        {/* 底部按鈕 */}
        <TouchableOpacity
          style={styles.editButton}
          activeOpacity={0.8}
          onPress={() => router.navigate("/account/edit-profile")}
        >
          <Text style={styles.bottomButtonText}>編輯</Text>
        </TouchableOpacity>
      </View>
    </View>
  )


}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 24,
  },
  infoBlock: {
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#222',
  },
  value: {
    fontWeight: 'normal',
    color: '#333',
  },
  editButton: {
    backgroundColor: COLORS.background,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  bottomButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
