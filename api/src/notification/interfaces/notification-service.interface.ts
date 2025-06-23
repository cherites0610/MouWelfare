import { SendNotificationDto } from "../dto/notification.dto.js";

export interface NotificationService {
  send(dto: SendNotificationDto): Promise<void>;
}
