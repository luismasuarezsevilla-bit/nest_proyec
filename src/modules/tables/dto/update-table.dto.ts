import { PartialType } from '@nestjs/swagger';
import { CreateTableDto } from './create-table.dto.js'; // Asegúrate de quitar el .js si estás en TypeScript

// No incluyas el id aquí

// Ahora PartialType viene de @nestjs/swagger
export class UpdateTableDto extends PartialType(CreateTableDto) {
  // Opcional: Generalmente el ID va en la URL (@Param) y no en el body (@Body).
  // Si decides enviarlo también en el body, asegúrate de validarlo.
}
