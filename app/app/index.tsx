import React, { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '@/src/store'
import { incrementAppLaunchCount, loadConfig, writeConfig } from '@/src/store/slices/configSlice'
import { fetchUser } from '@/src/store/slices/userSlice'
import { View, Text } from 'react-native'

export default function Index() {
  const dispatch = useDispatch<AppDispatch>();
  const { appLaunchCount } = useSelector((state: RootState) => state.config);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasIncremented, setHasIncremented] = useState(false);

  const init = async () => {
    try {
      await dispatch(loadConfig());
      await dispatch(fetchUser());
      setIsInitialized(true);
    } catch (error) {
      console.error("Initialization failed:", error);
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    // 確保 appLaunchCount 是一個有效的數字 (加載完成後通常 >= 0)
    if (isInitialized && typeof appLaunchCount === 'number' && appLaunchCount >= 0 && !hasIncremented) {
      dispatch(incrementAppLaunchCount());
      dispatch(writeConfig()); // 保存包含新計數的設定檔
      setHasIncremented(true); // <--- 在這裡將狀態設為 true，防止重複執行
    }
  }, [appLaunchCount, isInitialized, hasIncremented, dispatch]); // 將 dispatch 加入依賴項 (linting rule)

  if (!isInitialized) {
    return (
      <View>
        <Text>Loading...</Text>
      </View>
    );
  }

  return <Redirect href={"/home"} />;
}