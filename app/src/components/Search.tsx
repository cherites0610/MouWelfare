import { View, Image, TextInput, StyleSheet, TouchableOpacity } from 'react-native'
import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../utils/colors';
import { useRouter } from 'expo-router';

export default function Search() {
  const route = useRouter()

  return (
    <View style={styles.SearchBar}>
      <Image
        // Replace with your actual avatar source or a placeholder
        source={require('../../assets/images/logo.png')}
        style={styles.avatar}
      />
      <TextInput
        returnKeyType="search"
        enablesReturnKeyAutomatically={true}
        style={styles.input}
        placeholder="Ex. 兒童福利"
        placeholderTextColor="#888"
      />
      <View style={styles.iconContainer}>
        <TouchableOpacity onPress={() => {route.navigate("/home/favourite")}}>
          <Ionicons name="heart-outline" size={24} color="black" style={styles.icon} />
        </TouchableOpacity>

      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    width: 40,
    height: 40,
    marginRight: 7,
    borderRadius: 40, // Make it circular
  },
  SearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background, // 綠色背景
    borderRadius: 10, // 圓角
    margin: 10,
  },
  prefixText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
    marginRight: 10,
  },
  input: {
    flex: 1, // 讓輸入框佔據剩餘空間
    height: 40,
    backgroundColor: 'white',
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  iconContainer: {
    flexDirection: 'row',
  },
  icon: {
    marginLeft: 10,
  },
});