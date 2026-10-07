# Módulo de Reservas (`reservations`)
 
Módulo de NestJS para gestionar las reservas de mesas del restaurante. Expone un CRUD completo documentado con Swagger y valida las reglas de negocio en el service. La creación de reservas (`POST /api/v1/reservations`) valida disponibilidad en tiempo real dentro de una transacción de PostgreSQL.
 
## Estructura
 
```
src/modules/reservations/
├── dto/
│   ├── create-reservation.dto.ts
│   └── update-reservation.dto.ts
├── entities/
│   └── reservation.entity.ts
├── reservations.controller.ts
├── reservations.service.ts
├── reservations.module.ts
└── README.md
```
 
## Entity: `Reservation`
 
Tabla: `reservations`
 
| Campo        | Tipo                  | Descripción                                             |
| ------------ | --------------------- | ------------------------------------------------------- |
| `id`         | `uuid`                | Identificador (autogenerado).                           |
| `customer_id`| `uuid`                | Cliente que hace la reserva.                            |
| `table_id`   | `uuid` (nullable)     | Mesa asignada. En la API es obligatoria (ver nota).     |
| `date`       | `date` (`string`)     | Fecha de la reserva, formato `YYYY-MM-DD`.              |
| `time`       | `time` (`string`)     | Hora de la reserva, formato `HH:mm`.                    |
| `guests`     | `int`                 | Cantidad de personas.                                   |
| `status`     | `enum`                | Estado. Por defecto `PENDING`.                          |
| `notes`      | `text` (nullable)     | Notas adicionales.                                      |
| `created_at` | `Date`                | Fecha de creación (autogenerada).                       |
| `updated_at` | `Date`                | Fecha de última actualización (autogenerada).           |
 
### Estados (`ReservationStatus`)
 
`PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`
 
> Las relaciones `@ManyToOne` hacia `Customer` y `Table` están comentadas en la entity. Por eso no existe llave foránea en la base de datos y la existencia de cliente y mesa se valida en el service.
 
> La columna `table_id` sigue siendo nullable en la base de datos, pero el DTO de creación la exige. Pendiente: volverla `NOT NULL` en la entity.
 
## Endpoints
 
El proyecto usa el prefijo global `api/v1` (`app.setGlobalPrefix('api/v1')` en `main.ts`).
 
| Método   | Ruta                        | Descripción                    | Respuestas                     |
| -------- | --------------------------- | ------------------------------ | ------------------------------ |
| `POST`   | `/api/v1/reservations`      | Crear una reserva              | `201`, `400`, `404`, `409`     |
| `GET`    | `/api/v1/reservations`      | Listar todas las reservas      | `200`                          |
| `GET`    | `/api/v1/reservations/:id`  | Obtener una reserva por ID     | `200`, `400`, `404`            |
| `PATCH`  | `/api/v1/reservations/:id`  | Actualizar una reserva         | `200`, `400`, `404`, `409`     |
| `DELETE` | `/api/v1/reservations/:id`  | Eliminar una reserva           | `204`, `400`, `404`            |
 
Los parámetros `:id` se validan con `ParseUUIDPipe`: un ID que no sea UUID responde `400` en lugar de llegar a la base de datos.
 
La documentación interactiva está en Swagger: `/api/docs` (no lleva el prefijo `api/v1`).
 
### Cuerpo de `POST /api/v1/reservations`
 
Se debe enviar **uno de los dos**: `customer_id` (cliente existente) o `customer` (cliente nuevo).
 
```json
{
  "customer": { "name": "Ana Pérez", "email": "ana@correo.com", "phone": "3001234567" },
  "table_id": "550e8400-e29b-41d4-a716-446655440001",
  "date": "2026-12-20",
  "time": "20:00",
  "guests": 2,
  "notes": "Mesa cerca de la ventana"
}
```
 
| Campo         | Obligatorio              | Validación                                         |
| ------------- | ------------------------ | -------------------------------------------------- |
| `customer_id` | Si no se envía `customer`| UUID.                                              |
| `customer`    | Si no se envía `customer_id` | `name`, `email` (formato válido) y `phone`.    |
| `table_id`    | Sí                       | UUID.                                              |
| `date`        | Sí                       | Formato `YYYY-MM-DD`.                              |
| `time`        | Sí                       | Formato `HH:mm` (24 horas).                        |
| `guests`      | Sí                       | Entero, mínimo 1.                                  |
| `notes`       | No                       | Texto de hasta 255 caracteres.                     |
 
