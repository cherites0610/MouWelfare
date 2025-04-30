import { View, Text, SafeAreaView, ScrollView, Image, TouchableOpacity, Switch, StyleSheet, FlatList, Alert, Modal, TextInput, Platform } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router';
import { deleteFamilyApi, EditFamilyInfApi, exitFamilyApi, FamilysResponse, fetchFmailyApi, getFmailyCodeApi } from '@/src/api/familyApi';
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/src/store';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '@/src/utils/colors';
import { fetchFamily } from '@/src/store/slices/familySlice';


const FamilySettingsScreen = () => {
    const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true); // 初始值設為 true (如圖所示)
    const { authToken } = useSelector((state: RootState) => state.config)
    const { familys } = useSelector((state: RootState) => state.family)
    const { user } = useSelector((state: RootState) => state.user)
    const [code, setCode] = useState<string>()
    const [displayModal, setDisplayModal] = useState<boolean>(false);
    const [editNameModal, setEditNameModal] = useState<boolean>(false);
    const [newFamilyName, setNewFamilyName] = useState<string>('');
    const glob = useLocalSearchParams();


    const familyID = glob.familyid as string
    let family = familys.find((item) => item.id == familyID) as FamilysResponse

    const disDispatch = useDispatch<AppDispatch>()
    const router = useRouter()

    const handleGenerateQrCodePress = async () => {
        if (family?.id) {
            const code = await getFmailyCodeApi(authToken, family.id);
            setCode(code)
            setDisplayModal(true)
        }
        // 在這裡加入產生 QR Code 的邏輯
    };

    const handleExitFamilyPress = async () => {
        const result = await exitFamilyApi(authToken, family?.id!)

        if (result.status_code == 200) {
            Alert.alert("退出家庭成功")
            await disDispatch(fetchFamily())
            router.replace("/account/family")
        } else {
            Alert.alert("退出家庭失敗")
        }
    }

    const handleDeleteFamilyPress = async () => {
        const result = await deleteFamilyApi(authToken, family?.id!)

        if (result.status_code == 200) {
            Alert.alert("刪除家庭成功")
            await disDispatch(fetchFamily())
            router.replace("/account/family")
        } else {
            Alert.alert("刪除家庭失敗")
        }
    };

    const editFamilyNameConfirm = async () => {
        if (newFamilyName.length==0){
            setEditNameModal(false)
            return
        } 
        const result = await EditFamilyInfApi(authToken,family?.id!,newFamilyName)
        if (result.status_code==200) {
            await disDispatch(fetchFamily())
            family = familys.find((item) => item.id == familyID) as FamilysResponse
            setEditNameModal(false)
            Alert.alert(result.message)
        }else {
            Alert.alert("修改失敗",result.message)
        }
    }

    if (!family) {
        // 如果沒有 family 資料，可以顯示載入中或錯誤訊息
        return (
            <SafeAreaView style={styles.container}>
                <Text>載入家庭資料中...</Text>
            </SafeAreaView>
        );
    }

    const renderButton = () => {
        const role = family.members.find((item) => {
            return item.userId == user?.id
        })?.role

        if (role == 1) {
            return (
                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteFamilyPress}>
                    <Text style={styles.deleteButtonText}>刪除家庭</Text>
                </TouchableOpacity>
            )
        } else if (role == 2) {
            return (
                <>
                    <TouchableOpacity style={styles.deleteButton} onPress={handleExitFamilyPress}>
                        <Text style={styles.deleteButtonText}>退出家庭</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.mangmentDeleteButton} onPress={handleDeleteFamilyPress}>
                        <Text style={styles.deleteButtonText}>刪除家庭</Text>
                    </TouchableOpacity>
                </>
            )
        } else {
            return (
                <TouchableOpacity style={styles.deleteButton} onPress={handleExitFamilyPress}>
                    <Text style={styles.deleteButtonText}>退出家庭</Text>
                </TouchableOpacity>
            )
        }
    }

    return (
        <ScrollView style={styles.container}>
            {/* --- 頭像和名稱區 --- */}
            <View style={styles.userInfoSection}>
                {family.members.map((item, index) =>
                    <View key={index}>
                        <Image
                            source={{ uri: item.avatar_url }} // 提供一個預設圖片
                            style={styles.avatar}
                        />
                        <Text style={styles.userName}>{item.name}</Text>
                    </View>
                )}

            </View>

            {/* --- 設定選項列表 --- */}
            <View style={styles.settingsList}>
                {/* 群組名稱 */}
                <TouchableOpacity style={styles.listItem} onPress={() => { setEditNameModal(true) }}>
                    <Text style={styles.listItemText}>群組名稱</Text>
                    <View style={styles.listItemRight}>
                        <Text style={styles.listItemValue}>{family.name}</Text>
                        <Text style={styles.arrowIcon}>{'>'}</Text>
                        {/* 建議用圖標 */}
                    </View>
                </TouchableOpacity>
                {/* 開啟通知 */}
                {/* <View style={styles.listItem}>
                    <Text style={styles.listItemText}>開啟通知</Text>
                    <Switch
                        trackColor={{ false: '#767577', true: '#81b0ff' }} // 可以自訂顏色
                        thumbColor={isNotificationsEnabled ? '#f4f3f4' : '#f4f3f4'}
                        ios_backgroundColor="#3e3e3e"
                        onValueChange={setIsNotificationsEnabled}
                        value={isNotificationsEnabled}
                    />
                </View> */}

                {/* 產生QRCODE */}
                <TouchableOpacity style={styles.listItem} onPress={handleGenerateQrCodePress}>
                    <Text style={styles.listItemText}>產生QRCODE</Text>
                </TouchableOpacity>
            </View>

            {/* --- 刪除家庭按鈕 --- */}
            {renderButton()}


            <Modal
                visible={displayModal}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>邀請好友</Text>
                        <View style={styles.qrContainer}>
                            <Text style={styles.codeText}>邀請碼: {code}</Text>
                            <QRCode
                                value={code}
                                size={180}
                                color="#000000"
                                backgroundColor="#ffffff"
                            />
                        </View>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setDisplayModal(false)}
                        >
                            <Text style={styles.closeButtonText}>關閉</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={editNameModal}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>修改家庭名</Text>
                        <View style={styles.qrContainer}>
                            <TextInput
                                style={styles.input}
                                onChangeText={setNewFamilyName}
                                value={newFamilyName}
                                placeholder='請輸入欲修改的家庭名'
                            />
                        </View>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={editFamilyNameConfirm}
                        >
                            <Text style={styles.closeButtonText}>{newFamilyName.length==0?"關閉":"確定"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};
