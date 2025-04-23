import { View, Text, StyleSheet } from 'react-native'
import React from 'react'
import { COLORS } from '../utils/colors';

type props = { location: string, category: string[], title: string, lightStatus: number }

export default function WelfareItem({ location, category, title, lightStatus }: props) {
    const getCircleColor = () => {
        switch (lightStatus) {
            case 1:
                return COLORS.light_green; // 綠色
            case 2:
                return COLORS.light_yellow; // 黃色
            case 3:
                return COLORS.light_red; // 紅色
            default:
                return COLORS.light_yellow;
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.textContainer}>
                <Text style={styles.subTitle}>{location} / {category}</Text>
                <Text style={styles.title}>{title}</Text>
            </View>
            <View style={[styles.circle, { backgroundColor: getCircleColor() }]} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        height: 100,
        flexDirection: 'row', // 讓文字和圓形圖標水平排列
        alignItems: 'center', // 垂直居中
        paddingHorizontal: 15, // 左右內邊距
    },
    textContainer: {
        flex: 1, // 讓文字區域佔據剩餘空間
    },
    title: {
        fontSize: 18, // 文字大小
        color: 'black', // 文字顏色
        marginVertical: 5, // 上下間距
        fontWeight: "500"
    },
    subTitle: {
        fontWeight: "thin",
        fontStyle: "italic",
        color: "gray"
    },
    circle: {
        width: 20, // 圓形圖標的寬度
        height: 20, // 圓形圖標的高度
        borderRadius: 15, // 圓形效果
        marginLeft: 10, // 與文字的間距
    },
});