import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CustomerDataDto {
  @ApiProperty({ example: 'Ana Pérez' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'ana@correo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '3001234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class CreateReservationDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de un cliente existente. Obligatorio si no se envía "customer".',
  })
  @ValidateIf((o) => !o.customer)
  @IsUUID()
  customer_id?: string;

  @ApiPropertyOptional({
    type: CustomerDataDto,
    description: 'Datos del cliente nuevo. Obligatorio si no se envía "customer_id".',
  })
  @ValidateIf((o) => !o.customer_id)
  @ValidateNested()
  @Type(() => CustomerDataDto)
  customer?: CustomerDataDto;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'ID de la mesa',
  })
  @IsUUID()
  table_id: string;

  @ApiProperty({ example: '2026-12-20', description: 'Fecha (YYYY-MM-DD)' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date debe tener formato YYYY-MM-DD' })
  date: string;

  @ApiProperty({ example: '19:30', description: 'Hora (HH:mm, 24 horas)' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'time debe tener formato HH:mm' })
  time: string;

  @ApiProperty({ example: 4, description: 'Cantidad de personas' })
  @IsInt()
  @Min(1)
  guests: number;

  @ApiPropertyOptional({
    example: 'Mesa cerca de la ventana',
    description: 'Notas adicionales de la reserva',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsString()
  @MaxLength(255)
  notes?: string;
}