from fastapi import FastAPI
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import json, re
from pathlib import Path

app = FastAPI()

BASE_URL = "https://dosw.gov.taipei/"

# 👉 把輸出路徑改成 crawler-service/output.json
BASE_DIR = Path(__file__).resolve().parent   # 這就是 crawler-service 資料夾
OUTPUT_PATH = BASE_DIR / "output.json"

STOP_SELECTOR = ".list-text.detail.bottom-detail"
LINK_SELECTOR = ".list-text.content-list .h4 a"

EXTRACT_SELECTORS = {
    "title": "h2.h3",
    "date": ".list-text.detail.bottom-detail ul li:nth-child(2)",
    "content": ".area-editor.user-edit, .area-editor.user-edit td[colspan='3'], .div .essay"
}

visited = set()

class CrawlRequest(BaseModel):
    url: str
    city: str


def append_json(path: Path, data: dict):
    """邊爬邊寫入 JSON"""
    if path.exists():
        try:
            current = json.loads(path.read_text(encoding="utf-8"))
        except:
            current = []
    else:
        current = []
    current.append(data)
    path.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8")


def crawl(url, city, results: list):
    if url in visited:
        return
    visited.add(url)

    print(f"正在爬取: {url}")

    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"爬取 {url} 發生錯誤: {e}")
        return

    resp.encoding = "utf-8"
    soup = BeautifulSoup(resp.text, "html.parser")

    links = soup.select(LINK_SELECTOR)
    if links:
        for link in links:
            next_url = urljoin(BASE_URL, link.get("href"))
            crawl(next_url, city, results)
    else:
        if soup.select_one(STOP_SELECTOR):
            title_el = soup.select_one(EXTRACT_SELECTORS["title"])
            date_el = soup.select_one(EXTRACT_SELECTORS["date"])
            content_elements = soup.select(EXTRACT_SELECTORS["content"])
            content = "\n".join([el.get_text(strip=True) for el in content_elements])

            date_text = date_el.get_text(strip=True) if date_el else ""
            date_match = re.search(r"\d{3}-\d{2}-\d{2}", date_text)
            date_cleaned = date_match.group(0) if date_match else ""

            data = {
                "city": city,
                "url": url,
                "title": title_el.get_text(strip=True) if title_el else "",
                "date": date_cleaned,
                "content": content,
            }

            if data["title"] and data["date"] and data["content"]:
                results.append(data)
                append_json(OUTPUT_PATH, data)
                print(f"✅ 已抓取: {data['title']}")


@app.post("/crawl")
async def crawl_endpoint(req: CrawlRequest):
    global visited
    visited = set()

    # 確保輸出目錄存在
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text("[]", encoding="utf-8")  # 清空舊資料

    results = []
    crawl(req.url, req.city, results)

    # 爬完後一次回傳所有資料
    return {"status": "success", "city": req.city, "count": len(results), "data": results}
