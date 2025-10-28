import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function CowLoading() {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.overlay}>
      {/* 外圈旋轉的圓圈 */}
      <Animated.View style={[styles.circle, { transform: [{ rotate: spin }] }]}>
        <View style={styles.dot} />
      </Animated.View>

      {/* 小牛圖片 */}
      <Image
        source={require('../../../app/assets/images/Mou/cow.jpg')}
        style={styles.cow}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // 半透明背景
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // 確保在最上層
  },
  circle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: '#FFD9EC', // 柔粉外圈
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  dot: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#FF7BAC', // 可愛粉色點
    position: 'absolute',
    top: -8,
  },
  cow: {
    width: 100,
    height: 100,
  },
});
