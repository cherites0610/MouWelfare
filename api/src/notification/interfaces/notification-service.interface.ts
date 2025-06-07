import { SendNotificationDto } from "../dto/notification.dto";

export interface NotificationService {
    send(dto: SendNotificationDto): Promise<void>;
}