import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationService } from "./interfaces/notification-service.interface.js";
import { SendNotificationDto } from "./dto/notification.dto.js";
import { Resend } from "resend";

@Injectable()
export class EmailNotificationService implements NotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);
  private readonly resendToken: string;
  private readonly emailDomain: string;
  constructor(private configService: ConfigService) {
    this.resendToken = configService.get("RESEND_API_KEY") || "";
    this.emailDomain =
      configService.get("EMAIL_DOMAIN") || "Mou@mou-welfare.com";
  }

  async send(dto: SendNotificationDto): Promise<void> {
    const resend = new Resend(this.resendToken);
    const { data, error } = await resend.emails.send({
      from: this.emailDomain,
      to: [dto.recipient],
      subject: dto.subject || "",
      html: `<strong>${dto.message}</strong>`,
    });

    if (error) {
      return console.error({ error });
    }
  }
}
