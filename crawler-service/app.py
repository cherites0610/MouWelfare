from fastapi import FastAPI
from pydantic import BaseModel
import requests, json, re, time
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
from datetime import datetime

app = FastAPI()
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_PATH = BASE_DIR / "output.json"
visited = set()

class CrawlRequest(BaseModel):
    url: str = None
    city: str

def append_json(path: Path, data: dict):
    if path.exists():
        try:
            current = json.loads(path.read_text(encoding="utf-8"))
        except:
            current = []
    else:
        current = []
    current.append(data)
    path.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8")

# ================== 台北爬蟲 (Requests + BS4) ==================
STOP_SELECTOR = ".list-text.detail.bottom-detail"
LINK_SELECTOR = ".list-text.content-list .h4 a"
EXTRACT_SELECTORS = {
    "title": "h2.h3",
    "date": ".list-text.detail.bottom-detail ul li:nth-child(2)",
    "content": ".area-editor.user-edit, .area-editor.user-edit td[colspan='3'], .div .essay"
}

def crawl_taipei(url, city, results: list):
    global visited
    if url in visited:
        print(f"[DEBUG] URL 已訪問: {url}")
        return
    visited.add(url)

    BASE_URL = "https://dosw.gov.taipei/"

    print(f"[DEBUG] 開始爬取(台北): {url}")
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        print(f"[DEBUG] 網頁取得成功: {url}")
    except requests.RequestException as e:
        print(f"[ERROR] 爬取 {url} 發生錯誤: {e}")
        return

    resp.encoding = "utf-8"
    soup = BeautifulSoup(resp.text, "html.parser")

    links = soup.select(LINK_SELECTOR)
    if links:
        print(f"[DEBUG] 發現 {len(links)} 個子連結，遞迴爬取...")
        for link in links:
            next_url = urljoin(BASE_URL, link.get("href"))
            crawl_taipei(next_url, city, results)
    else:
        if soup.select_one(STOP_SELECTOR):
            print(f"[DEBUG] 停止選擇器找到，準備抓取內容: {url}")
            title_el = soup.select_one(EXTRACT_SELECTORS["title"])
            date_el = soup.select_one(EXTRACT_SELECTORS["date"])
            content_elements = soup.select(EXTRACT_SELECTORS["content"])
            content = "\n".join([el.get_text(strip=True) for el in content_elements])

            date_text = date_el.get_text(strip=True) if date_el else ""
            print(f"[DEBUG] 原始日期文字: {date_text}")
            date_match = re.search(r"\d{3}-\d{2}-\d{2}", date_text)
            date_converted = ""
            if date_match:
                try:
                    parts = date_match.group(0).split("-")
                    roc_year = int(parts[0])
                    year = roc_year + 1911
                    date_converted = f"{year}-{parts[1]}-{parts[2]}"
                    print(f"[DEBUG] 轉換後日期: {date_converted}")
                except Exception as e:
                    print(f"[WARN] 日期轉換失敗: {date_text}, error: {e}")

            data = {
                "city": city,
                "url": url,
                "title": title_el.get_text(strip=True) if title_el else "",
                "date": date_converted,
                "content": content,
            }

            if data["title"] and data["date"] and data["content"]:
                results.append(data)
                append_json(OUTPUT_PATH, data)
                print(f"[INFO] 已抓取: {data['title']} ({data['date']})")
            else:
                print(f"[WARN] 資料不完整，略過: {url}")

# ================== 南投爬蟲 (Selenium, 修正 PostBack 連結) ==================
def crawl_nantou(results: list):
    LIST_URL = "https://welfare.nantou.gov.tw/1486/WebMap/ListView/3654/zh-Hant-TW"

    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")

    print("[DEBUG] 初始化 Chrome WebDriver...")
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

    print(f"[DEBUG] 打開列表頁: {LIST_URL}")
    driver.get(LIST_URL)
    time.sleep(2)  # 等待 JS 渲染
    print("[DEBUG] 頁面加載完成")

    # 找到所有公告 <a>
    links = driver.find_elements(By.CSS_SELECTOR, ".table-responsive ul li ul li ul li ul li ul li a")
    print(f"[DEBUG] 使用選擇器 '.table-responsive ul li ul li ul li ul li ul li a' 找到 {len(links)} 個連結")

    link_urls = []
    for a in links:
        href = a.get_attribute("href")
        if href and href.startswith("http"):
            link_urls.append(href)
        else:
            # 處理 javascript:__doPostBack
            onclick = a.get_attribute("onclick")
            if onclick:
                import re
                m = re.search(r"'(\/1486\/WebMap\/PageListPartial.*?)'", onclick)
                if m:
                    link_urls.append("https://welfare.nantou.gov.tw" + m.group(1))

    print(f"[DEBUG] 過濾後有效連結數: {len(link_urls)}")

    for detail_url in link_urls:
        if detail_url in visited:
            continue
        visited.add(detail_url)

        try:
            driver.get(detail_url)
            time.sleep(1)

            title_tag = driver.find_element(By.CSS_SELECTOR, "h2")
            title = title_tag.text.strip() if title_tag else ""

            date_tag = driver.find_element(By.XPATH, "//table//tr[th[text()='發布時間']]/td")
            raw_date = date_tag.text.strip() if date_tag else ""
            date = ""

            # 嘗試轉成 xxxx-xx-xx
            try:
                # 先把斜線改成標準解析
                date = datetime.strptime(raw_date, "%Y/%m/%d").strftime("%Y-%m-%d")
            except ValueError:
                # 如果格式不符合就略過
                print(f"⚠️ 日期轉換失敗: {raw_date}")

            content_tag = driver.find_element(By.XPATH, "//table//tr[th[text()='內容']]/td")
            content = content_tag.text if content_tag else ""

            if not title or not content:
                continue

            data = {
                "city": "南投市",
                "title": title,
                "date": date,
                "content": content,
                "url": detail_url
            }

            results.append(data)
            append_json(OUTPUT_PATH, data)
            print(f"✅ 已抓取: {title} ({date})")

        except Exception as e:
            print(f"⚠️ 抓取失敗: {detail_url} - {e}")
            continue

    driver.quit()
    print(f"[DEBUG] WebDriver 已關閉")
    print(f"[INFO] 南投爬取完成，共抓到 {len(results)} 筆資料")


# ================== FastAPI 入口 ==================
@app.post("/crawl")
async def crawl_endpoint(req: CrawlRequest):
    global visited
    visited = set()
    
    # 確保輸出目錄存在
    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    OUTPUT_PATH.write_text("[]", encoding="utf-8")
    results = []

    print(f"[DEBUG] 開始爬取城市: {req.city}")

    if req.city == "台北市":
        if not req.url:
            return {"success": False, "message": "台北市必須提供 url", "data": []}
        crawl_taipei(req.url, req.city, results)
    elif req.city in ["南投市", "南投縣", "nantou"]:  # 新增 nantou 支援
        crawl_nantou(results)
    else:
        return {"success": False, "message": f"目前不支援 {req.city}", "data": []}

    print(f"[DEBUG] 完成爬取城市: {req.city}, 共 {len(results)} 筆資料")
    return {"success": True, "city": req.city, "count": len(results), "data": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)