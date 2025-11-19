import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../user/entities/user.entity.js";
import { Conversation } from "./entities/conversation.entity.js";
import { Message } from "./entities/message.entity.js";

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  /**
   * 根據對話 ID 獲取最新的 AI 訊息
   * @param conversationId 對話 ID
   * @returns 最新的 AI 訊息物件，如果沒有則回傳 null
   */
  async getLastAiMessage(conversationId: number) {
    const latestAiMessage = await this.messageRepository.findOne({
      where: {
        conversation: { id: conversationId },
        role: "ai", // 只查找 AI 訊息
      },
      order: { created_at: "DESC" },
    });
    return latestAiMessage;
  }

  // 建立新的對話
  async createConversation(userId: string, title?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const conversation = this.conversationRepository.create({
      title,
      user,
    });
    return await this.conversationRepository.save(conversation);
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
    role: "user" | "ai",
    content: string,
    metadata?: Record<string, any>
  ) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });
    if (!conversation) throw new Error("Conversation not found");

    // 修正點：直接將 metadata 物件儲存
    const message = this.messageRepository.create({
      conversation, // 確保對話物件被正確關聯
      role,
      content,
      metadata: metadata || {},
    });

    return await this.messageRepository.save(message);
  }

  async getHistoryAsText(conversationId: number): Promise<string> {
    const messages = await this.messageRepository.find({
      where: { conversation: { id: conversationId }, role: "user" },
      order: { created_at: "ASC" }, // 確保訊息按時間順序排列
    });

    // 只串連使用者說過的話，作為判斷依據
    return messages.map((msg) => msg.content).join("\n");
  }
}
