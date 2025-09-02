// 在這裡手動填寫你電腦當前的區域網路 IP 位址
const YOUR_COMPUTER_IP = '172.20.10.6'; // <--- 把這裡換成你自己的 IP

// 組合出 API 的基礎 URL
const BASE_URL = `http://${YOUR_COMPUTER_IP}:3000`;

// 固定的使用者 ID (如果需要的話 )
const MOCK_USER_ID = '06d55800-9a60-4a33-9777-e6ac439b82e7';

// 將所有設定值匯出，方便其他檔案使用
export const AppConfig = {
  api: {
    baseUrl: BASE_URL,
    endpoints: {
      conversations: `${BASE_URL}/vertex/conversations`,
      search: `${BASE_URL}/vertex/search`,
    },
  },
  user: {
    mockId: MOCK_USER_ID,
  },
};