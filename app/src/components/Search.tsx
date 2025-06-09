import { View, Image, TextInput, StyleSheet, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../utils/colors';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from "react-redux"
import { AppDispatch, RootState } from '../store';
import { setSearchQuery } from '../store/slices/filiterSlice';


export default function Search() {
  const route = useRouter()
  const dispatch = useDispatch<AppDispatch>();
  const { searchQuery } = useSelector((state:RootState) => state.filiter)

  return (
    <View style={styles.SearchBar}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.avatar}
      />
      <TextInput
        returnKeyType="search"
        enablesReturnKeyAutomatically={true}
        style={styles.input}
        onChangeText={(text) => {
          dispatch(setSearchQuery(text))
        }}
        value={searchQuery}
        placeholder="Ex. 兒童福利"
        placeholderTextColor="#888"
      />
      <View style={styles.iconContainer}>
        <TouchableOpacity onPress={() => { route.navigate("/home/favourite") }}>
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