export interface Config {
    elderlyMode: boolean; // 是否開啟老人模式
    autoFilterUserData: boolean; // 首頁是否自動篩選用戶資料
    autoInjectChatContext: boolean; // 阿哞是否自動篩選用戶資料
    authToken: string; // 存放認證 token
    appLaunchCount: number; // 應用程式開啟次數
    needsNewChat?: 'personalized' | 'general' | null;
}