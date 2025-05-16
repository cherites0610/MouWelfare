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

// 定義類型
interface Item {
  id: number;
  name: string;
  image: ImageSourcePropType;
}

interface ResultItem {
  title: string;
  url: string;
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
    { id: 1, name: '家庭與育兒福利', image: require("@/assets/images/Mou/baby.jpg") },
    { id: 2, name: '教育福利', image: require("@/assets/images/Mou/school.jpg") },
    { id: 3, name: '健康與醫療福利', image: require("@/assets/images/Mou/school.jpg") },
    { id: 4, name: '老人與退休福利', image: require("@/assets/images/Mou/school.jpg") },
    { id: 5, name: '低收入戶與弱勢族群', image: require("@/assets/images/Mou/school.jpg") },
    { id: 6, name: '殘疾與特殊需求福利', image: require("@/assets/images/Mou/school.jpg") },
    { id: 7, name: '就業與創業福利', image: require("@/assets/images/Mou/school.jpg") },
    { id: 8, name: '社會安全與基本生活支援', image: require("@/assets/images/Mou/school.jpg") },
    { id: 9, name: '兒童及少年福利', image: require("@/assets/images/Mou/school.jpg") },
    { id: 10, name: '其他特定族群福利', image: require("@/assets/images/Mou/school.jpg") },
  ];

  const taiwanItems: Item[] = [
    { id: 1, name: '北區', image: require("@/assets/images/Mou/school.jpg") },
    { id: 2, name: '中區', image: require("@/assets/images/Mou/school.jpg") },
    { id: 3, name: '南區', image: require("@/assets/images/Mou/school.jpg") },
    { id: 4, name: '東區', image: require("@/assets/images/Mou/school.jpg") },
  ];

  const northItems: Item[] = [
    { id: 1, name: '台北市', image: require("@/assets/images/Mou/school.jpg") },
    { id: 2, name: '新北市', image: require("@/assets/images/Mou/school.jpg") },
    { id: 3, name: '基隆市', image: require("@/assets/images/Mou/school.jpg") },
    { id: 4, name: '桃園市', image: require("@/assets/images/Mou/school.jpg") },
    { id: 5, name: '宜蘭縣', image: require("@/assets/images/Mou/school.jpg") },
    { id: 6, name: '新竹縣', image: require("@/assets/images/Mou/school.jpg") },
    { id: 7, name: '新竹市', image: require("@/assets/images/Mou/school.jpg") },
  ];

  const midItems: Item[] = [
    { id: 8, name: '台中市', image: require("@/assets/images/Mou/school.jpg") },
    { id: 9, name: '苗栗縣', image: require("@/assets/images/Mou/school.jpg") },
    { id: 10, name: '彰化縣', image: require("@/assets/images/Mou/school.jpg") },
    { id: 11, name: '南投縣', image: require("@/assets/images/Mou/school.jpg") },
    { id: 12, name: '雲林縣', image: require("@/assets/images/Mou/school.jpg") },
  ];

  const southItems: Item[] = [
    { id: 13, name: '高雄市', image: require("@/assets/images/Mou/school.jpg") },
    { id: 14, name: '台南市', image: require("@/assets/images/Mou/school.jpg") },
    { id: 15, name: '嘉義市', image: require("@/assets/images/Mou/school.jpg") },
    { id: 16, name: '嘉義縣', image: require("@/assets/images/Mou/school.jpg") },
    { id: 17, name: '屏東縣', image: require("@/assets/images/Mou/school.jpg") },
  ];

  const eastItems: Item[] = [
    { id: 18, name: '花蓮縣', image: require("@/assets/images/Mou/school.jpg") },
    { id: 19, name: '台東縣', image: require("@/assets/images/Mou/school.jpg") },
  ];

  const botAvatar = require("@/assets/images/logo.png")

  // 初始化
  useEffect(() => {
    // 插入初始服務卡片
    setMessages([{ type: 'service', items: ewlfareItems }]);
    // 獲取 chatID
    getChatId();
  }, []);

  // 獲取 chatID
  const getChatId = async () => {
    // try {
    //   // const result = await mouRequest.get('application/6236a802-a99f-11ef-86e8-0242ac110002/chat/open');
    //   setChatID(result.data.data);
    // } catch (error) {
    //   Alert.alert('錯誤', '無法獲取 chatID');
    // }
  };

  // 發送消息到後端
  const sendMessageToModel = async (message: string): Promise<string> => {
    // const result = await mouRequest.post(`/application/chat_message/${chatID}`, {
    // message,
    // re_chat: false,
    // stream: false,
    // });
    // return result.data.data.content;
    return "當前為測試環境\n為避免api超出費用\n請切換至生產環境"
  };

  // 處理用戶輸入
  const handleSendMessage = async () => {
    if (!inputText.trim()) {
      Alert.alert('錯誤', '請輸入問題');
      return;
    }

    // 插入用戶消息
    setMessages((prev) => [...prev, { type: 'user', content: inputText }]);
    setInputText('');

    // 插入加載中
    setMessages((prev) => [...prev, { type: 'loading' }]);

    try {
      const result = await sendMessageToModel(inputText);
      // 移除加載中，插入結果
      setMessages((prev) => [...prev.slice(0, -1), { type: 'bot', content: result }]);
    } catch (error) {
      // 移除加載中，插入錯誤提示
      setMessages((prev) => [...prev.slice(0, -1), { type: 'bot', content: '發生錯誤，請重新輸入' }]);
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
              data={item.resultItems}
              renderItem={({ item: result }) => (
                <TouchableOpacity
                  style={styles.resultCard}
                  onPress={() => {
                    if (result.url !== 'home') {
                      // 需要實現 URL 跳轉邏輯
                      Alert.alert('提示', `跳轉到 ${result.url}`);
                    } else {
                      setMessages([{ type: 'service', items: ewlfareItems }]);
                    }
                  }}
                >
                  <Text style={styles.resultText}>{result.title}</Text>
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
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 16,
  },
  userText: {
    backgroundColor: '#a3e635',
    padding: 12,
    borderRadius: 8,
    maxWidth: width * 0.7,
    marginRight: 8,
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
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    marginBottom: 12,
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