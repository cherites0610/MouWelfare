import { CameraView, CameraType, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useState } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type QrScannerProps = {
    onScan: (data: string) => void;
};

export default function QrScanner({ onScan }: QrScannerProps) {
    const [facing, setFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>We need your permission to show the camera</Text>
                <Button onPress={requestPermission} title="grant permission" />
            </View>
        );
    }

    function toggleCameraFacing() {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    }

    return (
        <View style={styles.container}>
            <CameraView
                onBarcodeScanned={(result: BarcodeScanningResult) => {
                    // console.log(result.data);
                    onScan(result.data); // 將掃描結果傳回
                }}
                style={styles.camera}
                facing={facing}
            >
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
                        <Text style={styles.text}>請掃碼QR CODE</Text>
                    </TouchableOpacity>
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1, // 確保容器佔滿可用空間
        justifyContent: 'center',
        alignItems: 'center',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
    },
    camera: {
        width: '100%', // 確保相機預覽佔滿容器寬度
        height: '100%', // 確保相機預覽佔滿容器高度
    },
    buttonContainer: {
        position: 'absolute', // 使用絕對定位避免影響相機預覽
        bottom: 20,
        flexDirection: 'row',
        backgroundColor: 'transparent',
    },
    button: {
        padding: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // 添加背景以提高可見性
        borderRadius: 5,
    },
    text: {
        fontSize: 18, // 減小字體以適應模態框
        fontWeight: 'bold',
        color: 'white',
    },
});