El campo `status` no se acepta en el body: con `forbidNonWhitelisted` enviarlo responde `400`. Toda reserva nueva nace `PENDING`.
 
## Reglas de negocio (service)
 
Al crear una reserva:
 
| Regla  | Descripción                                                                 | Respuesta |
| ------ | --------------------------------------------------------------------------- | --------- |
| RN-043 | La fecha y hora deben ser futuras.                                          | `400`     |
| RN-044 | La mesa no puede tener otra reserva que se solape en el rango de tiempo.    | `409`     |
| RN-045 | `guests` no puede superar la capacidad de la mesa.                          | `400`     |
| RN-046 | Si el cliente no existe, se registran sus datos básicos antes de la reserva.| —         |
| RN-047 | Toda reserva nueva se crea con estado `PENDING`.                            | —         |
 
Otras respuestas: mesa inexistente o `customer_id` inexistente responden `404`; si no llega ni `customer_id` ni `customer` responde `400`.
 
### Cómo funciona `create`
 
Todo ocurre dentro de una transacción (`dataSource.transaction`), por lo que cualquier error hace rollback: si la reserva falla, un cliente nuevo **no** queda guardado.
 
1. Valida que `date` y `time` sean futuros.
2. Bloquea la fila de la mesa con `pessimistic_write`. Dos peticiones simultáneas sobre la misma mesa se ejecutan una después de la otra, lo que evita que ambas pasen la validación de disponibilidad.
3. Valida la capacidad de la mesa.
4. Busca reservas de esa mesa y fecha que no estén `CANCELLED` y comprueba si los rangos se solapan.
5. Si llega `customer_id`, verifica que exista. Si llega `customer`, busca por `email` y, si no existe, lo crea.
6. Guarda la reserva con estado `PENDING`.
### Solapamiento de rangos
 
Cada reserva ocupa la mesa durante `RESERVATION_DURATION_MINUTES` (constante en `reservations.service.ts`, actualmente **120 minutos**). Dos reservas chocan cuando:
 
```
inicio_nueva < inicio_existente + duración  Y  inicio_existente < inicio_nueva + duración
```
 
Con 2 horas: una reserva a las 20:00 bloquea la mesa hasta las 22:00. Reservar a las 21:00 da `409`; a las 22:00 o después es válido. Las reservas `CANCELLED` liberan la mesa.
 
> La duración de 2 horas es un supuesto: la especificación de la tarea no la define. Confirmarla con el equipo.
 
### Actualización
 
`PATCH` corre también en transacción y aplica las mismas validaciones sobre los valores finales (lo que ya tenía la reserva más lo que cambia), excluyendo la propia reserva del chequeo de conflicto. Al consultar, actualizar o eliminar un ID inexistente se responde `404`.
 
## Problemas resueltos
 
### 1. Marcadores de conflicto de merge dentro del código
 
**Síntoma:** al compilar, 21 errores `TS1185: Merge conflict marker encountered` en `app.module.ts`, `create-category.dto.ts` y `table.entity.ts`.
 
**Causa:** los marcadores `<<<<<<< HEAD`, `=======` y `>>>>>>> origin/feature/customers` habían quedado dentro de los archivos. `git status` no mostraba archivos en conflicto, lo que indicaba que los marcadores ya estaban commiteados y no había un merge en curso.
 
**Solución:**
- `create-category.dto.ts`: se conservaron las líneas de `origin/feature/customers` (`import { Transform }` y los dos `@Transform(({ value }) => value?.trim())`).
- `app.module.ts`: se juntaron los imports y los módulos de ambas ramas (`ReservationsModule`, `CategoriesModule`, `CustomersModule`, `TablesModule`) sin duplicar `CategoriesModule`.
- `table.entity.ts`: se unificaron los imports de `typeorm` y se eligió un solo nombre para la columna de actualización.
- Se verificó con `grep -rn -E "^(<<<<<<<|=======|>>>>>>>)" src/` y el compilador quedó en `Found 0 errors`.
**Prevención:** antes de cada commit, ejecutar ese mismo `grep`.
 
