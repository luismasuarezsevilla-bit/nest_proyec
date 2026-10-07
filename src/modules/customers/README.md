
# Customers Module

## Descripción

El módulo `Customers` se encarga de administrar la información de los clientes del restaurante. Permite crear, consultar, actualizar y eliminar clientes mediante una API REST.

El módulo utiliza NestJS, TypeORM, PostgreSQL, class-validator y Swagger para implementar la lógica, persistencia, validación y documentación de la API.

## Estructura del módulo

El módulo sigue una arquitectura basada en la separación de responsabilidades:

- **Controller:** Recibe las solicitudes HTTP y expone los endpoints de la API.
- **Service:** Contiene la lógica de negocio relacionada con los clientes.
- **Entity:** Define la estructura de la tabla `customers` en PostgreSQL.
- **DTOs:** Definen y validan los datos recibidos en las solicitudes.
- **Repository:** Permite al Service interactuar con la entidad mediante TypeORM.

El flujo general de una solicitud es:

```text
Controller → Service → Repository → TypeORM → PostgreSQL
````


## Decisiones de diseño

### 1. Identificador UUID

El campo `id` utiliza UUID como identificador único de cada cliente.

```ts
@PrimaryGeneratedColumn('uuid')
id: string;
```

Se utiliza UUID en lugar de un identificador numérico incremental para generar identificadores únicos y evitar depender de una secuencia de números consecutivos.

Además, al utilizar UUID, los parámetros `id` recibidos por los endpoints se manejan como `string`.

---

### 2. Nombre y teléfono obligatorios

Los campos `name` y `phone` son obligatorios.

La entidad define las restricciones correspondientes:

```text
name  → varchar(100)
phone → varchar(20)
```

Además, el DTO utiliza `class-validator` para garantizar que ambos campos sean cadenas de texto y que no estén vacíos.

Las validaciones utilizadas son:

```ts
@IsString()
@IsNotEmpty()
```

Esto permite evitar que la API reciba clientes sin información básica.

---

### 3. Correo electrónico opcional

El campo `email` es opcional y permite valores de hasta 255 caracteres.

En el DTO se utilizan:

```ts
@IsOptional()
@IsEmail()
```

Esto significa que el cliente puede registrarse sin proporcionar un correo electrónico, pero si lo proporciona, debe tener un formato válido.

Por ejemplo:

```json
{
  "name": "Juan Pérez",
  "phone": "3001234567",
  "email": "juan@gmail.com"
}
```

También es válido crear un cliente sin correo:

```json
{
  "name": "Juan Pérez",
  "phone": "3001234567"
}
```

---

### 4. Control de correos duplicados

El correo electrónico debe mantenerse como un dato único entre los clientes.

Para evitar que un cliente utilice el correo perteneciente a otro cliente, el Service realiza una búsqueda antes de crear o actualizar un registro.

En el caso de una actualización se tiene en cuenta el `id` del cliente actual. Esto permite que un cliente conserve su propio correo, pero evita que utilice el correo de otro cliente.

Cuando se intenta utilizar un correo que ya pertenece a otro cliente, se devuelve un error:

```text
409 Conflict
```

Esta validación permite manejar la regla de negocio antes de realizar la actualización en la base de datos.

---

### 5. Timestamps automáticos

La entidad utiliza `CreateDateColumn` y `UpdateDateColumn` para administrar automáticamente las fechas de creación y actualización.

```ts
@CreateDateColumn({ name: 'created_at' })
createdAt: Date;

@UpdateDateColumn({ name: 'updated_at' })
updatedAt: Date;
```

De esta manera, la aplicación no necesita enviar manualmente estos valores.

El comportamiento es:

```text
Creación del cliente
        ↓
created_at = fecha de creación
updated_at = fecha de creación

Actualización del cliente
        ↓
