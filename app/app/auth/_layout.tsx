import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

export default function Layout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false
            }}
        >
            <Stack.Screen name='login'></Stack.Screen>
            <Stack.Screen name='register'></Stack.Screen>
            <Stack.Screen name='verify'></Stack.Screen>
            <Stack.Screen name='forgetPassword'></Stack.Screen>
        </Stack>
    )
}