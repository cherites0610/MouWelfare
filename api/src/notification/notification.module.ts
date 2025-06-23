import { Global, Module } from "@nestjs/common";
import { NotificationService } from "./notification.service.js";
import { LineNotificationService } from "./line-notification.service.js";
import { EmailNotificationService } from "./email-notification.service.js";

@Global()
@Module({
  providers: [
    NotificationService,
    LineNotificationService,
    EmailNotificationService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
