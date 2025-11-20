import React, { useEffect, useState, useLayoutEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { fetchWelfareComparisonAPI } from "@/src/api/welfareApi";
import { COLORS } from "@/src/utils/colors";
import { ComparisonResponse } from "@/src/type/welfareType";

// 基礎寬度設定
const MIN_COLUMN_WIDTH = 160;
const DIMENSION_WIDTH = 100;
const SCREEN_WIDTH = Dimensions.get("window").width;

const WelfareComparison = () => {
  const { welfareId } = useLocalSearchParams();
  const navigation = useNavigation();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.user);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ComparisonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. 動態計算欄位寬度
  const dynamicColumnWidth = useMemo(() => {
    if (!data || data.columns.length === 0) return MIN_COLUMN_WIDTH;

    // 螢幕總寬 - 左側固定欄位寬度
    const availableWidth = SCREEN_WIDTH - DIMENSION_WIDTH;
    // 平均分配給每個欄位
    const distributedWidth = availableWidth / data.columns.length;

    // 如果平均寬度大於最小寬度，就用平均寬度（填滿螢幕），否則用最小寬度（可滑動）
    return Math.max(MIN_COLUMN_WIDTH, distributedWidth);
  }, [data]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "跨縣市福利對比",
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingHorizontal: 10 }}
        >
          <Ionicons
            name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"}
            size={28}
            color="#333"
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!welfareId || !user?.id) return;
      try {
        setLoading(true);
        const result = await fetchWelfareComparisonAPI(
          String(welfareId),
          user.id
        );
        setData(result);
      } catch (err: any) {
        console.log(err);
        setError(err.message || "無法載入對比資料");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [welfareId, user?.id]);

  // 2. 處理點擊跳轉
  const handleTitlePress = (col: any) => {
    // 由於對比列表可能沒有包含詳細的資格判定結果(lightStatus)，
    // 這裡傳入 -1 表示狀態未知，讓詳情頁自行處理
    const lightStatus = -1;
    const lightReasonString = encodeURIComponent(JSON.stringify([]));

    router.navigate(
      `/home/${col.key}?lightStatus=${lightStatus}&lightReason=${lightReasonString}`
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10, color: "#666" }}>
          AI 正在分析全台類似福利...
        </Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || "無資料"}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.verticalScroll}>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
          <View style={styles.tableContainer}>
            {/* 表頭區域 */}
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.fixedColumn,
                  styles.headerCell,
                  { backgroundColor: "#f0f0f0" },
                ]}
              >
                <Text style={styles.headerText}>比較項目</Text>
              </View>
              {data.columns.map((col) => (
                <View
                  key={col.key}
                  style={[
                    styles.columnCell,
                    styles.headerCell,
                    col.isSource && styles.sourceHeader,
                    { width: dynamicColumnWidth }, // 套用動態寬度
                  ]}
                >
                  <Text
                    style={[
                      styles.locationText,
                      col.isSource && styles.sourceText,
                    ]}
                  >
                    {col.location}
                  </Text>

                  {/* 3. 修改標題為可點擊 */}
                  <TouchableOpacity
                    onPress={() => handleTitlePress(col)}
                    style={styles.titleButton}
                  >
                    <Text
                      style={[
                        styles.welfareTitleText,
                        styles.clickableTitle, // 增加連結樣式
                        col.isSource && styles.sourceText,
                        col.isSource && { textDecorationColor: "#fff" }, // 如果是深色背景，底線改白色
                      ]}
                      numberOfLines={2}
                    >
                      {col.title}
                    </Text>
                    <Ionicons
                      name="open-outline"
                      size={14}
                      color={col.isSource ? "#fff" : COLORS.primary}
                      style={{ marginTop: 2 }}
                    />
                  </TouchableOpacity>

                  {col.isSource && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>目前查看</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* 內容區域 */}
            {data.rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.dataRow}>
                <View style={[styles.fixedColumn, styles.dimensionCell]}>
                  <Text style={styles.dimensionText}>{row.dimension}</Text>
                </View>
                {data.columns.map((col) => (
                  <View
                    key={`${rowIndex}-${col.key}`}
                    style={[
                      styles.columnCell,
                      col.isSource && styles.sourceColumnBg,
                      { width: dynamicColumnWidth }, // 套用動態寬度
                    ]}
                  >
                    <Text style={styles.cellText}>
                      {row.values[col.key] || "-"}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  verticalScroll: {
    flex: 1,
  },
  tableContainer: {
    padding: 10,
    // 確保內容太少時也能撐開一點
    minHeight: 300,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#ddd",
  },
  dataRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    minHeight: 60,
  },
  fixedColumn: {
    width: DIMENSION_WIDTH,
    padding: 10,
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#eee",
    backgroundColor: "#fafafa",
  },
  columnCell: {
    // width 由 inline style 覆蓋
    padding: 10,
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#eee",
  },
  headerCell: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 15,
  },
  headerText: {
    fontWeight: "bold",
    color: "#333",
  },
  locationText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 6,
    textAlign: "center",
  },
  // 新增標題按鈕容器樣式
  titleButton: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  welfareTitleText: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 18,
  },
  // 新增可點擊的樣式 (藍色 + 底線)
  clickableTitle: {
    color: COLORS.primary || "blue",
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  dimensionCell: {
    justifyContent: "center",
  },
  dimensionText: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#555",
  },
  cellText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 22,
  },
  sourceHeader: {
    backgroundColor: COLORS.background,
  },
  sourceColumnBg: {
    backgroundColor: "#f9fcff",
  },
  sourceText: {
    color: "#fff",
  },
  badge: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  errorText: {
    fontSize: 16,
    color: "red",
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#ddd",
    borderRadius: 8,
  },
  retryText: {
    color: "#333",
  },
});

export default WelfareComparison;
