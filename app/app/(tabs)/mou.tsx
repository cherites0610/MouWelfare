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
  Alert,
  Dimensions,
  ImageSourcePropType,
  Linking,
} from "react-native";
import axios from "axios";
import { useRouter } from "expo-router";
import Markdown, { RenderRules } from "react-native-markdown-display";
import { AppConfig } from "../../src/config/app.config";
import { useDispatch, useSelector } from "react-redux"; // 1. 匯入 useSelector
import { AppDispatch, RootState } from "../../src/store"; // 2. 匯入 RootState 型別
import RightDrawer from "../../src/components/Mou/RightDrawer";
import { Ionicons } from "@expo/vector-icons";
import { resetNewChatSignal } from "../../src/store/slices/configSlice";
import { User } from "../../src/type/user";
import { SafeAreaView } from "react-native-safe-area-context";

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
  id?: string;
  summary?: string;
  location?: string;
  forward?: string[];
  categories?: string[];
  detail?: string;
  publicationDate?: string;
  applicationCriteria?: string[];
  lightStatus?: number;
  lightReason?: string[];
}

interface Message {
  type: "user" | "bot" | "service" | "place" | "result" | "loading";
  content?: string;
  items?: Item[];
  resultItems?: ResultItem[];
  showAvatar?: boolean;
  conversationId?: string;
}

const getLightColor = (status: number | undefined) => {
  switch (status) {
    case 1:
      return COLORS.light_green;
    case 2:
      return COLORS.light_yellow;
    case 3:
      return COLORS.light_red;
    default:
      return COLORS.light_yellow;
  }
};

const getLightText = (status: number | undefined) => {
  switch (status) {
    case 1:
      return "符合領取資格!";
    case 2:
      return "不一定符合領取資格!";
    case 3:
      return "不符合領取資格!";
    default:
      return "不一定符合領取資格!";
  }
};

