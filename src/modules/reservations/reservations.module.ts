import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service.js';
import { ReservationsController } from './reservations.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity.js';
import { Table } from '../tables/entities/table.entity.js';
import { Customer } from '../customers/entities/customer.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, Table, Customer])],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
