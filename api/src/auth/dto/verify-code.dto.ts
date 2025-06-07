import { createZodDto } from "nestjs-zod";
import { VerifyAction } from "src/common/enum/verify-action-enum";
import { z } from "zod";

export const VerifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string(),
  action: z.nativeEnum(VerifyAction)
})

export class VerifyCodeDto extends createZodDto(VerifyCodeSchema) {}