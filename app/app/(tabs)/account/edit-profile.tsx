import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    StyleSheet,
    Alert,
    Platform,
    ScrollView,
    Dimensions, 
    ViewStyle
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from "react-redux"
import { AppDispatch, RootState } from '@/src/store';
import { updateAvatarApi, updateProfileAPI } from '@/src/api/userApi';
import { fetchUser } from '@/src/store/slices/userSlice';
import DropDownPicker from 'react-native-dropdown-picker';
import { GenderNum, getTextByGender, getTextByIdentity, getTextByLocation, IdentityNum, LocationNum } from '@/src/utils/getTextByNumber';
import { User } from '@/src/type/user';
import { COLORS } from '@/src/utils/colors';

export default function EditProfileScreen() {
    const router = useRouter();
    const [avatar, setAvatar] = useState<string>();
    const [name, setName] = useState<string>();
    const [birthday, setBirthday] = useState<string>(''); // 改為字符串以接受輸入
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

    // 性別下拉選單狀態
    const [genderOpen, setGenderOpen] = useState(false);
    const [genderValue, setGenderValue] = useState<string | null>(null);
    const [genderItems, setGenderItems] = useState(Array.from({ length: GenderNum - 1 }, (_, i) => ({
        label: getTextByGender(i + 1),
        value: getTextByGender(i + 1),
    })));

    // 地區下拉選單狀態
    const [locationOpen, setLocationOpen] = useState(false);
    const [locationValue, setLocationValue] = useState<string | null>(null);
    const [locationItems, setLocationItems] = useState(Array.from({ length: LocationNum - 1 }, (_, i) => ({
        label: getTextByLocation(i + 1),
        value: getTextByLocation(i + 1),
    })));

    // 身份下拉選單狀態
    const [identitiesOpen, setIdentitiesOpen] = useState(false);
    const [identitiesValue, setIdentitiesValue] = useState<string[]>([]);
    const [identitiesItems, setIdentitiesItems] = useState(Array.from({ length: IdentityNum - 6 }, (_, i) => ({
        label: getTextByIdentity(i + 6),
        value: getTextByIdentity(i + 6),
    })));

    const { user } = useSelector((state: RootState) => state.user);
    const { authToken } = useSelector((state: RootState) => state.config);
    const dispatch = useDispatch<AppDispatch>();

    useEffect(() => {
        if (user) {
            setName(user.name);
            setAvatar(user.avatarUrl);
            setGenderValue(user.gender || null);
            setLocationValue(user.location?.name || null);
            // 格式化生日為 YYYY/MM/DD
            setBirthday(user.birthday ? new Date(user.birthday).toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).split('/').join('/') : '');
            setIdentitiesValue(Array.isArray(user.identities) ? user.identities.map((item) => item.name) : []);
        }
    }, [user]);

    const onGenderOpen = useCallback(() => {
        setLocationOpen(false);
        setIdentitiesOpen(false);
    }, []);

    const onLocationOpen = useCallback(() => {
        setGenderOpen(false);
        setIdentitiesOpen(false);
    }, []);

    const onIdentitiesOpen = useCallback(() => {
        setGenderOpen(false);
        setLocationOpen(false);
    }, []);

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('需要相冊訪問權限');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
            const uri = result.assets[0].uri;
            const filename = uri.split('/').pop() || 'avatar.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image`;

            const formData = new FormData();
            if (Platform.OS === 'web') {
                try {
                    const response = await fetch(uri);
                    const blob = await response.blob();
                    formData.append('avatar', blob, filename);
                } catch (error) {
                    console.error('Web 平台檔案處理失敗:', error);
                    Alert.alert('錯誤', '檔案處理失敗，請重新選擇');
                    return;
                }
            } else {
                
                formData.append('avatar', {
                    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
                    name: filename,
                    type,
                } as any);
            }
            try {
            
            const resp = await updateAvatarApi(authToken, formData);

            if (resp && resp.data) {
                Alert.alert("更新成功", resp.message || "頭像已更新");
                setAvatar(resp.data); // 使用回傳的新頭像 URL
                dispatch(fetchUser());
            } else {
                throw new Error("伺服器回應格式不正確");
            }

        } catch (error: any) {
            console.error("上傳頭像失敗:", error);
            const errorMessage = error.response?.data?.message || error.message || "頭像上傳失敗，請稍後再試。";
            Alert.alert("錯誤", errorMessage);
        }
        }
    };

    const validateBirthday = (input: string): boolean => {
        const regex = /^\d{4}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/;
        if (!regex.test(input)) {
            return false;
        }
        const [year, month, day] = input.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    };

    const handleSubmit = async () => {
        try {
            // 檢查生日格式
            if (birthday && !validateBirthday(birthday)) {
                Alert.alert('錯誤', '生日格式無效，請輸入 YYYY/MM/DD');
                return;
            }

            const parseBirthday = (birthday: string): string | undefined => {
                const [year, month, day] = birthday.split('/').map(Number);
                const date = new Date(year, month - 1, day); // Month is 0-based in JavaScript
                // Check if the date is valid
                if (
                    isNaN(date.getTime()) ||
                    date.getFullYear() !== year ||
                    date.getMonth() + 1 !== month ||
                    date.getDate() !== day
                ) {
                    return undefined;
                }
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            };

            const updatedUserData: Partial<User> = {
                name: name || '',
                // birthday: birthday ? new Date(birthday).toISOString() : undefined,
                birthday: birthday ? parseBirthday(birthday) : undefined,
                gender: genderValue ?? undefined,
                location: {
                    name: locationValue ?? '',
                    id: ''
                },
                identities: identitiesValue.map(name => ({ name, id: '' })),
            };

            try {
                const result = await updateProfileAPI(authToken, updatedUserData)
                Alert.alert(result.message)
                dispatch(fetchUser());
                router.back()
            } catch (err: any) {
                Alert.alert('錯誤', '更新失敗，請重試。',);
            }

        } catch (error) {
            console.error("更新個人資料失敗:", error);

        } 
    };
    const getModalWidth = (screenWidth: number): number => {
       if (screenWidth > 600) return screenWidth * 0.6;      // 平板：60%
        if (screenWidth > 400) return screenWidth * 0.75;     // 大手機：75%
        return screenWidth * 0.85;                                // 小手機：85%
    };
    const getModalStyle = (type: 'location' | 'identity'): ViewStyle => {
        const baseStyle: ViewStyle = {
            backgroundColor: '#fff',
            borderRadius: 16,
            width: getModalWidth(screenWidth),
            alignSelf: 'center',
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 10,
            borderWidth: 1,
            borderColor: '#f0f0f0',
        };

        if (type === 'location') {
            return {
                ...baseStyle,
                marginTop: screenHeight * 0.2,        // 地區選擇器稍高一點（有搜尋框）
                maxHeight: screenHeight * 0.6,        // 更大的高度容納搜尋和選項
                minHeight: 250,
            };
        } else {
            return {
                ...baseStyle,
                marginTop: screenHeight * 0.25,       // 身份選擇器標準位置
                maxHeight: screenHeight * 0.5,        // 標準高度
                minHeight: 200,
            };
        }
    };
    const locationModalStyle = getModalStyle('location');
    const identityModalStyle = getModalStyle('identity');

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.container}>
                <View style={styles.content}>
                    <TouchableOpacity onPress={pickImage}>
                        <Image
                            source={{ uri: avatar || user?.avatarUrl || 'https://via.placeholder.com/100' }}
                            style={styles.avatar}
                        />
                        <Text style={styles.changeAvatarText}>更改頭像</Text>
                    </TouchableOpacity>

                    <View style={[styles.infoBlock, { zIndex: 100 }]}>
                        <Text style={styles.label}>姓名：</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="輸入姓名"
                        />
                    </View>

                    <View style={[styles.infoBlock, { zIndex: 90 }]}>
                        <Text style={styles.label}>生日：</Text>
                        <TextInput
                            style={styles.input}
                            value={birthday}
                            onChangeText={setBirthday}
                            placeholder="YYYY/MM/DD"
                            keyboardType="default"
                        />
                    </View>

                    <View style={[styles.infoBlock, { zIndex: 80 }]}>
                        <Text style={styles.label}>性別：</Text>
                        <DropDownPicker
                            open={genderOpen}
                            value={genderValue}
                            items={genderItems}
                            setOpen={setGenderOpen}
                            setValue={setGenderValue}
                            setItems={setGenderItems}
                            onOpen={onGenderOpen}
                            placeholder="選擇性別"
                            containerStyle={styles.dropdownContainer}
                            style={styles.dropdown}
                            dropDownContainerStyle={styles.dropdownListStyle}
                            listMode="SCROLLVIEW"
                            zIndex={3000}
                            zIndexInverse={1000}
                            dropDownDirection="BOTTOM"
                        />
                    </View>

                    <View style={[styles.infoBlock, { zIndex: 70 }]}>
                        <Text style={styles.label}>地區：</Text>
                        <DropDownPicker
                            open={locationOpen}
                            value={locationValue}
                            items={locationItems}
                            setOpen={setLocationOpen}
                            setValue={setLocationValue}
                            setItems={setLocationItems}
                            onOpen={onLocationOpen}
                            placeholder="選擇地區"
                            containerStyle={styles.dropdownContainer}
                            style={styles.dropdown}
                            dropDownContainerStyle={styles.dropdownListStyle}
                            // listMode="SCROLLVIEW"
                            // zIndex={2000}
                            // zIndexInverse={2000}
                            // dropDownDirection="BOTTOM"
                            // Modal 模式
                            listMode="MODAL"
                            modalProps={{
                                animationType: "slide",
                                transparent: true,
                            }}
                            modalContentContainerStyle={locationModalStyle}
                            modalTitle="選擇地區"
                            modalTitleStyle={styles.modalTitle}
                            
                            // 🔥 啟用搜尋功能
                            searchable={true}
                            searchPlaceholder="搜索縣市..."
                        />
                    </View>

                    <View style={[styles.infoBlock, { zIndex: 60, marginBottom: 0 }]}>
                        <Text style={styles.label}>身份：</Text>
                        <DropDownPicker
                            multiple={true}
                            min={0}
                            open={identitiesOpen}
                            value={identitiesValue}
                            items={identitiesItems}
                            setOpen={setIdentitiesOpen}
                            setValue={setIdentitiesValue}
                            setItems={setIdentitiesItems}
                            onOpen={onIdentitiesOpen}
                            placeholder="選擇身份"
                            mode="BADGE"
                            badgeDotColors={["#e76f51", "#00b4d8", "#e9c46a"]}
                            containerStyle={styles.dropdownContainer}
                            style={styles.dropdown}
                            dropDownContainerStyle={styles.dropdownListStyle}
                            // listMode="SCROLLVIEW"
                            // zIndex={1000}
                            // zIndexInverse={3000}
                            // dropDownDirection="BOTTOM"
                            listMode="MODAL"
                            modalProps={{
                                animationType: "slide",
                                transparent: true,
                                statusBarTranslucent: true,
                            }}
                            modalContentContainerStyle={identityModalStyle}
                            modalTitle="選擇身份"
                            modalTitleStyle={styles.modalTitle}
                        />
                    </View>
                </View>

                <View style={{ height: locationOpen ? 30 : 0 }} />
                <View style={{ height: identitiesOpen ? 200 : 0 }} />

                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                    <Text style={styles.bottomButtonText}>儲存</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}


const styles = StyleSheet.create({
    
    scrollContainer: {
        flexGrow: 1,
    },
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    content: {
        alignItems: 'center',
        paddingBottom: 30,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 10,
        backgroundColor: '#cccccc',
    },
    changeAvatarText: {
        color: '#007AFF',
        textAlign: 'center',
        marginBottom: 20,
    },
    infoBlock: {
        width: '100%',
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#fff',
        height: 50,
        padding: 12,
        marginRight: 8,
    },
    dropdownContainer: {},
    dropdown: {
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        backgroundColor: '#fff',
    },
    dropdownListStyle: {
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    submitButton: {
        backgroundColor: COLORS.background,
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
        width: '100%',
    },
    bottomButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
},
});
