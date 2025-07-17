
# 福利管理後臺 API 文件
這份文件旨在協助前端開發人員與後端福利管理系統進行串接。請在使用前仔細閱讀所有說明。

## API Base Url
`https://mou-api.cherites.org`

## 認證 (Authentication)
所有需要權限的 API 端點都必須經過驗證。請在 HTTP 請求的 Header 中加入 `Authorization` 欄位。

* **驗證模式 (Type)**: **Bearer**

#### 範例
1.  **原始 API Key**:
    `a78301c8de0e462d827679cd590223fd`
2.  **Base64 編碼後**:
    `YTc4MzAxYzBkZTBlNDYyZDgyNzY3OWNkNTkwMjIzZmQ=`
3.  **最終放入 Header 的內容**:
    `Authorization: Bearer YTc4MzAxYzBkZTBlNDYyZDgyNzY3OWNkNTkwMjIzZmQ=`

## 標準回應格式 (Standard Response Formats)

#### 成功回應 (`200 OK`)
所有成功的請求都會回傳以下格式的 JSON 物件：
```json
{
  "message": "一個描述操作結果的訊息，例如 '查詢成功'",
  "data": {
    // 實際的資料內容會放在這裡
  }
}
````

#### 錯誤回應 (`4xx` 或 `5xx`)

當請求發生錯誤時（例如：認證失敗、找不到資源、資料驗證錯誤），會回傳以下格式的 JSON 物件：

```json
{
  "statusCode": 401,
  "message": "詳細的錯誤訊息，例如 '無效的 API Key'",
  "error": "錯誤類型，例如 'Unauthorized'"
}
```

-----

## API 端點 (Endpoints)

以下是所有可用的 API 端點。

### 1\. 取得所有異常福利列表

這個端點用於獲取所有被標記為「有異常」的福利項目清單。

| 屬性 | 內容 |
| --- | --- |
| **方法 (Method)** | `GET` |
| **路徑 (Path)** | `/welfare/admin/abnormal` |
| **認證 (Auth)** | **必要 (Required)** |

#### Headers

  * `Authorization`: `Bearer <YourBase64Token>`

#### Curl 範例

```bash
curl -X GET '[https://mou-api.cherites.org/welfare/admin/abnormal](https://mou-api.cherites.org/welfare/admin/abnormal)' \
-H 'Authorization: Bearer NTI2NmIyZTAxNDgxNGE2MWE2ODgxZWZhYTlmYmI3MzY='
```

-----

### 2\. 取得單一福利資料

透過福利項目的唯一 id 來查詢其詳細資料。

| 屬性 | 內容 |
| --- | --- |
| **方法 (Method)** | `GET` |
| **路徑 (Path)** | `/welfare/:id` |
| **認證 (Auth)** | **不需要 (Not Required)** |

#### 路徑參數 (Path Parameters)

  * `id` (string, uuid): 福利項目的唯一識別碼。

#### Curl 範例

```bash
curl -X GET '[https://mou-api.cherites.org/welfare/0044149a-4130-4bef-934f-4c91a8e2f87b](https://mou-api.cherites.org/welfare/0044149a-4130-4bef-934f-4c91a8e2f87b)'
```

-----

### 3\. 將福利標記為無異常

將某個被標記為異常的福利項目，更新為「無異常」狀態 (`isAbnormal: false`)。

| 屬性 | 內容 |
| --- | --- |
| **方法 (Method)** | `POST` |
| **路徑 (Path)** | `/welfare/:id/abnormal/false` |
| **認證 (Auth)** | **必要 (Required)** |

#### 路徑參數 (Path Parameters)

  * `id` (string, uuid): 福利項目的唯一識別碼。

#### Curl 範例

```bash
curl -X POST '[https://mou-api.cherites.org/welfare/0044149a-4130-4bef-934f-4c91a8e2f87b/abnormal/false](https://mou-api.cherites.org/welfare/0044149a-4130-4bef-934f-4c91a8e2f87b/abnormal/false)' \
-H 'Authorization: Bearer NTI2NmIyZTAxNDgxNGE2MWE2ODgxZWZhYTlmYmI3MzY='
```

-----

### 4\. 更新福利資料

修改一個已存在的福利項目的部分或全部資料。

| 屬性 | 內容 |
| --- | --- |
| **方法 (Method)** | `PATCH` |
| **路徑 (Path)** | `/welfare/:id` |
| **認證 (Auth)** | **必要 (Required)** |

#### Headers

  * `Authorization`: `Bearer <YourBase64Token>`
  * `Content-Type`: `application/json`

#### 路徑參數 (Path Parameters)

  * `id` (string, uuid): 福利項目的唯一識別碼。

#### 請求內文 (Request Body)

請求內文是一個 JSON 物件，包含您想要更新的欄位。使用 `PATCH` 方法時，所有欄位都是**選填**的。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `title` | `string` | 福利標題 |
| `details` | `string` | 詳細內容 |
| `summary` | `string` | 摘要 |
| `link` | `string` | 相關連結，必須是有效的 URL 格式 |
| `forward` | `string` | 轉發/分享時的文案 |
| `publicationDate`| `string` | 發布日期，格式為 `YYYY-MM-DD` |
| `status` | `number` | 福利狀態，例如 `0`=草稿, `1`=已發布 |
| `locationID` | `number` | 地點的 ID (關聯的主鍵) |
| `categoryID` | `Array<number>` | 福利所屬分類的 ID 陣列 |
| `identityID` | `Array<number>` | 福利適用身分的 ID 陣列 |
| `isAbnormal` | `boolean` | 是否標記為異常 |

#### Curl 範例

```bash
curl -X PATCH '[https://mou-api.cherites.org/welfare/0044149a-4130-4bef-934f-4c91a8e2f87b](https://mou-api.cherites.org/welfare/0044149a-4130-4bef-934f-4c91a8e2f87b)' \
-H 'Authorization: Bearer NTI2NmIyZTAxNDgxNGE2MWE2ODgxZWZhYTlmYmI3MzY=' \
-H 'Content-Type: application/json' \
-d '{
  "title": "更新後的福利標題",
  "link": "[https://new.link.com](https://new.link.com)",
  "status": 1
}'
```

-----

### 5\. 刪除福利

永久刪除一個福利項目。此操作無法復原。

| 屬性 | 內容 |
| --- | --- |
| **方法 (Method)** | `DELETE` |
| **路徑 (Path)** | `/welfare/:id` |
| **認證 (Auth)** | **必要 (Required)** |

#### 路徑參數 (Path Parameters)

  * `id` (string, uuid): 福利項目的唯一識別碼。

#### Curl 範例

```bash
curl -X DELETE '[https://mou-api.cherites.org/welfare/0044149a-4130-4bef-934f-4c91a8e2f87b](https://mou-api.cherites.org/welfare/0044149a-4130-4bef-934f-4c91a8e2f87b)' \
-H 'Authorization: Bearer NTI2NmIyZTAxNDgxNGE2MWE2ODgxZWZhYTlmYmI3MzY='
```

-----

### 6\. 新增福利資料

建立一個新的福利項目。

| 屬性 | 內容 |
| --- | --- |
| **方法 (Method)** | `POST` |
| **路徑 (Path)** | `/welfare` |
| **認證 (Auth)** | **必要 (Required)** |

#### Headers

  * `Authorization`: `Bearer <YourBase64Token>`
  * `Content-Type`: `application/json`

#### 請求內文 (Request Body)

請求內文是一個 JSON 物件。除了 `isAbnormal` 為選填 (預設為 `false`) 外，其他所有欄位皆為**必填**。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `title` | `string` | 福利標題 |
| `details` | `string` | 詳細內容 |
| `summary` | `string` | 摘要 |
| `link` | `string` | 相關連結，必須是有效的 URL 格式 |
| `forward` | `string` | 轉發/分享時的文案 |
| `publicationDate`| `string` | 發布日期，格式為 `YYYY-MM-DD` |
| `status` | `number` | 福利狀態，例如 `0`=草稿, `1`=已發布 |
| `locationID` | `number` | 地點的 ID (關聯的主鍵) |
| `categoryID` | `Array<number>` | 福利所屬分類的 ID 陣列 |
| `identityID` | `Array<number>` | 福利適用身分的 ID 陣列 |
| `isAbnormal` | `boolean` | (選填) 是否標記為異常，預設 `false` |

#### Curl 範例

```bash
curl -X POST '[https://mou-api.cherites.org/welfare](https://mou-api.cherites.org/welfare)' \
-H 'Authorization: Bearer NTI2NmIyZTAxNDgxNGE2MWE2ODgxZWZhYTlmYmI3MzY=' \
-H 'Content-Type: application/json' \
-d '{
    "title": "新建立的福利",
    "details": "這是一個詳細的福利內容說明...",
    "summary": "這是摘要",
    "link": "[https://example.com/new-welfare](https://example.com/new-welfare)",
    "forward": "快來看看這個新福利！",
    "publicationDate": "2025-07-13",
    "status": 1,
    "locationID": 1,
    "categoryID": [1, 5],
    "identityID": [2, 3]
}'
```