updated_at = nueva fecha de actualización
```

---

### 6. DTOs y validaciones

Se utiliza `CreateCustomerDto` para validar los datos al crear un cliente.

Las principales validaciones son:

* `name` debe ser un texto.
* `name` no puede estar vacío.
* `phone` debe ser un texto.
* `phone` no puede estar vacío.
* `email` es opcional.
* Si se proporciona `email`, debe tener un formato válido.

Para las actualizaciones se utiliza `UpdateCustomerDto`, que hereda de `CreateCustomerDto` mediante `PartialType`.

Esto permite realizar actualizaciones parciales.

Por ejemplo, se puede actualizar únicamente el teléfono:

```json
{
  "phone": "3111234567"
}
```

sin tener que enviar nuevamente todos los campos del cliente.

Los DTOs también utilizan decoradores de Swagger para documentar los campos y proporcionar ejemplos en la API.

---

### 7. Validación de UUID

Los endpoints que reciben un `id` utilizan `ParseUUIDPipe` para verificar que el identificador tenga un formato UUID válido.

Por ejemplo:

```ts
@Delete(':id')
remove(
  @Param('id', new ParseUUIDPipe()) id: string,
) {
  return this.customersService.remove(id);
}
```

Esto permite rechazar solicitudes con identificadores que no tengan el formato esperado.

---

### 8. Manejo de clientes inexistentes

Antes de actualizar o eliminar un cliente, el Service verifica que el registro exista.

Si el cliente no existe, se devuelve:

```text
404 Not Found
```

Esto evita realizar operaciones sobre registros inexistentes y proporciona una respuesta clara al consumidor de la API.

---

### 9. Manejo de errores

El módulo utiliza las excepciones HTTP proporcionadas por NestJS para manejar diferentes situaciones.

Entre ellas:

* `400 Bad Request`: datos inválidos o UUID con formato incorrecto.
* `404 Not Found`: el cliente solicitado no existe.
* `409 Conflict`: se intenta utilizar un correo que ya pertenece a otro cliente.

Esto permite devolver respuestas HTTP descriptivas en lugar de exponer directamente errores internos de la aplicación o de PostgreSQL.

---

## Documentación con Swagger

El módulo utiliza Swagger para documentar y probar los endpoints de la API.

El controlador utiliza:

```ts
@ApiTags('Customers')
```

para agrupar los endpoints relacionados con clientes.

Además, cada operación utiliza `@ApiOperation()` para proporcionar una descripción de su funcionalidad.

La documentación está disponible en:

```text
/api/docs
```

Desde Swagger se pueden consultar y probar las siguientes operaciones:

* `POST /customers`: Crear un cliente.
* `GET /customers`: Obtener todos los clientes.
* `GET /customers/:id`: Obtener un cliente por su ID.
* `PATCH /customers/:id`: Actualizar un cliente.
* `DELETE /customers/:id`: Eliminar un cliente.

---

## Flujo de funcionamiento

El flujo de una solicitud sigue las siguientes etapas:

1. El cliente realiza una solicitud HTTP.
2. El Controller recibe la solicitud.
3. El DTO valida los datos recibidos.
4. El Controller envía la información al Service.
5. El Service aplica las reglas de negocio correspondientes.
6. El Repository de TypeORM realiza la operación sobre la entidad.
7. TypeORM se comunica con PostgreSQL.
8. El resultado se devuelve al cliente mediante el Controller.

El flujo puede representarse de la siguiente manera:

```text
Cliente
   │
   ▼
HTTP Request
   │
   ▼
CustomersController
   │
   ▼
DTO + Validaciones
   │
   ▼
CustomersService
   │
   ▼
CustomerRepository
   │
   ▼
TypeORM
   │
   ▼
PostgreSQL
```

---

## Persistencia con TypeORM

La conexión general con PostgreSQL se configura mediante:

```ts
TypeOrmModule.forRoot()
```

Mientras que el repositorio de `Customer` se registra dentro del módulo mediante:

```ts
TypeOrmModule.forFeature([Customer])
```

Esto permite inyectar el repositorio en el Service:

```ts
@InjectRepository(Customer)
private readonly customerRepository: Repository<Customer>
```

El repositorio permite realizar operaciones como:

```text
create()
save()
find()
findOneBy()
update()
delete()
```

---

## Operaciones CRUD

### Crear

```http
POST /customers
```

Ejemplo:

```json
{
  "name": "Juan Pérez",
  "phone": "3001234567",
  "email": "juan@gmail.com"
}
```

### Consultar todos

```http
GET /customers
```

### Consultar por ID

```http
GET /customers/:id
```

### Actualizar

```http
PATCH /customers/:id
```

Ejemplo:

```json
{
  "phone": "3119876543"
}
```

### Eliminar

```http
DELETE /customers/:id
```

---

## Tecnologías utilizadas

* NestJS
* TypeScript
* TypeORM
* PostgreSQL
* class-validator
* class-transformer
* Swagger
* Docker / Docker Compose

---

## Buenas prácticas implementadas

* Separación de responsabilidades mediante Controller, Service y Repository.
* Uso de DTOs para controlar los datos de entrada.
* Validación mediante `class-validator`.
* Uso de UUID como identificador.
* Validación del formato de los UUID.
* Manejo de errores mediante excepciones HTTP de NestJS.
* Validación de existencia antes de actualizar o eliminar.
* Control de correos electrónicos duplicados.
* Uso de variables de entorno para la configuración de la base de datos.
* Documentación de la API mediante Swagger.

