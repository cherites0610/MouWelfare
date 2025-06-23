import { User } from "../../../user/entities/user.entity.js";
import { Welfare } from "../../../welfare/entities/welfare.entity.js";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Relation,
} from "typeorm";

@Entity()
export class Location {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true,
  })
  name: string;

  @OneToMany(() => User, (user) => user.location)
  users: Relation<User>[];

  @OneToMany(() => Welfare, (welfare) => welfare.location)
  welfares: Relation<Welfare>[];
}
