// src/config/google.config.ts
import { registerAs } from "@nestjs/config";

export interface GoogleConfig {
  projectId: string;
  collectionId: string;
  engineId: string;
  credentials: any;
}

export default registerAs("google", (): GoogleConfig => {
  const keyFileBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;

  if (!keyFileBase64) {
    throw new Error(
      "GCP credentials (GOOGLE_APPLICATION_CREDENTIALS_BASE64) are not configured."
    );
  }

  let credentials;
  try {
    const decodedBuffer = Buffer.from(keyFileBase64, "base64");
    credentials = JSON.parse(decodedBuffer.toString("utf-8"));
  } catch (error) {
    throw new Error("解碼或解析 GCP 憑證時發生錯誤: " + error.message);
  }

  const projectId = process.env.PROJECT_ID;
  const collectionId = process.env.COLLECTION_ID;
  const engineId = process.env.ENGINE_ID;

  if (!projectId || !collectionId || !engineId) {
    throw new Error(
      "PROJECT_ID, COLLECTION_ID, or ENGINE_ID is missing from environment variables."
    );
  }

  return {
    projectId,
    collectionId,
    engineId,
    credentials,
  };
});
