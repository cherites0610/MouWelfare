import { fetchWelfareByIDAPI,addFavoriteAPI,fetchFavoriteAPI,deleteFavoriteAPI } from '@/src/api/welfareApi';
import { RootState } from '@/src/store';
import { Welfare } from '@/src/type/welfareType';
import { COLORS } from '@/src/utils/colors';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams,useRouter,useNavigation  } from 'expo-router';
import React, { useEffect, useState, useLayoutEffect } from 'react';
import { StackNavigationProp, StackActions } from '@react-navigation/stack';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Image,
  Platform,
  ScrollView,
  SafeAreaView,
  Linking,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';

const WelfareInfo = () => {
  const glob = useLocalSearchParams();
  const { welfareId, sourcePage, lightStatus: lightStatusParam,lightReason:lightReasonParam } = useLocalSearchParams();
  const [isFavorited, setIsFavorited] = useState(false);
  const lightStatus = lightStatusParam ? Number(lightStatusParam) : undefined;
  const navigation = useNavigation<StackNavigationProp<any>>(); 
  const [welfare, setWelfare] = useState<Welfare | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useSelector((state: RootState) => state.user)
  const { locations, categories, identities, family, searchQuery } = useSelector((state: RootState) => state.filiter)
  const { familys } = useSelector((state: RootState) => state.family); // 獲取家庭類型數據
  const { authToken } = useSelector((state: RootState) => state.config);
  const router = useRouter();

  const getCircleColor = (status: number | undefined) => {
    switch (status) {
      case 1:
        return COLORS.light_green;
      case 2:
        return COLORS.light_yellow;
      case 3:
        return COLORS.light_red;
      default:
        return COLORS.light_yellow;
    }
  };

  const getCircleText = (light_status: number) => {
    switch (light_status) {
      case 1:
        return '符合領取資格!';
      case 2:
        return '不一定符合領取資格!';
      case 3:
        return '不符合領取資格!';
      default:
        return '不一定符合領取資格!';
    }
  };

  
useEffect(() => {
    const init = async () => {
      if (!welfareId) {
        setError('福利 ID 不存在，無法載入資料。');
        return;
      }
      try {
        const familyId = familys.find((item) => item.name === family)?.id;

        // 使用 Promise.all 並行處理兩個 API 請求，提升速度
        const [welfareResponse, favoritesResponse] = await Promise.all([
          fetchWelfareByIDAPI(String(welfareId), user?.id, familyId),
          fetchFavoriteAPI(authToken) // 獲取所有收藏項目
        ]);

        let finalWelfareData = welfareResponse.data;

        // 檢查當前福利是否在收藏列表中
        const isCurrentlyFavorited = favoritesResponse.data.some(fav => fav.id === finalWelfareData.id);
        setIsFavorited(isCurrentlyFavorited); // 設定初始收藏狀態

        let lightReasonFromRoute: string[] | undefined = undefined;
        if (typeof lightReasonParam === 'string' && lightReasonParam) {
          try {
            lightReasonFromRoute = JSON.parse(lightReasonParam);
          } catch (e) { console.error("從路由參數解析 lightReason 失敗:", e); }
        }
        
        finalWelfareData = {
          ...finalWelfareData,
          lightStatus: lightStatus !== undefined ? lightStatus : finalWelfareData.lightStatus,
          lightReason: lightReasonFromRoute !== undefined ? lightReasonFromRoute : finalWelfareData.lightReason,
        };
        
        setWelfare(finalWelfareData);
      } catch (error) {
        console.error('載入福利資料時發生錯誤:', error);
        setError('無法加載數據，請稍後重試');
      }
    };
    init();
  }, [welfareId, user?.id, authToken]); // <-- 將 authToken 加入依賴

  useLayoutEffect(() => {
    const handleCustomBack = () => {
      if (sourcePage === 'chat') {
        router.navigate('/mou');
      } else {
        if (navigation.canGoBack()) { navigation.goBack(); } 
        else { router.navigate('/home'); }
      }
    };

    // 分享邏輯
    const handleShare = async () => {
      if (!welfare) return;
      try {
        await Share.share({ message: `哞福利向您送來了福利!\n${welfare.title}\n原文鏈接: ${welfare.link}` });
      } catch (error: any) { Alert.alert(error.message); }
    };

    // 收藏/取消收藏的切換邏輯
    const handleToggleFavorite = async () => {
      if (!welfare) return;
      try {
        let result;
        if (isFavorited) {
          // 如果已收藏，則呼叫刪除 API
          result = await deleteFavoriteAPI(authToken, welfare.id);
          setIsFavorited(false); // 更新本地狀態為「未收藏」
        } else {
          // 如果未收藏，則呼叫新增 API
          result = await addFavoriteAPI(authToken, welfare.id);
          setIsFavorited(true); // 更新本地狀態為「已收藏」
        }
        Alert.alert('操作結果', result.message);
      } catch (err: any) {
        Alert.alert('操作失敗', err.message);
      }
    };

    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={handleCustomBack} style={{ paddingHorizontal: 10 }} >
          <Ionicons name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} size={28} color="#333" />
        </TouchableOpacity>
      ),
      // ✨ 在這裡新增 headerRight
      headerRight: () => (
        welfare && (
          <View style={styles.headerRightContainer}>
            <TouchableOpacity onPress={handleToggleFavorite} style={styles.headerButton}>
              <Ionicons 
                name={isFavorited ? 'heart' : 'heart-outline'} 
                size={24} 
                color={isFavorited ? COLORS.light_red : '#333'} 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
              <Ionicons name="share-social-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        )
      ),
    });
    
  }, [sourcePage, navigation, router, welfare, authToken, isFavorited]); // <-- 加入 isFavorited 依賴

  const openLink = async (url: string) => {
    if (url && (await Linking.canOpenURL(url))) {
      await Linking.openURL(url);
    } else {
      console.warn('Invalid or unsupported URL:', url);
    }
  };
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );}
  if (!welfare) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.pageContainer}>
      {welfare ? (
        <View style={{ flex: 1 }}>
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.container}>
            <Text style={styles.title}>{welfare.title}</Text>
            <Text style={{...styles.releaseDate,marginBottom:3}}>發佈日期: {welfare.publicationDate||"無法取得發佈日期"}</Text>
            <Text style={{...styles.releaseDate,marginBottom:3}}>福利種類: {welfare.categories.join(',')||"無法取得福利種類"}</Text>
            <Text style={styles.releaseDate}>地區: {welfare.location}</Text>

            <Text style={styles.sectionTitle}>簡要原文(AI生成，請自行鑒別):</Text>
            <Text style={styles.notes}>{welfare.summary}</Text>

            <Text style={styles.sectionTitle}>申請條件</Text>
            <FlatList
              style={styles.list}
              scrollEnabled={false}
              data={welfare.applicationCriteria}
              renderItem={({ item, index }) => (
                <View
                  style={[
                    styles.listRow,
                    index === welfare.applicationCriteria.length - 1 && styles.lastItemRow,
                  ]}
                >
                  <Text style={styles.listIndex}>{index + 1}</Text>
                  <Text style={styles.listItemText}>{item}</Text>
                </View>
              )}
              keyExtractor={(item, index) => index.toString()}
            />

            <Text style={styles.sectionTitle}>可獲得之福利</Text>
            <FlatList
              style={styles.list}
              scrollEnabled={false}
              data={welfare.forward}
              renderItem={({ item, index }) => (
                <View
                  style={[
                    styles.listRow,
                    index === welfare.forward.length - 1 && styles.lastItemRow,
                  ]}
                >
                  <Text style={styles.listIndex}>{index + 1}</Text>
                  <Text style={styles.listItemText}>{item}</Text>
                </View>
              )}
              keyExtractor={(item, index) => index.toString()}
            />

            <View style={styles.statusRow}>
              <Text style={styles.sectionTitle}>你是否符合申請條件</Text>
              <TouchableOpacity style={styles.infoIcon}>
                <Ionicons size={20} name="information-circle-outline" />
              </TouchableOpacity>
              <View
                style={[styles.circleIndicator, { backgroundColor: getCircleColor(lightStatus) }]}
              />
              <Text style={styles.resultText}>{getCircleText(lightStatus)}</Text>
            </View>
            {welfare.lightReason && welfare.lightReason.length > 0 && (
              <View style={styles.reasonContainer}>
                <Text style={styles.reasonTitle}>
                  評估說明：
                </Text>
                <Text style={styles.reasonText}>
                  {/* 將理由陣列轉換為換行的字串 */}
                  {welfare.lightReason.join('\n')}
                </Text>
              </View>
            )}

            {welfare.familyMember.length > 0 && (
              <Text style={styles.sectionTitle}>可獲得福利之家人</Text>
            )}
            <FlatList
              style={styles.list}
              scrollEnabled={false}
              data={welfare.familyMember} // 假設 API 返回或使用臨時數據
              renderItem={({ item, index }) => (
                <View
                  style={[
                    styles.listRow,
                    index === (welfare.familyMember.length) - 1 && styles.lastItemRow,
                  ]}
                >
                  <Text style={styles.listIndex}>{index + 1}</Text>
                  <Image
                    source={{ uri: item?.avatarUrl }}
                    style={styles.avatar}
                  />
                  <Text style={styles.listItemText}>{item.name}</Text>
                </View>
              )}
              keyExtractor={(item, index) => index.toString()}
            />
            
            {/* <Text style={styles.sectionTitle}>原始文章:</Text>  
           <Text style={styles.notes}>{welfare.detail}</Text> */}
</View>
</ScrollView>
           {/* <View style={styles.bottomActionContainer}>
            <View style={styles.statusRow}>
              <Text style={styles.sectionTitle}>需要詳細原始資料:</Text>
              <TouchableOpacity onPress={() => openLink(welfare.link)}>
                <Text style={styles.linkText}>點此前往原文網站</Text>
              </TouchableOpacity>
            </View> */}
            <View style={styles.bottomActionContainer}>
            <TouchableOpacity onPress={() => openLink(welfare.link)} style={styles.linkButton}>
              <Text style={styles.linkText}>點此前往原文網站</Text>
              <Ionicons name="open-outline" size={20} color="#007aff" />
            </TouchableOpacity>
          </View>
          </View>
      
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text>Loading...</Text>
        </View>
      )}
      </SafeAreaView>

  );
};
const styles = StyleSheet.create({
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  releaseDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    // marginTop: 16,
    // marginBottom: 8,
    marginRight: 6,
  },
  list: {
    marginLeft: 30,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingBottom: 10,
    marginVertical: 10,
    borderBottomWidth: 0.3,
    borderBlockColor: 'gray',
    paddingRight: 30,
  },
  lastItemRow: {
    borderBottomWidth: 0, // 移除底線
  },
  listIndex: {
    fontSize: 14,
  },
  listItemText: {
    fontSize: 14,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoIcon: {
    paddingLeft: 4,
    paddingRight: 10,
  },
  circleIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 8,
  },
  resultText: {
    fontSize: 14,
  },
  // linkText: {
  //   color: 'blue',
  //   fontStyle: 'italic',
  //   fontSize: 16,
  //   textDecorationLine: "underline",
  // },
  notes: {
    fontSize: 15,
    color: '#333',
    marginTop: 8,
    lineHeight: 25,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: 'red' },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 50,
  },
  reasonContainer:{
     marginTop: 8, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8,marginBottom:8
  },
  reasonTitle:{
    fontSize: 16, fontWeight: 'bold', marginBottom: 6 
  },
  reasonText:{
    fontSize: 14, color: '#333', lineHeight: 22 
  },
  bottomActionContainer: {
    padding: 16,
    paddingTop: 8,
    marginBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff'
  },
  pageContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom:10
  },
  linkText: {
    color: '#007aff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WelfareInfo;
