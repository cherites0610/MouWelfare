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
import { Ionicons } from '@expo/vector-icons'; 
import { addFavoriteAPI, deleteFavoriteAPI } from '../api/welfareApi';

type WelfareListProps = {
    listData: Welfare[];
    refreshing: boolean;
    onRefresh: () => void;
    isLoadingMore: boolean;
    onLoadMore: () => void;
    onToggleFavorite: (welfareId: number, currentStatus: boolean) => void;
    authToken: string;
};

type RightActionProps = {
    item: Welfare;
    prog: SharedValue<number>;
    drag: SharedValue<number>;
    authToken: string;
    onToggleFavorite: (welfareId: number, currentStatus: boolean) => void;
};

export default function WelfareList({ listData, refreshing, onRefresh, isLoadingMore, onLoadMore, onToggleFavorite, authToken }: WelfareListProps) {
    const route = useRouter();

    const handleEndReached = () => {
        if (!isLoadingMore && !refreshing) {
            onLoadMore();
        }
    };

    const RightAction = ({ item, prog, drag, authToken, onToggleFavorite }: RightActionProps) => {
        const styleAnimation = useAnimatedStyle(() => {
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
                        `哞福利向您送來了福利!\n ${item.title} \n 原文鏈接:${item.link}`,
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
            try {
                if (item.isFavorited) {
          // 如果已收藏，則呼叫刪除 API
             await deleteFavoriteAPI(authToken, item.id);
             } else {
          // 如果未收藏，則呼叫新增 API
            await addFavoriteAPI(authToken, item.id);
        }
        // 呼叫父層傳來的函式，來更新 UI 狀態
        onToggleFavorite(item.id, item.isFavorited || false);
         } catch (err: any) {
     Alert.alert('操作失敗', err.message);
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
                    {/* <Text>收藏</Text> */}
                    <Ionicons 
                        name={item.isFavorited ? 'heart' : 'heart-outline'} 
                        size={28} 
                        color={'white'} 
                    />
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
                    {/* <Text>分享</Text> */}
                    <Ionicons name="share-social-outline" size={28} color={'#333'} />
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
                        <RightAction 
                        item={item} 
                        prog={progress} 
                        drag={dragX} 
                        authToken={authToken}
                        onToggleFavorite={onToggleFavorite}/>
                    )}
                >
                    <TouchableOpacity
                        onPress={() => { 
                        const lightReasonString = item.lightReason 
                            ? JSON.stringify(item.lightReason) 
                            : '';
                        route.navigate(`/home/${item.id}?lightStatus=${item.lightStatus ?? -1}&lightReason=${lightReasonString}`);
                
                        }}
                    >
                        <WelfareItem
                            location={item.location}
                            title={item.title}
                            category={item.categories}
                            lightStatus={item.lightStatus}
                            familyMember={item.familyMember}
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