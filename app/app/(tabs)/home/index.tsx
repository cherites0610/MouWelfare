import { Alert, StatusBar, View } from 'react-native';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CowLoading from '../../../src/components/CowLoading';
import ReanimatedDrawerLayout, {
  DrawerType,
  DrawerPosition,
  DrawerLayoutMethods,
} from 'react-native-gesture-handler/ReanimatedDrawerLayout';
import Search from '@/src/components/Search';
import { COLORS } from '@/src/utils/colors';
import Filiter from '@/src/components/Filiter/FiliterBar';
import FilterDrawer from '@/src/components/FliterDrawer/FilterDrawer';
import WelfareList from '@/src/components/WelfareList';
import { Welfare, WelfareApiParams } from '@/src/type/welfareType';
import { fetchWelfareApi,fetchFavoriteAPI  } from '@/src/api/welfareApi';
import { AppDispatch,RootState } from '@/src/store';
import { useSelector,useDispatch  } from 'react-redux';
import { debounce } from 'lodash';
import { ActivityIndicator } from 'react-native';
import { setLocations,
    setIdentities,
    setAge, 
    setGender, 
    setIncome, 
    resetFilters } from '@/src/store/slices/filiterSlice';
import { ageOptions, genderOptions, incomeOptions, identityOptions } from '@/src/components/FliterDrawer/constants';
import dayjs from 'dayjs';

