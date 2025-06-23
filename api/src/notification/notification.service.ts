import { Injectable, BadRequestException } from "@nestjs/common";
import { LineNotificationService } from "./line-notification.service.js";
import { SendNotificationDto } from "./dto/notification.dto.js";
import { EmailNotificationService } from "./email-notification.service.js";

@Injectable()
export class NotificationService {
  constructor(
    private lineNotificationService: LineNotificationService,
    private emailNotificationService: EmailNotificationService,
  ) {}

  async sendNotification(
    type: "line" | "email",
    dto: SendNotificationDto,
  ): Promise<void> {
    let service;
    switch (type) {
      case "line":
        service = this.lineNotificationService;
        break;
      case "email":
        service = this.emailNotificationService;
        break;
      default:
        throw new BadRequestException("Invalid notification type");
    }
    await service.send(dto);
  }
}
