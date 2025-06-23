import { PartialType } from "@nestjs/mapped-types";
import { CreateUserFamilyDto } from "./create-user-family.dto";
import { z } from "zod";
import { FamilyRole } from "src/common/enum/role.enum";

export const updateUserSchema = z.object({
  role: z.nativeEnum(FamilyRole),
});
