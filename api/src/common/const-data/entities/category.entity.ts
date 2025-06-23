import { Welfare } from "../../../welfare/entities/welfare.entity.js";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  Relation,
} from "typeorm";

@Entity()
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true,
  })
  name: string;

  @ManyToMany(() => Welfare, (welfare) => welfare.categories)
  welfares: Relation<Welfare>[];
}