const generateUserProfilePrompt = (user: User | null): string => {
  if (!user) {
    return "";
  }
  const profileParts: string[] = [];
  // 1. 處理地區
  if (user.location?.name) {
    profileParts.push(`${user.location.name}`);
  }
  // 2. 處理身分
  if (user.identities && user.identities.length > 0) {
    const identityNames = user.identities.map((id) => id.name).join("、");
    profileParts.push(`身分為 ${identityNames}`);
  }
  // 3. 處理生日/年齡 (如果後端 AI 能理解年齡更好)
  if (user.birthday) {
    // 簡單起見，可以直接傳遞生日，或是在前端計算年齡
    const birthDate = new Date(user.birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    profileParts.push(`目前年齡大約 ${age} 歲`);
  }
  // 4. 處理性別
  if (user.gender) {
    profileParts.push(`性別為 ${user.gender}`);
  }
  if (profileParts.length === 0) {
    return "";
  }
  // 將所有部分組合成一句話
  return `我的個人背景資料是：${profileParts.join("，")}。`;
};

// 主組件
const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [chatID, setChatID] = useState<number | undefined>(undefined);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [selectedService, setSelectedService] = useState<number>(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const { width } = Dimensions.get("window");
  const { user } = useSelector((state: RootState) => state.user);
  const { autoFilterUserData, needsNewChat } = useSelector(
    (state: RootState) => state.config
  );
  const autoInjectChatContext = useSelector(
    (state: RootState) => state.config.autoInjectChatContext
  );
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  // 數據
  const categorySynonyms: { [key: string]: string[] } = {
    兒童: ["兒童及青少年福利"],
    小孩: ["兒童及青少年福利"],
    兒少: ["兒童及青少年福利"],
    青少年: ["兒童及青少年福利"],
    孩童: ["兒童及青少年福利"],
    少年: ["兒童及青少年福利"],
    學生: ["兒童及青少年福利"], // 身份
    學費: ["兒童及青少年福利"], // 需求
    就學: ["兒童及青少年福利"], // 情境
    獎學金: ["兒童及青少年福利"], // 具體項目
    扶養: ["兒童及青少年福利"], // 動作/情境

    // --- 婦女與幼兒福利 ---
    // 目的：捕捉所有與母親、懷孕、新生兒相關的詞彙
    婦女: ["婦女與幼兒福利"],
    媽媽: ["婦女與幼兒福利"],
    母親: ["婦女與幼兒福利"],
    孕婦: ["婦女與幼兒福利"], // 身份
    懷孕: ["婦女與幼兒福利"], // 情境
    生育: ["婦女與幼兒福利"], // 情境
    生產: ["婦女與幼兒福利"], // 情境
    產後: ["婦女與幼兒福利"], // 情境
    坐月子: ["婦女與幼兒福利"], // 情境
    單親: ["婦女與幼兒福利", "社會救助福利"], // 單親家庭常同時需要這兩類協助

    // --- 育兒與幼兒（交叉類別） ---
    // 目的：這些詞彙同時與母親和孩子相關，對應到兩個分類最精準
    育兒: ["婦女與幼兒福利", "兒童及青少年福利"],
    托育: ["兒童及青少年福利", "婦女與幼兒福利"],
    幼兒: ["婦女與幼兒福利", "兒童及青少年福利"],
    托嬰: ["婦女與幼兒福利", "兒童及青少年福利"],
    嬰兒: ["婦女與幼兒福利", "兒童及青少年福利"],

    // --- 老人福利 ---
    // 目的：捕捉所有與年長者、退休、照護相關的詞彙
    老人: ["老人福利"],
    長者: ["老人福利"],
    長輩: ["老人福利"],
    銀髮族: ["老人福利"],
    阿公: ["老人福利"],
    阿嬤: ["老人福利"],
    獨居: ["老人福利", "社會救助福利"], // 獨居老人常需要社會救助
    退休: ["老人福利"], // 情境
    長照: ["老人福利"], // 需求 (長期照顧)
    敬老: ["老人福利"], // 相關詞彙 (敬老卡)
    安養: ["老人福利"], // 需求
    養老: ["老人福利"], // 情境
    假牙: ["老人福利"], // 具體項目

    // --- 社會救助福利 ---
    // 目的：這是最廣泛的，捕捉所有與經濟困難、生活突發狀況相關的詞彙
    救助: ["社會救助福利"],
    補助: ["社會救助福利"],
    津貼: ["社會救助福利"],
    急難: ["社會救助福利"], // 情境 (急難救助)
    困難: ["社會救助福利"], // 情境 (生活困難)
    失業: ["社會救助福利"], // 情境
    沒工作: ["社會救助福利"], // 口語化
    租屋: ["社會救助福利"], // 需求 (租屋補助)
    房租: ["社會救助福利"], // 需求
    醫療: ["社會救助福利", "身心障礙福利"], // 醫療補助可能屬於兩者
    醫藥費: ["社會救助福利"], // 需求
    清寒: ["社會救助福利"], // 身份
    弱勢: ["社會救助福利"], // 身份
    低收入: ["社會救助福利"], // 身份

    // --- 身心障礙福利 ---
    // 目的：捕捉所有與身心障礙者相關的正式、口語及需求詞彙
    身心障礙: ["身心障礙福利"],
    身障: ["身心障礙福利"],
    殘障: ["身心障礙福利"],
    障友: ["身心障礙福利"], // 社群稱呼
    行動不便: ["身心障礙福利"], // 情境描述
    輔具: ["身心障礙福利"], // 需求 (輔具補助)
    復健: ["身心障礙福利"], // 需求
    照護: ["身心障礙福利", "老人福利"], // 照護需求同時與長者和身障者相關
  };

  const ewlfareItems: Item[] = [
    {
      id: 1,
      name: "兒童及青少年福利",
      image: require("@/assets/images/Mou/baby.jpeg"),
    },
    {
      id: 2,
      name: "婦女與幼兒福利",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
    {
      id: 3,
      name: "老人福利",
      image: require("@/assets/images/Mou/elderly.jpeg"),
    },
    {
      id: 4,
      name: "社會救助福利",
      image: require("@/assets/images/Mou/elderly.jpeg"),
    },
    {
      id: 5,
      name: "身心障礙福利",
      image: require("@/assets/images/Mou/accessibility.jpeg"),
    },
    { id: 6, name: "其他", image: require("@/assets/images/Mou/school.jpeg") },
  ];

  const northItems: Item[] = [
    {
      id: 1,
      name: "臺北市",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
    {
      id: 2,
      name: "新北市",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
    {
      id: 3,
      name: "基隆市",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
    {
      id: 4,
      name: "桃園市",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
    {
      id: 5,
      name: "宜蘭縣",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
    {
      id: 6,
      name: "新竹縣",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
    {
      id: 7,
      name: "新竹市",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
  ];

  const midItems: Item[] = [
    {
      id: 8,
      name: "臺中市",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
    {
      id: 9,
      name: "苗栗縣",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
    {
      id: 10,
      name: "彰化縣",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
    {
      id: 11,
      name: "南投縣",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
    {
      id: 12,
      name: "雲林縣",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
  ];

  const southItems: Item[] = [
    {
      id: 13,
      name: "高雄市",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
    {
      id: 14,
      name: "臺南市",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
    {
      id: 15,
      name: "嘉義市",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
    {
      id: 16,
      name: "嘉義縣",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
    {
      id: 17,
      name: "屏東縣",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
  ];

  const eastItems: Item[] = [
    {
      id: 18,
      name: "花蓮縣",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
    {
      id: 19,
      name: "臺東縣",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
  ];

  const offshoreItems: Item[] = [
    {
      id: 20,
      name: "澎湖縣",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
    {
      id: 21,
      name: "金門縣",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
    {
      id: 22,
      name: "連江縣",
      image: require("@/assets/images/Mou/school.jpeg"),
    },
  ];
  const botAvatar = require("@/assets/images/logo.jpeg");
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const toggleRightDrawer = () => {
    setIsDrawerVisible(!isDrawerVisible);
  };

  // 建立一個包含所有縣市名稱的 Set，方便快速查找
  const sortedCategories = React.useMemo(
    () =>
      [
        ...Object.keys(categorySynonyms), // 取得所有同義詞，如 ['兒童', '小孩', ...]
        ...ewlfareItems.map((i) => i.name), // 取得所有正式類別名稱
      ].sort((a, b) => b.length - a.length),
    []
  );
  const sortedLocations = React.useMemo(
    () =>
      [
        ...northItems.map((i) => i.name),
        ...midItems.map((i) => i.name),
        ...southItems.map((i) => i.name),
        ...eastItems.map((i) => i.name),
        ...offshoreItems.map((i) => i.name),
      ].sort((a, b) => b.length - a.length),
    [] // 空依賴陣列，確保只計算一次
  );

  useEffect(() => {
    const initializeChat = async () => {
      if (isStartingChat) return;
      setIsStartingChat(true);

      // 簡化後的 switch 邏輯
      switch (needsNewChat) {
        case "personalized":
          console.log("偵測到 'personalized' 信號，啟動個人化新對話...");
          await startNewChat(true);
          break;
        case "general":
          console.log("偵測到 'general' 信號，啟動通用新對話...");
          await startNewChat(false);
          break;
        default:
          // 只有在首次渲染時 (isInitialized 為 false)，才執行此處
          console.log("App 首次加載，啟動普通新對話...");
          await startNewChat(false);
          break;
      }

      if (needsNewChat) {
        dispatch(resetNewChatSignal());
      }

      setIsStartingChat(false);
    };

    // 簡化後的觸發條件
    if (!isInitialized) {
      initializeChat();
      setIsInitialized(true);
    } else if (needsNewChat) {
      initializeChat();
    }
  }, [isInitialized, needsNewChat, dispatch]);

  useEffect(() => {
    if (shouldRedirect) {
      router.navigate("/auth/login");
    }
  }, [shouldRedirect]);

  const startNewChat = async (isPersonalized: boolean) => {
    // 1. 清空畫面
    setMessages([]);

    // 2. 顯示載入中
    setMessages([{ type: "loading" }]);

    // 3. 獲取新的 chatID (如果需要)
    const newChatId = await getOrCreateChatId();
    if (newChatId === null) {
      setMessages([
        {
          type: "bot",
          content: "抱歉，無法建立新的對話，請檢查您的網路連線或登入狀態。",
        },
      ]);
      return;
    }

    // 4. 準備問候語
    let initialQuery = "你好";
    // 只有在明確要求個人化，且條件滿足時，才拼接個人資料
    if (isPersonalized && autoInjectChatContext && user) {
      const userProfilePrompt = generateUserProfilePrompt(user);
      if (userProfilePrompt) {
        initialQuery = `你好 (${userProfilePrompt})`;
      }
    }
    console.log(
      `啟動新對話，isPersonalized: ${isPersonalized}, 查詢:`,
      initialQuery
    );

    // 5. 使用這個問候語發送第一個請求
    try {
      const { content, cards: rawWelfareCards } = await sendMessageToModel(
        initialQuery,
        newChatId
      );

      // 6. 更新畫面
      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => m.type !== "loading");
        const botMessage: Message = { type: "bot", content: content };
        const newMessages = [...withoutLoading, botMessage];

        // 不論如何，都接著顯示通用的福利類別卡片
        const serviceMessage: Message = {
          type: "service",
          items: ewlfareItems,
        };
        newMessages.push(serviceMessage);

        return newMessages;
      });
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m.type !== "loading"));
      setMessages((prev) => [
        ...prev,
        { type: "bot", content: "抱歉，初始化對話時發生錯誤。" },
      ]);
    }
  };

  // 新建並獲取 chatID
  const getOrCreateChatId = async (): Promise<number | null> => {
    if (!user || !user.id) {
      setShouldRedirect(true);
      console.error("無法創建聊天室：使用者未登入或 user.id 不存在");
      // router.navigate('/auth/login');
      return null;
    }
    try {
      const response = await axios.post(AppConfig.api.endpoints.conversations, {
        userId: user.id,
        title: "新對話", // 可以給一個預設標題
      });
      const newChatId: number = response.data.id; // 後端返回的 id 應該是 number
      setChatID(newChatId); // 更新為 number 類型
      console.log(user.id, "後端獲取新的 chatID:", newChatId);
      return newChatId;
    } catch (error: any) {
      // axios response 有 httpStatus
      if (error.response?.status === 403 || error.code === 403) {
        console.warn("權限錯誤，跳轉至登入頁面");
        router.navigate("/auth/login");
      } else {
        console.error("無法獲取或創建 chatID:", error);
      }
      return null;
    }
  };

  // 發送消息到後端
  const sendMessageToModel = async (
    message: string,
    conversationIdOverride?: number
  ): Promise<{
    content: string;
    cards: ResultItem[];
    newConversationId?: number;
  }> => {
    if (!user || !user.id) {
      console.error("無法發送訊息：使用者未登入");
      return { content: "錯誤：使用者未登入", cards: [] };
    }
    try {
      // 優先使用傳入的 conversationIdOverride，如果沒有，才用 state 中的 chatID
      const finalChatId =
        conversationIdOverride !== undefined ? conversationIdOverride : chatID;

      const response = await axios.post(
        AppConfig.api.endpoints.search,
        {
          userId: user.id,
          conversationId: finalChatId, // 直接傳遞 number 類型，undefined 也會被正確處理
          query: message,
          personalized: autoInjectChatContext, //傳遞有無個人化
        },
        {
          timeout: 30000, // 30 秒超時
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // 處理回應資料
      let aiAnswer: string = "";
      let welfareCards: ResultItem[] = [];
      let returnedConversationId: number | undefined = undefined;

      if (response.data && typeof response.data === "object") {
        aiAnswer = response.data.answer || ""; // 後端直接返回 answer 字段
        returnedConversationId = response.data.conversationId; // 提取後端返回的 conversationId

        if (
          response.data.welfareCards &&
          Array.isArray(response.data.welfareCards)
        ) {
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
            applicationCriteria: card.applicationCriteria,
            lightStatus: card.lightStatus,
            lightReason: card.lightReason,
          }));
          console.log("AI回", response.data.welfareCards);
        }
      } else if (typeof response.data === "string") {
        aiAnswer = response.data;
      } else {
        aiAnswer = "收到回應但格式不正確";
      }

      // 返回一個包含 AI 回答、福利卡片和新的 conversationId 的物件
      return {
        content: aiAnswer || "抱歉，沒有收到有效回應",
        cards: welfareCards,
        newConversationId: returnedConversationId,
      };
    } catch (error) {
      console.error("Vertex AI 查詢失敗:", error);
      let errorMessage = "發生未知錯誤，請稍後再試";
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const message = error.response.data?.message || "未知伺服器錯誤";
          errorMessage = `伺服器錯誤 (${status}): ${message}`;
        } else if (error.request) {
          errorMessage =
            "網路連線錯誤，請檢查：\n1. 後端服務是否正在運行\n2. 網路連線是否正常\n3. URL 設定是否正確";
        } else if (error.code === "ECONNABORTED") {
          errorMessage = "請求超時，AI 處理時間較長，請稍後再試";
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

  // 服務卡片點擊
  const handleServiceClick = (name: string) => {
    performAiSearch(name);
  };

  const handleNewChat = () => {
    console.log("使用者請求開啟新的聊天室...");
    setMessages([]); // 清空當前訊息列表
    setChatID(undefined);
    setIsInitialized(false);
  };

  const performAiSearch = async (
    query: string,
    options?: { asNewConversation?: boolean },
    isPersonalized?: boolean
  ) => {
    const isNewConversation = options?.asNewConversation ?? false;

    const userMessage: Message = { type: "user", content: query };
    const loadingMessage: Message = { type: "loading" };

    const baseMessages = isNewConversation ? [] : messages;
    setMessages([...baseMessages, userMessage, loadingMessage]);

    const personalized = autoInjectChatContext && !!user;

    try {
      let finalQuery = query;

      if (autoInjectChatContext && user) {
        if (personalized) {
          const userProfilePrompt = generateUserProfilePrompt(user);
          finalQuery = `請根據下列使用者背景推薦相關福利：
          [使用者背景]
          ${userProfilePrompt}

          [使用者查詢]
          ${query}`;
        } else {
          // 🚫 非個人化查詢，完全不加入使用者背景
          finalQuery = query;
          console.log("🧩 使用普通查詢:", finalQuery);
        }
      }

      const conversationId = isNewConversation ? undefined : chatID;
      console.log("finalQuery:", finalQuery);
      const {
        content: aiResponseContent,
        cards: rawWelfareCards,
        newConversationId,
      } = await sendMessageToModel(finalQuery, conversationId);

      if (newConversationId !== undefined) {
        setChatID(newConversationId);
      }

      setMessages((prev) => {
        const prevMessages = isNewConversation
          ? [userMessage]
          : prev.filter((m) => m.type !== "loading");
        return [...prevMessages, { type: "bot", content: aiResponseContent }];
      });

      // 確保前端二次過濾邏輯始終被應用
      if (rawWelfareCards && rawWelfareCards.length > 0) {
        const userProfilePrompt = generateUserProfilePrompt(user);
        // 重新構建對話上下文，確保包含當前用戶的查詢
        // 注意：這裡的 conversationContext 應該基於當前所有訊息，包括新發送的 userMessage
        const conversationContext = [
          ...[...baseMessages, userMessage]
            .filter((m) => m.type === "user")
            .map((m) => m.content),
          userProfilePrompt, // ✅ 將使用者背景加入
        ].join(" ");

        let targetLocation: string | undefined;
        let targetCategories: string[] = [];

        // 將 baseMessages + 當前 userMessage 中的文字累積起來
        const accumulatedUserInput = [
          ...baseMessages
            .filter((m) => m.type === "user")
            .map((m) => m.content),
          query,
        ].join(" ");

        // 再從累積文字提取地點與類別
        if (!personalized) {
          targetLocation = extractLocationFromText(accumulatedUserInput);
          targetCategories = extractCategoriesFromText(accumulatedUserInput);
          console.log("🧩 非個人化模式：從累積使用者輸入提取篩選條件");
        } else {
          // ✅ 個人化查詢時才從背景 + 對話上下文提取
          for (const loc of sortedLocations) {
            if (
              conversationContext.includes(loc) ||
              conversationContext.includes(loc.slice(0, -1))
            ) {
              targetLocation = loc;
              break;
            }
          }

          // 提取類別（優先使用查詢內容）
          let categorySource = query; // 🔹 先看使用者查詢文字
          let foundCategory = false;

          for (const keyword of sortedCategories) {
            if (categorySource.includes(keyword)) {
              targetCategories = categorySynonyms[keyword] || [keyword];
              foundCategory = true;
              break;
            }
          }

          if (!foundCategory) {
            targetCategories = [];
          }
        }
        // 應用過濾
        const filteredCards = rawWelfareCards.filter((card) => {
          let isMatch = true;

          // 🏠 地點寬鬆比對：允許部分匹配
          if (targetLocation && card.location) {
            const cardLoc = card.location.replace(/\s/g, "");
            const targetLoc = targetLocation.replace(/\s/g, "");
            if (!cardLoc.includes(targetLoc) && !targetLoc.includes(cardLoc)) {
              isMatch = false;
            }
          }

          // 🧩 類別寬鬆比對：允許部分字串包含
          if (targetCategories.length > 0 && Array.isArray(card.categories)) {
            const hasIntersection = targetCategories.some((tc) =>
              card.categories!.some((c) => c.includes(tc))
            );
            if (!hasIntersection) {
              isMatch = false;
            }
          }

          return isMatch;
        });

        console.log("🎯 原始卡片數:", rawWelfareCards.length);
        console.log(
          "🎯 篩選條件 => 地點:",
          targetLocation,
          " 類別:",
          targetCategories
        );
        console.log("🎯 篩選後卡片數:", filteredCards.length);

        if (filteredCards.length > 0) {
          setMessages((prev) => [
            ...prev,
            { type: "result", resultItems: filteredCards },
          ]);
        } else {
          // 如果過濾後沒有卡片，可以考慮顯示一個提示，或者不顯示卡片
          console.log("前端過濾後沒有找到符合條件的卡片。");
          // 如果希望在過濾後沒有結果時，也顯示一個「無結果」的卡片，可以取消註解下面這段
          //  setMessages((prev) => [...prev, { type: "result", resultItems: [{ title: '未找到符合條件的福利', url: '#' }] }]);
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const prevMessages = isNewConversation
          ? [userMessage]
          : prev.filter((m) => m.type !== "loading");
        return [
          ...prevMessages,
          { type: "bot", content: "查詢時發生錯誤，請稍後再試。" },
        ];
      });
    } finally {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  };

  // 🔍 從文字中找出類別關鍵字
  const extractCategoriesFromText = (text: string): string[] => {
    if (!text) return [];
    const foundCategories: string[] = [];

    for (const keyword of sortedCategories) {
      if (text.includes(keyword)) {
        if (categorySynonyms[keyword]) {
          foundCategories.push(...categorySynonyms[keyword]);
        } else {
          foundCategories.push(keyword);
        }
      }
    }

    return Array.from(new Set(foundCategories)); // 去重
  };

  // 📍 從文字中找出地點關鍵字
  const extractLocationFromText = (text: string): string | undefined => {
    if (!text) return undefined;
    for (const loc of sortedLocations) {
      if (text.includes(loc) || text.includes(loc.slice(0, -1))) {
        return loc;
      }
    }
    return undefined;
  };

  // 定義自定義的渲染規則
  const customRenderRules: RenderRules = {
    link: (node, children, parent, styles) => {
      const url = node.attributes.href;
      const isInternalLink = url.startsWith("/home/");

      const handlePress = () => {
        console.log("攔截到 Markdown 連結點擊，URL:", url);
        if (isInternalLink) {
          // router.navigate(url as any);
          router.navigate({
            pathname: url, // e.g. /home/12
            params: {
              sourcePage: "chat",
            },
          });
        } else {
          console.warn("未知的連結格式，將嘗試使用 Linking.openURL:", url);
        }
      };

      // 直接定義連結樣式，不依賴 styles.link
      const finalLinkStyle = isInternalLink
        ? linkStyles.internalLink
        : linkStyles.externalLink;
      return (
        <Text key={node.key} style={finalLinkStyle} onPress={handlePress}>
          {children}
        </Text>
      );
    },
  };
  // 渲染消息
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const nextMessage =
      index < messages.length - 1 ? messages[index + 1] : null;

    // 判斷兩個訊息是否來自同一「陣營」（使用者 vs 機器人）
    const isSameSenderAsNext =
      nextMessage && (item.type === "user") === (nextMessage.type === "user");

    // 如果沒有下一則訊息，或者下一則訊息的發送者陣營不同，就顯示頭像
    const shouldShowAvatar = !isSameSenderAsNext;

    switch (item.type) {
      case "user":
        return (
          <View style={styles.userMessage}>
            {/* <Image source={{ uri: 'https://placehold.co/40' }} style={styles.avatarUser} /> */}
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
              <Markdown
                //  style={markdownStyles}
                rules={customRenderRules}
              >
                {item.content}
              </Markdown>
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
      case "result":
        return (
          <View style={styles.botMessage}>
            {shouldShowAvatar ? (
              <TouchableOpacity>
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
                    console.log("item", item, "result", result);
                    // 檢查 result.id 是否存在，以避免路徑變成 'home/undefined'
                    if (result.id) {
                      const lightReasonString = result.lightReason
                        ? JSON.stringify(result.lightReason)
                        : ""; // 如果不存在，就傳送空字串
                      router.navigate(
                        `/home/${result.id}?sourcePage=chat&lightStatus=${result.lightStatus ?? -1}&lightReason=${lightReasonString}`
                      );
                    } else if (result.url === "home") {
                      // 處理 "未找到福利" 的情況，這部分邏輯保持不變
                      setMessages((prev) => {
                        const initialMessages = prev.filter(
                          (m) => m.type === "bot" || m.type === "service"
                        );
                        if (initialMessages.length > 0) {
                          return initialMessages;
                        }
                        return [{ type: "service", items: ewlfareItems }];
                      });
                    }
                  }}
                >
                  <Text
                    style={styles.resultTitle}
                    numberOfLines={3}
                    ellipsizeMode="tail"
                  >
                    {result.title}
                  </Text>
                  {result.lightStatus !== undefined && (
                    <View style={styles.lightStatusContainer}>
                      <View
                        style={[
                          styles.circleIndicator,
                          {
                            backgroundColor: getLightColor(result.lightStatus),
                          },
                        ]}
                      />
                      <Text style={styles.lightStatusText}>
                        {getLightText(result.lightStatus)}
                      </Text>
                    </View>
                  )}
                  {/* {result.lightReason && <Text style={styles.resultLocation}>理由:{result.lightReason}</Text>} */}

                  {result.location && (
                    <Text style={styles.resultLocation}>
                      地點: {result.location}
                    </Text>
                  )}

                  {result.categories && (
                    <Text
                      style={styles.resultLocation}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      類別:{`${result.categories.join("、")}`}
                    </Text>
                  )}

                  {result.forward && (
                    <Text
                      style={styles.resultForward}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >{`福利:${result.forward.join("、")}`}</Text>
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item, index) => index.toString()}
            />
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
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendMessage}
          >
            <Text style={styles.sendButtonText}>
              <Ionicons name="send" size={28} color={COLORS.background} />
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <RightDrawer isVisible={isDrawerVisible} onClose={toggleRightDrawer} />
    </SafeAreaView>
  );
};

// 樣式
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
    color: COLORS.text,
    marginLeft: 8,
  },
  settingsIcon: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  newChatIcon: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    marginRight: 8,
  }, // 新增樣式
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  userMessage: {
    flexDirection: "row-reverse",
    // justifyContent: 'flex-end',
    alignItems: "center",
    marginBottom: 16,
  },
  userText: {
    backgroundColor: "#a3e635",
    padding: 12,
    borderRadius: 8,
    maxWidth: width * 0.7,
    marginRight: 0,
    fontSize: 16,
  },
  botMessage: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  botText: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    maxWidth: width * 0.7,
    marginLeft: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
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
    backgroundColor: "#fff",
    borderRadius: 8,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  serviceImage: {
    width: "100%",
    height: 150,
    resizeMode: "contain",
  },
  serviceText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  placeCard: {
    width: 144,
    height: 32,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  placeText: {
    fontSize: 16,
  },
  resultCard: {
    width: 160, // 設定固定寬度
    height: 224, // 設定固定高度
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginRight: 10, // 卡片之間增加右邊距，用於橫向間隔
    marginBottom: 10, // 保持底部間距，如果 FlatList 內容會換行
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3, // Android 陰影
    justifyContent: "space-between", // 讓內容在卡片內垂直分佈
  },
  lightStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5, // 調整間距
    marginBottom: 5,
  },
  circleIndicator: {
    width: 12, // 調整大小以適應卡片
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  lightStatusText: {
    fontSize: 12, // 調整字體大小
    color: "#333",
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    // marginBottom: 1,
    // lineHeight: 24,
  },
  resultLocation: {
    fontSize: 14,
    color: "#666",
    // marginBottom: 2,
  },
  resultForward: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  resultCatege: {
    // 如果您決定顯示 summary，請添加此樣式
    fontSize: 14,
    color: "#555",
    marginTop: 2,
  },
  resultText: {
    fontSize: 16,
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
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    // fontWeight: "bold",
  },
  botTextContainer: {
    backgroundColor: "#fff",
    // padding: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    maxWidth: width * 0.7,
    // marginLeft: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
});

const linkStyles = StyleSheet.create({
  internalLink: {
    color: "blue",
    textDecorationLine: "underline",
  },
  externalLink: {
    color: "#333", // 使用與文字相同的顏色
    textDecorationLine: "none",
  },
});

export default App;
