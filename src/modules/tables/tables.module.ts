import { Module } from '@nestjs/common';
import { TablesService } from './tables.service.js';
import { TablesController } from './tables.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Table } from './entities/table.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Table])],
  controllers: [TablesController],
  providers: [TablesService],
})
export class TablesModule {}
