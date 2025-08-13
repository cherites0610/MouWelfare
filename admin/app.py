# -*- coding: utf-8 -*-

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
from google.auth.transport.requests import Request
from google.oauth2 import service_account

app = Flask(__name__)
CORS(app)

# --- 1. 設定 GCP Discovery Engine 相關參數 ---
# 專案 ID
PROJECT_ID = os.getenv("PROJECT_ID")
# 區域
LOCATION = os.getenv("LOCATION")
# 集合 ID
COLLECTION_ID = os.getenv("COLLECTION_ID")
# 引擎 ID
ENGINE_ID = os.getenv("ENGINE_ID")
# 服務配置 ID
SERVING_CONFIG_ID = os.getenv("SERVING_CONFIG_ID")

# 請確保您的服務帳戶金鑰檔案位於此路徑
# 服務帳戶必須擁有 'Discovery Engine User' 權限
SERVICE_ACCOUNT_KEY_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

# 設定 API 端點 URL，這與您 curl 命令中的 URL 相同
API_ENDPOINT = (
    f"https://discoveryengine.googleapis.com/v1alpha/projects/{PROJECT_ID}/locations/{LOCATION}/collections/{COLLECTION_ID}/engines/{ENGINE_ID}/servingConfigs/{SERVING_CONFIG_ID}:answer"
)

# --- 2. 處理 GCP 驗證的函式 ---
def get_access_token():
    """使用服務帳戶金鑰取得 OAuth 2.0 存取權杖"""
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
    
    # 檢查金鑰檔案是否存在
    if not os.path.exists(SERVICE_ACCOUNT_KEY_FILE):
        raise FileNotFoundError(f"服務帳戶金鑰檔案未找到於: {SERVICE_ACCOUNT_KEY_FILE}")

    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_KEY_FILE, scopes=scopes
    )
    creds.refresh(Request())
    return creds.token
# --- 3. 處理 AI 答案生成的函式 ---
def get_ai_answer(query_text):
    """
    呼叫 Discovery Engine API 並回傳處理後的結果。
    此函式會根據 Discovery Engine 的 API 格式構造請求。
    """
    try:
        access_token = get_access_token()
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        
        # 構造 curl 命令完全相同的 JSON 請求，並整合 promptSpec
        data = {
            "query": {
                "text": query_text,
                "queryId": ""
            },
            "session": "",
            "relatedQuestionsSpec": {
                "enable": True
            },
            "answerGenerationSpec": {
                "ignoreAdversarialQuery": False,
                "ignoreNonAnswerSeekingQuery": False,
                "ignoreLowRelevantContent": True,
                "multimodalSpec": {},
                "includeCitations": True,
                # --- 新增的 promptSpec ---
                "promptSpec": {
                    "preamble": """你是一位熱心且專業的福利查詢小幫手，名字是「阿哞」。
                        你的任務是根據所提供的資料庫內容，為使用者提供政府福利相關的資訊。

                        回答原則：
                        1. 回答內容必須嚴格基於所提供的資料庫。
                        2. 清楚說明福利的名稱和相關內容，並以專業、熱心的口吻回答。
                        3. 每個回答的字數必須維持在 200 字以內，並力求簡潔明瞭。
                        4. 當使用者提供的資料不明確或不夠完整時，在回應的最後持續追問更多資訊，例如「請問您是哪個縣市的居民呢？」或「您方便提供更具體的資料嗎？」，以幫助使用者找到適合自己的福利。
                        5. 如果資料庫中找不到使用者提問的資訊，請禮貌地告知使用者目前無法提供相關資訊，並避免編造或猜測答案。"""
                },
                # --- 結束 ---
                "modelSpec": {
                    "modelVersion": "stable"
                }
            },
            "queryUnderstandingSpec": {
                "queryClassificationSpec": {
                    "types": [
                        "NON_ANSWER_SEEKING_QUERY",
                        "NON_ANSWER_SEEKING_QUERY_V2"
                    ]
                }
            }
        }
        
        response = requests.post(API_ENDPOINT, headers=headers, data=json.dumps(data))
        response.raise_for_status() # 如果請求失敗，會拋出異常

        response_data = response.json()
        print(response_data)

        answer_data = response_data.get("answer")
        if not answer_data:
            return {"answer_text": "無法生成答案", "citations": [], "related_questions": []}

        summary_text = answer_data.get("answerText")
        if not summary_text:
            return {"answer_text": "無法生成答案", "citations": [], "related_questions": []}

        citations = []
        references = answer_data.get("references", [])
        citations_data = answer_data.get("citations", [])
        related_questions = answer_data.get("relatedQuestions", [])

        if citations_data and references:
            for c in citations_data:
                for src in c.get("sources", []):
                    ref_id = int(src.get("referenceId", -1))
                    if 0 <= ref_id < len(references):
                        ref = references[ref_id].get("structuredDocumentInfo", {})
                        title = ref.get("title", "無標題")
                        link = ref.get("uri", "")
                        citations.append({"title": title, "link": link})

        return {
            "answer_text": summary_text,
            "citations": citations,
            "related_questions": related_questions
        }


    except FileNotFoundError as e:
        print(f"檔案錯誤: {e}")
        raise e
    except requests.exceptions.RequestException as e:
        print(f"API 請求失敗: {e}")
        raise e
    except Exception as e:
        print(f"處理請求時發生錯誤: {e}")
        raise e

# --- 4. 定義後端 API 端點 ---
@app.route("/api/ai-test", methods=["POST"])
def ai_test_endpoint():
    user_query = request.json.get("query")
    if not user_query:
        return jsonify({"error": "缺少查詢參數"}), 400

    try:
        # 呼叫新的函式來獲取答案
        ai_response = get_ai_answer(user_query)
        print("回傳內容:", ai_response)
        # 回傳包含答案、相關引用和相關問題的 JSON 物件
        return jsonify(ai_response)
        
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        print(f"處理請求時發生錯誤: {e}")
        return jsonify({"error": "伺服器內部錯誤"}), 500

# --- 5. 運行服務 ---
if __name__ == "__main__":
    app.run(debug=True, port=5000)