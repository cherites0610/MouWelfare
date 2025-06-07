import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity()
export class VerificationCode {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    code: string;

    @Column()
    action: string;

    @Column()
    expiresAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User, (user) => user.id)
    user: User;
}