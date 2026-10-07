import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNotEmpty,
  IsString,
  Length,
  IsNumber,
  IsEnum,
  IsUrl,
  IsOptional,
  IsPositive,
} from 'class-validator';
// 1. Importamos Transform desde class-transformer
import { Transform } from 'class-transformer';
import { productAvailability, productStatus } from '../enum/interface.js';

export class CreateProductDto {
  @ApiProperty({
    example: 'Producto de ejemplo',
    description: 'Nombre del producto',
  })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @Length(2, 120, { message: 'El nombre debe tener entre 2 y 120 caracteres' })
  // 2. Aplicamos la transformación antes de que class-validator valide el tamaño
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({
    example: 'Descripción del producto',
    description: 'Descripción del producto',
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @Length(2, 500, {
    message: 'La descripción debe tener entre 2 y 500 caracteres',
  })
  // 3. Aplicamos la transformación (el operador ?. evita errores si viene undefined)
  @Transform(({ value }) => value?.trim())
  description: string;

  @ApiProperty({
    example: 19.99,
    description: 'Precio del producto',
  })
  @IsNotEmpty({ message: 'El precio es requerido' })
  @IsPositive({ message: 'El precio debe ser un número positivo' })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'El precio debe ser un número' },
  )
  price: number;

  @ApiProperty({
    example: 'ID de la categoría',
    description: 'ID de la categoría a la que pertenece el producto',
  })
  @IsNotEmpty({ message: 'El ID de la categoría es requerido' })
  @IsUUID(4, { message: 'El ID de la categoría debe ser un UUID válido' })
  category_id: string;

  @ApiProperty({
    description: 'Disponibilidad del producto',
    enum: productAvailability,
    default: productAvailability.AVAILABLE,
  })
  @IsEnum(productAvailability)
  @IsOptional()
  availability: productAvailability;

  @ApiProperty({
    description: 'Estado del producto',
    enum: productStatus,
    default: productStatus.ACTIVE,
  })
  @IsEnum(productStatus)
  @IsOptional()
  status: productStatus;

  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: 'URL de la imagen del producto',
  })
  @IsOptional()
  @IsString({ message: 'La URL de la imagen debe ser una cadena de texto' })
  @IsUrl(
    { protocols: ['http', 'https'] },
    { message: 'La URL de la imagen debe ser una dirección web válida' },
  )
  // 4. Aplicamos la transformación también aquí
  @Transform(({ value }) => value?.trim())
  imageUrl: string;
}
