import { COLORS } from "@/src/utils/colors";
import React, { useEffect, useRef, useState } from "react";
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
  Dimensions,
  Alert,
} from "react-native";
import axios from "axios";
import { useRouter } from "expo-router";
import Markdown, { RenderRules } from "react-native-markdown-display";
import { AppConfig } from "../../src/config/app.config";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../src/store";
import RightDrawer from "../../src/components/Mou/RightDrawer";
import { Ionicons } from "@expo/vector-icons";
import { resetNewChatSignal } from "../../src/store/slices/configSlice";
import { SafeAreaView } from "react-native-safe-area-context";
import { ewlfareItems } from "@/src/constants/chatData";
import { generateUserProfilePrompt } from "@/src/utils/chatUtils";
import WelfareResultList from "@/src/components/Mou/WelfareResultList";
import { Message, ChatApiResponse } from "@/src/type/chatTypes";

const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [chatID, setChatID] = useState<number | undefined>(undefined);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);

  const { user } = useSelector((state: RootState) => state.user);
  const { needsNewChat, autoInjectChatContext } = useSelector(
    (state: RootState) => state.config
  );

  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const botAvatar = require("@/assets/images/logo.jpeg");

  const toggleRightDrawer = () => setIsDrawerVisible(!isDrawerVisible);

  // --- 初始化與重置邏輯 ---
  useEffect(() => {
    const initializeChat = async () => {
      if (isStartingChat) return;
      setIsStartingChat(true);

      const isPersonalized =
        needsNewChat === "personalized" ||
        (needsNewChat !== "general" && !isInitialized);

      await startNewChat(isPersonalized);

      if (needsNewChat) {
        dispatch(resetNewChatSignal());
      }
      setIsStartingChat(false);
    };

    if (!isInitialized) {
      initializeChat();
      setIsInitialized(true);
    } else if (needsNewChat) {
      initializeChat();
    }
  }, [isInitialized, needsNewChat, dispatch]);

  // --- 權限檢查 ---
  useEffect(() => {
    if (shouldRedirect) {
      router.navigate("/auth/login");
    }
  }, [shouldRedirect]);

  // --- 核心：啟動新對話 ---
  const startNewChat = async (isPersonalized: boolean) => {
    // 1. 清空狀態
    setMessages([]);
    setChatID(undefined); // 重要：重置 ID，讓後端知道要創新對話

    // 2. 構建初始問候語 (包含 Prompt Injection)
    let initialQuery = "你好";
    if (isPersonalized && autoInjectChatContext && user) {
      const userProfilePrompt = generateUserProfilePrompt(user);
      if (userProfilePrompt) {
        initialQuery = `你好 (${userProfilePrompt})`;
      }
    }

    // 3. 執行第一次搜尋 (ConversationId 為 undefined)
    await performAiSearch(initialQuery, { isHidden: false });

    // 4. 顯示初始引導卡片
    setMessages((prev) => [...prev, { type: "service", items: ewlfareItems }]);
  };

  // --- 核心：呼叫統一 API ---
  const sendMessageToBackend = async (
    query: string,
    conversationId?: number
  ): Promise<ChatApiResponse | null> => {
    if (!user?.id) {
      setShouldRedirect(true);
      return null;
    }

    try {
      const response = await axios.post<ChatApiResponse>(
        AppConfig.api.endpoints.search, // 確保這裡是 /search
        {
          userId: user.id,
          conversationId: conversationId, // 如果是 undefined，後端會創建新對話
          query: query,
        },
        { timeout: 45000 } // AI 處理可能較慢，設長一點
      );
      return response.data;
    } catch (error: any) {
      console.error("API Error:", error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) setShouldRedirect(true);
      }
      return null;
    }
  };

  // --- 核心：執行搜尋並更新 UI ---
  const performAiSearch = async (
    query: string,
    options: { isHidden?: boolean } = {} // isHidden 用於隱藏 Prompt Injection 的長字串
  ) => {
    // 1. 顯示使用者訊息 (如果不是隱藏的系統指令)
    // 通常第一次的 Prompt Injection 我們不希望使用者看到 "你好 (我的背景是...)" 這麼長
    const displayQuery = query.includes("我的個人背景資料是") ? "你好" : query;

    if (!options.isHidden) {
      setMessages((prev) => [...prev, { type: "user", content: displayQuery }]);
    }

    // 2. 顯示 Loading
    setMessages((prev) => [...prev, { type: "loading" }]);

    try {
      // 3. 呼叫 API (帶入目前的 chatID)
      const data = await sendMessageToBackend(query, chatID);

      // 移除 Loading
      setMessages((prev) => prev.filter((m) => m.type !== "loading"));

      if (data) {
        // 4. 更新 ChatID (如果是新對話，後端會回傳新的 ID)
        if (data.isNewConversation || data.conversationId) {
          setChatID(data.conversationId);
        }

        // 5. 顯示 AI 回答
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            content: data.answer,
            relatedQuestions: data.relatedQuestions, // 儲存相關問題供未來使用
          },
        ]);

        // 6. 顯示福利卡片 (後端已經計算好燈號與過濾，前端直接顯示)
        if (data.welfareCards && data.welfareCards.length > 0) {
          // 轉換後端資料格式為前端組件需要的格式 (加上 url 屬性)
          const mappedCards = data.welfareCards.map((card) => ({
            ...card,
            url: `home/${card.id}`, // 前端路由
          }));

          setMessages((prev) => [
            ...prev,
            { type: "result", resultItems: mappedCards },
          ]);
        }

        // (可選) 顯示偵測到的身份 Debug 資訊
        if (data.detectedIdentities?.length > 0) {
          console.log(
            "Backend detected:",
            data.detectedIdentities,
            data.detectedLocation
          );
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { type: "bot", content: "抱歉，伺服器暫時沒有回應，請稍後再試。" },
        ]);
      }
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m.type !== "loading"));
      setMessages((prev) => [...prev, { type: "bot", content: "發生錯誤" }]);
    } finally {
      // 滾動到底部
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        100
      );
    }
  };

  // --- UI 事件處理 ---

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const query = inputText;
    setInputText("");

    // 如果是後續對話，且需要個人化，這裡也可以選擇是否要再次注入 Context
    // 但通常第一次注入後，Conversation History 就有了，所以直接送 Query 即可
    await performAiSearch(query, { isHidden: false });
  };

  const handleServiceClick = (name: string) => {
    // 點擊分類卡片，直接送出該分類名稱
    performAiSearch(`我想查詢${name}相關的資訊`, { isHidden: false });
  };

  const handleNewChat = () => {
    // 手動觸發新對話
    startNewChat(autoInjectChatContext);
  };

  // --- 渲染邏輯 ---

  const customRenderRules: RenderRules = {
    link: (node, children, _, __) => {
      const url = node.attributes.href;
      const isInternalLink = url.startsWith("/home/");
      const handlePress = () => {
        if (isInternalLink) {
          router.navigate({ pathname: url, params: { sourcePage: "chat" } });
        } else {
          console.warn("External link", url);
        }
      };
      return (
        <Text
          key={node.key}
          style={{
            color: isInternalLink ? "blue" : "#333",
            textDecorationLine: isInternalLink ? "underline" : "none",
          }}
          onPress={handlePress}
        >
          {children}
        </Text>
      );
    },
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const nextMessage =
      index < messages.length - 1 ? messages[index + 1] : null;
    const isSameSenderAsNext =
      nextMessage && (item.type === "user") === (nextMessage.type === "user");
    const shouldShowAvatar = !isSameSenderAsNext;

    switch (item.type) {
      case "user":
        return (
          <View style={styles.userMessage}>
            <Text style={styles.userText}>{item.content}</Text>
          </View>
        );
      case "bot":
        return (
          <View style={styles.botMessage}>
            {shouldShowAvatar ? (
              <Image source={botAvatar} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
            <View style={styles.botTextContainer}>
              <Markdown rules={customRenderRules}>{item.content}</Markdown>
              {/* 這裡可以選擇性顯示 relatedQuestions */}
            </View>
          </View>
        );
      case "service":
        return (
          <View style={styles.botMessage}>
            <TouchableOpacity>
              <Image source={botAvatar} style={styles.avatar} />
            </TouchableOpacity>
            <FlatList
              horizontal
              data={item.items}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item: service }) => (
                <TouchableOpacity
                  style={styles.serviceCard}
                  onPress={() => handleServiceClick(service.name)}
                >
                  <Image source={service.image} style={styles.serviceImage} />
                  <Text style={styles.serviceText}>{service.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        );
      case "result":
        return (
          <View style={styles.botMessage}>
            {shouldShowAvatar ? (
              <Image source={botAvatar} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
            <WelfareResultList data={item.resultItems || []} />
          </View>
        );
      case "loading":
        return (
          <View style={styles.botMessage}>
            <Image source={botAvatar} style={styles.avatar} />
            <View style={styles.loading}>
              <Text>加載中 </Text>
              <ActivityIndicator size="small" color="#22c55e" />
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: COLORS.background }}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>阿哞福利查詢</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={handleNewChat} style={styles.newChatIcon}>
            <Ionicons name="add-circle-outline" size={28} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleRightDrawer}
            style={styles.settingsIcon}
          >
            <Ionicons name="options-outline" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
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
            onSubmitEditing={handleSendMessage} // 增加 Enter 發送
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendMessage}
          >
            <Ionicons name="send" size={28} color={COLORS.background} />
          </TouchableOpacity>
        </View>
      </View>
      <RightDrawer isVisible={isDrawerVisible} onClose={toggleRightDrawer} />
    </SafeAreaView>
  );
};

const { width } = Dimensions.get("window");
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  settingsIcon: { padding: 10, borderRadius: 10, backgroundColor: "#f9fafb" },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  newChatIcon: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    marginRight: 8,
  },
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  scrollContent: { padding: 16, paddingBottom: 80 },
  userMessage: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 16,
  },
  userText: {
    backgroundColor: "#a3e635",
    padding: 12,
    borderRadius: 8,
    maxWidth: width * 0.7,
    fontSize: 16,
  },
  botMessage: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  avatarPlaceholder: { width: 40, marginRight: 10 },
  serviceCard: {
    width: 160,
    height: 224,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  serviceImage: { width: "100%", height: 150, resizeMode: "contain" },
  serviceText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  loading: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  input: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 9,
    borderRadius: 8,
    justifyContent: "center",
  },
  botTextContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    borderRadius: 8,
    maxWidth: width * 0.7,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
});

export default App;
