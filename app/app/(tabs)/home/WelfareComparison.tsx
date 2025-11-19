import React, { useEffect, useState, useLayoutEffect } from "react";
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

const COLUMN_WIDTH = 160;
const DIMENSION_WIDTH = 100;

const WelfareComparison = () => {
  const { welfareId } = useLocalSearchParams();
  const navigation = useNavigation();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.user);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ComparisonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
                  <Text
                    style={[
                      styles.welfareTitleText,
                      col.isSource && styles.sourceText,
                    ]}
                    numberOfLines={2}
                  >
                    {col.title}
                  </Text>
                  {col.isSource && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>目前查看</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

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
    width: COLUMN_WIDTH,
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
    marginBottom: 4,
    textAlign: "center",
  },
  welfareTitleText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
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
    lineHeight: 20,
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
    marginTop: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 6,
    paddingVertical: 2,
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
