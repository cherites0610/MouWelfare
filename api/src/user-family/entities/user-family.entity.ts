import { FamilyRole } from "../../common/enum/role.enum.js";
import { Family } from "../../family/entities/family.entity.js";
import { User } from "../../user/entities/user.entity.js";
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from "typeorm";

@Entity()
export class UserFamily {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.userFamilies, { onDelete: "CASCADE" })
  user: Relation<User>;

  @ManyToOne(() => Family, (family) => family.userFamilies, {
    onDelete: "CASCADE",
  })
  family: Relation<Family>;

  @Column({ type: "enum", enum: FamilyRole, default: FamilyRole.Member })
  role: FamilyRole;
}
