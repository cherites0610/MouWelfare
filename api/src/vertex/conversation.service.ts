import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity.js';
import { Conversation } from './entities/conversation.entity.js';
import { Message } from './entities/message.entity.js';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // 建立新的對話
  async createConversation(userId: string, title?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const conversation = this.conversationRepo.create({
      title,
      user,
    });
    return await this.conversationRepo.save(conversation);
  }

  // 新增訊息
  async addMessage(
    conversationId: number,
    role: 'user' | 'ai',
    content: string,
    extra?: { welfareCards?: any[] },
  ) {
    const conversation = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conversation) throw new Error('Conversation not found');

    const messageData: any = {
      conversation,
      role,
      content,
    };

    if (role === 'ai') {
      messageData.welfareCards = extra?.welfareCards || [];
    }

    const message = this.messageRepo.create(messageData);
    return await this.messageRepo.save(message);
  }

  // 取得用戶對話ID
  async getConversationById(conversationId: number, includeMessages = true) {
    return this.conversationRepo.findOne({
      where: { id: conversationId },
      relations:  ['messages', 'user'] ,
      order: includeMessages ? { messages: { created_at: 'ASC' } } : undefined,
    });
  }


  // 取得最近訊息
  async getRecentMessages(conversationId: number, limit = 5) {
    return await this.messageRepo.find({
      where: { conversation: { id: conversationId } },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  // 查詢某個使用者的對話清單
  async getUserConversations(userId: string) {
    return await this.conversationRepo.find({
      where: { user: { id: userId } },
      order: { updated_at: 'DESC' },
    });
  }

  // 修改對話標題
  async renameConversation(conversationId: number, newTitle: string) {
    await this.conversationRepo.update(conversationId, { title: newTitle });
    return this.conversationRepo.findOne({ where: { id: conversationId } });
  }

  // 刪除對話
  async deleteConversation(conversationId: number) {
    return await this.conversationRepo.delete(conversationId);
  }
}
