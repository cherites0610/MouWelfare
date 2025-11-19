import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  ForbiddenException,
} from "@nestjs/common";
import { VertexService } from "./vertex.service.js";
import { ConversationService } from "./conversation.service.js";
import { Public } from "../common/decorators/public.decorator.js";

@Controller("vertex")
export class VertexController {
  constructor(private readonly vertexService: VertexService) {}

  @Public()
  @Post("search")
  async search(
    @Body("userId") userId: string,
    @Body("conversationId") conversationId: number | undefined,
    @Body("query") query: string
  ) {
    return this.vertexService.getAiAnswer(query, userId, conversationId);
  }

  @Public()
  @Post("compare-auto")
  async compareAuto(
    @Body("userId") userId: string,
    @Body("welfareId") welfareId: string
  ) {
    return this.vertexService.autoCompareSimilar(welfareId, userId);
  }
}
