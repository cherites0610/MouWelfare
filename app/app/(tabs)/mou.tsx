import { COLORS } from '@/src/utils/colors';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  ImageSourcePropType,
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { Platform,Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {WelfareApiParams} from "../type/welfareType";
import {fetchWelfareApi} from "@/src/api/welfareApi";
import Markdown from 'react-native-markdown-display';
import { AppConfig } from '@/src/config/app.config';

// 定義類型
interface Item {
  id: number;
  name: string;
  image: ImageSourcePropType;
}

interface ResultItem {
  title: string;
  url: string;
  // welfareCards 的結構
  id?:string;
  summary?: string;
  location?: string;
  forward?: string;
}

interface Message {
  type: 'user' | 'bot' | 'service' | 'place' | 'result' | 'loading';
  content?: string;
  items?: Item[];
  resultItems?: ResultItem[];
  showAvatar?: boolean;
}

// 主組件
const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  // const [inputText, setInputText] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const router = useRouter();
  const [chatID, setChatID] = useState<string>('');
  const [selectedService, setSelectedService] = useState<number>(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { width } = Dimensions.get('window');

  // 數據
  const serviceIdToCategoryMap: { [key: number]: string } = {
  1: '兒童及青少年福利',
  2: '婦女與幼兒福利',
  3: '老人福利',
  4: '社會救助福利',
  5: '身心障礙福利',
  6: '其他',
};

  const ewlfareItems: Item[] = [
    { id: 1, name: '兒童及青少年福利', image: require("@/assets/images/Mou/baby.jpeg") },
    { id: 2, name: '婦女與幼兒福利', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 3, name: '老人福利', image: require("@/assets/images/Mou/elderly.jpeg") },
    { id: 4, name: '社會救助福利', image: require("@/assets/images/Mou/elderly.jpeg") },
    { id: 5, name: '身心障礙福利', image: require("@/assets/images/Mou/accessibility.jpeg") },
    { id: 6, name: '其他', image: require("@/assets/images/Mou/school.jpeg") },
  ];

  const taiwanItems: Item[] = [
    { id: 1, name: '北區', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 2, name: '中區', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 3, name: '南區', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 4, name: '東區', image: require("@/assets/images/Mou/school.jpeg") },
  ];

  const northItems: Item[] = [
    { id: 1, name: '台北市', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 2, name: '新北市', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 3, name: '基隆市', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 4, name: '桃園市', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 5, name: '宜蘭縣', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 6, name: '新竹縣', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 7, name: '新竹市', image: require("@/assets/images/Mou/school.jpeg") },
  ];

  const midItems: Item[] = [
    { id: 8, name: '台中市', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 9, name: '苗栗縣', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 10, name: '彰化縣', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 11, name: '南投縣', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 12, name: '雲林縣', image: require("@/assets/images/Mou/school.jpeg") },
  ];

  const southItems: Item[] = [
    { id: 13, name: '高雄市', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 14, name: '台南市', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 15, name: '嘉義市', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 16, name: '嘉義縣', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 17, name: '屏東縣', image: require("@/assets/images/Mou/school.jpeg") },
  ];

  const eastItems: Item[] = [
    { id: 18, name: '花蓮縣', image: require("@/assets/images/Mou/school.jpeg") },
    { id: 19, name: '台東縣', image: require("@/assets/images/Mou/school.jpeg") },
  ];

  const botAvatar = require("@/assets/images/logo.jpeg")

  // 初始化
  useEffect(() => {
  if (!isInitialized) {
    // 這個 effect 的職責只有一個：獲取一次 chatID
    // 一旦 getOrCreateChatId 成功並呼叫了 setChatID
    // 上面那個監聽 chatID 的 effect 就會自動被觸發，接管後續流程
    getOrCreateChatId(); 
    setIsInitialized(true);
  }
}, [isInitialized]);

// --- 新增這個 useEffect 來實現 UI 與 chatID 的連動 ---
useEffect(() => {
  // 當 chatID 發生變化時（包括從空字串變為初始 ID）
  // 這個 effect 就會被觸發

  // 如果 chatID 不是一個有效的 ID，就什麼都不做
  if (!chatID) {
    return;
  }

  console.log(`chatID 已變更為: ${chatID}，準備更新 UI...`);

  // 定義一個函式來載入新聊天室的內容
  const loadNewChat = async () => {
    // 1. 立刻清空畫面上的舊訊息
    setMessages([]); 

    // 2. 顯示一個載入中的提示
    setMessages([{ type: 'loading' }]);

    // 3. 從後端獲取這個 chatID 的歷史紀錄
    const history = await loadChatHistory(chatID); // <--- 我們會修改 loadChatHistory

    // 4. 移除載入中提示，並顯示歷史紀錄
    setMessages(history);

    // 如果是全新的聊天室（沒有歷史紀錄），可以顯示一個歡迎訊息
    if (history.length === 0) {
      // 這裡可以再次呼叫機器人打招呼，或者顯示一個靜態的歡迎卡片
      await handleBotAvatarClick(chatID);
    }
  };

  loadNewChat();

}, [chatID]); 

  // 新建並獲取 chatID
  const getOrCreateChatId = async () => {
    try {

      const response = await axios.post(AppConfig.api.endpoints.conversations, {
        userId: AppConfig.user.mockId,
        title: '新對話' // 可以給一個預設標題
      });
      
      const newChatId = response.data.id.toString();
      setChatID(newChatId);
      // 這裡不再將新的 chatID 儲存到 AsyncStorage，因為我們希望每次都創建新的
      console.log("從後端獲取新的 chatID:", newChatId);
      return newChatId; // 返回新的 chatID

    } 
    catch (error) {
      console.error('無法獲取或創建 chatID:', error);
      // Alert.alert('錯誤', '無法獲取或創建 chatID');
      return null; // 發生錯誤時返回 null
    }
  };
  const loadChatHistory = async (currentChatId: string): Promise<Message[]> => {
  if (!currentChatId) return [];

  try {
    const url = `${AppConfig.api.endpoints.conversations}/${AppConfig.user.mockId}/${currentChatId}`;
    const response = await axios.get(url);
    
    // *** 確保這裡有完整的 map 邏輯 ***
    const historyMessages: Message[] = response.data.messages.map((msg: any) => {
      let type: Message['type'] = msg.role === 'user' ? 'user' : 'bot';
      
      if (type === 'bot' && msg.welfareCards && msg.welfareCards.length > 0) {
        return { 
          type: type, 
          content: msg.content, 
          resultItems: msg.welfareCards.map((card: any) => ({
            id: card.id,
            title: card.title,
            url: `home/${card.id}`,   
            summary: card.summary, 
            location: card.location, 
            forward: card.forward, 
          }))
        };
      } else {
        return { type: type, content: msg.content };
      }
    });
    
    return historyMessages; 

  } catch (error) {
    console.error('載入歷史對話失敗:', error);
    Alert.alert('錯誤', '無法載入歷史對話');
    return []; // 發生錯誤時也返回空陣列
  }
};
  
  // 發送消息到後端
  const sendMessageToModel = async (message: string, conversationIdOverride?: string): Promise<{ content: string; cards: ResultItem[]; }> => {
    try {
       // 優先使用傳入的 conversationIdOverride，如果沒有，才用 state 中的 chatID
    const finalChatId = conversationIdOverride || chatID;

    const response = await axios.post(AppConfig.api.endpoints.search, {
      userId: AppConfig.user.mockId,
      // 使用我們最終確定的 ID
      conversationId: finalChatId ? parseInt(finalChatId) : undefined, 
      query: message
      }, {
        timeout: 30000, // 30 秒超時
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // 處理回應資料
      let aiAnswer: string = '';
      let welfareCards: ResultItem[] = [];
      
      // 檢查 response.data 是否為物件，並提取 answer 和 welfareCards
      if (response.data && typeof response.data === 'object') {
        if (response.data.answer) {
          aiAnswer = response.data.answer;
        } else {
          aiAnswer = JSON.stringify(response.data);
        }

        // 提取 welfareCards
        if (response.data.welfareCards && Array.isArray(response.data.welfareCards)) {
          welfareCards = response.data.welfareCards.map((card: any) => ({
            id:card.id,
            title: card.title,
            url: `home/${card.id}`,   
            summary: card.summary, 
            location: card.location, 
            forward: card.forward, 
          }));
        }

      } else if (typeof response.data === 'string') {
        aiAnswer = response.data;
      } else {
        aiAnswer = '收到回應但格式不正確';
      }

      // 返回一個包含 AI 回答和福利卡片的物件
      return { content: aiAnswer || '抱歉，沒有收到有效回應', cards: welfareCards };
      
    } catch (error) {
      console.error('Vertex AI 查詢失敗:', error);
      
      let errorMessage = '發生未知錯誤，請稍後再試';
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const message = error.response.data?.message || '未知伺服器錯誤';
          errorMessage = `伺服器錯誤 (${status}): ${message}`;
        } else if (error.request) {
          errorMessage = '網路連線錯誤，請檢查：\n1. 後端服務是否正在運行\n2. 網路連線是否正常\n3. URL 設定是否正確';
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = '請求超時，AI 處理時間較長，請稍後再試';
        }
      }
      return { content: errorMessage, cards: [] };
    }
  };
  
  // 處理用戶輸入
  const handleSendMessage = async () => {
  if (!inputText.trim()) {
    Alert.alert("錯誤", "請輸入問題");
    return;
  }

  // 插入用戶消息
  setMessages((prev) => [...prev, { type: "user", content: inputText }]);
  setInputText("");

  // 插入加載中
  setMessages((prev) => [...prev, { type: "loading" }]);

  try {
    // 呼叫 sendMessageToModel，它現在返回一個物件 { content, cards }
    const { content: aiResponseContent, cards: welfareCards } = await sendMessageToModel(inputText);

    // 移除加載中，插入 AI 的文字回答
    setMessages((prev) => [...prev.slice(0, -1), { type: "bot", content: aiResponseContent, showAvatar: false }]);

    // 如果有福利卡片，則將它們作為新的訊息類型插入
    if (welfareCards && welfareCards.length > 0) {
      setMessages((prev) => [
        ...prev,
        { type: "result", resultItems: welfareCards } // 使用 resultItems 來顯示卡片
      ]);
    }
    // 自動滾動到底部
  scrollViewRef.current?.scrollToEnd({ animated: true });

  } catch (error) {
    // 移除加載中，插入錯誤提示
    setMessages((prev) => [...prev.slice(0, -1), { type: "bot", content: "發生錯誤，請重新輸入" }]);
  }

  // 自動滾動到底部
  scrollViewRef.current?.scrollToEnd({ animated: true });
};

  // 檢查選擇項
  const checkIndex = (name: string): [number, number, string, number] => {
    const items: { data: Item[]; index: number }[] = [
      { data: ewlfareItems, index: 1 },
      { data: taiwanItems, index: 2 },
      { data: northItems, index: 3 },
      { data: midItems, index: 3 },
      { data: southItems, index: 3 },
      { data: eastItems, index: 3 },
    ];

    for (const { data, index } of items) {
      const foundItem = data.find((item) => item.name === name);
      if (foundItem) {
        if (index === 1) {
          setSelectedService(foundItem.id);
        }
        return [foundItem.id, index, foundItem.name, selectedService];
      }
    }

    return [0, 0, '', selectedService];
  };

  // 服務卡片點擊
  const handleServiceClick = (name: string) => {
    const index = checkIndex(name);
    if (index[1] === 1) {
      setMessages((prev) => [
        ...prev,
        { type: 'user', content: index[2] },
        { type: 'place', items: taiwanItems },
      ]);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  };

  // 地區卡片點擊
  const handlePlaceClick = (name: string) => {
    const index = checkIndex(name);
    if (index[1] === 1) {
      setMessages((prev) => [
        ...prev,
        { type: 'user', content: index[2] },
        { type: 'place', items: taiwanItems },
      ]);
    } else if (index[1] === 2) {
      let items: Item[] = [];
      if (index[0] === 1) items = northItems;
      else if (index[0] === 2) items = midItems;
      else if (index[0] === 3) items = southItems;
      else if (index[0] === 4) items = eastItems;
      setMessages((prev) => [
        ...prev,
        { type: 'user', content: index[2] },
        { type: 'place', items },
      ]);
    } else if (index[1] === 3) {
      setMessages((prev) => [...prev, { type: 'user', content: index[2] }]);
      handleResult(index);
    }
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };
   // 新增或修改：根據福利類別和地區查詢福利卡片
  const fetchWelfareCards = async (serviceId: number, locationName: string): Promise<ResultItem[]> => {
    try {
      // 1. 把福利類別的數字 ID 轉換成名稱
      const categoryName = serviceIdToCategoryMap[serviceId];
      if (!categoryName) {
        console.warn(`未找到 serviceId ${serviceId} 對應的類別名稱`);
        return []; // 如果找不到對應的名稱，就返回空陣列
      }

      // 2. 準備好呼叫 API 需要的參數
      const params: WelfareApiParams = {
        locations: [locationName], // 地區名稱，放在陣列裡
        categories: [categoryName], // 福利類別名稱，放在陣列裡
        userID: AppConfig.user.mockId, // 您的用戶 ID，請替換成實際的
        // 如果後端 API 支援分頁，您也可以加上 page: 1, pageSize: 10 等參數
      };

      // 3. 呼叫您提供的 fetchWelfareApi 函數
      const response = await fetchWelfareApi(params);

      // 4. 處理後端返回的資料
      // 假設後端返回的資料裡，福利卡片列表放在 response.welfares 裡面
      if (response && Array.isArray(response.data.data)) {
        return response.data.data.map((card: any) => ({
          id:card.id,
          title: card.title,
          url: `home/${card.id}`,   
          summary: card.summary, 
          location: card.location, 
          forward: card.forward, 
          // 如果您的 Welfare 類型還有其他欄位，請在這裡補充映射
          // 例如：imageUrl: card.imageUrl,
        }));
      } else {
        console.warn("後端返回的福利卡片格式不正確或為空:", response);
        return [];
      }
    } catch (error) {
      console.error("查詢福利卡片失敗:", error);
      Alert.alert("錯誤", "無法查詢福利卡片，請稍後再試");
      return [];
    }
  };
  // 新增：處理機器人頭像點擊事件
  const handleBotAvatarClick = async (currentChatId: string) => {
    // 1. 顯示「載入中」訊息，讓用戶知道程式正在處理
    setMessages((prev) => [...prev, { type: 'loading' }]);

    try {
       // 使用傳入的、最可靠的 chatID
    const { content, cards } = await sendMessageToModel('你好', currentChatId);

    setMessages((prev) => {
      const withoutLoading = prev.filter(m => m.type !== 'loading');
      return [...withoutLoading, { type: 'bot', content: content }];
    });
    setMessages((prev) => [...prev, { type: 'service', items: ewlfareItems }]);
    } catch (error) {
      // 錯誤處理
      setMessages((prev) => prev.slice(0, -1));
      setMessages((prev) => [...prev, { type: 'bot', content: '呼叫服務卡片時發生錯誤，請稍後再試。' }]);
    }
  };

  // 處理最終結果
  // 修改：處理最終結果
  const handleResult = async (input: [number, number, string, number]) => {
    const selectedServiceId = input[3]; // 這是福利類別的 ID
    const selectedLocationName = input[2]; // 這是地區的名稱

    // 1. 顯示「載入中」訊息，讓用戶知道正在查詢
    setMessages((prev) => [...prev, { type: 'loading' }]);

    try {
      // 2. 呼叫 fetchWelfareCards 函數來獲取實際的福利卡片資料
      const welfareCards = await fetchWelfareCards(selectedServiceId, selectedLocationName);

      // 3. 移除「載入中」訊息
      setMessages((prev) => prev.slice(0, -1));

      // 4. 根據是否有找到福利卡片來顯示結果
      if (welfareCards.length > 0) {
        // 如果找到了，就顯示這些福利卡片
        setMessages((prev) => [
          ...prev,
          { type: 'result', resultItems: welfareCards }
        ]);
      } else {
        // 如果沒找到，就顯示「未找到相關福利」的訊息
        const noResult: ResultItem[] = [{ title: '未找到相關福利\n點擊返回主界面', url: 'home' }];
        setMessages((prev) => [...prev, { type: 'result', resultItems: noResult }]);
        // 自動滾動到底部
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    } catch (error) {
      // 5. 如果發生錯誤，移除「載入中」並顯示錯誤訊息
      setMessages((prev) => prev.slice(0, -1));
      setMessages((prev) => [...prev, { type: 'bot', content: '查詢福利卡片時發生錯誤，請稍後再試。' }]);
    }
  };

  const handleNewChat = () => {
  console.log("使用者請求開啟新的聊天室...");
  // 直接呼叫我們現有的函式來獲取一個全新的 chatID
  // 之後的所有 UI 更新都會由 useEffect[chatID] 自動處理
  getOrCreateChatId(); 
};

  // 渲染消息
  const renderMessage = ({ item,index }: { item: Message,index:number }) => {
    
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;

    // 判斷兩個訊息是否來自同一「陣營」（使用者 vs 機器人）
    const isSameSenderAsNext = 
      nextMessage && 
      (item.type === 'user') === (nextMessage.type === 'user');

    // 如果沒有下一則訊息，或者下一則訊息的發送者陣營不同，就顯示頭像
    const shouldShowAvatar = !isSameSenderAsNext;

    switch (item.type) {
      case 'user':
        return (
          <View style={styles.userMessage}>
            <Text style={styles.userText}>{item.content}</Text>
            <Image source={{ uri: 'https://via.placeholder.com/40' }} style={styles.avatar} />
          </View>
        );
           case 'bot':
            return (
              <View style={styles.botMessage}>
                  {/* 根據我們的規則來決定是否渲染頭像 */}
                  {shouldShowAvatar ? (
                    <Image source={botAvatar} style={styles.avatar} />
                  ) : (
                    // 如果不顯示頭像，放一個等寬的空白 View 來佔位，確保訊息能對齊
                    <View style={styles.avatarPlaceholder} />
                  )}
                  <View style={styles.botTextContainer}>
                    <Markdown style={markdownStyles}>{item.content}</Markdown>
                  </View>
                </View>
            );
      case 'service':
        return (
          <View style={styles.botMessage}>
          <TouchableOpacity onPress={handleNewChat}> 
              <Image source={botAvatar} style={styles.avatar} />
            </TouchableOpacity>
            <FlatList
              horizontal
              data={item.items}
              renderItem={({ item: service }) => (
                <TouchableOpacity
                  style={styles.serviceCard}
                  onPress={() => handleServiceClick(service.name)}
                >
                  <Image source={service.image} style={styles.serviceImage} />
                  <Text style={styles.serviceText}>{service.name}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id.toString()}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        );
      case 'place':
        return (
          <View style={styles.botMessage}>
            <TouchableOpacity onPress={handleNewChat}> 
              <Image source={botAvatar} style={styles.avatar} />
            </TouchableOpacity>
            <FlatList
              data={item.items}
              renderItem={({ item: place }) => (
                <TouchableOpacity
                  style={styles.placeCard}
                  onPress={() => handlePlaceClick(place.name)}
                >
                  <Text style={styles.placeText}>{place.name}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id.toString()}
            />
          </View>
        );
      case 'result':
        return (
            <View style={styles.botMessage}>
              {/* 同樣的邏輯應用在所有機器人發出的訊息類型上 */}
              {shouldShowAvatar ? (
                <TouchableOpacity onPress={handleNewChat}>
                  <Image source={botAvatar} style={styles.avatar} />
                </TouchableOpacity>
              ) : (
                <View style={styles.avatarPlaceholder} />
              )}
                <FlatList
                  horizontal={true} // 啟用橫向滑動
                  showsHorizontalScrollIndicator={false} // 隱藏橫向滾動條
                  data={item.resultItems}
                  renderItem={({ item: result }) => (
                    <TouchableOpacity
                      style={styles.resultCard} // 將在此樣式中設定寬高
                      onPress={() => {
                        // 檢查 result.id 是否存在，以避免路徑變成 'home/undefined'
                        if (result.id) {
                          // 使用 navigate 和手動拼接字串的方式
                          router.navigate(('home/' + result.id) as any);
                        } else if (result.url === 'home') {
                          // 處理 "未找到福利" 的情況，這部分邏輯保持不變
                          setMessages((prev) => {
                            const initialMessages = prev.filter(m => m.type === 'bot' || m.type === 'service');
                            if (initialMessages.length > 0) {
                              return initialMessages;
                            }
                            return [{ type: 'service', items: ewlfareItems }];
                          });
                        }
                      }}
                    >
                      <Text style={styles.resultTitle} numberOfLines={3} ellipsizeMode="tail">{result.title}</Text>
                      {result.location && <Text style={styles.resultLocation}>地點: {result.location}</Text>}
                      {result.forward && <Text style={styles.resultForward}>福利: {result.forward}</Text>}
                      
                      {/* {result.summary && <Text style={styles.resultSummary}>{result.summary}</Text>} */}
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item, index) => index.toString()}
                />
              </View>
            );
      case 'loading':
        return (
          <View style={styles.botMessage}>
            <Image source={botAvatar} style={styles.avatar} />
            <View style={styles.loading}>
              <Text style={styles.botText}>加載中 </Text>
              <ActivityIndicator size="small" color="#22c55e" />
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(_, index) => index.toString()}
            scrollEnabled={false}
          />
        </ScrollView>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholderTextColor="#aaa"
            placeholder="輸入問題..."
            value={inputText}
            onChangeText={setInputText}
            
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
            <Text style={styles.sendButtonText}>發送</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>

  );
};

// 樣式
const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  userMessage: {
    flexDirection: 'row-reverse',
    // justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 16,
  },
  userText: {
    backgroundColor: '#a3e635',
    padding: 12,
    borderRadius: 8,
    maxWidth: width * 0.7,
    marginRight: 0,
    fontSize: 16,
  },
  botMessage: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  botText: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    maxWidth: width * 0.7,
    marginLeft: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 5,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 40, // 寬度與頭像相同
    marginRight: 10, // 右邊距與頭像相同
  },
  serviceCard: {
    width: 160,
    height: 224,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serviceImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  serviceText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  placeCard: {
    width: 144,
    height: 32,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  placeText: {
    fontSize: 16,
  },
  resultCard: {
    width: 160, // 設定固定寬度
      height: 224, // 設定固定高度
      backgroundColor: '#fff',
      padding: 15,
      borderRadius: 10,
      marginRight: 10, // 卡片之間增加右邊距，用於橫向間隔
      marginBottom: 10, // 保持底部間距，如果 FlatList 內容會換行
      borderWidth: 1,
      borderColor: '#e5e7eb',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3, // Android 陰影
      justifyContent: 'space-between', // 讓內容在卡片內垂直分佈
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
    lineHeight: 24,  
  },
  resultLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  resultForward: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  resultSummary: { // 如果您決定顯示 summary，請添加此樣式
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  resultText: {
    fontSize: 16,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botTextContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    maxWidth: width * 0.7,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
});
const markdownStyles = {
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  heading1: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  strong: {
    fontWeight: 'bold',
  },
  em: {
    fontStyle: 'italic',
  },
  link: {
    color: 'blue',
    textDecorationLine: 'underline',
  },
  list_item: {
    marginBottom: 5,
  },
  bullet_list: {
    marginBottom: 5,
  },
  ordered_list: {
    marginBottom: 5,
  },
  // 您可以根據需要添加更多 Markdown 元素的樣式
}as const;

export default App;