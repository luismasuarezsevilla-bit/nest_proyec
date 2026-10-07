# Categories Module

## Descripción

El módulo `Categories` se encarga de administrar las categorías del menú del restaurante. Permite crear, consultar, actualizar y eliminar categorías mediante una API REST.

El módulo utiliza NestJS, TypeORM, PostgreSQL, class-validator y Swagger.

## Estructura del módulo

El módulo sigue la siguiente estructura:

* **Controller:** Recibe las solicitudes HTTP y expone los endpoints de la API.
* **Service:** Contiene la lógica de negocio y se comunica con el repositorio.
* **Entity:** Define la estructura de la tabla `categories` en PostgreSQL.
* **DTOs:** Definen y validan los datos recibidos en las solicitudes.
* **Enum:** Define los estados permitidos para una categoría.

El flujo de una solicitud es:

```text
Controller → Service → Repository → PostgreSQL
```

## Decisiones de diseño

### 1. Identificador UUID

El campo `id` utiliza UUID como identificador único de cada categoría.

Se eligió UUID en lugar de un número incremental porque permite generar identificadores únicos y dificulta que los usuarios puedan deducir la cantidad de registros o consultar recursos utilizando IDs consecutivos.

### 2. Nombre único

El campo `name` es obligatorio y tiene una restricción `unique` en la base de datos.

Esto evita que existan varias categorías con el mismo nombre. Además, el DTO valida que el nombre sea un texto, que no esté vacío y que no supere los 100 caracteres.

La restricción de unicidad se mantiene en la base de datos para garantizar que no se creen duplicados, incluso si dos solicitudes llegan al mismo tiempo.

### 3. Descripción opcional

El campo `description` es de tipo `text` y permite valores nulos.

Se definió como opcional porque una categoría puede crearse sin una descripción. Esto permite registrar categorías básicas y añadir información adicional cuando sea necesario.

### 4. Manejo del estado: `ACTIVE` e `INACTIVE`

Inicialmente, el estado de la categoría se podía manejar como un `string`. Sin embargo, se decidió utilizar un **enum llamado `CategoryStatus`** para definir los valores permitidos:

* `ACTIVE`: La categoría está activa y puede utilizarse en el menú.
* `INACTIVE`: La categoría está inactiva y puede conservarse en el sistema sin estar disponible para su uso.

La decisión de utilizar un enum permite centralizar y controlar los estados válidos dentro del código. De esta forma, se evita que diferentes partes de la aplicación utilicen valores inconsistentes, como `"active"`, `"Activo"` o `"enabled"`.

El enum también mejora la legibilidad del código, ya que permite utilizar valores como:

```typescript
CategoryStatus.ACTIVE
CategoryStatus.INACTIVE
```

En lugar de escribir manualmente cadenas de texto en diferentes lugares.

Además, el enum se utiliza en los DTOs junto con `@IsEnum()`. Esto permite validar que el estado recibido en una solicitud corresponda únicamente a uno de los valores definidos.

Aunque el estado se representa como un enum en TypeScript, la columna de la base de datos se mantiene como `varchar(20)`. Esto permite guardar los valores `ACTIVE` e `INACTIVE` como texto, mientras que el enum controla los valores permitidos desde la aplicación.

El valor predeterminado del estado es `ACTIVE`, por lo que una categoría se crea activa cuando no se proporciona un estado diferente.

### 5. DTOs y validaciones

Se utiliza `CreateCategoryDto` para validar los datos al crear una categoría.

Las validaciones principales son:

* El nombre debe ser un texto.
* El nombre no puede estar vacío.
* El nombre no puede superar los 100 caracteres.
* La descripción es opcional, pero si se envía debe ser un texto.
* El estado es opcional y solo puede ser `ACTIVE` o `INACTIVE`.

Para actualizar una categoría se utiliza `UpdateCategoryDto`, que hereda de `CreateCategoryDto` mediante `PartialType`. Esto permite que todos los campos sean opcionales durante una actualización.

También se utiliza Swagger para documentar los campos y mostrar los ejemplos de los datos esperados en la documentación de la API.

### 6. Validación global

Se utiliza `ValidationPipe` de NestJS con las siguientes opciones:

* `whitelist: true`: Elimina las propiedades que no están definidas en el DTO.
* `forbidNonWhitelisted: true`: Rechaza las solicitudes que contienen propiedades no permitidas.
* `transform: true`: Permite transformar los datos recibidos según las configuraciones de los DTOs.

Estas opciones ayudan a mantener un control sobre la información que recibe la API.

### 7. Manejo de errores y nombres duplicados

El nombre de la categoría debe ser único. En caso de que PostgreSQL detecte un nombre duplicado, el servicio captura el error y devuelve una excepción `ConflictException`.

Esto permite mostrar una respuesta HTTP `409 Conflict` en lugar de exponer directamente un error interno de la base de datos.

La validación de unicidad se apoya en la restricción `unique` de PostgreSQL, que funciona como la garantía definitiva para evitar registros duplicados.

## Documentación con Swagger

El controlador utiliza decoradores de Swagger para documentar los endpoints del módulo.

La documentación se encuentra disponible en:

```text
/api/docs
```

Desde Swagger se pueden consultar y probar las operaciones disponibles:

* `POST /categories`: Crear una categoría.
* `GET /categories`: Obtener todas las categorías.
* `GET /categories/:id`: Obtener una categoría por su ID.
* `PATCH /categories/:id`: Actualizar una categoría.
* `DELETE /categories/:id`: Eliminar una categoría.

## Flujo de funcionamiento

1. El cliente realiza una solicitud HTTP al controlador.
2. El DTO valida los datos recibidos.
3. El controlador envía los datos al servicio.
4. El servicio aplica la lógica de negocio.
5. El repositorio de TypeORM se comunica con PostgreSQL.
6. El resultado se devuelve al cliente mediante el controlador.

## Tecnologías utilizadas

* NestJS
* TypeORM
* PostgreSQL
* Class-validator
* Class-transformer
* Swagger
* TypeScript
