import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  OneToMany, 
  ManyToOne, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: '未命名對話' })
  title: string;

  @ManyToOne('User', 'conversations', { onDelete: 'CASCADE' })
  user: any;

  @OneToMany('Message', 'conversation', { cascade: true })
  messages: any[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}