import { COLORS } from "@/src/utils/colors";
import { Stack } from "expo-router";

export default function HomeLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: true, // 子頁顯示 Header
                headerStyle: { backgroundColor: COLORS.background },
                headerTintColor: 'black',
                headerBackButtonDisplayMode: "minimal"
            }}
        >
            <Stack.Screen name="index" options={{ headerShown: false, title: "首頁" }} />
            <Stack.Screen name="favourite" options={{ title: "我的最愛" }} />
            <Stack.Screen name="[welfareId]" options={{ title: "福利詳情" }} />

        </Stack>
    );
}