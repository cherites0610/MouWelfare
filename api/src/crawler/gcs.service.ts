import { Injectable, Logger } from "@nestjs/common";
import { Storage } from "@google-cloud/storage";
import * as path from "path";

@Injectable()
export class GcsService {
  private readonly logger = new Logger(GcsService.name);
  private readonly storage: Storage;
  private readonly bucketName: string;
  private readonly fileName: string;

  constructor() {
    const keyBase64 = process.env.GCS_KEY_BASE64;
    if (!keyBase64) throw new Error("缺少 GCS_KEY_BASE64 環境變數");

    const keyJson = JSON.parse(
      Buffer.from(keyBase64, "base64").toString("utf-8")
    );

    this.storage = new Storage({
      credentials: keyJson,
    });

    this.bucketName = process.env.GCS_BUCKET_NAME || "mouai_data";
    this.fileName = process.env.GCS_FILE_NAME || "welfare_data.jsonl";
  }

  /** 把新資料 append 進 GCS 的 jsonl 檔案 */
  async appendAndUpload(records: any[]): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(this.fileName);

    let existingContent = "";

    try {
      const [exists] = await file.exists();
      if (exists) {
        const [contents] = await file.download();
        existingContent = contents.toString("utf-8");
      }
    } catch (err) {
      this.logger.warn(`⚠️ 讀取 GCS 失敗（可能是首次建立）：${err.message}`);
    }

    // 把舊資料 + 新資料合併
    const lines: string[] = existingContent
      ? existingContent.trim().split("\n")
      : [];

    for (const record of records) {
      lines.push(JSON.stringify(record));
    }

    const newContent = lines.join("\n") + "\n";

    await file.save(newContent, {
      contentType: "application/jsonl",
    });

    this.logger.log(
      `☁️ 已更新 GCS ${this.fileName}, 新增 ${records.length} 筆資料`
    );
  }
}
