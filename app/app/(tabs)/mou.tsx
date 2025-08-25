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
import { Platform,Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
}

// 主組件
const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [chatID, setChatID] = useState<string>('');
  const [selectedService, setSelectedService] = useState<number>(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // 數據
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
    // 插入初始服務卡片
    setMessages([{ type: 'service', items: ewlfareItems }]);
    // 獲取 chatID
    const initializeChat = async () => {
      const id = await getOrCreateChatId();
      if (id) {
        // 確保 chatID 已經設置後再載入歷史對話
        loadChatHistory(id); 
      }
    };
    initializeChat();
  }, []);

  // 獲取 chatID
  const getOrCreateChatId = async () => {
    try {
      // 1. 嘗試從 AsyncStorage 載入 chatID
      const storedChatId = await AsyncStorage.getItem("current_chat_id");
      if (storedChatId) {
        setChatID(storedChatId);
        console.log("從 AsyncStorage 載入 chatID:", storedChatId);
        return storedChatId; // 返回載入的 chatID
      }

      // 2. 如果 AsyncStorage 中沒有，則向後端請求新的 chatID
      const baseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
      // 注意：這裡的 userId 應該是您應用程式中實際的用戶 ID
      // 如果沒有用戶登入系統，您可以生成一個 UUID 並儲存起來作為匿名用戶的 ID
      const userId = '06d55800-9a60-4a33-9777-e6ac439b82e7'; // 請替換為實際的用戶 ID

      const response = await axios.post(`${baseUrl}/vertex/conversations`, {
        userId: userId,
        title: '新對話' // 可以給一個預設標題
      });
      
      const newChatId = response.data.conversationId.toString();
      setChatID(newChatId);
      await AsyncStorage.setItem("current_chat_id", newChatId); // 儲存新的 chatID 到 AsyncStorage
      console.log("從後端獲取並儲存新的 chatID:", newChatId);
      return newChatId; // 返回新的 chatID

    } catch (error) {
      console.error('無法獲取或創建 chatID:', error);
      Alert.alert('錯誤', '無法獲取或創建 chatID');
      return null; // 發生錯誤時返回 null
    }
  };
  // const getChatId = async () => {
  //   // try {
  //   //   const result = await mouRequest.get('application/6236a802-a99f-11ef-86e8-0242ac110002/chat/open');
      
  //   //   setChatID(result.data.data);
  //   // } catch (error) {
  //   //   Alert.alert('錯誤', '無法獲取 chatID');
  //   // }
  // };
  const loadChatHistory = async (currentChatId: string) => {
    if (!currentChatId) return; // 確保 chatID 存在

    try {
      const baseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
      const userId = '06d55800-9a60-4a33-9777-e6ac439b82e7'; // 請替換為實際的用戶 ID，與 getOrCreateChatId 中的保持一致

      // 向後端發送請求，獲取特定 chatID 下的所有歷史訊息
      const response = await axios.get(`${baseUrl}/vertex/conversations/${userId}/${currentChatId}`);
      
      // 後端返回的 messages 列表
      const historyMessages: Message[] = response.data.messages.map((msg: any) => {
        // 根據後端返回的 role 判斷訊息類型
        let type: Message['type'];
        if (msg.role === 'user') {
          type = 'user';
        } else if (msg.role === 'ai') {
          type = 'bot'; // 將 ai 角色映射為 bot 類型
        } else {
          type = 'bot'; // 預設為 bot，或者根據實際情況處理其他類型
        }

        // 處理 content 和可能的 welfareCards
        const messageContent = msg.content;
        const welfareCards = msg.welfareCards; // 後端直接返回 welfareCards 陣列

        // 根據類型構建 Message 對象
        if (type === 'bot' && welfareCards && welfareCards.length > 0) {
          // 如果是機器人訊息且包含福利卡片，則可能需要拆分成兩條訊息
          // 一條是文字回覆，一條是結果卡片
          // 這裡為了簡化，我們將文字和卡片都放在 bot 訊息中，或者只顯示文字
          // 更複雜的處理會在後續 UI/UX 優化中考慮
          return { 
            type: type, 
            content: messageContent, 
            resultItems: welfareCards.map((card: any) => ({
              title: card.title,
              url: `home/${card.id}`,   
              summary: card.summary, 
              location: card.location, 
              forward: card.forward, 
            }))
          };
        } else {
          return { type: type, content: messageContent };
        }
      });

      // 將歷史訊息添加到當前訊息列表的最前面
      // 注意：這裡我們將初始服務卡片保留，然後將歷史訊息放在其後面
      // 如果您希望歷史訊息完全覆蓋初始服務卡片，可以調整這裡的邏輯
      setMessages((prev) => {
        // 過濾掉初始的服務卡片，如果它不是歷史對話的一部分
        const initialServiceCard = prev.find(m => m.type === 'service');
        const filteredPrev = initialServiceCard ? [initialServiceCard] : [];
        return [...filteredPrev, ...historyMessages];
      });
      
      // 自動滾動到底部
      scrollViewRef.current?.scrollToEnd({ animated: false });

    } catch (error) {
      console.error('載入歷史對話失敗:', error);
      Alert.alert('錯誤', '無法載入歷史對話');
    }
  };

  // 發送消息到後端
  const sendMessageToModel = async (message: string): Promise<{ content: string; cards: ResultItem[]; }> => {
    try {
      const baseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
      const userId = '06d55800-9a60-4a33-9777-e6ac439b82e7'; // 請替換為實際的用戶 ID，與 getOrCreateChatId 中的保持一致

      const response = await axios.post(`${baseUrl}/vertex/search`, {
        userId: userId, // 傳遞用戶 ID
        conversationId: chatID ? parseInt(chatID) : undefined, // 傳遞 chatID，如果存在則轉換為數字
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
      let returnedConversationId: string = ''; // 新增：用於接收後端返回的 conversationId
      
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
            title: card.title,
            url: `home/${card.id}`,   
            summary: card.summary, 
            location: card.location, 
            forward: card.forward, 
          }));
        }

        // 提取後端返回的 conversationId
        if (response.data.conversationId) {
          returnedConversationId = response.data.conversationId.toString();
        }

      } else if (typeof response.data === 'string') {
        aiAnswer = response.data;
      } else {
        aiAnswer = '收到回應但格式不正確';
      }
      
      // 如果後端返回了新的 conversationId，更新前端的 chatID 狀態
      if (returnedConversationId && returnedConversationId !== chatID) {
        setChatID(returnedConversationId);
        AsyncStorage.setItem("current_chat_id", returnedConversationId); // 同步更新 AsyncStorage
        console.log("後端返回新的 conversationId，已更新 chatID:", returnedConversationId);
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
//   const sendMessageToModel = async (message: string): Promise<{ content: string; cards: ResultItem[]; }> => {
//   try {
//     const baseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
//     const response = await axios.post(`${baseUrl}/vertex/search`, {
//       query: message
//     }, {
//       timeout: 30000, // 30 秒超時
//       headers: {
//         'Content-Type': 'application/json',
//       }
//     });
    
//     // 處理回應資料
//     let aiAnswer: string = '';
//     let welfareCards: ResultItem[] = [];
    
//     // 檢查 response.data 是否為物件，並提取 answer 和 welfareCards
//     if (response.data && typeof response.data === 'object') {
//       if (response.data.answer) {
//         aiAnswer = response.data.answer;
//       } else {
//         // 如果沒有 answer 字段，但有其他內容，可以將整個物件字串化作為備用
//         aiAnswer = JSON.stringify(response.data);
//       }

//       // 提取 welfareCards
//       if (response.data.welfareCards && Array.isArray(response.data.welfareCards)) {
//         welfareCards = response.data.welfareCards.map((card: any) => ({
//           title: card.title,
//           url: `home/${card.id}`,   // 模板字串寫法
//           summary: card.summary, // 根據您的 ResultItem 介面添加
//           location: card.location, // 根據您的 ResultItem 介面添加
//           forward: card.forward, // 根據您的 ResultItem 介面添加
//         }));
//       }

//     } else if (typeof response.data === 'string') {
//       // 如果後端直接返回字串，則直接使用
//       aiAnswer = response.data;
//     } else {
//       aiAnswer = '收到回應但格式不正確';
//     }
    
//     // 返回一個包含 AI 回答和福利卡片的物件
//     return { content: aiAnswer || '抱歉，沒有收到有效回應', cards: welfareCards };
    
//   } catch (error) {
//     console.error('Vertex AI 查詢失敗:', error);
    
//     let errorMessage = '發生未知錯誤，請稍後再試';
//     if (axios.isAxiosError(error)) {
//       if (error.response) {
//         const status = error.response.status;
//         const message = error.response.data?.message || '未知伺服器錯誤';
//         errorMessage = `伺服器錯誤 (${status}): ${message}`;
//       } else if (error.request) {
//         errorMessage = '網路連線錯誤，請檢查：\n1. 後端服務是否正在運行\n2. 網路連線是否正常\n3. URL 設定是否正確';
//       } else if (error.code === 'ECONNABORTED') {
//         errorMessage = '請求超時，AI 處理時間較長，請稍後再試';
//       }
//     }
//     // 即使發生錯誤，也返回一個包含錯誤訊息和空卡片的物件
//     return { content: errorMessage, cards: [] };
//   }
// };

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
    setMessages((prev) => [...prev.slice(0, -1), { type: "bot", content: aiResponseContent }]);

    // 如果有福利卡片，則將它們作為新的訊息類型插入
    if (welfareCards && welfareCards.length > 0) {
      setMessages((prev) => [
        ...prev,
        { type: "result", resultItems: welfareCards } // 使用 resultItems 來顯示卡片
      ]);
    }

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

  // 處理最終結果
  const handleResult = (input: [number, number, string, number]) => {
    // 模擬查詢結果（需要實現後端邏輯）
    const result: ResultItem[] = [{ title: '未找到相關福利\n點擊返回主界面', url: 'home' }];
    setMessages((prev) => [...prev, { type: 'result', resultItems: result }]);
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  // 渲染消息
  const renderMessage = ({ item }: { item: Message }) => {
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
            <Image source={{ uri: 'https://via.placeholder.com/40' }} style={styles.avatar} />
            <Text style={styles.botText}>{item.content}</Text>
          </View>
        );
      case 'service':
        return (
          <View style={styles.botMessage}>
            <Image source={botAvatar} style={styles.avatar} />
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
            <Image source={botAvatar} style={styles.avatar} />
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
                <Image source={botAvatar} style={styles.avatar} />
                <FlatList
                  horizontal={true} // 啟用橫向滑動
                  showsHorizontalScrollIndicator={false} // 隱藏橫向滾動條
                  data={item.resultItems}
                  renderItem={({ item: result }) => (
                    <TouchableOpacity
                      style={styles.resultCard} // 將在此樣式中設定寬高
                      onPress={() => {
                        if (result.url && result.url !== 'home') {
                          Linking.openURL(result.url).catch(err => 
                            Alert.alert('錯誤', `無法打開連結: ${result.url}`)
                          );
                        } else if (result.url === 'home') {
                          setMessages([{ type: 'service', items: ewlfareItems }]);
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
            value={inputText}
            onChangeText={setInputText}
            placeholder="輸入問題..."
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
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
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
});

export default App;