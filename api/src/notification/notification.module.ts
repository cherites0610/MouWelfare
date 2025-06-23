import { Global, Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { LineNotificationService } from "./line-notification.service";
import { EmailNotificationService } from "./email-notification.service";

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
