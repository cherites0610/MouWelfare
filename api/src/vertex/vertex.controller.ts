import { Body, Controller, Post, Get, Param, ForbiddenException } from '@nestjs/common';
import { VertexService } from './vertex.service.js';
import { ConversationService } from './conversation.service.js';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('vertex')
export class VertexController {
  constructor(
    private readonly vertexService: VertexService,
    private readonly conversationService: ConversationService,
  ) {}

  /** 主要 AI 對話 + 訊息紀錄
   * 如果沒有給conversationId 自動新建對話
   */
  @Public()
  @Post('search')
  async search(
    @Body('userId') userId: string,
    @Body('conversationId') conversationId: number,
    @Body('query') query: string,
  ) {
    return this.vertexService.getAiAnswer(query, userId, conversationId);
  }

  /** 建立新對話 */
  @Public()
  @Post('conversations')
  async createConversation(
    @Body('userId') userId: string,
    @Body('title') title?: string,  // 可選，沒有就給預設值
  ) {
    return this.conversationService.createConversation(userId, title ?? '未命名對話');
  }

  /** 查詢某使用者的所有對話(title查詢) */
  @Public()
  @Get('conversations/user/:userId')
  async getUserConversations(@Param('userId') userId: string) {
    return this.conversationService.getUserConversations(userId);
  }

  /** 取得使用者特定對話的完整紀錄 */
  @Public()
  @Get('conversations/:userId/:conversationId')
  async getConversation(
    @Param('userId') userId: string,
    @Param('conversationId') conversationId: number,
  ) {
    const conversation = await this.conversationService.getConversationById(conversationId);

    if (!conversation || conversation.user.id !== userId) {
      throw new ForbiddenException('無權查看此對話');
    }
    // 過濾 user 訊息的 welfareCards
    const messages = conversation.messages.map(m => {
      if (m.role === 'user') {
        const { welfareCards, ...rest } = m;
        return rest;
      }
      return m;
    });

    return {
      conversationId: conversation.id,
      title: conversation.title,
      messages,
    };
  }

  /** 修改對話標題 */
  @Public()
  @Post('conversations/:conversationId/rename')
  async renameConversation(
    @Param('conversationId') conversationId: number,
    @Body('title') newTitle: string,
  ) {
    return this.conversationService.renameConversation(conversationId, newTitle);
  }

  /** 刪除對話 */
  @Public()
  @Post('conversations/:conversationId/delete')
  async deleteConversation(@Param('conversationId') conversationId: number) {
    return this.conversationService.deleteConversation(conversationId);
  }
}