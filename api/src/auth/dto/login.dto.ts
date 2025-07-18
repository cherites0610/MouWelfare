import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(5),
});

export class LoginDTO extends createZodDto(LoginSchema) {}
