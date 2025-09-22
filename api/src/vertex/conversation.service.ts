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

  /**
   * 根據對話 ID 獲取最新的訊息
   * @param conversationId 對話 ID
   * @returns 最新的訊息物件，如果沒有則回傳 null
   */
  async getLastMessage(conversationId: number) {
    // 使用 findOne 搭配 order by 來取得最新的一筆訊息
    const latestMessage = await this.messageRepo.findOne({
      where: { conversation: { id: conversationId } },
      order: { created_at: 'DESC' },
    });
    return latestMessage;
  }

  /**
 * 根據對話 ID 獲取最新的 AI 訊息
 * @param conversationId 對話 ID
 * @returns 最新的 AI 訊息物件，如果沒有則回傳 null
 */
async getLastAiMessage(conversationId: number) {
  const latestAiMessage = await this.messageRepo.findOne({
    where: { 
      conversation: { id: conversationId },
      role: 'ai'  // 只查找 AI 訊息
    },
    order: { created_at: 'DESC' },
  });
  return latestAiMessage;
}

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

  /**
   * 新增訊息
   * @param conversationId 對話 ID
   * @param role 角色 ('user' 或 'ai')
   * @param content 訊息內容
   * @param metadata 額外的訊息資訊，用於儲存 session ID
   */
  async addMessage(
    conversationId: number,
    role: 'user' | 'ai',
    content: string,
    metadata?: Record<string, any>,
  ) {
    const conversation = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conversation) throw new Error('Conversation not found');

    // 修正點：直接將 metadata 物件儲存
    const message = this.messageRepo.create({
      conversation, // 確保對話物件被正確關聯
      role,
      content,
      metadata: metadata || {},
    });

    return await this.messageRepo.save(message);
  }

  // 取得用戶對話ID
  async getConversationById(conversationId: number, includeMessages = true) {
    return this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['messages', 'user'],
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

  async checkLastMessage(conversationId: number) {
    const lastMessage = await this.messageRepo.findOne({
      where: { conversation: { id: conversationId } },
      order: { created_at: 'DESC' },
      relations: ['conversation'] // 載入 conversation 關聯
    });

    console.log('--- 檢查最後一則訊息 ---');
    console.log('對話 ID:', lastMessage?.conversation?.id);
    console.log('角色:', lastMessage?.role);
    console.log('內容:', lastMessage?.content);
    console.log('Metadata:', lastMessage?.metadata);

    // 檢查 metadata 是否包含 sessionName ID
    if (lastMessage?.metadata?.sessionName) {
      console.log('✅ 成功：找到 Session ID！');
      console.log('Session ID:', lastMessage.metadata.sessionName);
    } else {
      console.log('❌ 失敗：未找到 Session ID。');
    }
    return lastMessage;
  }
}