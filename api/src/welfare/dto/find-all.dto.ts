import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const FindAllSchema = z.object({
    page: z.coerce.number().min(1).default(1), // 預設值 1，自動轉數字
    pageSize: z.coerce.number().min(5).default(10), // 改名並設預設值
    locations: z.string().transform(val => val.split(',')).pipe(z.array(z.string())).optional(), // 處理逗號分隔
    identities: z.string().transform(val => val.split(',')).pipe(z.array(z.string())).optional(),
    categories: z.string().transform(val => val.split(',')).pipe(z.array(z.string())).optional(),
    families: z.string().transform(val => val.split(',')).pipe(z.array(z.string())).optional(),
    search: z.string().optional(), // 可選搜尋字串
    userID: z.string().optional()
});

export class FindAllDTO extends createZodDto(FindAllSchema) { }