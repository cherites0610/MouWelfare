import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { getLightColor, getLightText } from "@/src/utils/chatUtils";
import { useRouter } from "expo-router";
import { COLORS } from "@/src/utils/colors";
import { EnrichedWelfareCard } from "@/src/type/chatTypes";

// 擴充介面以包含 App.tsx 前端組裝時加入的 url (雖然我們可以直接用 id 跳轉)
export interface DisplayWelfareCard extends EnrichedWelfareCard {
  url?: string;
}

interface WelfareResultListProps {
  data: DisplayWelfareCard[];
}

const WelfareResultList: React.FC<WelfareResultListProps> = ({ data }) => {
  const router = useRouter();

  const handlePress = (card: DisplayWelfareCard) => {
    if (card.id) {
      // 序列化理由陣列，以便通過 URL 傳遞
      const lightReasonString = card.lightReason
        ? JSON.stringify(card.lightReason)
        : "";

      // 構建路由參數
      router.navigate(
        `/home/${card.id}?sourcePage=chat&lightStatus=${card.lightStatus ?? -1}&lightReason=${encodeURIComponent(lightReasonString)}`
      );
    }
  };

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={data}
      keyExtractor={(item, index) =>
        item.id ? item.id.toString() : index.toString()
      }
      contentContainerStyle={{ paddingRight: 20 }} // 讓最後一張卡片有點間距
      renderItem={({ item: card }) => (
        <TouchableOpacity
          style={styles.resultCard}
          onPress={() => handlePress(card)}
          activeOpacity={0.8}
        >
          <View>
            <Text
              style={styles.resultTitle}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {card.title}
            </Text>

            {/* 燈號狀態顯示 */}
            {card.lightStatus !== undefined && (
              <View style={styles.lightStatusContainer}>
                <View
                  style={[
                    styles.circleIndicator,
                    { backgroundColor: getLightColor(card.lightStatus) },
                  ]}
                />
                <Text style={styles.lightStatusText}>
                  {getLightText(card.lightStatus)}
                </Text>
              </View>
            )}

            {/* 地點 */}
            {card.location && (
              <Text style={styles.metaText} numberOfLines={1}>
                📍 {card.location}
              </Text>
            )}

            {/* 類別 (Array -> String) */}
            {card.categories && card.categories.length > 0 && (
              <Text
                style={styles.metaText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                🏷️ {card.categories.join("、")}
              </Text>
            )}

            {/* 福利内容 (Forward) */}
            {card.forward && card.forward.length > 0 && (
              <Text
                style={styles.forwardText}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                🎁{" "}
                {Array.isArray(card.forward)
                  ? card.forward.join("、")
                  : card.forward}
              </Text>
            )}
          </View>

          {/* 底部查看詳情文字，增加引導感 */}
          <Text style={styles.viewDetailText}>查看詳情 &gt;</Text>
        </TouchableOpacity>
      )}
    />
  );
};

const styles = StyleSheet.create({
  resultCard: {
    width: 180, // 稍微加寬一點以容納更多資訊
    height: 240,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    justifyContent: "space-between", // 讓內容靠上，"查看詳情"靠下
    // 陰影效果
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937", // 深灰黑色
    marginBottom: 8,
    lineHeight: 22,
    height: 44, // 固定標題高度，約兩行
  },
  lightStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start", // 讓背景色只包覆內容
  },
  circleIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  lightStatusText: {
    fontSize: 11,
    color: "#4b5563",
    fontWeight: "500",
  },
  metaText: {
    fontSize: 13,
    color: "#6b7280", // 灰色
    marginBottom: 4,
  },
  forwardText: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },
  viewDetailText: {
    fontSize: 13,
    color: COLORS.primary || "#2563eb", // 使用主題色或藍色
    textAlign: "right",
    fontWeight: "600",
    marginTop: 8,
  },
});

export default WelfareResultList;
