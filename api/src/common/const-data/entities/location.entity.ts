import { User } from 'src/user/entities/user.entity';
import { Welfare } from 'src/welfare/entities/welfare.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Relation } from 'typeorm';

@Entity()
export class Location {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true
  })
  name: string;

  @OneToMany(() => User, user => user.location)
  users: Relation<User>[];

  @OneToMany(() => Welfare, welfare => welfare.location)
  welfares: Relation<Welfare>[];
}

