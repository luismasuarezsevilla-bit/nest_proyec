# Módulo Tables

Módulo de **NestJS** para la gestión de mesas de un restaurante. Expone una API REST con operaciones CRUD (crear, listar, obtener, actualizar y eliminar) sobre las mesas, y persiste los datos mediante **TypeORM**.

## Contenido del módulo

```
tables/
├── dto/
│   ├── create-table.dto.ts   # Validaciones para la creación de una mesa
│   └── update-table.dto.ts   # DTO parcial para actualizaciones (PATCH)
├── entities/
│   └── table.entity.ts       # Entidad TypeORM "Table"
├── tables.controller.ts      # Rutas HTTP del recurso /tables
├── tables.service.ts         # Lógica de negocio y acceso a datos
├── tables.module.ts          # Definición del módulo de Nest
├── tables.controller.spec.ts # Test unitario del controller
└── tables.service.spec.ts    # Test unitario del service
```

## Modelo de datos (`Table`)

| Campo      | Tipo                                   | Descripción                                      |
|------------|-----------------------------------------|---------------------------------------------------|
| `id`       | `uuid`                                  | Identificador único, generado automáticamente.     |
| `number`   | `int` (único)                           | Número de la mesa.                                 |
| `capacity` | `int`                                    | Cantidad de personas que soporta la mesa.          |
| `zone`     | `varchar` (máx. 50)                     | Zona del restaurante (ej. "Terraza").              |
| `status`   | `enum`: `available` \| `occupied` \| `reserved` | Estado actual de la mesa. Por defecto `available`. |
| `createAt` | `Date`                                   | Fecha de creación (autogenerada).                  |
| `updatedAt` | `Date`                                   | Fecha de última actualización (autogenerada).      |

> Nota: la entidad se mapea a la tabla `tables` en la base de datos (en plural) porque `table` suele ser una palabra reservada en SQL.

## Endpoints

Todas las rutas están bajo el prefijo `/tables`.

| Método   | Ruta          | Descripción                     | Respuestas                                  |
|----------|---------------|----------------------------------|----------------------------------------------|
| `POST`   | `/tables`     | Crea una nueva mesa              | `201` creada · `400` datos inválidos · `409` número de mesa duplicado |
| `GET`    | `/tables`     | Lista todas las mesas            | `200` OK                                     |
| `GET`    | `/tables/:id` | Obtiene una mesa por su ID (UUID)| `200` OK · `404` no encontrada               |
| `PATCH`  | `/tables/:id` | Actualiza una mesa (parcial)     | `200` actualizada · `404` no encontrada      |
| `DELETE` | `/tables/:id` | Elimina una mesa                 | `200` eliminada · `404` no encontrada        |

La documentación interactiva de estos endpoints se genera automáticamente vía **Swagger** (`@nestjs/swagger`).

### Validaciones al crear/actualizar una mesa

- `number`: entero positivo, obligatorio y único.
- `capacity`: entero positivo, obligatorio.
- `zone`: texto obligatorio, máximo 50 caracteres.
- `status`: opcional; si se envía, debe ser `available`, `occupied` o `reserved`. Si se omite, se usa `available` por defecto.

En `update-table.dto.ts` todos estos campos son opcionales (`PartialType`), ya que una actualización puede modificar solo algunos.

## Reglas de negocio

- **Número de mesa único**: al crear una mesa, el servicio verifica que no exista otra con el mismo `number`; si existe, lanza un `409 Conflict`.
- **Existencia antes de operar**: `findOne`, `update` y `remove` verifican que la mesa exista y lanzan `404 Not Found` en caso contrario.
- **Actualización con `preload`**: `update` usa `tableRepository.preload` para fusionar los cambios del DTO con la entidad existente antes de guardarla.

## Uso

1. Registrar el módulo en el módulo raíz de la aplicación (o donde corresponda):

```ts
import { TablesModule } from './tables/tables.module.js';

@Module({
  imports: [TablesModule /* ...otros módulos */],
})
export class AppModule {}
```

2. Asegurarse de que `TypeOrmModule` esté configurado a nivel de la app con la conexión a la base de datos.

3. Ejecutar la aplicación y consumir los endpoints descritos arriba (por ejemplo, desde Swagger UI en `/api` si está habilitado).

## Evidencia de Pruebas Unitarias

El módulo cuenta con una suite completa de pruebas unitarias implementadas con **Jest**, aislando las dependencias mediante mocks para garantizar la fiabilidad de cada capa de forma independiente.

Para ejecutar exclusivamente las pruebas de este módulo, utiliza el siguiente comando:
 ![Pruebas service ](test-service.png)
 ![Pruebas controller ](Test-controller.png)

```bash
npm run test -- tables

## Pendientes / posibles mejoras

- Ampliar la cobertura de tests (actualmente solo verifican que el service/controller se instancien).
- Agregar paginación y filtros (por zona o estado) en `GET /tables`.
- Validar reglas adicionales de negocio, como impedir eliminar una mesa que esté `occupied` o `reserved`.
