import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VertexService } from './vertex.service.js';
import { VertexController } from './vertex.controller.js';
import { User } from '../user/entities/user.entity.js';
import { ConversationService } from './conversation.service.js';
import { Conversation } from './entities/conversation.entity.js';
import { Message } from './entities/message.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([User,Conversation, Message])],
  controllers: [VertexController],
  providers: [VertexService, ConversationService],
  exports: [ConversationService],
})
export class VertexModule {}
