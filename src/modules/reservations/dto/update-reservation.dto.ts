import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateReservationDto } from './create-reservation.dto.js';
import { IsEnum, IsOptional } from 'class-validator';
import { ReservationStatus } from '../entities/reservation.entity.js';

export class UpdateReservationDto extends PartialType(CreateReservationDto) {
  @ApiPropertyOptional({
    enum: ReservationStatus,
    description: 'Estado de la reserva',
    example: ReservationStatus.PENDING,
  })
  //ya
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;
}
