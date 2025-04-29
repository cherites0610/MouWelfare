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
import { RootState } from '@/src/store';
import { useSelector } from 'react-redux';

export default function Index() {
  const drawerRef = useRef<DrawerLayoutMethods>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<Welfare[]>([]);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false); // 新增
  const { familys: FAMILYS } = useSelector((state: RootState) => state.family); // 獲取家庭類型數據
  const { locations, categories, identities, families, searchQuery } = useSelector((state: RootState) => state.filiter)


  const fetchWelfareData = (queryParams: Partial<WelfareApiParams>, isNextPage = false) => {
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
      setPage(1);
    }
    // 是下一頁時，設置 loading more 狀態
    if (isNextPage) {
      setIsLoadingMore(true);
    }

    // 計算下一頁的頁數
    const nextPage = isNextPage ? page + 1 : page;

    const familyID = FAMILYS.find((item) => item.name === families)?.id;
    queryParams.families = familyID ?? "";

    const query: WelfareApiParams = {
      locations: queryParams.locations ?? [],
      categories: queryParams.categories ?? [],
      identities: queryParams.identities ?? [],
      families: queryParams.families ?? "",
      searchQuery: queryParams.searchQuery ?? "",
      page: nextPage ?? 1,
      pageSize: queryParams.pageSize ?? 20
    }

    // 執行 API 請求
    fetchWelfareApi(query)
      .then((res) => {
        // 更新數據
        setData((prevData: Welfare[]) => {
          // 如果是下一頁，追加數據；否則替換數據
          const newData = isNextPage ? [...prevData, ...res.data] : [...res.data];
          // 去重，根據 id 確保數據唯一
          return Array.from(new Map(newData.map((item) => [item.id, item])).values());
        });

        // 更新頁數
        if (isNextPage) {
          setPage((prevPage: number) => prevPage + 1);
        }

        // 更新 hasMore 狀態
        setHasMore(res.pagination.totalPages - res.pagination.page > 0);
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
  };

  const handleRefresh = () => {
    setPage(1);
    // console.log("載入資料（非下一頁）", locations, categories, families, searchQuery)
    fetchWelfareData({ locations, categories, identities, families, searchQuery }, false);
  }

  useEffect(() => {
    handleRefresh()
  }, [locations, categories, identities, families, searchQuery])

  useEffect(() => {
    fetchWelfareData({ locations, categories, identities, families, searchQuery }, false);
  }, []);

  const onLoadMore = () => {
    if (hasMore && !isFetching) {
      fetchWelfareData({ locations, categories, identities, families, searchQuery }, true);
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