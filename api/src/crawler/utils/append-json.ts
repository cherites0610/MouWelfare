import fs from "fs-extra";

export async function appendJson(filePath: string, newItem: any) {
  await fs.ensureFile(filePath);

  // 讀舊資料
  let arr: any[] = [];
  try {
    const raw = await fs.readFile(filePath, "utf8");
    arr = raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    arr = [];
  }

  arr.push(newItem);
  await fs.writeFile(filePath, JSON.stringify(arr, null, 2), "utf8");
}