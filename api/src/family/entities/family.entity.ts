import { UserFamily } from "../../user-family/entities/user-family.entity.js";
import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from "typeorm";

@Entity()
export class Family {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @OneToMany(() => UserFamily, (userFamily) => userFamily.family)
  userFamilies: Relation<UserFamily>[];
}
