import { createZodDto } from "nestjs-zod";
import { VerifyAction } from "src/common/enum/verify-action-enum";
import { z } from "zod";

export const SendVerificationCodeSchema = z.object({
  email: z.string().email(),
  action: z.nativeEnum(VerifyAction),
});

export class SendVerificationCodeDto extends createZodDto(
  SendVerificationCodeSchema,
) {}
