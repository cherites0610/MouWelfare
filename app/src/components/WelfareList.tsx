import { View, Text, FlatList, RefreshControl, Share, Alert, TouchableOpacity } from 'react-native'
import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, {
    Extrapolation,
    interpolate,
    SharedValue,
    useAnimatedStyle,
} from 'react-native-reanimated';
import WelfareItem from './WelfareItem';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { COLORS } from '../utils/colors';
import { useRouter } from 'expo-router';
import { Welfare } from '../type/welfareType';

type WelfareListProps = {
    listData: Welfare[];
    refreshing: boolean; // 父組件控制
    onRefresh: () => void; // 父組件提供的刷新方法
};

type RightActionProps = {
    item: Welfare;
    prog: SharedValue<number>;
    drag: SharedValue<number>;
};

export default function WelfareList({ listData, refreshing, onRefresh }: WelfareListProps) {
    const route = useRouter();

    const RightAction = ({ item, prog, drag }: RightActionProps) => {
        const styleAnimation = useAnimatedStyle(() => {
            // 每個按鈕寬度 80px，兩個就是 160
            const translateX = interpolate(
                drag.value,
                [-160, 0],
                [0, 160],
                Extrapolation.CLAMP
            );
            return {
                transform: [{ translateX }],
            };
        });

        const handleShare = async () => {
            try {
                const result = await Share.share({
                    message:
                        `哞福利向您送來了福利!\n ${item.title} \n 原文鏈接:${item.url}`,
                });
                if (result.action === Share.sharedAction) {
                    if (result.activityType) {
                        // shared with activity type of result.activityType
                        Alert.alert('分享成功');
                    } else {
                        // shared
                    }
                } else if (result.action === Share.dismissedAction) {
                    // dismissed
                }
            } catch (error: any) {
                Alert.alert(error.message);
            }
        };

        const handleFavorite = () => {
            Alert.alert('暫未開發')
        };

        return (
            <Reanimated.View style={[styleAnimation, { flexDirection: 'row' }]}>
                <TouchableOpacity
                    style={{
                        backgroundColor: COLORS.primary,
                        padding: 20,
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: 80,
                        borderRightWidth: 1,
                        borderColor: 'gray'
                    }}
                    onPress={handleFavorite}
                >
                    <Text>收藏</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        backgroundColor: COLORS.background,
                        padding: 20,
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: 80,
                    }}
                    onPress={handleShare}
                >
                    <Text>分享</Text>
                </TouchableOpacity>
            </Reanimated.View>
        );
    };

    const renderItem = ({ item }: { item: Welfare }) => {
        return (
            <GestureHandlerRootView>
                <ReanimatedSwipeable
                    friction={2}
                    rightThreshold={40}
                    renderRightActions={(progress, dragX) => (
                        <RightAction item={item} prog={progress} drag={dragX} />
                    )}
                >
                    <TouchableOpacity
                        onPress={() => {route.navigate(('/home/'+item.id) as any )}}
                    >
                        <WelfareItem
                            location={item.location}
                            title={item.title}
                            category={item.categories}
                            lightStatus={item.light_status}
                        />
                    </TouchableOpacity>

                </ReanimatedSwipeable>
            </GestureHandlerRootView>
        )
    }

    return (
        <View style={{ backgroundColor: "white" }}>
            <FlatList
                data={listData} // 數據來源
                renderItem={renderItem} // 渲染每個項目的函數
                keyExtractor={(item) => item.id.toString()} // 每個項目的唯一 key
                initialNumToRender={10}
                maxToRenderPerBatch={20}
                windowSize={100}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            />
        </View>
    )
}