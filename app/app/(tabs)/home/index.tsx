import { Alert, SafeAreaView, StatusBar, View } from 'react-native';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { fetchWelfareApi } from '@/src/api/welfareApi';
import { AppDispatch,RootState } from '@/src/store';
import { useSelector,useDispatch  } from 'react-redux';
import { debounce } from 'lodash';
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
  const { autoFilterUserData } = useSelector((state: RootState) => state.config);
  const dispatch = useDispatch<AppDispatch>();
  
  const fetchWelfareData = useCallback((queryParams: Partial<WelfareApiParams>, isNextPage = false) => {
    if (isFetching) return; // 防止重複請求
    setIsFetching(true);

    // 如果是下一頁且沒有更多數據，直接結束
    if (!hasMore && isNextPage) {
      setIsFetching(false);
      return;
    }

    // 非下一頁（刷新）時，設置 refreshing 並重置頁數
    if (!isNextPage) {
      setRefreshing(true);
      setData([]);
      setPage(1);
    }
    // 是下一頁時，設置 loading more 狀態
    if (isNextPage) {
      setIsLoadingMore(true);
    }

    // 計算下一頁的頁數
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
      pageSize: queryParams.pageSize ?? 20,
      age: queryParams.age ?? null,
      gender: queryParams.gender ?? null,
      income: queryParams.income ?? [],
    }

    // 執行 API 請求
    fetchWelfareApi(query)
      .then((res) => {
        setData((prevData: Welfare[]) => {
          // 如果是下一頁，追加數據；否則替換數據
          const newData = isNextPage ? [...prevData, ...res.data.data] : [...res.data.data];
          // 去重，根據 id 確保數據唯一
          return Array.from(new Map(newData.map((item) => [item.id, item])).values());
        });

        // 更新頁數
        if (isNextPage) {
          setPage((prevPage: number) => prevPage + 1);
        }
        
        // 更新 hasMore 狀態
        setHasMore(res.data.pagination.totalPage - res.data.pagination.page > 0);
      })
      .catch((err) => {
        console.error('獲取資料失敗:', err);
        // 可選：顯示錯誤提示
        alert('無法加載數據，請稍後重試');
      })
      .finally(() => {
        // 結束時重置狀態
        if (!isNextPage) {
          setRefreshing(false);
        }
        if (isNextPage) {
          setIsLoadingMore(false);
        }
        setIsFetching(false);
      });
  },[isFetching, hasMore, page, user, FAMILYS, family]);

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
      console.log("🚀 自動篩選已啟用，正在根據用戶資料更新所有篩選條件...");
      
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
        console.log("age",age)
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
      console.log("🏃‍♂️ 自動篩選已關閉，重置所有篩選條件。");
      dispatch(resetFilters());
    }
  }, [user, autoFilterUserData, dispatch]);

  const onLoadMore = () => {
    if (hasMore && !isFetching) {
      fetchWelfareData({ locations, categories, identities, searchQuery, age, gender, income }, true);
    }
  }

  const openDrawer = useCallback(() => {
    drawerRef.current?.openDrawer();
  }, []);

  const closeDrawer = useCallback(() => {
    drawerRef.current?.closeDrawer();
  }, []);

  return (
    <GestureHandlerRootView>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
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
              />
            </View>
          </ReanimatedDrawerLayout>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}