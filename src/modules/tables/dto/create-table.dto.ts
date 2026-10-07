import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsIn,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTableDto {
  @ApiProperty({
    description: 'Número de la mesa',
    example: 1,
  })
  @IsInt({ message: 'El número de la mesa debe ser un número entero' })
  @IsPositive({ message: 'El número de la mesa debe ser positivo' })
  @IsNotEmpty({ message: 'El número de la mesa es requerido' })
  number: number;

  @ApiProperty({
    description: 'Capacidad de la mesa',
    example: 4,
  })
  @IsInt({ message: 'La capacidad debe ser un número entero' })
  @IsPositive({ message: 'La capacidad debe ser mayor a 0' })
  @IsNotEmpty({ message: 'La capacidad es requerida' })
  capacity: number;

  @ApiProperty({
    description: 'Zona de la mesa',
    example: 'Terraza',
  })
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'La zona debe ser un texto' })
  @IsNotEmpty({ message: 'La zona es requerida' })
  @MaxLength(50, { message: 'La zona no puede exceder los 50 caracteres' })
  zone: string;

  @ApiProperty({
    description: 'Estado de la mesa',
    example: 'available',
    enum: ['available', 'occupied', 'reserved'],
    default: 'available',
  })
  @IsString()
  @IsOptional() // Es opcional porque la base de datos tiene un valor por defecto ("available")
  @IsIn(['available', 'occupied', 'reserved'], {
    message:
      'El estado debe ser uno de los siguientes: available, occupied, reserved',
  })
  status?: string;
}
