import { Stack, useRouter } from "expo-router";
import store, { RootState } from "@/src/store";
import { Provider, useDispatch, useSelector } from 'react-redux'
import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { fetchUser } from "@/src/store/slices/userSlice";
export default function RootLayout() {
  

  return (
    <Provider store={store}>
      <Stack
        screenOptions={{
          headerShown: false, // 全局禁用標頭
        }}
      />
    </Provider>
  );
}