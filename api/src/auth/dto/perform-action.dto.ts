import { createZodDto } from "nestjs-zod";
import { VerifyAction } from "../../common/enum/verify-action-enum.js";
import z from "zod";

export const PerformActionSchema = z.object({
  token: z.string(),
  action: z.nativeEnum(VerifyAction),
  newPassword: z.string().optional(),
});

export class PerformActionDto extends createZodDto(PerformActionSchema) {}
