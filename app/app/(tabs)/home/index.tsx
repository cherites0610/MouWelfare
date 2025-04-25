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
import { Welfare } from '@/src/type/welfareType';
import { fetchWelfareApi } from '@/src/api/welfareApi';

export default function Index() {
  const drawerRef = useRef<DrawerLayoutMethods>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<Welfare[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [regions, setRegions] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [families, setFamilies] = useState<string[]>([]);
  const [filteredData, setFilteredData] = useState<Welfare[]>([]); // 新增篩選後的數據狀態

  // 處理搜尋
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    console.log('搜尋內容:', query);
  }, []);

  // 處理地區選擇
  const handleRegionsChange = useCallback((selectedRegions: string[]) => {
    setRegions(selectedRegions);
    console.log('Selected Regions:', selectedRegions);
  }, []);

  // 處理服務選擇
  const handleServicesChange = useCallback((selectedServices: string[]) => {
    setServices(selectedServices);
    console.log('Selected Services:', selectedServices);
  }, []);

  // 處理家庭選擇
  const handleFamiliesChange = useCallback((selectedFamilies: string[]) => {
    setFamilies(selectedFamilies);
    console.log('Selected Families:', selectedFamilies);
  }, []);

  // 處理刷新
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await fetchWelfareApi();
      setData(result);
      setFilteredData(result); // 初始化篩選數據
    } catch (err) {
      console.error('刷新資料失敗', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // 篩選邏輯（異步執行）
  useEffect(() => {
    const filterData = () => {
      console.log('Filtering with:', { regions, services, families });
      // 示例篩選邏輯（根據實際數據結構調整）
      const filtered = data.filter((item) => {
        const regionMatch = regions.length === 0 || regions.includes(item.location);
        const serviceMatch = services.length === 0 || services.includes(item.categories[0]);
        const familyMatch = families.length === 0 || families.includes("");
        return regionMatch && serviceMatch && familyMatch;
      });
      setFilteredData(filtered);
    };

    // 使用 setTimeout 異步執行篩選，減少主線程阻塞
    const timeoutId = setTimeout(filterData, 0);
    return () => clearTimeout(timeoutId);
  }, [regions, services, families, data]);

  // 初始加載數據
  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

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
          <Search onSearch={handleSearch} />
          <Filiter
            openFilterDrawer={openDrawer}
            onRegionsChange={handleRegionsChange}
            onServicesChange={handleServicesChange}
            onFamiliesChange={handleFamiliesChange}
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
                listData={filteredData} // 使用篩選後的數據
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            </View>
          </ReanimatedDrawerLayout>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}