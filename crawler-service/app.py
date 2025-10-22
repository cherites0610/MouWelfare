from fastapi import FastAPI
from pydantic import BaseModel
import requests, json, re, time, mimetypes
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI
from pydantic import BaseModel
import json
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, TimeoutError

# 附件處理需要的套件
import pdfplumber
import docx2txt
import io
import docx
import tempfile
import os

app = FastAPI()
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_PATH = BASE_DIR / "output.json"
visited = set()
executor = ThreadPoolExecutor(max_workers=2)  # 同時最多跑 2 個城市

class CrawlRequest(BaseModel):
    url: str = None
    city: str
    config: dict = None


# ================== 共用工具函式 ==================
def append_json(path: Path, data: dict):
    """安全寫入 json"""
    if path.exists():
        try:
            current = json.loads(path.read_text(encoding="utf-8"))
        except:
            current = []
    else:
        current = []
    current.append(data)
    path.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8")

async def run_in_thread(fn, *args):
    """把同步函式包成異步，可用 asyncio.gather 並行"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, fn, *args)

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


MAX_CONTENT_LENGTH = 4000  # 最大字數限制

# ========== 附件解析 ==========
def extract_text_from_bytes(content_bytes: bytes, ext: str, paragraphs: int = 2) -> str:
    """解析 PDF/DOCX/TXT 附件，過濾表格與短行"""
    text = ""
    try:
        if ext.lower() == ".pdf":
            with pdfplumber.open(io.BytesIO(content_bytes)) as pdf:
                all_text = []
                for page in pdf.pages[:10]:  # 最多讀前10頁
                    page_text = page.extract_text(x_tolerance=2, y_tolerance=3)
                    if not page_text:
                        continue
                    page_text = re.sub(r"[│┤├┬┴┼─━‐-–—]", " ", page_text)
                    page_text = re.sub(r"\n(?=[^\n]{1,10}\n)", " ", page_text)
                    all_text.append(page_text.strip())
                full_text = "\n\n".join(all_text)
        elif ext.lower() == ".docx":
            full_text = docx2txt.process(io.BytesIO(content_bytes))
        elif ext.lower() in [".txt", ".csv"]:
            full_text = content_bytes.decode("utf-8", errors="ignore")
        else:
            return ""

        lines = [l.strip() for l in full_text.splitlines() if len(l.strip()) > 8]
        lines = [l for l in lines if not re.search(r"\t|,{3,}|；{2,}|：{2,}", l)]
        full_text = "\n".join(lines)

        paragraphs_list = [p.strip() for p in re.split(r"\n{2,}", full_text) if len(p.strip()) > 50]
        text = "\n\n".join(paragraphs_list[:paragraphs])

        if len(text) < 100 or len(re.findall(r"\d", text)) > len(text)*0.4:
            return ""
    except Exception as e:
        print(f"[ERROR] 附件解析失敗: {e}")
        return ""
    return text.strip()


def safe_extract_text(content_bytes: bytes, ext: str, timeout_sec: int = 10) -> str:
    """在子進程解析附件，超時就略過"""
    with ProcessPoolExecutor(max_workers=1) as executor:
        future = executor.submit(extract_text_from_bytes, content_bytes, ext)
        try:
            return future.result(timeout=timeout_sec)
        except TimeoutError:
            print(f"[WARN] 附件解析超時，略過")
            return ""
        except Exception as e:
            print(f"[ERROR] 附件解析失敗: {e}")
            return ""


def download_and_process_attachments(soup: BeautifulSoup, base_url: str, title: str, download_selector: str = None) -> list:
    """下載附件，只回傳文字，超時或格式不支援會略過"""
    attachments = []
    elements = soup.select(download_selector or ".list-text.file-download-multiple ul li a")
    for idx, a in enumerate(elements[:2]):
        name = a.get_text(strip=True) or f"附件{idx+1}"
        link = urljoin(base_url, a.get("href"))
        ext = Path(link).suffix.lower()
        print(f"[DEBUG] 下載附件: {name} ({link})")

        if ext not in [".pdf", ".docx", ".txt", ".csv"]:
            print(f"[WARN] 不支援附件格式: {name} ({ext})")
            continue

        try:
            r = requests.get(link, timeout=15)
            r.raise_for_status()
            if len(r.content) > 2*1024*1024:  # 超過2MB略過
                print(f"[WARN] 附件太大，略過: {name}")
                continue
            file_text = safe_extract_text(r.content, ext, timeout_sec=10)
            if file_text:
                print(f"[INFO] ✅ 附件解析成功: {name} ({len(file_text)}字)")
                attachments.append(file_text)
            else:
                print(f"[INFO] ⚠️ 附件無有效文字: {name}")
        except Exception as e:
            print(f"[WARN] 附件下載/解析失敗: {name}, {e}")
    return attachments


# ========== 截斷文字 ==========
def truncate_text(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    cut_point = text.rfind("。", 0, max_len)
    if cut_point == -1:
        return text[:max_len]
    return text[:cut_point+1]


# ========== 台北爬蟲 ==========
def crawl_taipei(url, city, results: list, config: dict = None):
    global visited
    if url in visited:
        print(f"[DEBUG] 已訪問過: {url}")
        return
    visited.add(url)
    print(f"[DEBUG] 開始抓取 URL: {url}")

    BASE_URL = "https://dosw.gov.taipei/"
    STOP_SELECTOR = config.get("stopSelector", ".list-text.detail.bottom-detail") if config else ".list-text.detail.bottom-detail"
    LINK_SELECTOR = ".list-text.content-list .h4 a"
    EXTRACT_SELECTORS = config.get("extractSelectors", {
        "title": "h2.h3",
        "date": ".list-text.detail.bottom-detail ul li:nth-child(2)",
        "content": ".area-editor.user-edit, .area-editor.user-edit td[colspan='3'], .div .essay",
    })

    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")
    except Exception as e:
        print(f"[ERROR] 無法取得 {url}: {e}")
        return

    # ===== 列表頁遞迴 =====
    links = soup.select(LINK_SELECTOR)
    if links:
        print(f"[DEBUG] 發現 {len(links)} 筆列表資料，準備遞迴...")
        for link in links[:40]:
            next_url = urljoin(BASE_URL, link.get("href"))
            crawl_taipei(next_url, city, results, config)
        return

    # ===== 判斷內文頁 =====
    if not soup.select_one(STOP_SELECTOR) and not soup.select_one(".area-editor.user-edit"):
        print(f"[DEBUG] 非內文頁，略過: {url}")
        return

    # ===== 抓內文 =====
    title_el = soup.select_one(EXTRACT_SELECTORS["title"])
    date_el = soup.select_one(EXTRACT_SELECTORS["date"])
    content_els = soup.select(EXTRACT_SELECTORS["content"])
    title = title_el.get_text(strip=True) if title_el else ""
    content = "\n".join([el.get_text(" ", strip=True) for el in content_els])
    print(f"[DEBUG] 抓取標題: {title}")

    # ===== 子頁整合 (從第二個 li 開始) =====
    inner_links = soup.select(".list-text.classify ul li a")[1:]
    for i, a in enumerate(inner_links[:5], start=2):
        if len(content) >= MAX_CONTENT_LENGTH:
            break
        inner_url = urljoin(BASE_URL, a.get("href"))
        try:
            r = requests.get(inner_url, timeout=10)
            r.encoding = "utf-8"
            inner_soup = BeautifulSoup(r.text, "html.parser")
            inner_content = "\n".join([el.get_text(" ", strip=True) for el in inner_soup.select(EXTRACT_SELECTORS["content"])])
            if inner_content:
                remaining = MAX_CONTENT_LENGTH - len(content)
                inner_trunc = truncate_text(inner_content, remaining)
                if inner_trunc:
                    content += f"\n\n" + inner_trunc
                    print(f"[DEBUG] 整合子頁{i} 完成")
        except Exception as e:
            print(f"[WARN] 子頁{i} 讀取失敗: {e}")

    # ===== 附件 =====
    if len(content) < MAX_CONTENT_LENGTH:
        attachments = download_and_process_attachments(soup, BASE_URL, title)
        for idx, att in enumerate(attachments, start=1):
            remaining = MAX_CONTENT_LENGTH - len(content)
            if remaining <= 0:
                break
            att_trunc = truncate_text(att, remaining)
            if att_trunc:
                content += f"\n\n--- 附件{idx} ---\n" + att_trunc
                print(f"[DEBUG] 加入附件{idx}完成")

    # ===== 字數截斷 =====
    content = truncate_text(content, MAX_CONTENT_LENGTH)

    # ===== 日期轉換 =====
    date_converted = ""
    if date_el:
        date_text = date_el.get_text(strip=True)
        match = re.search(r"(\d{3,4})[-/.](\d{2})[-/.](\d{2})", date_text)
        if match:
            year = int(match.group(1))
            if year < 1911:
                year += 1911
            date_converted = f"{year}-{match.group(2)}-{match.group(3)}"

    # ===== 篩選無效資料 =====
    if len(content.strip()) < 50 and (not inner_links) and (len(content.strip()) == 0):
        print(f"[WARN] 正文過短且無子頁/附件，略過: {title}")
        return

    # ===== 儲存資料 =====
    data = {
        "city": city,
        "url": url,
        "title": title,
        "date": date_converted,
        "content": re.sub(r"\s{3,}", " ", content.strip()),
    }
    results.append(data)
    append_json(OUTPUT_PATH, data)
    print(f"[✅ DONE] {title} ({date_converted}) - 內容長度: {len(content)}")

# ================== 南投爬蟲 ==================
def extract_text_from_file(file_url, max_pages=3):
    """下載檔案並解析成文字，只抓前三頁。不支援的格式返回 None"""
    try:
        # 加快下載速度，減少 timeout
        res = requests.get(file_url, timeout=10, stream=True)
        if res.status_code != 200:
            return None
        
        # 限制下載大小（避免下載過大檔案）
        content = b""
        max_size = 5 * 1024 * 1024  # 5MB
        for chunk in res.iter_content(chunk_size=8192):
            content += chunk
            if len(content) > max_size:
                print(f"[WARN] 檔案過大，截斷: {file_url[:50]}...")
                break
                
    except Exception as e:
        print(f"[ERROR] 下載失敗: {str(e)[:50]}")
        return None

    tmp_file = None
    text = ""

    # 根據 URL 或 Content-Type 判斷檔案類型
    content_type = res.headers.get('Content-Type', '').lower()
    file_url_lower = file_url.lower()

    # 圖片格式直接略過
    if "image" in content_type or file_url_lower.endswith((".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg")):
        return None

    if file_url_lower.endswith(".docx") or "wordprocessingml" in content_type:
        tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".docx")
        tmp_file.write(content)
        tmp_file.close()
        try:
            doc = docx.Document(tmp_file.name)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            # 只取前 30 段（大約 3 頁）
            text = "\n".join(paragraphs[:30])
        except Exception as e:
            print(f"[ERROR] DOCX 解析失敗: {str(e)[:50]}")
            text = None
            
    elif file_url_lower.endswith(".pdf") or "pdf" in content_type:
        tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp_file.write(content)
        tmp_file.close()
        try:
            with pdfplumber.open(tmp_file.name) as pdf:
                pages = pdf.pages[:max_pages]
                text = "\n".join(page.extract_text() or "" for page in pages)
        except Exception as e:
            print(f"[ERROR] PDF 解析失敗: {str(e)[:50]}")
            text = None
    else:
        # 不支援的格式返回 None
        text = None

    if tmp_file and os.path.exists(tmp_file.name):
        try:
            os.remove(tmp_file.name)
        except:
            pass

    return text.strip() if text else None

def crawl_files_from_table(page_source, base_url, page_url):
    """每個 <tr> 是一筆資料，下載第一個附件並擷取文字。不支援格式直接略過"""
    soup = BeautifulSoup(page_source, "html.parser")
    rows = soup.select("#ListData .table tr")
    results = []

    for tr in rows[1:]:  # 跳過表頭
        tds = tr.find_all("td")
        if len(tds) < 3:
            continue

        title = tds[1].get_text(strip=True)
        raw_date = tds[2].get_text(strip=True)
        m = re.match(r"(\d{3})/(\d{2})/(\d{2})", raw_date)
        date = f"{int(m[1])+1911}-{m[2]}-{m[3]}" if m else raw_date

        # 找第一個附件（任何格式）
        first_file_tag = None
        for a_tag in tr.select("td a"):
            href = a_tag.get("href", "")
            if href and "FileDownload.ashx" in href:
                first_file_tag = a_tag
                break

        # 沒有附件，直接略過
        if not first_file_tag:
            print(f"[SKIP] 無附件，略過: {title}")
            continue

        file_url = urljoin(base_url, first_file_tag["href"])
        content = extract_text_from_file(file_url, max_pages=3)
        
        # 如果是不支援的格式或圖片，content 會是 None，直接略過
        if content is None:
            print(f"[SKIP] 不支援的格式，略過: {title}")
            continue
        
        # 如果內容是空白，也略過
        if not content or len(content.strip()) == 0:
            print(f"[SKIP] 附件無內容，略過: {title}")
            continue

        results.append({
            "city": "南投縣",
            "title": title,
            "date": date,
            "content": content,
            "url": page_url  # 使用網頁 URL，而非檔案下載連結
        })

    return results

def crawl_nantou(results: list, visited: set, config: dict = None):
    LIST_URL = "https://welfare.nantou.gov.tw/1486/WebMap/ListView/3654/zh-Hant-TW"
    BASE_URL = "https://welfare.nantou.gov.tw"

    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-images")  # 不載入圖片
    chrome_options.add_argument("--blink-settings=imagesEnabled=false")
    chrome_options.page_load_strategy = 'eager'  # 不等完全載入

    print("[DEBUG] 初始化 Chrome WebDriver...")
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    driver.set_page_load_timeout(30)  # 設定頁面載入超時
    
    try:
        driver.get(LIST_URL)
        time.sleep(2)

        # 只抓取 site-map__list--2 的前六個 li
        soup = BeautifulSoup(driver.page_source, "html.parser")
        main_categories = soup.select(".site-map__list--2 > li")[:6]  # 只取前六個
        
        print(f"[DEBUG] 找到 {len(main_categories)} 個主分類")

        link_urls = []
        for li in main_categories:
            # 抓取該主分類下所有的詳細頁面連結（site-map__list--4）
            detail_links = li.select(".site-map__list--4 a")
            for a in detail_links:
                href = a.get("href")
                if href and href.startswith("/1486/"):
                    full_url = BASE_URL + href
                    link_urls.append(full_url)
                elif href and href.startswith("http"):
                    link_urls.append(href)

        print(f"[DEBUG] 有效連結數: {len(link_urls)}")

        for idx, detail_url in enumerate(link_urls, 1):
            if detail_url in visited:
                continue
            visited.add(detail_url)

            print(f"[{idx}/{len(link_urls)}] 處理中: {detail_url}")

            try:
                driver.get(detail_url)
                time.sleep(0.5)  # 減少等待時間
                soup = BeautifulSoup(driver.page_source, "html.parser")

                title = soup.select_one("h2").get_text(strip=True) if soup.select_one("h2") else ""
                date = ""
                date_tag = soup.select_one("table tr th:contains('發布時間') + td")
                if date_tag:
                    raw_date = date_tag.get_text(strip=True)
                    if re.match(r'^\d{3}/', raw_date):
                        y, mth, d = raw_date.split("/")
                        date = f"{int(y)+1911}-{mth.zfill(2)}-{d.zfill(2)}"
                    else:
                        date = raw_date

                content_tag = soup.select_one("table tr th:contains('內容') + td")
                content = content_tag.get_text(strip=True) if content_tag else ""

                # === 關鍵修改：如果是表格型頁面，直接處理表格中的每個 tr ===
                if not title or not content:
                    attachments = crawl_files_from_table(driver.page_source, BASE_URL, detail_url)
                    if attachments:
                        # 不要合併，直接把每個 tr 作為獨立的一筆資料
                        for att in attachments:
                            data = {
                                "city": att["city"],
                                "title": att["title"],
                                "date": att["date"],
                                "content": att["content"],
                                "url": att["url"]
                            }
                            results.append(data)
                            
                            if config and config.get("OUTPUT_PATH"):
                                append_json(config["OUTPUT_PATH"], data)
                            else:
                                append_json(OUTPUT_PATH, data)
                                
                            print(f"✅ 已抓取 (表格): {att['title']} ({att['date']}), 內容長度: {len(att['content'])}")
                        
                        # 表格處理完畢，跳到下一個 detail_url
                        continue

                # === 如果不是表格型頁面，仍按原本邏輯處理 ===
                if not title or not content:
                    print(f"[WARN] 無法抓到任何內容，略過: {detail_url}")
                    continue

                data = {
                    "city": "南投縣",
                    "title": title,
                    "date": date,
                    "content": content,
                    "url": detail_url
                }

                results.append(data)
                if config and config.get("OUTPUT_PATH"):
                    append_json(config["OUTPUT_PATH"], data)
                else:
                    append_json(OUTPUT_PATH, data)
                    
                print(f"✅ 已抓取: {title} ({date}), 內容長度: {len(content)}")

            except Exception as e:
                print(f"⚠️ 抓取失敗: {detail_url} - {e}")
                continue

    finally:
        driver.quit()
        
    print(f"[INFO] 南投爬取完成，共抓到 {len(results)} 筆資料")

# ================== FastAPI 入口 ==================
@app.post("/crawl")
async def crawl_endpoint(req: CrawlRequest):
    global visited
    visited = set()
    
    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    OUTPUT_PATH.write_text("[]", encoding="utf-8")

    results = []

    tasks = []

    # 台北爬蟲
    if req.city in ["台北市", "臺北市", "taipei"]:
        if not req.url:
            return {"success": False, "message": "台北市必須提供 url", "data": []}
        tasks.append(run_in_thread(
            crawl_taipei, req.url, req.config.get("city", "臺北市") if req.config else "臺北市", results, req.config
        ))

    # 南投爬蟲
    if req.city in ["南投市", "南投縣", "nantou"]:
        tasks.append(run_in_thread(crawl_nantou, results, visited, req.config))

    if not tasks:
        return {"success": False, "message": f"目前不支援 {req.city}", "data": []}

    # 同時跑
    await asyncio.gather(*tasks)

    # 驗證輸出
    try:
        if OUTPUT_PATH.exists():
            saved_data = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
            print(f"[DEBUG] output.json 共有 {len(saved_data)} 筆資料")
            for i, item in enumerate(saved_data[:3]):
                print(f"[DEBUG] 第{i+1}筆: {item.get('title', 'N/A')[:50]}...")
    except Exception as e:
        print(f"[WARN] 無法讀取 output.json: {e}")

    return {"success": True, "city": req.city, "count": len(results), "data": results, "output_file": str(OUTPUT_PATH.absolute())}