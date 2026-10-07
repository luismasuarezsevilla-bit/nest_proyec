import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre completo del cliente',
  })
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacio' })
  name: string;

  @ApiProperty({
    example: '3001234567',
    description: 'Número de teléfono del cliente',
  })
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'El telefono debe estar en un formato valido' })
  @IsNotEmpty({ message: 'El telefono debe estar vacio' })
  phone: string;

  @ApiProperty({
    example: 'juan@gmail.com',
    description: 'Correo electrónico del cliente',
    required: false,
  })
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'El email debe ser texto' })
  @IsEmail()
  @IsNotEmpty({ message: 'El email no debe estar vacio' })
  email: string;
}
