import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RootState } from '@/src/store';
import { useSelector } from 'react-redux';
import { deleteFavoriteAPI, fetchFavoriteAPI } from '@/src/api/welfareApi';
import { Welfare } from '@/src/type/welfareType';

export default function Favourite() {
  const { authToken } = useSelector((state: RootState) => state.config);
  const { status } = useSelector((state: RootState) => state.user);
  const route = useRouter();
  const [favourities, setFavourities] = useState<Welfare[]>([]);

  const deleteFavourite = async (welfareID: number) => {
    try {
      const result = await deleteFavoriteAPI(authToken, welfareID);
      fetchFavourite();
      Alert.alert(result.message);
    } catch (err: any) {
      Alert.alert(err.message);
    }
  };

  const fetchFavourite = async () => {
    try {
      const result = await fetchFavoriteAPI(authToken);
      setFavourities(result.data);
    } catch (err: any) {
      Alert.alert(err.message);
    }
  };

  useEffect(() => {
    if (status != 'succeeded') {
      route.replace('/auth/login')
    }
    fetchFavourite();
  }, []);

  const renderItem = ({ item }: { item: Welfare }) => (
    <View style={styles.favouriteContainer}>
      {/* 點擊跳轉的項目區域 */}
      <TouchableOpacity
        style={styles.itemContainer}
        activeOpacity={0.7}
        onPress={() => route.navigate(('home/' + item.id) as any)}
      >
        {/* <Ionicons name="chatbox-ellipses-outline" size={40} color="#4B5563" /> */}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
            {item.title}
          </Text>
        </View>
      </TouchableOpacity>

      {/* 刪除按鈕 */}
      <TouchableOpacity
        style={styles.deleteButton}
        activeOpacity={0.7}
        onPress={() => deleteFavourite(item.id)}
      >
        <Ionicons name="heart" size={24} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={favourities}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No favorites yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16, // 增加水平內邊距
    backgroundColor: '#F3F4F6', // 淺灰色背景，增加層次感
  },
  listContent: {
    paddingVertical: 16, // 列表上下內邊距
  },
  favouriteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16, // 項目間距
    backgroundColor: '#FFFFFF',
    borderRadius: 12, // 圓角
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3, // Android 陰影
  },
  itemContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  titleContainer: {
    flex: 1,
    marginLeft: 12, // 圖標與標題間距
  },
  title: {
    fontSize: 16, // 稍小的字體，更精緻
    fontWeight: '600', // 中等粗細
    color: '#1F2937', // 深灰色文字
    lineHeight: 22, // 行高，改善可讀性
  },
  deleteButton: {
    padding: 12, // 增大點擊區域
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280', // 淺灰色文字
  },
});