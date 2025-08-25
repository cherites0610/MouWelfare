import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  CreateDateColumn 
} from 'typeorm';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne('Conversation', 'messages', { onDelete: 'CASCADE' })
  conversation: any;

  @Column({ type: 'enum', enum: ['user', 'ai'] })
  role: 'user' | 'ai';

  @Column({ type: 'json', nullable: true })
  welfareCards: any[];

  @Column('text')
  content: string;

  @CreateDateColumn()
  created_at: Date;
}