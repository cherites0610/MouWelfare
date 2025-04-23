import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native'
import React from 'react'
import type { favourite } from '@/src/type/favourite'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

export default function Favourite() {
  const route = useRouter();
  const favourities: favourite[] = [
    {
      id: '1',
      title: 'test'
    },
    {
      id: '2',
      title: 'test2'
    }
  ]

  const renderItem = ({ item }: { item: favourite }) => (
    <TouchableOpacity onPress={() => { route.navigate(("home/" + item.id) as any) }}>
      <View style={styles.favouriteContainer}>
        <Ionicons size={60} name='chatbox-ellipses-outline'></Ionicons>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{item.title}</Text>
        </View>
        <View style={{flexDirection:'column-reverse'}}>
          <Ionicons size={30} name='heart'></Ionicons>
        </View>
        
      </View>
    </TouchableOpacity>

  )

  return (
    <View style={{paddingHorizontal:7}}>
      <FlatList
        data={favourities}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  favouriteContainer: {
    flexDirection: "row",
    marginTop: 20
  },
  titleContainer: {
    backgroundColor: 'white',
    marginHorizontal: 10,
    padding: 16,
    shadowColor: '#000',        // Tailwind: shadow-md
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,               // Android shadow
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomRightRadius: 7
  },
  title: {
    fontSize: 20,
  }
})