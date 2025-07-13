# 福利管理後臺
這份文件旨在協助前端開發人員與後端福利管理系統進行串接。請在使用前仔細閱讀所有說明。

## API Base Url:  
`https://mou-api.cherites.org`  

## 認證 (Authentication)
所有對本 API 的請求都必須經過驗證。請在 HTTP 請求的 Header 中加入 Authorization 欄位。
- 驗證模式 (Type): **Bearer**
- API Key: **5266b2e014814a61a6881efaa9fbb736**
### 如何產生 Token:
你需要將 API Key 透過 Base64 編碼，然後將編碼後的字串放到 Bearer  後方。
### 範例:
1. 原始 API Key:  
`a78301c8de0e462d827679cd590223fd`
2. Base64 編碼後:  
`YTc4MzAxYzBkZTBlNDYyZDgyNzY3OWNkNTkwMjIzZmQ=`
1. 最終放入 Header 的內容:  
`Authorization: Bearer YTc4MzAxYzBkZTBlNDYyZDgyNzY3OWNkNTkwMjIzZmQ=`
***
## API端點(Endpoints)
以下是所有可用的 API 端點。
***
1. 取得所有異常福利列表  
這個端點用於獲取所有被標記為「有異常」的福利項目清單。
- 方法 (Method): GET
- 路徑 (Path): /welfare/admin/abnormal
***
1. 取得單一福利資料  
透過福利項目的唯一 id 來查詢其詳細資料。

- 方法 (Method): GET
- 路徑 (Path): /welfare/:id
***
3. 將福利標記爲無異常  
將某個被標記為異常的福利項目，更新為「無異常」狀態。
- 方法 (Method): POST
- 路徑 (Path): /welfare/:id/abnormal/false
***
4. 更新福利資料  
修改一個已存在的福利項目的部分或全部資料。
- 方法 (Method): PATCH
- 路徑 (Path): /welfare/:id
***
5. 刪除福利  
永久刪除一個福利項目。此操作無法復原。
- 方法 (Method): DELETE
- 路徑 (Path): /welfare/:id