import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class FaqItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  question: string;

  @Column()
  answer: string;

  @Column({
    default: false,
  })
  enabled: boolean;
}
