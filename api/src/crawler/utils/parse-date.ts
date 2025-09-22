export function parseDateToISO(raw: string): string | null {
  if (!raw) return null;

  // 把中文或其他前綴去掉，只留數字和 - /
  const clean = raw.replace(/[^\d/-]/g, "");

  // 1. 處理西元 yyyy-mm-dd / yyyy/mm/dd
  const YYYYmatch = clean.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (YYYYmatch) {
    const year = YYYYmatch[1];
    const month = YYYYmatch[2].padStart(2, "0");
    const day = YYYYmatch[3].padStart(2, "0");

    const normalized = `${year}-${month}-${day}`;
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? null : date.toISOString().split("T")[0];
  }

  // 2. 處理民國 yyy-mm-dd / yyy/mm/dd
  const yyyMatch = clean.match(/(\d{3})[/-](\d{1,2})[/-](\d{1,2})/);
  if (yyyMatch) {
    const year = (parseInt(yyyMatch[1], 10) + 1911).toString();
    const month = yyyMatch[2].padStart(2, "0");
    const day = yyyMatch[3].padStart(2, "0");

    const normalized = `${year}-${month}-${day}`;
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? null : date.toISOString().split("T")[0];
  }

  return null;
}
