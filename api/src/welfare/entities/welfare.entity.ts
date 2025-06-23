import { Category } from "src/common/const-data/entities/category.entity";
import { Identity } from "src/common/const-data/entities/identity.entity";
import { Location } from "src/common/const-data/entities/location.entity";
import { WelfareStatus } from "src/common/enum/welfare-status.enum";
import { User } from "src/user/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from "typeorm";

@Entity()
export class Welfare {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Column({
    type: "text",
  })
  details: string;

  @Column()
  summary: string;

  @Column()
  link: string;

  @Column()
  forward: string;

  @Column({
    nullable: true,
  })
  publicationDate: Date;

  @Column()
  status: WelfareStatus;

  @ManyToOne(() => Location, (location) => location.users)
  @JoinColumn({ name: "locationID" })
  location?: Relation<Location>;

  @Column({
    nullable: true,
  })
  locationID: number;

  @ManyToMany(() => Category, (category) => category.welfares)
  @JoinTable({
    name: "welfare_categories",
  })
  categories: Relation<Category>[];

  @ManyToMany(() => Identity, (identity) => identity.welfares)
  @JoinTable({
    name: "welfare_identities",
  })
  identities: Relation<Identity>[];

  @CreateDateColumn()
  createdAt: Date;

  @ManyToMany(() => User, (user) => user.welfares)
  users: Relation<User>[];
}
