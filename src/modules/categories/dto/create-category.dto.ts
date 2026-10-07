import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryStatus } from '../enum/category-status.enum.js';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Nombre de la categoría', example: 'Postres' })
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MaxLength(100, { message: 'El nombre no puede exceder los 100 caracteres' })
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción de la categoría',
    example: 'Todos los postres fríos y calientes',
  })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Estado de la categoría',
    enum: CategoryStatus,
    default: CategoryStatus.ACTIVE,
  })
  @IsEnum(CategoryStatus, {
    message: 'El estado solo puede ser ACTIVE o INACTIVE',
  })
  @IsOptional()
  status?: CategoryStatus;
}
