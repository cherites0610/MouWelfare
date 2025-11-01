import React, { use, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
} from 'react-native';
import { Link, useRouter } from 'expo-router'; // Assuming you use expo-router for Link
import { Ionicons } from '@expo/vector-icons'; // Import icons
import { COLORS } from '@/src/utils/colors';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/src/store';
import { logout } from '@/src/store/slices/userSlice';
import { setAuthToken, writeConfig } from '@/src/store/slices/configSlice';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Settings() {
    const { user, status } = useSelector((state: RootState) => state.user)
    const dispatch = useDispatch<AppDispatch>();
    const route = useRouter();

    useEffect(() => {
        console.log(1);
    }, []);
        

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.profileSection}>
                    <Image
                        source={{uri:user?.avatarUrl}}
                        style={styles.avatar}
                    />
                    <Text style={styles.profileText}>
                        {status == "succeeded" ? user?.name : '未登錄'}
                    </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.menuSection}>
                    {menuItems.map((item) => (
                        <Link key={item.text} href={item.href} asChild>
                            <TouchableOpacity style={styles.menuItem} activeOpacity={0.6}>
                                <Ionicons name={item.icon} size={22} color="#555" style={styles.icon} />
                                <Text style={styles.menuText}>{item.text}</Text>
                                <Ionicons name="chevron-forward-outline" size={20} color="#bbb" />
                            </TouchableOpacity>
                        </Link>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.bottomButton, styles.logoutButton]}
                    activeOpacity={0.8}
                    onPress={() => {
                        route.replace("/home");
                        dispatch(logout());
                        dispatch(setAuthToken(""));
                        dispatch(writeConfig());
                    }}
                >
                    <Text style={styles.bottomButtonText}>登出</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const menuItems = [
    {
        icon: 'person-outline' as const, // Use icon names from Ionicons or your chosen library
        text: '個人資料',
        href: '/account/profile' as const, // Adjust href as needed
    },
    {
        icon: 'people-outline' as const,
        text: '家庭',
        href: '/account/family' as const, // Adjust href as needed
    },
    {
        icon: 'settings-outline' as const,
        text: '設定',
        href: '/account/setting' as const, // Adjust href as needed
    },
    {
        icon: 'help-circle-outline' as const,
        text: '常見問題',
        href: '/account/fqa' as const, // Adjust href as needed
    },
];

const styles = StyleSheet.create({
    bottomButton: {
        paddingVertical: 14,
        marginHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginButton: {
        backgroundColor: COLORS.background,
    },
    logoutButton: {
        backgroundColor: COLORS.background,
    },
    bottomButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    safeArea: {
        flex: 1,
        backgroundColor: 'white', // Light background for the whole screen
    },
    container: {
        flex: 1,
        // Removed justifyContent and alignItems center
    },
    profileSection: {
        alignItems: 'center', // Center avatar and text horizontally
        paddingVertical: 30, // Add vertical spacing
        backgroundColor: 'white', // White background for this section
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40, // Make it circular
        marginBottom: 10,
        backgroundColor: '#e0e0e0', // Placeholder background
    },
    profileText: {
        fontSize: 25,
        color: '#333',
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#EFEFEF', // Light gray divider line
        // Removed marginHorizontal as it's full width now
    },
    menuSection: {
        marginTop: 10, // Space above the menu items
        backgroundColor: 'white', // White background for menu items
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1, // Add border between items
        borderBottomColor: '#F5F5F5', // Lighter border color
    },
    icon: {
        marginRight: 15, // Space between icon and text
        width: 24, // Ensure icons align nicely
        textAlign: 'center',
    },
    menuText: {
        flex: 1, // Allow text to take remaining space
        fontSize: 22,
        color: '#333',
    }
});