import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { VertexService } from "./vertex.service.js";
import { VertexController } from "./vertex.controller.js";
import { User } from "../user/entities/user.entity.js";
import { ConversationService } from "./conversation.service.js";
import { Conversation } from "./entities/conversation.entity.js";
import { Message } from "./entities/message.entity.js";
import { WelfareModule } from "../welfare/welfare.module.js";
import { UserModule } from "../user/user.module.js";
import { DiscoveryEngineClient } from "./discovery-engine.service.js";
import { AIModule } from "../ai/ai.module.js";
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Conversation, Message]),
    WelfareModule,
    UserModule,
    AIModule,
  ],
  controllers: [VertexController],
  providers: [VertexService, ConversationService, DiscoveryEngineClient],
  exports: [ConversationService],
})
export class VertexModule {}
