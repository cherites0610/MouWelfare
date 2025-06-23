import { PartialType } from "@nestjs/mapped-types";
import { CreateUserFamilyDto } from "./create-user-family.dto.js";
import { z } from "zod";
import { FamilyRole } from "../../common/enum/role.enum.js";

export const updateUserSchema = z.object({
  role: z.nativeEnum(FamilyRole),
});
