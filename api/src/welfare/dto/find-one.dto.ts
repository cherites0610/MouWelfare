import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const FindOneSchema = z.object({
  familyID: z.string().optional(),
  userID: z.string().optional(),
});

export class FindOneDTO extends createZodDto(FindOneSchema) {}
