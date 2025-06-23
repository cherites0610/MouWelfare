import { User } from "../../../user/entities/user.entity.js";
import { Welfare } from "../../../welfare/entities/welfare.entity.js";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  Relation,
} from "typeorm";

@Entity()
export class Identity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true,
  })
  name: string;

  @ManyToMany(() => User, (user) => user.identities)
  users: Relation<User>[];

  @ManyToMany(() => Welfare, (welfare) => welfare.identities)
  welfares: Relation<Welfare>[];
}
