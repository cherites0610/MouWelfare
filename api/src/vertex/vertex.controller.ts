import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { VertexService } from './vertex.service.js';
import { SearchDto } from './dto/search.dto.js';
import { Public } from '../common/decorators/public.decorator.js'

@Controller('vertex')
export class VertexController {
  constructor(private readonly vertexService: VertexService) { }

  @Public()
  @Post('search')
  async search(@Body(new ValidationPipe()) searchDto: SearchDto) {
    const { query } = searchDto;

    const result = await this.vertexService.getAiAnswer(query);

    return result;
  }
}