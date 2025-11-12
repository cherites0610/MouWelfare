import { fetchFqaApi } from "@/src/api/fqaApi";
import { fqa } from "@/src/type/fqaType";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView,
} from "react-native";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Fqa() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [faqData, setFaqData] = useState<fqa[]>([]);

  const toggleExpand = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const [isLoading, setIsLoading] = useState(true);

  const init = async () => {
    setIsLoading(true); // Start loading
    try {
      const data = await fetchFqaApi();
      setFaqData(data);
    } catch (error) {
      console.error("Failed to fetch FAQ data:", error);
      setFaqData([]);
    } finally {
      setIsLoading(false); // Stop loading regardless of success/failure
    }
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {faqData.map((item, index) => (
        <View key={index} style={styles.card}>
          <TouchableOpacity
            onPress={() => toggleExpand(index)}
            style={styles.row}
          >
            <Text style={styles.question}>Q：{item.question}</Text>
            <Ionicons
              name={
                expandedIndex === index
                  ? ("arrow-up-outline" as const)
                  : ("arrow-down-outline" as const)
              }
              size={24}
              color="#666"
            />
          </TouchableOpacity>
          {expandedIndex === index && (
            <View style={styles.answerBox}>
              <Text style={styles.answer}>A：{item.answer}</Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
    flex: 1,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 25,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  question: {
    fontSize: 18,
    color: "#222",
    flex: 1,
    marginRight: 8,
  },
  answerBox: {
    marginTop: 20,
    marginLeft: 10,
  },
  answer: {
    fontSize: 16,
    color: "#444",
    lineHeight: 30,
  },
});