// --- 結束組件 ---

// --- 樣式 ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    userInfoSection: {
        paddingHorizontal: 10,
        paddingVertical: 20,
        backgroundColor: '#ffffff', // 白色背景
        flexDirection: "row",
        gap: 15
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 15, // More horizontal padding
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        fontSize: 16,
        minWidth: 200,
        marginBottom: 0, // Consistent spacing
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 40, // 圓形
        marginBottom: 10,
    },
    userName: {
        textAlign: "center",
        fontSize: 16,
        color: '#333',
    },
    settingsList: {
        marginTop: 10, // 與上方頭像區的間隔
        backgroundColor: '#ffffff', // 列表背景色
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0', // 分隔線顏色
    },
    listItemText: {
        fontSize: 16,
        color: '#333',
    },
    listItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    listItemValue: {
        fontSize: 16,
        color: '#888', // 值的顏色稍暗
        marginRight: 10,
    },
    arrowIcon: {
        fontSize: 18,
        color: '#cccccc', // 箭頭顏色
    },
    mangmentDeleteButton: {
        borderTopWidth: 1,
        borderColor: "#f0f0f0",
        backgroundColor: '#ffffff', // 按鈕背景
        paddingVertical: 15,
        alignItems: 'center',
    },
    deleteButton: {
        marginTop: 40, // 與列表的間隔
        backgroundColor: '#ffffff', // 按鈕背景
        paddingVertical: 15,
        alignItems: 'center',
    },
    deleteButtonText: {
        fontSize: 16,
        color: 'red', // 紅色文字，表示危險操作
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
        width: '85%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 20,
    },
    qrContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    codeText: {
        fontSize: 16,
        color: '#333333',
        marginBottom: 16,
        fontWeight: '500',
    },
    closeButton: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 32,
        minWidth: 120,
    },
    closeButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
});
// --- 結束樣式 ---

export default FamilySettingsScreen; // 匯出組件