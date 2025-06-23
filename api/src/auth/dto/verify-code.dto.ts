import { createZodDto } from "nestjs-zod";
import { VerifyAction } from "../../common/enum/verify-action-enum.js";
import { z } from "zod";

export const VerifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string(),
  action: z.nativeEnum(VerifyAction),
});

export class VerifyCodeDto extends createZodDto(VerifyCodeSchema) {}
