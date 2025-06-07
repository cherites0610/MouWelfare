export class SendNotificationDto {
    recipient: string; // 接收者（Line ID 或 Email 地址）
    message: string;   // 通知內容
    subject?: string;  // Email 主題（Line 可忽略）
}