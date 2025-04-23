import { Alert, SafeAreaView, StatusBar, View } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedDrawerLayout, {
  DrawerType,
  DrawerPosition,
  DrawerLayoutMethods,
} from 'react-native-gesture-handler/ReanimatedDrawerLayout';
import Search from '@/src/components/Search';
import { COLORS } from '@/src/utils/colors';
import Filiter from '@/src/components/Filiter';
import FilterDrawer from '@/src/components/FilterDrawer';
import WelfareList from '@/src/components/WelfareList';
import { RootState, AppDispatch } from '@/src/store';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUser } from '@/src/store/slices/userSlice';
import { Config } from '@/src/type/configType';
import { loadConfig, writeConfig } from '@/src/store/slices/configSlice';
import { Welfare } from '@/src/type/welfareType';
import { fetchWelfareApi } from '@/src/api/welfareApi';

export default function Index() {
  const drawerRef = useRef<DrawerLayoutMethods>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<Welfare[]>([]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      const result = await fetchWelfareApi();
      setData(result);
    } catch (err) {
      console.error("刷新資料失敗", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);


  const openDrawer = () => {
    drawerRef.current?.openDrawer();
  };

  const closeDrawer = () => {
    drawerRef.current?.closeDrawer();
  }

  return (
    <GestureHandlerRootView>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          <StatusBar backgroundColor={COLORS.background} />
          <Search></Search>
          <Filiter
            openFiliterDrawe={openDrawer}
          ></Filiter>
          <ReanimatedDrawerLayout
            ref={drawerRef}
            renderNavigationView={() => <FilterDrawer closeDrawer={closeDrawer} />}
            drawerPosition={DrawerPosition.RIGHT}
            drawerType={DrawerType.FRONT}
            overlayColor='rgba(0, 0, 0, 0)'
          >
            <View style={{ flex: 1, backgroundColor: 'white' }}>
              <WelfareList
                listData={data}
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            </View>
          </ReanimatedDrawerLayout>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}