export default function Index() {
  const drawerRef = useRef<DrawerLayoutMethods>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<Welfare[]>([]);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false); // 新增
  const { familys: FAMILYS } = useSelector((state: RootState) => state.family); // 獲取家庭類型數據
  const { locations, categories, identities, family, searchQuery, age, gender, income } = useSelector((state: RootState) => state.filiter)
  const { user } = useSelector((state: RootState) => state.user)
  const { autoFilterUserData, authToken } = useSelector((state: RootState) => state.config);
  const dispatch = useDispatch<AppDispatch>();

  
  const fetchWelfareData = useCallback((queryParams: Partial<WelfareApiParams>, isNextPage = false) => {
    if (isFetching) return; // 防止重複請求
    setIsFetching(true);

    if (!hasMore && isNextPage) {
      setIsFetching(false);
      return;
    }

    if (!isNextPage) {
      setRefreshing(true);
      setData([]);
      setPage(1);
    }
    if (isNextPage) {
      setIsLoadingMore(true);
    }

    const nextPage = isNextPage ? page + 1 : page;
    const familyID = FAMILYS.find((item) => item.name === family)?.id;
    queryParams.familyID = familyID ?? "";

    const query: WelfareApiParams = {
      locations: queryParams.locations ?? [],
      categories: queryParams.categories ?? [],
      identities: queryParams.identities ?? [],
      familyID: queryParams.familyID ?? "",
      searchQuery: queryParams.searchQuery ?? "",
      userID: user?.id ?? "",
      page: nextPage ?? 1,
      // pageSize: queryParams.pageSize ?? 20,
      pageSize:20,
      age: queryParams.age ?? null,
      gender: queryParams.gender ?? null,
      income: queryParams.income ?? [],
    }

    fetchWelfareApi(query)
      .then(async (res) => {
        const favoritesResponse = await fetchFavoriteAPI(authToken);
        const favoriteIds = new Set(favoritesResponse.data.map((fav: Welfare) => fav.id));

        const enrichedData = res.data.data.map(welfare => ({
          ...welfare,
          isFavorited: favoriteIds.has(welfare.id),
        }));

        // 🔹 新增排序邏輯
        const sortedData = enrichedData.sort((a, b) => {
          // 1️⃣ 紅綠燈優先
          const lightPriority = (card: Welfare) => {
            switch (card.lightStatus) {
              case 1: return 0; // 綠
              case 2: return 1; // 黃
              case 3: return 2; // 紅
              default: return 3;
            }
          };
          const pa = lightPriority(a);
          const pb = lightPriority(b);
          if (pa !== pb) return pa - pb;

          // 2️⃣ 居住地匹配優先
          const locationMatchA = a.location === user?.location?.name ? 0 : 1;
          const locationMatchB = b.location === user?.location?.name ? 0 : 1;
          if (locationMatchA !== locationMatchB) return locationMatchA - locationMatchB;

          // 3️⃣ 年齡匹配優先
          const ageMatch = (card: Welfare) => {
            if (!age) return 1;
            return card.applicationCriteria.some(c => c.includes(age)) ? 0 : 1;
          };
          const aa = ageMatch(a);
          const ab = ageMatch(b);
          if (aa !== ab) return aa - ab;

          // 4️⃣ 預設依發佈日期排序
          return new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime();
        });

        setData((prevData: Welfare[]) => {
          const newData = isNextPage ? [...prevData, ...sortedData] : sortedData;
          // 去重
          return Array.from(new Map(newData.map((item) => [item.id, item])).values());
        });

        if (isNextPage) {
          setPage((prevPage: number) => prevPage + 1);
        }

        setHasMore(res.data.pagination.totalPage - res.data.pagination.page > 0);
      })
      .catch((err) => {
        console.error('獲取資料失敗:', err);
        alert('無法加載數據，請稍後重試');
      })
      .finally(() => {
        if (!isNextPage) setRefreshing(false);
        if (isNextPage) setIsLoadingMore(false);
        setIsFetching(false);
      });
    }, [isFetching, hasMore, page, user, FAMILYS, family, authToken, age]);

  const handleRefresh = useCallback(() => {
    setPage(1);
    fetchWelfareData({ locations, categories, identities, searchQuery, age, gender, income }, false);
  },[fetchWelfareData, locations, categories, identities, searchQuery, age, gender, income])

  const debouncedHandleRefresh = useCallback(debounce(handleRefresh, 300), [handleRefresh]);

  useEffect(() => {
        debouncedHandleRefresh();
        return () => {
            debouncedHandleRefresh.cancel();
        };
    }, [locations, categories, identities, family, searchQuery, age, gender, income]);
  useEffect(() => {
    if (!user) return; 

    if (autoFilterUserData) {
      // 1. 更新地區 (這部分您可能已經有了)
      if (user.location?.name) {
        dispatch(setLocations([user.location.name]));
      }
      if (user.gender && genderOptions.includes(user.gender)) {
        dispatch(setGender(user.gender));
      } else {
        dispatch(setGender(null)); // 如果沒有或不匹配，設為 null
      }
      if (user.birthday) {
        // 使用 dayjs 計算當前日期與生日之間的年份差距
        const age = dayjs().diff(user.birthday, 'year');
        let ageGroup = null;

        if (age < 20) {
          ageGroup = "20歲以下";
        } else if (age >= 20 && age <= 65) { // 注意這裡的邊界條件
          ageGroup = "20歲-65歲";
        } else {
          ageGroup = "65歲以上";
        }
        dispatch(setAge(ageGroup));
      } else {
        dispatch(setAge(null)); // 如果沒有生日資訊，設為 null
      }
      
      // 2. 處理來自 user.identities 的所有詳細篩選
      if (user.identities && user.identities.length > 0) {
        const userIdentities = user.identities.map(id => id.name); // 假設 id.name 是選項文字

        // 篩選出收入 (多選)
        const foundIncome = incomeOptions.filter(opt => userIdentities.includes(opt));
        dispatch(setIncome(foundIncome));

        // 篩選出身分別 (多選)
        const foundIdentities = identityOptions.filter(opt => userIdentities.includes(opt));
        dispatch(setIdentities(foundIdentities));
      }

    } else {
      console.log("自動篩選已關閉，重置所有篩選條件。");
      dispatch(resetFilters());
    }
  }, [user, autoFilterUserData, dispatch]);

  const onLoadMore = useCallback(() => {
    if (hasMore && !isFetching) {
      fetchWelfareData({ locations, categories, identities, searchQuery, age, gender, income }, true);
    }
    // 依賴所有函式中用到的 props 和 state
}, [hasMore, isFetching, fetchWelfareData, locations, categories, identities, searchQuery, age, gender, income]);

  const openDrawer = useCallback(() => {
    drawerRef.current?.openDrawer();
  }, []);

  const closeDrawer = useCallback(() => {
    drawerRef.current?.closeDrawer();
  }, []);

  const handleToggleFavoriteInList = useCallback((welfareId: number, currentStatus: boolean) => {
    setData(currentData => 
      currentData.map(item => 
        item.id === welfareId ? { ...item, isFavorited: !currentStatus } : item
      )
    );
}, []);

  return (
    <GestureHandlerRootView>
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.background }}>
          <StatusBar backgroundColor={COLORS.background} />
          <Search />
          <Filiter
            openFilterDrawer={openDrawer}
          />
          <ReanimatedDrawerLayout
            ref={drawerRef}
            renderNavigationView={() => <FilterDrawer closeDrawer={closeDrawer} />}
            drawerPosition={DrawerPosition.RIGHT}
            drawerType={DrawerType.FRONT}
            overlayColor="rgba(0, 0, 0, 0)"
          >
            <View style={{ flex: 1, backgroundColor: 'white' }}>
                <WelfareList
                  listData={data}
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  onLoadMore={onLoadMore}
                  isLoadingMore={isLoadingMore}
                  onToggleFavorite={handleToggleFavoriteInList}
                  authToken={authToken}
                />
            </View>
          </ReanimatedDrawerLayout>
        </SafeAreaView>
    </GestureHandlerRootView>
  );
}