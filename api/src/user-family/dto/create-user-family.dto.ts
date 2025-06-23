import { FamilyRole } from "../../common/enum/role.enum.js";

export class CreateUserFamilyDto {
  userID: string;
  familyID: string;
  role: FamilyRole = FamilyRole.Member;
}
