import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import React, { useEffect } from 'react'
import { FamilysResponse, fetchUserFamilyApi } from '@/src/api/familyApi'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { useRoute } from '@react-navigation/native'
import { useRouter } from 'expo-router'

export default function Family() {
  const [familys, setFamilys] = React.useState<FamilysResponse[]>([])

  const route = useRouter()

  useEffect(() => {
    const fetchFamily = async () => {
      const token = await AsyncStorage.getItem('token')
      const familys = await fetchUserFamilyApi(token!)
      setFamilys(familys)
    }
    fetchFamily()
  }, [])

  const handlerClickCard = (index: number) => {
    // Handle card click here, e.g., navigate to family details
    // console.log(`Family card ${index} clicked`)
    route.navigate(("/account/"+index) as any)
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {familys.map((family, index) => (
          <TouchableOpacity onPress={() => {handlerClickCard(Number(family.id))}}  >
            <View key={index} style={styles.card}>
              <Text style={styles.familyName}>{family.name}</Text>
              {family.members.map((member, index) => (
                <View key={index} style={styles.memberRow}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Ionicons name="arrow-forward-outline" size={24} color="#666" />
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  familyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberName: {
    fontSize: 16,
    color: '#555',
  },
});
