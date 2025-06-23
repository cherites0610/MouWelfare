import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const CreateFamilySchema = z.object({
  name: z.string().min(1).max(10),
});

export class CreateFamilyDto extends createZodDto(CreateFamilySchema) {}
