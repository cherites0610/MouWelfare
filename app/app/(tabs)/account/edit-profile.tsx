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
            setAvatar(user.avatar_url);
            setGenderValue(user.gender || null);
            setLocationValue(user.location || null);
            // 格式化生日為 YYYY/MM/DD
            setBirthday(user.birthday ? new Date(user.birthday).toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).split('/').join('/') : '');
            setIdentitiesValue(Array.isArray(user.identities) ? user.identities : []);
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
            formData.append('avatar', {
                uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
                name: filename,
                type,
            } as any);

            try {
                const resp = await updateAvatarApi(authToken, formData);
                if (resp.status_code === 200) {
                    Alert.alert("更新成功", resp.message);
                    setAvatar(resp.data);
                    dispatch(fetchUser());
                } else {
                    Alert.alert("更新失敗", resp.message || "未知錯誤");
                }
            } catch (error) {
                console.error("上傳頭像失敗:", error);
                Alert.alert("錯誤", "頭像上傳失敗。");
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
                location: locationValue ?? undefined,
                identities: identitiesValue,
            };

            const result = await updateProfileAPI(authToken, updatedUserData)

            if (result.status_code == 200) {
                Alert.alert(result.message)
                dispatch(fetchUser());

                while (router.canGoBack()) {
                    router.back();
                }
                // 替換到目標頁面
                router.replace('/home'); // 替換為目標路由，例如 '/login'

            }

        } catch (error) {
            console.error("更新個人資料失敗:", error);
            Alert.alert('錯誤', '更新失敗，請重試。',);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.container}>
                <View style={styles.content}>
                    <TouchableOpacity onPress={pickImage}>
                        <Image
                            source={{ uri: avatar || user?.avatar_url || 'https://via.placeholder.com/100' }}
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
                            listMode="SCROLLVIEW"
                            zIndex={2000}
                            zIndexInverse={2000}
                            dropDownDirection="BOTTOM"
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
                            listMode="SCROLLVIEW"
                            zIndex={1000}
                            zIndexInverse={3000}
                            dropDownDirection="BOTTOM"
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
});