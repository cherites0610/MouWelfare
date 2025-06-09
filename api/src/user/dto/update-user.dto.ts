import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { Gender } from 'src/common/enum/gender.enum';

// 定義 UpdateUserDto 的 Zod 模式
export const UpdateUserSchema = z.object({
  name: z.string().min(1, { message: '姓名不能為空' }).optional(),
  birthday: z
    .string()
    .datetime({ message: '生日必須是有效的日期格式 (ISO 8601)' })
    .nullable()
    .optional(),
  gender: z.nativeEnum(Gender).nullable().optional(),
  isVerified: z.boolean().optional(),
  isSubscribe: z.boolean().optional(),
  lineID: z.string().nullable().optional(),
  avatarUrl: z.string().optional(),
  location: z.string().optional(),
  identities: z.array(z.string()).optional(),
});

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}