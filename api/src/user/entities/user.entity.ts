import { Identity } from "src/common/const-data/entities/identity.entity";
import { Location } from "src/common/const-data/entities/location.entity";
import { Gender } from "src/common/enum/gender.enum";
import { UserFamily } from "src/user-family/entities/user-family.entity";
import { Welfare } from "src/welfare/entities/welfare.entity";
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column()
  password: string;

  @Column({
    unique: true,
  })
  email: string;

  @Column({
    nullable: true,
  })
  birthday: Date;

  @Column({
    nullable: true,
  })
  gender: Gender;

  @Column({
    default: false,
  })
  isVerified: boolean;

  @Column({
    default: false,
  })
  isSubscribe: boolean;

  @Column({
    nullable: true,
  })
  lineID: string;

  @Column({
    default:
      "https://mouwelfare-avatar-test.s3.ap-northeast-1.amazonaws.com/avatars/default_avatar",
  })
  avatarUrl: string;

  @ManyToOne(() => Location, (location) => location.users)
  @JoinColumn({ name: "locationId" })
  location?: Relation<Location>;

  @Column({
    nullable: true,
  })
  locationId: number;

  @ManyToMany(() => Identity, (identity) => identity.users)
  @JoinTable({
    name: "user_identites",
  })
  identities: Relation<Identity>[];

  @OneToMany(() => UserFamily, (userFamily) => userFamily.user)
  userFamilies: UserFamily[];

  @ManyToMany(() => Welfare, (welfare) => welfare.users)
  @JoinTable({
    name: "user_favourite_welfare",
  })
  welfares: Relation<Welfare>[];
}
