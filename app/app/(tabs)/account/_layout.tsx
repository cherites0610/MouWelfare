
import { COLORS } from "@/src/utils/colors";
import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true, // 子頁顯示 Header
        headerStyle: {backgroundColor:COLORS.background},
        headerTintColor:'black',
        headerBackButtonDisplayMode:"minimal"
      }}
    >
      <Stack.Screen name="index" options={{ headerShown:false,title: "帳戶頁面" }} />
      <Stack.Screen name="setting" options={{ title: "帳戶設定" }} />
      <Stack.Screen name="profile" options={{ title: "帳戶資料設定" }} />
      <Stack.Screen name="family" options={{ title: "家庭" }} />
      <Stack.Screen name="fqa" options={{ title: "常見問題" }} />
      <Stack.Screen name="edit-profile" options={{title:"編輯資料"}} />

      <Stack.Screen name="[familyid]" options={{title:"家庭設定"}} />
    </Stack>
  );
}