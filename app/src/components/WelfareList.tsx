import { View, Text, FlatList, RefreshControl, Share, Alert, TouchableOpacity, ActivityIndicator } from 'react-native'
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
import { addFavoriteAPI } from '../api/welfareApi';
import { RootState } from '../store';
import { useSelector } from 'react-redux'

type WelfareListProps = {
    listData: Welfare[];
    refreshing: boolean; // 父組件控制
    onRefresh: () => void; // 父組件提供的刷新方法
    isLoadingMore: boolean; // 父組件提供的加載更多狀態
    onLoadMore: () => void; // 父組件提供的加載更多方法
};

type RightActionProps = {
    item: Welfare;
    prog: SharedValue<number>;
    drag: SharedValue<number>;
};

export default function WelfareList({ listData, refreshing, onRefresh, isLoadingMore, onLoadMore }: WelfareListProps) {
    const route = useRouter();

    const { authToken } = useSelector((state: RootState) => state.config)

    const handleEndReached = () => {
        if (!isLoadingMore && !refreshing) {
            // 觸發下一頁請求
            // 這裡假設父組件傳入了一個 onLoadMore 回調
            onLoadMore();
        }
    };

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

        const handleFavorite = async () => {
            const reuslt = await addFavoriteAPI(authToken, item.id)
            if (reuslt.status_code==200) {
                Alert.alert('添加成功')
            }else {
                Alert.alert('添加失敗')
            }
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
                        onPress={() => { route.navigate(('/home/' + item.id) as any) }}
                    >
                        <WelfareItem
                            location={item.location}
                            title={item.title}
                            category={item.categories}
                            lightStatus={item.light_status}
                            familyMember={item.family_member}
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
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={21}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.7}
                ListFooterComponent={isLoadingMore ? <ActivityIndicator size="small" /> : null}
            />
        </View>
    )
}