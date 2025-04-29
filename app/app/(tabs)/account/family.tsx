import { Image, View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Modal, TextInput, Platform, Alert } from 'react-native';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createFamilyApi, FamilysResponse, fetchUserFamilyApi, JoinFamilyApi } from '@/src/api/familyApi';
// Removed AsyncStorage import as it wasn't used in this component
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/src/store';
import QrScanner from '@/src/components/QrScanner'; // Assuming this component exists
import { fetchFamily } from '@/src/store/slices/familySlice';

// Define modal types more strictly
type ModalType = 'family' | 'member';

export default function Family() {
  const [modalType, setModalType] = useState<ModalType | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isFabOpen, setIsFabOpen] = useState(false);
  const fabAnimation = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState<boolean>(false);
  const [scannerActive, setScannerActive] = useState<boolean>(false);

  const { familys } = useSelector((state: RootState) => state.family)
  const { authToken } = useSelector((state: RootState) => state.config)
  const disDispatch = useDispatch<AppDispatch>()

  const router = useRouter();

  const handleConfirm = async () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || loading) {
      return;
    }

    setLoading(true);
    let success = false;
    try {
      if (modalType === 'family') {
        await createFamilyApi(authToken, trimmedValue);
        Alert.alert("成功", "家庭已成功創建！");
        success = true;
      } else if (modalType === 'member') {
        await JoinFamilyApi(authToken, trimmedValue);
        Alert.alert("成功", "已成功加入家庭！");
        success = true;
      }

      if (success) {
        disDispatch(fetchFamily())
        setModalType(null);
        setInputValue('');
        setScannerActive(false);
      }
    } catch (e: any) {

      console.error(`Failed to ${modalType === 'family' ? 'create' : 'join'} family:`, e);
      if (!e?.isAlertShown) {
        Alert.alert(`${modalType === 'family' ? '創建' : '加入'}家庭失敗`, "請檢查輸入內容或稍後再試。");
      }
      success = false;
    } finally {
      setLoading(false);
    }
  };

  const toggleFab = () => {
    const toValue = isFabOpen ? 0 : 1;
    Animated.timing(fabAnimation, {
      toValue,
      duration: 200,
      useNativeDriver: true, // Keep true for performance
    }).start(() => {
      setIsFabOpen(!isFabOpen); // Update state after animation completes
    });
  };

  const openModal = (type: ModalType) => {
    setModalType(type);
    setInputValue('');
    setScannerActive(false);
    if (isFabOpen) {
      toggleFab();
    }
  };

  const handleCancel = () => {
    setModalType(null);
    setInputValue('');
    setScannerActive(false);
  };

  const handlerClickFamilyCard = (id: string) => {
    router.push(`/account/${id}`);
  };

  const modalConfig = {
    family: {
      title: '創建家庭',
      placeholder: '輸入家庭名稱',
      showQrOption: false,
    },
    member: {
      title: '加入家庭',
      placeholder: '輸入邀請代碼',
      showQrOption: true,
    },
  };

  const currentModalConfig = modalType ? modalConfig[modalType] : null;

  const translateY1 = fabAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, -70] });
  const translateY2 = fabAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, -130] });
  const opacity = fabAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const rotate = fabAnimation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {familys.length === 0 ? (
          <Text style={styles.emptyText}>尚無家庭數據</Text>
        ) : (
          familys.map((family) => (
            <TouchableOpacity
              key={family.id}
              onPress={() => handlerClickFamilyCard(family.id)}
              style={styles.card}
            >
              <Text style={styles.familyName}>{family.name || '未知家庭'}</Text>
              {family.members.map((member) => (
                <View key={member.userId} style={styles.memberRow}>
                  <Image
                    source={{ uri: member.avatar_url }}
                    style={styles.avatar}
                  />
                  <Text style={styles.memberName}>{member.name || '未知成員'}</Text>
                </View>
              ))}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Sub FABs */}
      <Animated.View style={[styles.fabBase, styles.subFab, { transform: [{ translateY: translateY1 }], opacity }]}>
        <TouchableOpacity onPress={() => openModal('family')} style={styles.fabTouchable}>
          <Ionicons name="add-circle-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={[styles.fabBase, styles.subFab, { transform: [{ translateY: translateY2 }], opacity }]}>
        <TouchableOpacity onPress={() => openModal('member')} style={styles.fabTouchable}>
          <Ionicons name="person-add-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Main FAB */}
      <Animated.View style={[styles.fabBase, styles.mainFab]}>
        <TouchableOpacity onPress={toggleFab} style={styles.fabTouchable}>
          {/* Optional: Animate icon rotation */}
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name={isFabOpen ? 'add' : 'add'} size={30} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      {/* Modal */}
      <Modal
        visible={!!modalType} // Show modal if modalType is not null
        transparent
        animationType="fade"
        onRequestClose={handleCancel} // Handle back button press on Android
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {currentModalConfig && ( // Ensure config exists before accessing
              <>
                <Text style={styles.modalTitle}>{currentModalConfig.title}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={currentModalConfig.placeholder}
                  value={inputValue}
                  onChangeText={setInputValue}
                  returnKeyType="done"
                  onSubmitEditing={handleConfirm} // Allow submitting with keyboard 'done'
                />

                {/* Conditionally render QrScanner component */}
                {scannerActive && (
                  <View style={styles.qrScannerContainer}>
                    <QrScanner
                      onScan={(data) => {
                        setInputValue(data); // 更新輸入框
                        setScannerActive(false); // 關閉掃描器
                      }} />
                  </View>
                )}

                {/* Conditionally render QR Code Scan Button (Inlined) */}
                {currentModalConfig.showQrOption && !scannerActive && (
                  <TouchableOpacity
                    onPress={() => setScannerActive(true)} // Toggle scanner visibility
                    style={[styles.utilityButton, styles.qrButton]} // Use a different style maybe
                  >
                    <Ionicons name="qr-code-outline" size={20} color="#fff" style={{ marginRight: 5 }} />
                    <Text style={styles.buttonText}>掃描QR Code</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={[styles.buttonBase, styles.cancelButton]} onPress={handleCancel}>
                    <Text style={styles.buttonText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.buttonBase,
                      styles.confirmButton,
                      { opacity: inputValue.trim() && !loading ? 1 : 0.5 }, // Disable visually when empty or loading
                    ]}
                    onPress={handleConfirm}
                    disabled={!inputValue.trim() || loading} // Actually disable button
                  >
                    <Text style={styles.buttonText}>確認</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Styles --- (Minor adjustments for clarity and new elements)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    // padding: 10, // Padding moved to ScrollView content if needed edge-to-edge
  },
  scrollViewContent: {
    padding: 15, // Add padding here for content spacing
    paddingBottom: 80, // Add padding at the bottom to avoid FAB overlap
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee', // Lighter border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, // Softer shadow
    shadowRadius: 3,
    elevation: 2, // Lower elevation
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 40, // 圓形
    marginBottom: 10,
  },
  familyName: {
    fontSize: 18, // Slightly smaller
    fontWeight: '600', // Medium weight
    color: '#333',
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0', // Lighter separator
    // Remove border for the last item if needed: lastChild: { borderBottomWidth: 0 }
  },
  memberName: {
    marginLeft: 10,
    fontSize: 18,
    color: '#555',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 50, // More margin
  },
  // Base style for all FABs to reduce repetition
  fabBase: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  mainFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
  },
  subFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF9500',
  },
  // Make touchable area cover the whole FAB
  fabTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Darker overlay
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20, // Add padding to prevent modal edge touching screen edge
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  // 新增一個專用容器給 QrScanner
  qrScannerContainer: {
    width: '100%',
    height: 300, // 為相機預覽設置固定高度
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20, // More space
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15, // More horizontal padding
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    marginBottom: 15, // Consistent spacing
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20, // Add margin above buttons
  },
  // Base button style
  buttonBase: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center', // Center text vertically
    flexDirection: 'row', // Allow icon + text
  },
  cancelButton: {
    backgroundColor: '#6c757d', // Grey color for cancel
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  // Specific button for utility actions like QR scan
  utilityButton: {
    backgroundColor: '#5bc0de', // Info color (example)
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15, // Space below if shown
    flexDirection: 'row',
  },
  qrButton: {
    backgroundColor: '#5cb85c', // Success color (example)
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600', // Bold text
  },
});