### 2. Nombre inconsistente `updateAt` / `updatedAt`
 
**Causa:** la entity `Table` tenía `updatedAt` en una rama y `updateAt` en la otra. Las entities `Category` y `Customer` ya usaban `updatedAt`.
 
**Solución:** se unificó en `updatedAt` en `table.entity.ts` y en el README del módulo de mesas (`sed -i 's/`updateAt`/`updatedAt`/'`).
 
**Nota:** con `synchronize: true`, renombrar una propiedad cambia la columna en la base de datos. En `Table` el campo `createAt` sigue sin la "d"; si se renombra, hacerlo en todo el proyecto a la vez.
 
### 3. Error de conexión: `la autentificación password falló para el usuario «postgres»` (código `28P01`)
 
**Síntoma:** Nest arrancaba pero no conectaba a la base de datos, y `docker compose up -d` fallaba con `bind: address already in use` en el puerto 5432.
 
**Causa:** había un PostgreSQL instalado localmente (verificado con `sudo ss -tlnp | grep 5432`) ocupando el puerto 5432. Nest conectaba a ese servidor y no al contenedor `restaurant_db`, por lo que la contraseña del `docker-compose.yml` no aplicaba.
 
**Solución (elegir una):**
- Detener el PostgreSQL local (`sudo systemctl stop postgresql`) y levantar Docker.
- O mover el contenedor a otro puerto (`"5433:5432"` en `docker-compose.yml` y `DB_PORT=5433` en `.env`).
En ambos casos, `DB_USERNAME`, `DB_PASSWORD` y `DB_DATABASE` del `.env` deben coincidir con `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` del compose, y hay que reiniciar Nest después de editar el `.env`.
 
### 4. Controller: documentación Swagger incorrecta y sin validación de UUID
 
**Problemas:**
- El summary de `findOne` decía "todas las reservas" y la respuesta 200 decía "Reserva **no** encontrada correctamente".
- Un ID inválido llegaba a la base de datos y devolvía `500`.
- Faltaba documentar los errores `400` y `409`.
**Solución:** se corrigieron los textos, se agregó `ParseUUIDPipe` a `findOne`, `update` y `remove`, y se añadieron `type: Reservation` y las respuestas `400` y `409` en Swagger.
 
### 5. Service: errores que no se cumplían
 
| Problema                                                              | Solución                                                             |
| --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `findOne` devolvía `null` con status 200 si el ID no existía.         | Lanza `NotFoundException`.                                           |
| `update` usaba `repository.update`: devolvía un `UpdateResult`, no la reserva, y no validaba nada. | Busca la reserva, valida y la guarda con `save`.       |
| `remove` no fallaba con un ID inexistente.                            | Revisa `result.affected` y lanza `NotFoundException`.                |
| Un `customer_id` o `table_id` inexistente se guardaba sin error (no hay llaves foráneas). | Se valida que existan antes de guardar.          |
| No se validaba la capacidad de la mesa.                               | Se valida contra `capacity`.                                         |
| No se rechazaban fechas pasadas.                                      | `400` si la fecha y hora ya pasaron.                                 |
 
### 6. Errores de tipos con `table_id` y `date`
 
- **`date`:** en la entity es `string`, y el helper usaba `date instanceof Date`, que TypeScript rechaza sobre un `string` (TS2358). Se tipó `date` y `time` como `string`.
- **`table_id`:** era opcional (`string | undefined`) y no cabía en los helpers que pedían `string`. Además, TypeORM **ignora** las propiedades `undefined` dentro de un `where`, así que una reserva sin mesa habría comparado solo fecha y hora y dado falsos `409`. Esto se resolvió en el punto 8 haciendo `table_id` obligatorio.
- El chequeo de conflicto ignora las reservas `CANCELLED`, porque una reserva cancelada libera la mesa.
### 7. Revisión de `create` contra la tarea de creación de reservas
 
Al comparar el service con la especificación (RN-043 a RN-047 y los criterios de aceptación) se encontraron estos incumplimientos:
 
