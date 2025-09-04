import { Stack, useRouter } from "expo-router";
import { COLORS } from "@/src/utils/colors";
import store, { RootState } from "@/src/store";
import { Provider, useDispatch, useSelector } from 'react-redux'
import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { fetchUser } from "@/src/store/slices/userSlice";
import { SafeAreaProvider,SafeAreaView  } from "react-native-safe-area-context";
export default function RootLayout() {
  

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1,backgroundColor:COLORS.background }} edges={["top", "left", "right"]}>
          <Stack
            screenOptions={{
              headerShown: false, // 全局隱藏標頭
            }}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </Provider>
  );
}