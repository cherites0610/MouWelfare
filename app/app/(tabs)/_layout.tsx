import { RootState } from "@/src/store";
import { COLORS } from "@/src/utils/colors";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { Image } from "react-native";
import { useSelector } from 'react-redux';

export default function RootLayout() {
  const { status } = useSelector((state: RootState) => state.user)
  const route = useRouter()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="mou"
        options={{
          title: "阿哞",
          tabBarActiveTintColor: COLORS.background,
          tabBarIcon: ({ color, size }) => (
            <Image
              source={require('../../assets/images/amuo.png')} // 替換為你的圖標路徑
              style={{ width: size, height: size, tintColor: color }} // 設置大小與顏色
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            if (status != 'succeeded') {
              e.preventDefault();
              route.navigate("/auth/login")
            }
          },
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          tabBarActiveTintColor: COLORS.background,
          title: "首頁",
          tabBarIcon: ({ color, size }) => <Ionicons images-outline name="home-outline" color={color} size={size} />
        }}
      listeners={{
          tabPress: () => {
            // 重置 home 分頁到 index
            route.navigate('/home/');
          },
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          tabBarActiveTintColor: COLORS.background,
          title: "帳戶",
          tabBarIcon: ({ color, size }) => <Ionicons images-outline name="person-outline" color={color} size={size} />
        }}
        listeners={{
          tabPress: (e) => {
            if (status != 'succeeded') {
              e.preventDefault();
              route.navigate("/auth/login")
            }
          },
        }}
      />
    </Tabs>
  )
}
