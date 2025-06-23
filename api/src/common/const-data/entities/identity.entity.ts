import { User } from "src/user/entities/user.entity";
import { Welfare } from "src/welfare/entities/welfare.entity";
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
