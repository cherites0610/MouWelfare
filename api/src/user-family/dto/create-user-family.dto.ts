import { FamilyRole } from "src/common/enum/role.enum";

export class CreateUserFamilyDto {
    userID:string;
    familyID:string;
    role:FamilyRole=FamilyRole.Member;
}
