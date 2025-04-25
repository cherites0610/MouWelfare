import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    StyleSheet,
    Alert,
    Button,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from "react-redux"
import { AppDispatch, RootState } from '@/src/store';
import { User } from '@/src/type/user';
import { updateAvatarApi } from '@/src/api/userApi';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { fetchUser } from '@/src/store/slices/userSlice';

export default function EditProfileScreen() {
    const router = useRouter();
    const [currentUser, setUser] = useState<User | null>(null);
    const [avatar, setAvatar] = useState<string>();
    const [name, setName] = useState<string>();
    const [birthday, setBirthday] = useState<Date>(new Date(1598051730000));
    const [gender, setGender] = useState('');
    const [location, setLocation] = useState('');
    const [identities, setIdentities] = useState<string[]>([]);

    const [showDatepicker, setShowDatePicker] = useState<boolean>(false);

    const { user } = useSelector((state: RootState) => state.user)
    const { authToken } = useSelector((state: RootState) => state.config)
    const dispatch = useDispatch<AppDispatch>()

    // 假設你從某處（例如 Redux 或 API）獲取當前用戶資料
    useEffect(() => {
        if (user) {
            setName(user.name)
            setAvatar(user.avatar_url)
            // setBirthday(user.birthday)
            // setGender(user.gender)
        }

    }, []);

    // 選擇並上傳頭像
    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('需要相冊權限');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images", "livePhotos"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled && result.assets[0].uri) {
            const uri = result.assets[0].uri;

            // 上傳頭像到後端
            const formData = new FormData();
            formData.append('avatar', {
                uri,
                name: 'avatar.jpg',
                type: 'image/jpeg',
            } as any);


            const resp = await updateAvatarApi(authToken, formData)
            if (resp.status_code == 200) {
                Alert.alert("更改成功", resp.message)
                setAvatar(resp.data)

            } else {
                Alert.alert("更改失敗", resp.message)
                setAvatar(resp.data)
            }

            dispatch(fetchUser())
        }
    };

    // 提交表單
    const handleSubmit = async () => {
        try {
            const updatedUser = {
                name,
                birthday,
                gender,
                location,
                identities,
                avatar_url: avatar,
            };

            // await axios.put('http://your-backend/api/user/update', updatedUser, {
                // headers: { Authorization: 'Bearer your-token' },
            // });

            Alert.alert('成功', '資料已更新', [
                { text: '確定', onPress: () => router.back() },
            ]);
        } catch (error) {
            Alert.alert('錯誤', '更新失敗');
        }
    };

    const onChange = (event: DateTimePickerEvent, selectedDate?: Date): void => {
        if (selectedDate) {
            setBirthday(selectedDate);
        }
        setShowDatePicker(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* 頭像 */}
                <TouchableOpacity onPress={pickImage}>
                    <Image
                        source={{ uri: avatar || currentUser?.avatar_url || 'http://your-backend/uploads/default_avatar.png' }}
                        style={styles.avatar}
                    />
                    <Text style={styles.changeAvatarText}>更改頭像</Text>
                </TouchableOpacity>

                {/* 表單欄位 */}
                <View style={styles.infoBlock}>
                    <Text style={styles.label}>姓名：</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="輸入姓名"
                    />

                    <Text style={styles.label}>生日:</Text>
                    <DateTimePicker
                        testID="dateTimePicker"
                        value={birthday}
                        mode={'date'}
                        onChange={onChange}
                        // style={styles.input}
                        style={styles.datapick}
                    />


                    <Text style={styles.label}>性別：</Text>
                    <TextInput
                        style={styles.input}
                        value={gender}
                        onChangeText={setGender}
                        placeholder="輸入性別"
                    />
                    <Text style={styles.label}>地區：</Text>
                    <TextInput
                        style={styles.input}
                        value={location}
                        onChangeText={setLocation}
                        placeholder="輸入地區"
                    />
                    <Text style={styles.label}>身份別：</Text>
                    <TextInput
                        style={styles.input}
                        value={identities.join(',')}
                        onChangeText={(text) => setIdentities(text.split(','))}
                        placeholder="輸入身份別，用逗號分隔"
                    />
                </View>
            </View>

            {/* 提交按鈕 */}
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.bottomButtonText}>保存</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    content: {
        alignItems: 'center',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 10,
    },
    changeAvatarText: {
        color: '#007AFF',
        textAlign: 'center',
        marginBottom: 20,
    },
    infoBlock: {
        width: '100%',
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginTop: 5,
        fontSize: 16,
    },
    datapick: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        backgroundColor: "white",
        
    },
    submitButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
    },
    bottomButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});