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
import {WelfareApiParams,Welfare} from "../type/welfareType";
import {fetchWelfareApi} from "@/src/api/welfareApi";
import Markdown from 'react-native-markdown-display';
import { AppConfig } from '@/src/config/app.config';
import { useSelector } from 'react-redux'; // 1. 匯入 useSelector
import { RootState } from '@/src/store'; // 2. 匯入 RootState 型別
import RightDrawer from '../../src/components/Mou/RightDrawer'; 
import { Ionicons } from '@expo/vector-icons'; 

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
  categories?: string[];
  detail?: string;
  publicationDate?: string;
  applicationCriteria?: string[];
  lightStatus?: number;
}

interface Message {
  type: 'user' | 'bot' | 'service' | 'place' | 'result' | 'loading';
  content?: string;
  items?: Item[];
  resultItems?: ResultItem[];
  showAvatar?: boolean;
  conversationId?: string;
}

// 主組件
const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  // const [inputText, setInputText] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const router = useRouter();
  // const [chatID, setChatID] = useState<string>('');
  const [chatID, setChatID] = useState<number | undefined>(undefined);
  const [selectedService, setSelectedService] = useState<number>(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { width } = Dimensions.get('window');
  // 3. 使用 useSelector 從 Redux store 中獲取 user 物件
  const { user } = useSelector((state: RootState) => state.user);
  // 數據
  const serviceIdToCategoryMap: { [key: number]: string } = {
  1: '兒童及青少年福利',
  2: '婦女與幼兒福利',
  3: '老人福利',
  4: '社會救助福利',
  5: '身心障礙福利',
  6: '其他',
};
const categorySynonyms: { [key: string]: string }= {
    '兒童': '兒童及青少年福利',
    '小孩': '兒童及青少年福利',
    '兒少': '兒童及青少年福利',
    '青少年': '兒童及青少年福利',
    '婦女': '婦女與幼兒福利',
    '幼兒': '婦女與幼兒福利',
    '老人': '老人福利',
    '長者': '老人福利',
    '長輩': '老人福利',
    '救助': '社會救助福利',
    '低收入': '社會救助福利',
    '身心障礙': '身心障礙福利',
    '身障': '身心障礙福利',
    '殘障': '身心障礙福利',
    // 你可以根據需要繼續擴充這個字典
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
  const [isDrawerVisible, setIsDrawerVisible] = useState(false); 

  const toggleRightDrawer = () => {
    setIsDrawerVisible(!isDrawerVisible);
  };

  // 建立一個包含所有縣市名稱的 Set，方便快速查找
  const sortedCategories = React.useMemo(() => 
    [
      ...Object.keys(categorySynonyms), // 取得所有同義詞，如 ['兒童', '小孩', ...]
      ...ewlfareItems.map(i => i.name) // 取得所有正式類別名稱
    ].sort((a, b) => b.length - a.length),
    []
  );
const sortedLocations = React.useMemo(() => 
    [
      ...northItems.map(i => i.name),
      ...midItems.map(i => i.name),
      ...southItems.map(i => i.name),
      ...eastItems.map(i => i.name),
    ].sort((a, b) => b.length - a.length),
    [] // 空依賴陣列，確保只計算一次
  );
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
  if (chatID === undefined) { // 檢查是否為初始的 undefined 狀態
    return;
  }
  console.log(`chatID 已變更為: ${chatID}，準備更新 UI...`);
  // 當 chatID 首次被設定（從 undefined 變為一個數字）時，發送一個初始的「你好」訊息
  // 這樣後端會創建對話並返回第一個 AI 回覆
  if (messages.length === 0) { // 避免重複發送歡迎訊息
    handleBotAvatarClick(chatID); // 觸發歡迎訊息，並將 chatID 傳入
  }
}, [chatID]); 

  // 新建並獲取 chatID
  const getOrCreateChatId = async (): Promise<number | null> => {
    if (!user || !user.id) {
      console.error("無法創建聊天室：使用者未登入或 user.id 不存在");
      router.navigate('/auth/login'); 
      return null;
    }
    try {
      const response = await axios.post(AppConfig.api.endpoints.conversations, {
        userId: user.id,
        title: '新對話' // 可以給一個預設標題
      });
      
      const newChatId: number = response.data.id; // 後端返回的 id 應該是 number
      setChatID(newChatId); // 更新為 number 類型
      console.log(user.id, "後端獲取新的 chatID:", newChatId);
      return newChatId; 

    } 
    catch (error) {
      console.error('無法獲取或創建 chatID:', error);
      return null;
    }
  };
  
  // 發送消息到後端
  const sendMessageToModel = async (message: string, conversationIdOverride?: number): Promise<{ content: string; cards: ResultItem[]; newConversationId?: number; }> => {
    if (!user || !user.id) {
      console.error("無法發送訊息：使用者未登入");
      return { content: "錯誤：使用者未登入", cards: [] };
    }
    try {
      // 優先使用傳入的 conversationIdOverride，如果沒有，才用 state 中的 chatID
      const finalChatId = conversationIdOverride !== undefined ? conversationIdOverride : chatID;

      const response = await axios.post(AppConfig.api.endpoints.search, {
        userId: user.id,
        conversationId: finalChatId, // 直接傳遞 number 類型，undefined 也會被正確處理
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
      let returnedConversationId: number | undefined = undefined;
      
      if (response.data && typeof response.data === 'object') {
        aiAnswer = response.data.answer || ''; // 後端直接返回 answer 字段
        returnedConversationId = response.data.conversationId; // 提取後端返回的 conversationId

        if (response.data.welfareCards && Array.isArray(response.data.welfareCards)) {
          welfareCards = response.data.welfareCards.map((card: any) => ({
            id: card.id,
            title: card.title,
            url: `home/${card.id}`,   
            summary: card.summary, 
            location: card.location, 
            forward: card.forward, 
            categories: card.categories,
            detail: card.detail,
            publicationDate: card.publicationDate,
            applicationCriteria: card.applicationCriteria
          }));
        }
      } else if (typeof response.data === 'string') {
        aiAnswer = response.data;
      } else {
        aiAnswer = '收到回應但格式不正確';
      }

      // 返回一個包含 AI 回答、福利卡片和新的 conversationId 的物件
      return { content: aiAnswer || '抱歉，沒有收到有效回應', cards: welfareCards, newConversationId: returnedConversationId };
      
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
  const query = inputText;
    setInputText(""); // 清空輸入框
    await performAiSearch(query); // 呼叫共用的查詢函式
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
    performAiSearch(name); 
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
    if (!user || !user.id) return [];
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
        userID: user.id, // 您的用戶 ID，請替換成實際的
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
          categories:card.categories,
          detail: card.detail,
          publicationDate: card.publicationDate,
          applicationCriteria: card.applicationCriteria
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
  const handleBotAvatarClick = async (currentChatId?: number) => {
    setMessages((prev) => [...prev, { type: 'loading' }]);
    try {
      const { content, cards, newConversationId } = await sendMessageToModel('你好', currentChatId);

      if (newConversationId !== undefined) {
        setChatID(newConversationId); // 更新 chatID 為後端返回的最新對話 ID
      }

      setMessages((prev) => {
        const withoutLoading = prev.filter(m => m.type !== 'loading');
        return [...withoutLoading, { type: 'bot', content: content }];
      });
      setMessages((prev) => [...prev, { type: 'service', items: ewlfareItems }]);
    } catch (error) {
      setMessages((prev) => prev.filter(m => m.type !== 'loading')); // 移除 loading 訊息
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
  setMessages([]); // 清空當前訊息列表
  setChatID(undefined);
};

const performAiSearch = async (query: string) => {
    // 1. 在畫面上顯示使用者（或系統）的查詢意圖
    const userMessage: Message = { type: "user", content: query };
    const loadingMessage: Message = { type: "loading" };
    const nextMessages = [...messages, userMessage, loadingMessage];
    setMessages(nextMessages);

    try {
      // 步驟 A: 將新舊所有使用者訊息拼接成一個大的上下文字串
      const conversationContext = nextMessages
        .filter(m => m.type === 'user') // 只關心使用者說過的話
        .map(m => m.content)             // 取出文字內容
        .join(' ');                      // 用空格拼接起來
      console.log("完整的對話上下文:", conversationContext);

      // 步驟 B: 從這個完整的上下文中，找出最後提到的地區和類別
      let targetLocation: string | undefined;
      let targetCategory: string | undefined;

      // --- 地區提取 (從長到短排序檢查) ---
      for (const loc of sortedLocations) {
        const shortLoc = loc.slice(0, -1);
        if (conversationContext.includes(loc)) {
          targetLocation = loc;
          break; 
        }
        if (conversationContext.includes(shortLoc)) {
          targetLocation = loc;
          break; 
        }
      }

      // --- 類別提取 (使用同義詞字典 + 從長到短排序檢查) ---
      for (const keyword of sortedCategories) {
        if (conversationContext.includes(keyword)) {
          targetCategory = categorySynonyms[keyword] || keyword;
          break; 
        }
      }
    console.log(`從上下文中提取的過濾條件 -> 地區: ${targetLocation || '無'}, 類別: ${targetCategory || '無'}`);

      // 3. 呼叫後端 API (這部分不變)
      const { content: aiResponseContent, cards: rawWelfareCards,newConversationId  } = await sendMessageToModel(query,chatID);
      if (newConversationId !== undefined) {
              setChatID(newConversationId); // 更新 chatID 為後端返回的最新對話 ID
            }
      // 4. 移除載入中，並顯示 AI 的文字回覆
      setMessages((prev) => {
        const withoutLoading = prev.filter(m => m.type !== 'loading');
        return [...withoutLoading, { type: "bot", content: aiResponseContent }];
      });

      // 5. 二次過濾邏輯 (現在它會使用從上下文中提取的關鍵詞)
      if (rawWelfareCards && rawWelfareCards.length > 0) {
        
        const filteredCards = rawWelfareCards.filter(card => {
          let isMatch = true;

          if (targetLocation && card.location !== targetLocation) {
            isMatch = false;
          }

          if (targetCategory && Array.isArray(card.categories) && !card.categories.includes(targetCategory)) {
            isMatch = false;
          }
          
          return isMatch;
        });

        if (filteredCards.length > 0) {
          setMessages((prev) => [
            ...prev,
            { type: "result", resultItems: filteredCards }
          ]);
        } else {
          console.log(`二次過濾後，沒有找到完全符合條件的福利卡片。`);
        }
      }
    } catch (error) {
      // 錯誤處理
      setMessages((prev) => {
        const withoutLoading = prev.filter(m => m.type !== 'loading');
        return [...withoutLoading, { type: "bot", content: "查詢時發生錯誤，請稍後再試。" }];
      });
    } finally {
      // 無論成功或失敗，都滾動到底部
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
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
            {/* <Image source={{ uri: 'https://placehold.co/40' }} style={styles.avatarUser} /> */}
            <Text style={styles.userText}>{item.content}</Text>
            
          </View>
        );
         case 'bot':
          return (
            <View style={styles.botMessage}>
            {shouldShowAvatar ? (
              <Image source={botAvatar} style={styles.avatar} />
            ) : (
              // 如果不顯示頭像，放一個等寬的空白 View 來佔位，確保訊息能對齊
              <View style={styles.avatarPlaceholder} />
            )}
            {/* <View style={styles.botTextContainer}>
              <Markdown style={markdownStyles}>{item.content}</Markdown>
            </View> */}
              <View style={styles.botTextContainer}>
                <Markdown 
                  style={markdownStyles}
                  onLinkPress={(url) => {
                    console.log('攔截到 Markdown 連結點擊，URL:', url);

                    if (url.startsWith('/home/')) {
                      router.replace(url as any);
                      // *** 關鍵修改：明確返回 true，阻止預設行為 ***
                      return true; 
                    }
                    
                    if (url.startsWith('http' )) {
                      Linking.openURL(url);
                      // *** 關鍵修改：明確返回 true，阻止預設行為 ***
                      return true;
                    }

                    console.warn('未知的連結格式:', url);
                    // 對於未知的格式，返回 false，讓套件自己處理（如果它有預設行為的話）
                    return false;
                  }}
                >
                  {item.content}
                </Markdown>
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
                        console.log("item",item,"result",result);
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
                      {result.categories && <Text style={styles.resultLocation}>類別:{result.categories}</Text>}
                      {result.applicationCriteria && <Text style={styles.resultLocation}>申請條件:{result.applicationCriteria}</Text>}
                      
                      {result.forward && <Text style={styles.resultForward}>福利: {result.forward}</Text>}
                      
                      
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
      {/* 新增：頂部導航欄 */}
    <View style={styles.header}>
      <Text style={styles.headerTitle}>AI 助理</Text>
      <TouchableOpacity onPress={toggleRightDrawer} style={styles.settingsIcon}>
        <Ionicons name="options-outline" size={24} color="#374151" /> {/* 齒輪圖標 */}
      </TouchableOpacity>
    </View>
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
      <RightDrawer
      isVisible={isDrawerVisible}
      onClose={toggleRightDrawer}
    />
    </SafeAreaView>

  );
};

// 樣式
const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  settingsIcon: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
  },
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
  avatarUser: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
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
    height: 150,
    resizeMode: 'contain', 
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
  resultCatege: { // 如果您決定顯示 summary，請添加此樣式
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