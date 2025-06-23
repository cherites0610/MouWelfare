import { createZodDto } from "nestjs-zod";
import { VerifyAction } from "../../common/enum/verify-action-enum.js";
import { z } from "zod";

export const SendVerificationCodeSchema = z.object({
  email: z.string().email(),
  action: z.nativeEnum(VerifyAction),
});

export class SendVerificationCodeDto extends createZodDto(
  SendVerificationCodeSchema,
) {}
