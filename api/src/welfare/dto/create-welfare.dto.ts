import { createZodDto } from "nestjs-zod";
import { WelfareStatus } from "../../common/enum/welfare-status.enum.js";
import { z } from "zod";

// 定義 CreateWelfareSchema
export const CreateWelfareSchema = z.object({
  title: z.string().min(1, "Title is required"),
  details: z.string().min(1, "Details are required"),
  summary: z.string().min(1, "Summary is required"),
  link: z.string().url("Must be a valid URL"),
  forward: z.string().min(1, "Forward is required"),
  publicationDate: z.string().date(),
  status: z.nativeEnum(WelfareStatus, { message: "Invalid status value" }),
  locationID: z.number().int().positive(),
  categoryID: z.array(z.number().int().positive(), {
    message: "Category IDs must be an array of positive integers",
  }),
  identityID: z.array(z.number().int().positive(), {
    message: "Identity IDs must be an array of positive integers",
  }),
});

export class CreateWelfareDto extends createZodDto(CreateWelfareSchema) {}
