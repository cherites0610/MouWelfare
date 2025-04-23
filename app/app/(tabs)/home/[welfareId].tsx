import { fetchWelfareByIDAPI } from '@/src/api/welfareApi';
import { Welfare } from '@/src/type/welfareType';
import { COLORS } from '@/src/utils/colors';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Linking,
  ActivityIndicator,
} from 'react-native';

const WelfareInfo = () => {
  const glob = useLocalSearchParams();
  const [welfare, setWelfare] = useState<Welfare | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getCircleColor = () => {
    switch (welfare?.light_status) {
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

  const getCircleText = (light_status: number) => {
    switch (light_status) {
      case 1:
        return '符合領取資格!';
      case 2:
        return '不一定符合領取資格!';
      case 3:
        return '不符合領取資格!';
      default:
        return '不一定符合領取資格!';
    }
  };

  const getWelfare = async () => {
    try {
      const response = await fetchWelfareByIDAPI(Number(glob.welfareId));
      setWelfare(response);
    } catch (error) {
      console.error('Error fetching welfare data:', error);
      setError('無法加載數據，請稍後重試');
    }
  };

  useEffect(() => {
    getWelfare();
  }, []);

  const openLink = async (url: string) => {
    if (url && (await Linking.canOpenURL(url))) {
      await Linking.openURL(url);
    } else {
      console.warn('Invalid or unsupported URL:', url);
    }
  };

  return (
    <>
      {welfare ? (
        <ScrollView>
          <View style={styles.container}>
            <Text style={styles.title}>{welfare.title}</Text>
            <Text style={styles.releaseDate}>發佈日期: {welfare.publication_date}</Text>

            <Text style={styles.sectionTitle}>申請條件</Text>
            <FlatList
              style={styles.list}
              scrollEnabled={false}
              data={welfare.identities}
              renderItem={({ item, index }) => (
                <View
                  style={[
                    styles.listRow,
                    index === welfare.identities.length - 1 && styles.lastItemRow,
                  ]}
                >
                  <Text style={styles.listIndex}>{index + 1}</Text>
                  <Text style={styles.listItemText}>{item}</Text>
                </View>
              )}
              keyExtractor={(item, index) => index.toString()}
            />

            <Text style={styles.sectionTitle}>可獲得之福利</Text>
            <FlatList
              style={styles.list}
              scrollEnabled={false}
              data={welfare.forward}
              renderItem={({ item, index }) => (
                <View
                  style={[
                    styles.listRow,
                    index === welfare.forward.length - 1 && styles.lastItemRow,
                  ]}
                >
                  <Text style={styles.listIndex}>{index + 1}</Text>
                  <Text style={styles.listItemText}>{item}</Text>
                </View>
              )}
              keyExtractor={(item, index) => index.toString()}
            />

            <View style={styles.statusRow}>
              <Text style={styles.statusText}>你是否符合申請條件</Text>
              <TouchableOpacity style={styles.infoIcon}>
                <Ionicons size={20} name="information-circle-outline" />
              </TouchableOpacity>
              <View
                style={[styles.circleIndicator, { backgroundColor: getCircleColor() }]}
              />
              <Text style={styles.resultText}>{getCircleText(welfare.light_status)}</Text>
            </View>

            <Text style={styles.sectionTitle}>可獲得福利之家人</Text>
            <FlatList
              style={styles.list}
              scrollEnabled={false}
              data={['羽毛', '猴子', '大哥']} // 假設 API 返回或使用臨時數據
              renderItem={({ item, index }) => (
                <View
                  style={[
                    styles.listRow,
                    index === (['羽毛', '猴子', '大哥'].length) - 1 && styles.lastItemRow,
                  ]}
                >
                  <Text style={styles.listIndex}>{index + 1}</Text>
                  <Text style={styles.listItemText}>{item}</Text>
                </View>
              )}
              keyExtractor={(item, index) => index.toString()}
            />

            <View style={styles.statusRow}>
              <Text style={styles.sectionTitle}>點此前往原文:</Text>
              <TouchableOpacity onPress={() => openLink(welfare.url)}>
                <Text style={styles.linkText}>點此前往原文</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>簡要原文:</Text>
            <Text style={styles.notes}>{welfare.detail}</Text>
          </View>
        </ScrollView>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text>Loading...</Text>
        </View>
      )}
    </>
  );
};
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  releaseDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  list: {
    marginLeft: 30,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingBottom: 10,
    marginVertical: 10,
    borderBottomWidth: 0.3,
    borderBlockColor: 'gray',
    paddingRight: 30,
  },
  lastItemRow: {
    borderBottomWidth: 0, // 移除底線
  },
  listIndex: {
    fontSize: 14,
  },
  listItemText: {
    fontSize: 14,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoIcon: {
    paddingLeft: 4,
    paddingRight: 10,
  },
  circleIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 8,
  },
  resultText: {
    fontSize: 14,
  },
  linkText: {
    color: 'blue',
    fontStyle: 'italic',
    fontSize: 14,
    textDecorationLine: "underline"
  },
  notes: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: 'red' },
});

export default WelfareInfo;
