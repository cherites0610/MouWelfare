import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { VertexService } from './vertex.service.js';
import { SearchDto } from './dto/search.dto.js';
import { Public } from '../common/decorators/public.decorator.js'

@Controller('vertex')
export class VertexController {
  constructor(private readonly vertexService: VertexService) { }

  @Public()
  @Post('search') // 建立一個 POST /vertex-ai/search 的端點
  async search(@Body(new ValidationPipe()) searchDto: SearchDto) {
    const { query, conversationId } = searchDto;

    // 呼叫我們的 service 來處理搜尋邏輯
    return this.vertexService.search(query, conversationId);
  }
}
