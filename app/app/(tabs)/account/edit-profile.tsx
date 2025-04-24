import { useState } from 'react';
import { Button, Image, View, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { updateAvatarApi } from '@/src/api/userApi';
import { useSelector,useDispatch } from "react-redux"
import { AppDispatch, RootState } from '@/src/store';
import { fetchUser } from '@/src/store/slices/userSlice';
export default function ImagePickerExample() {
    const [image, setImage] = useState<string | null>(null);
    const { authToken } = useSelector((state:RootState) => state.config)
    const dispatch = useDispatch<AppDispatch>();

    const pickImage = async () => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.2,
        });

        if (result) {
            const formData = new FormData();
            const file = {
                uri: result.assets?.[0]?.uri ?? '',
                type: result.assets?.[0]?.type ?? 'image/jpeg',
                name: result.assets?.[0]?.fileName ?? 'default.jpg',
            } as any;
            formData.append('avatar', file);

            const resp = await updateAvatarApi(authToken,formData)
            if (resp.status_code== 200) {
                Alert.alert('成功', '頭像上傳成功');
                setImage(resp.data);
                await dispatch(fetchUser());
            } else {
                Alert.alert("失敗", resp.message)
            }
            
        }
    };

    return (
        <View style={styles.container}>
            <Button title="Pick an image from camera roll" onPress={pickImage} />
            {image && <Image source={{ uri: image }} style={styles.image} />}
            <Button title='上傳'></Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: 200,
        height: 200,
    },
});