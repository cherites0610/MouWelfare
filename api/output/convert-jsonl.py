import json

# 設定輸入和輸出的檔案名稱
input_filepath = "results.json"
output_filepath = "output.jsonl"

try:
    # --- 讀取輸入的 JSON 檔案 ---
    with open(input_filepath, 'r', encoding='utf-8') as infile:
        data = json.load(infile)

except FileNotFoundError:
    print(f"錯誤：找不到輸入檔案 '{input_filepath}'。請確認檔案是否存在於相同目錄下。")
    exit() # 結束程式
except json.JSONDecodeError:
    print(f"錯誤：無法解析 '{input_filepath}' 中的 JSON 資料。請確認檔案內容是有效的 JSON 格式。")
    exit() # 結束程式
except Exception as e:
    print(f"讀取輸入檔案時發生未預期的錯誤：{e}")
    exit() # 結束程式

# --- 轉換資料格式 ---
jsonl_output_lines = []
for item in data:
    new_item = {
        "classificationAnnotation": {"displayName": ""},
        "textContent": item.get("content", "") # 使用 .get() 來安全地獲取 'content' 欄位，如果沒有則回傳空字串
    }
    jsonl_output_lines.append(json.dumps(new_item, ensure_ascii=False))

# --- 寫入 JSONL 檔案 ---
try:
    with open(output_filepath, 'w', encoding='utf-8') as outfile:
        for line in jsonl_output_lines:
            outfile.write(line + "\n")
    print(f"成功將資料從 '{input_filepath}' 轉換並儲存至 '{output_filepath}'。")
except Exception as e:
    print(f"寫入輸出檔案時發生錯誤：{e}")