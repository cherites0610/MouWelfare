import React from 'react';
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/src/store';
import { updateConfig, writeConfig } from '@/src/store/slices/configSlice';
import { COLORS } from '@/src/utils/colors';
import { useRouter } from 'expo-router';

interface RightDrawerProps {
  isVisible: boolean;
  onClose: () => void;
}


const RightDrawer: React.FC<RightDrawerProps> = ({ isVisible, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter(); 
  // 從 Redux 取得設定狀態
  const autoInjectChatContext = useSelector(
    (state: RootState) => state.config.autoInjectChatContext
  );

  const handleAutoSelectChange = (newValue: boolean) => {
     if (newValue) {
      // ✅ 開啟開關：發出 'personalized' 信號
      dispatch(updateConfig({ autoInjectChatContext: true, needsNewChat: 'personalized' }));
    } else {
      // ✅ 關閉開關：發出 'general' 信號
      dispatch(updateConfig({ autoInjectChatContext: false, needsNewChat: 'general' }));
    }
    // 無論開關，都寫入設定並返回
    dispatch(writeConfig());
    onClose(); 
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.drawer}>
              {/* Header */}
              <View style={[styles.header, styles.headerBorder]}>
                <Text style={styles.title}>設定</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* 對話設定 */}
              <View style={styles.settingSection}>
                <Text style={styles.sectionTitle}>對話設定</Text>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>自動套用個人資料篩選</Text>
                    <Text style={styles.settingDescription}>
                      根據您的個人資料自動篩選相關福利
                    </Text>
                  </View>
                  <Switch
                    trackColor={{ false: "#ccc", true: COLORS.background }}
                    thumbColor={autoInjectChatContext ? "#fff" : "#888"}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={handleAutoSelectChange}
                    value={autoInjectChatContext}
                  />
                </View>
              </View>

              {/* 其他功能 */}
              <View style={styles.settingSection}>
                <Text style={styles.sectionTitle}>其他功能</Text>
                <View style={styles.settingRow}>
                  <Text style={styles.comingSoonText}>更多功能即將推出...</Text>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  drawer: {
    width: '80%',
    height: '100%',
    backgroundColor: '#fff',
    paddingTop: 30,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    //  marginBottom: 20,
  },
  headerBorder: {
  borderBottomWidth: 1,
  borderBottomColor: "#ddd",
  flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
},
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  settingSection: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});

export default RightDrawer;