| Problema                                                                                   | Cambio                                                                                   |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| El conflicto solo se detectaba con fecha y hora **idénticas** (RN-044 habla de rango).     | Se compara solapamiento de rangos con una duración de reserva (120 min).                 |
| Sin transacción ni bloqueo: dos peticiones simultáneas podían reservar la misma mesa.      | `create` y `update` corren en `dataSource.transaction` con `pessimistic_write` sobre la mesa. |
| RN-046: solo se validaba que el cliente existiera; no se podía crear uno nuevo.            | Nuevo helper `resolveCustomer`: acepta `customer_id` o `customer` y crea el cliente si no existe (por `email`). |
| `table_id` era opcional: sin mesa se saltaban las validaciones y se guardaba la reserva.   | `table_id` es obligatorio en el DTO y se eliminó el `if (table_id)` del service.         |
| Exceso de capacidad respondía `409`.                                                       | Ahora responde `400`; el `409` queda reservado para choque de horario.                   |
| `ensureNotInPast` dejaba pasar fechas ilegibles y usaba `<` en vez de `<=`.                | Rechaza fechas inválidas y la hora exacta actual. Recorta `time` a `HH:mm` porque PostgreSQL devuelve `HH:mm:ss`. |
| Los repositorios de `Table` y `Customer` se inyectaban sin usar la transacción.            | Se usa el `manager` de la transacción. Siguen registrados en `forFeature` del módulo.    |
 
### 8. DTO de creación incompleto
 
**Problemas:**
- Solo aceptaba `customer_id`: no cumplía RN-046.
- `table_id` era opcional.
- `time` solo usaba `@IsString()` y aceptaba cualquier texto.
- `date` usaba `@IsDateString()`, que acepta fechas con hora y zona, y chocaba con el campo `time`.
- El Swagger de `notes` tenía la descripción "Estado de la reserva" y `default: 'PENDING'`, copiados por error.
- El ejemplo de fecha ya había pasado.
**Solución:** se reescribió el DTO:
- `customer_id` y `customer` (`CustomerDataDto` anidado) son mutuamente opcionales con `@ValidateIf`: se exige uno de los dos.
- `table_id` obligatorio (`@IsUUID()`).
- `date` con `@Matches(/^\d{4}-\d{2}-\d{2}$/)` y `time` con `@Matches(/^([01]\d|2[0-3]):[0-5]\d$/)`.
- Se corrigió la descripción de `notes` y los ejemplos de Swagger.
**Error al aplicarlo:** al pegar el archivo se cortó en `@ApiProperty({ example: 4, description:`, lo que generó `TS1109` y errores en cascada por `guests` y `notes` (en el service y en `UpdateReservationDto`, que hereda del DTO). Al pegar el archivo completo desaparecieron; el único error restante (`customer_id` ahora puede ser `undefined`) se resolvió reemplazando `create` por la versión con `resolveCustomer`. El build terminó con `Found 0 errors`.
 
### 9. Prefijo de la API y validación estricta en `main.ts`
 
**Problema:** `main.ts` no tenía prefijo global, por lo que el endpoint quedaba en `/reservations` y no en `/api/v1/reservations`.
 
**Solución:** se agregó `app.setGlobalPrefix('api/v1')` antes de crear el documento de Swagger y se registró el tag `Reservations`. Swagger sigue en `/api/docs`, sin el prefijo. Se mantiene `forbidNonWhitelisted: true`, así que enviar campos no declarados (por ejemplo `status`) responde `400`.
 
**Nota:** el prefijo afecta a **todos** los módulos (`/api/v1/tables`, `/api/v1/customers`, etc.). Si algún controlador ya incluía `api/v1`, la ruta quedaría duplicada.
 
### 10. Error `EADDRINUSE` en el puerto 3000
 
**Síntoma:** `npm run start:dev` compilaba y mapeaba las rutas, pero terminaba con `Error: listen EADDRINUSE: address already in use :::3000`.
 
**Causa:** el puerto 3000 lo ocupaba una instancia de Grafana (`ss -ltnp | grep 3000` mostró el proceso `grafana`, que corre en un contenedor, no como servicio de Ubuntu), y `.env` tenía `PORT=3000`. `main.ts` lee `process.env.PORT`, por lo que el valor del `.env` se usa siempre.
 
