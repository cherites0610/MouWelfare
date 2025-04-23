import { View, Text } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useLocalSearchParams } from 'expo-router';
import { FamilysResponse, fetchFmailyApi } from '@/src/api/familyApi';
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/src/store';

export default function FmailyID() {
    const { autoFilterUserData, elderlyMode, authToken } = useSelector((state: RootState) => state.config);
    const [family,setFamily] = useState<FamilysResponse>()

    const glob = useLocalSearchParams();



    const getFamily = async () => {
        try {
            const family = await fetchFmailyApi(authToken,Number(glob.familyid))
            setFamily(family)
        } catch (error) { 

        }
    }

    useEffect(() => {
        getFamily()
    })

    return (
        <View>
            <Text>[familyid]</Text>
            <Text>{family?.name}</Text>
        </View>
    )
}