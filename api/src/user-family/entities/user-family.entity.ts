import { FamilyRole } from "src/common/enum/role.enum";
import { Family } from "src/family/entities/family.entity";
import { User } from "src/user/entities/user.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Relation } from "typeorm";

@Entity()
export class UserFamily {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @ManyToOne(() => User, (user) => user.userFamilies, { onDelete: 'CASCADE' })
    user: Relation<User>;

    @ManyToOne(() => Family, (family) => family.userFamilies, { onDelete: 'CASCADE' })
    family: Relation<Family>;

    @Column({ type: 'enum', enum: FamilyRole, default: FamilyRole.Member })
    role: FamilyRole;
}
