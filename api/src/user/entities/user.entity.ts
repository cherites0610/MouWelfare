import { Identity } from "../../common/const-data/entities/identity.entity.js";
import { Location } from "../../common/const-data/entities/location.entity.js";
import { Gender } from "../../common/enum/gender.enum.js";
import { UserFamily } from "../../user-family/entities/user-family.entity.js";
import { Welfare } from "../../welfare/entities/welfare.entity.js";
// import { Conversation } from "../../vertex/entities/conversation.entity.js";
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

  @OneToMany('Conversation', 'user', { cascade: true })
  conversations: any[];
}
