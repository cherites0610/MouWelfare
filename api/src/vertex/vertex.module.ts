import { Module } from '@nestjs/common';
import { VertexService } from './vertex.service.js';
import { VertexController } from './vertex.controller.js';

@Module({
  controllers: [VertexController],
  providers: [VertexService],
})
export class VertexModule {}
