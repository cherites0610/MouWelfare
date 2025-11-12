// 在這裡手動填寫你電腦當前的區域網路 IP 位址
const YOUR_COMPUTER_IP = "mou-api.cherites.org"; // <--- 把這裡換成你自己的 IP

// 組合出 API 的基礎 URL
const BASE_URL = `https://${YOUR_COMPUTER_IP}`;

// 固定的使用者 ID (如果需要的話 )
const MOCK_USER_ID = "1bdc9519-1ddb-4613-828e-b0b86b39650b";

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