**Solución:** cambiar `PORT` en `.env` a un puerto libre (por ejemplo `PORT=3001`) y reiniciar. También se puede arrancar con `PORT=3001 npm run start:dev`. Si se define `PORT` en la terminal, debe coincidir con el `.env`.
 
**Nota:** no subir al repositorio un `.env` con un puerto distinto al del equipo; mantener un `.env.example` con los valores por defecto.
 
## Configuración necesaria
 
El service usa `DataSource` y el `manager` de la transacción. Los repositorios de `Table` y `Customer` ya no se inyectan, pero las entities deben seguir registradas en `reservations.module.ts` para que el `manager` las reconozca:
 
```ts
TypeOrmModule.forFeature([Reservation, Table, Customer])
```
 
`main.ts` debe tener:
 
```ts
app.setGlobalPrefix('api/v1');
app.useGlobalPipes(
  new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
);
```
 
## Pruebas manuales
 
Con la API arriba y el ID de una mesa existente (`GET /api/v1/tables`), probar en Swagger o con `curl`:
 
| Caso                                                          | Esperado                                   |
| ------------------------------------------------------------- | ------------------------------------------ |
| Reserva válida con cliente existente                          | `201`, estado `PENDING`                    |
| Reserva válida con cliente nuevo                              | `201`, el cliente queda creado             |
| Sin `table_id`                                                | `400`                                      |
| Sin `customer_id` ni `customer`                               | `400`                                      |
| Fecha pasada                                                  | `400`                                      |
| `guests` mayor que la capacidad de la mesa                    | `400`                                      |
| `table_id` inexistente                                        | `404`                                      |
| Misma mesa, misma fecha y hora                                | `409`                                      |
| Misma mesa, 1 hora después                                    | `409`                                      |
| Misma mesa, 3 horas después                                   | `201`                                      |
| Enviar `status` en el body                                    | `400`                                      |
| Cliente nuevo + mesa inexistente (rollback)                   | `404` y el cliente **no** queda en la base |
 
> Estado: estas pruebas están pendientes de ejecutar. Al momento de escribir esto el proyecto compila con `Found 0 errors` y las rutas se mapean correctamente, pero no se ha confirmado el resultado de cada caso.
 
## Pendiente / mejoras futuras
 
- **Confirmar con el equipo la duración de la reserva** (hoy 120 minutos) y la **zona horaria** del negocio: `new Date('YYYY-MM-DDTHH:mm:00')` usa la zona del servidor, y si está en UTC habría un desfase respecto a Colombia (UTC-5).
- **`UpdateReservationDto`:** si hereda de `CreateReservationDto` con `PartialType`, trae el campo `customer` anidado. Excluirlo con `OmitType(CreateReservationDto, ['customer'])` para que un `PATCH` no cree clientes, y confirmar que no permita modificar `status` sin una regla definida.
- **Verificar la entity `Customer`:** `manager.create(Customer, data)` asume los campos `name`, `email` y `phone`, y que `email` sea único. Ajustar si los nombres son distintos.
- **`DELETE`:** hoy borra físicamente. Evaluar cancelar (`status = CANCELLED`) para conservar el historial.
- **Volver `table_id` `NOT NULL`** en la entity y agregar un índice `@Index(['table_id', 'date'])` para acelerar la búsqueda de conflictos.
- **Restricción en base de datos** contra solapamientos (exclusion constraint con `tstzrange` y `btree_gist`) como segunda barrera además del bloqueo pesimista.
- **Reactivar las relaciones** `@ManyToOne` con `Customer` y `Table` para tener llaves foráneas reales.
- **Autenticación:** si el resto de la API usa guards, aplicarlos también a estos endpoints.
- **Pruebas unitarias** del service para RN-043 a RN-047 y el `409`.
- **Endpoints adicionales:** cancelar una reserva (`PATCH /reservations/:id/cancel`), cambiar estado, consultar disponibilidad, y filtros con paginación en `GET /reservations`.
- **Actualizar el estado de la mesa** (`RESERVED` / `AVAILABLE`) al crear o cancelar una reserva.