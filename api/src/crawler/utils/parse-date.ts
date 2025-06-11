export function parseDateToISO(raw: string): string | null {
  const YYYYmatch = raw.match(/\d{4}[/-]\d{1,2}[/-]\d{1,2}/);
  if (YYYYmatch) {
    const normalized = YYYYmatch[0].replace(/\//g, '-');
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  }

  const yyyMatch = raw.match(/(\d{3})[/-](\d{1,2})[/-](\d{1,2})/);
  if (yyyMatch) {
    const year = parseInt(yyyMatch[1], 10) + 1921;
    const month = yyyMatch[2];
    const day = yyyMatch[3];
    const normalized = `${year}-${month}-${day}`;
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  }

  return null
  // If not YYY-MM-DD, proceed with the original logic for YYYY-MM-DD or YYYY/MM/DD
  // const match = raw.match(/\d{4}[/-]\d{1,2}[/-]\d{1,2}/);
  // if (!match) return null;

  // const normalized = match[0].replace(/\//g, '-');
  // const date = new Date(normalized);
  // return isNaN(date.getTime()) ? null : date.toISOString();
}