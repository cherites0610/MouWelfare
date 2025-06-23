import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationService } from "./interfaces/notification-service.interface.js";
import { SendNotificationDto } from "./dto/notification.dto.js";
import axios from "axios";

@Injectable()
export class LineNotificationService implements NotificationService {
  private readonly logger = new Logger(LineNotificationService.name);
  private readonly lineNotifyUrl = "https://notify-api.line.me/api/notify";
  private readonly accessToken: string;

  constructor(private configService: ConfigService) {
    this.accessToken =
      this.configService.get<string>("LINE_NOTIFY_TOKEN") || "";
  }

  async send(dto: SendNotificationDto): Promise<void> {
    try {
      await axios.post(
        this.lineNotifyUrl,
        { message: dto.message },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
      this.logger.log(`發送Line通知${dto.recipient}`);
    } catch (error) {
      this.logger.error(`Failed to send Line notification: ${error.message}`);
      throw new Error("Line notification failed");
    }
  }
}
