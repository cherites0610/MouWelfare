import { createZodDto } from "nestjs-zod";
import { z } from "zod"; 

export const SignupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

export class SignupDTO extends createZodDto(SignupSchema) {}