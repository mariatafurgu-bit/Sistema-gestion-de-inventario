# Documentación de API - Sistema de Gestión de Inventario

## Configuración Base
- **URL Base**: `http://localhost:8000/api/`
- **Autenticación**: Sesión + CSRF (cookies de sesión y header `X-CSRFToken` en métodos mutables)
- **Formato de Respuesta**: JSON

## Autenticación
### Obtener CSRF Token
```
GET /api/csrf-token/
Response: {
  "csrfToken": "..."
}
```

### Login
```
POST /api/login/
Body: {
  "username": "usuario",
  "password": "contraseña"
}
Response: {
  "user_id": 1,
  "username": "usuario",
  "email": "usuario@correo.com",
  "rol": "administrador|almacenista",
  "mensaje": "Login exitoso como ..."
}
```

### Usuario actual
```
GET /api/usuario-actual/
```

### Logout
```
POST /api/logout/
```

---

## Categorías de Instrumentos

### Listar Categorías
```
GET /api/categorias/
Query Parameters:
  - search: busca por nombre/descripción
  - ordering: ordena por nombre
```

### Crear Categoría (Solo Admin)
```
POST /api/categorias/
Body: {
  "nombre": "Cuerdas",
  "descripcion": "Instrumentos de cuerda"
}
```

### Obtener Categoría
```
GET /api/categorias/{id}/
```

### Actualizar Categoría (Solo Admin)
```
PUT /api/categorias/{id}/
PATCH /api/categorias/{id}/
Body: {
  "nombre": "Nuevo Nombre",
  "descripcion": "Nueva descripción"
}
```

### Eliminar Categoría (Solo Admin)
```
DELETE /api/categorias/{id}/
```

---

## Instrumentos

### Listar Instrumentos
```
GET /api/instrumentos/
Query Parameters:
  - search: busca por nombre, referencia, marca, modelo, categoría
  - ordering: ordena por nombre, fecha_adquisicion, estado
  - limit: cantidad de resultados por página (default 20)
  - offset: desplazamiento para paginación

Ejemplo:
GET /api/instrumentos/?search=violin&ordering=-fecha_adquisicion&limit=10
```

### Crear Instrumento
```
POST /api/instrumentos/
Body: {
  "nombre": "Violín Yamaha",
  "referencia": "VLN-001",
  "marca": "Yamaha",
  "modelo": "V5",
  "fecha_adquisicion": "2024-01-15",
  "categoria": 1,
  "valor_reemplazo": 450.00,
  "ubicacion_fisica": "Almacén A",
  "cantidad": 3
}
```

### Obtener Instrumento (con historial)
```
GET /api/instrumentos/{id}/
Response incluye: historial completo de movimientos
```

### Actualizar Instrumento
```
PUT /api/instrumentos/{id}/
PATCH /api/instrumentos/{id}/
```

### Eliminar Instrumento (Solo Admin)
```
DELETE /api/instrumentos/{id}/
```

### Dar de Baja Instrumento
```
POST /api/instrumentos/{id}/dar_baja/
Body (opcional): {
  "observacion": "Instrumento dañado"
}
Response: {
  "mensaje": "Instrumento dado de baja correctamente.",
  "instrumento": {...}
}
```

### Enviar a Mantenimiento
```
POST /api/instrumentos/{id}/enviar_mantenimiento/
Body (opcional): {
  "observacion": "Reparación de cuerda"
}
Response: {
  "mensaje": "Instrumento enviado a mantenimiento.",
  "instrumento": {...}
}
```

### Cambiar Estado Físico (después de devolución)
```
POST /api/instrumentos/{id}/cambiar_estado_fisico/
Body: {
  "nuevo_estado": "disponible|mantenimiento|baja",
  "observacion": "Detalles del cambio"
}
Response: {
  "mensaje": "Estado del instrumento actualizado a: ...",
  "instrumento": {...}
}
```

### Obtener Historial de Instrumento
```
GET /api/instrumentos/{id}/historial/
Response: [
  {
    "id": 1,
    "instrumento": 1,
    "tipo_movimiento": "registro|prestamo|devolucion|cambio_estado",
    "estado_anterior": "disponible",
    "estado_nuevo": "prestado",
    "fecha_cambio": "2024-03-15T10:30:00Z",
    "cambiado_por_nombre": "usuario",
    "observacion": "..."
  }
]
```

---

## Usuarios (Estudiantes y Profesores)

### Listar Usuarios
```
GET /api/usuarios/
Query Parameters:
  - search: busca por nombre, documento, correo, tipo
  - ordering: ordena por nombre, tipo, fecha_creacion
```

### Crear Usuario
```
POST /api/usuarios/
Body: {
  "nombre": "Juan García",
  "documento": "1073456789",
  "tipo": "estudiante|profesor",
  "telefono": "3121234567",
  "correo": "juan@ejemplo.com",
  "activo": true
}
```

### Obtener Usuario
```
GET /api/usuarios/{id}/
```

### Actualizar Usuario
```
PUT /api/usuarios/{id}/
PATCH /api/usuarios/{id}/
```

### Eliminar Usuario
```
DELETE /api/usuarios/{id}/
```

---

## Préstamos

### Listar Préstamos
```
GET /api/prestamos/
Query Parameters:
  - search: busca por instrumento, usuario, documento, estado
  - ordering: ordena por fecha_prestamo, estado, fecha_vencimiento
  - limit: cantidad de resultados por página (default 20)

Ejemplo:
GET /api/prestamos/?search=violin&ordering=-fecha_prestamo
```

### Crear Préstamo
```
POST /api/prestamos/
Body: {
  "instrumento": 1,
  "usuario": 1,
  "estado": "enuso",
  "dias_permitidos": 7,
  "observaciones": "Detalles opcionales"
}
```

### Obtener Préstamo
```
GET /api/prestamos/{id}/
```

### Actualizar Préstamo
```
PUT /api/prestamos/{id}/
PATCH /api/prestamos/{id}/
```

### Devolver Instrumento (Cierra Préstamo)
```
POST /api/prestamos/{id}/devolver/
Body (opcional): {
  "observacion": "Instrumento en buen estado"
}
Response: {
  "mensaje": "Préstamo cerrado correctamente.",
  "prestamo": {...}
}
```

### Obtener Préstamos Vencidos
```
GET /api/prestamos/vencidos/
Response: {
  "cantidad": 3,
  "prestamos": [
    {
      "id": 1,
      "instrumento_nombre": "Violín",
      "instrumento_referencia": "VLN-001",
      "usuario_nombre": "Juan García",
      "usuario_documento": "1073456789",
      "usuario_telefono": "3121234567",
      "usuario_correo": "juan@ejemplo.com",
      "fecha_prestamo": "2024-01-10",
      "fecha_vencimiento": "2024-01-17",
      "dias_vencimiento": 5,
      "estado": "enuso"
    }
  ]
}
```

### Obtener Préstamos Próximos a Vencer (7 días)
```
GET /api/prestamos/proximos_a_vencer/
Response: {
  "cantidad": 2,
  "prestamos": [...]
}
```

### Exportar Préstamos a Excel
```
GET /api/prestamos/exportar_excel/
Response: archivo .xlsx descargándose
```

### Reporte de Estado de Instrumentos
```
GET /api/prestamos/reporte_estado_instrumentos/
Response: {
  "total_instrumentos": 8,
  "estadisticas_por_estado": {
    "disponible": 6,
    "prestado": 1,
    "mantenimiento": 1,
    "baja": 0
  },
  "instrumentos": [...]
}
```

---

## Reportes y Estadísticas

### Estadísticas Generales del Sistema
```
GET /api/reportes/estadisticas_generales/
Response: {
  "total_instrumentos": 8,
  "instrumentos_disponibles": 6,
  "instrumentos_prestados": 1,
  "instrumentos_mantenimiento": 1,
  "instrumentos_baja": 0,
  "total_prestamos_activos": 1,
  "prestamos_vencidos": 0,
  "total_usuarios": 7,
  "total_categorias": 5
}
```

### Reporte de Uso de Instrumentos
```
GET /api/reportes/reporte_uso_instrumentos/
Response: {
  "total_instrumentos": 8,
  "reportes": [
    {
      "id": 1,
      "nombre": "Violín Yamaha",
      "referencia": "VLN-001",
      "categoria": "Cuerdas",
      "estado": "disponible",
      "total_prestamos": 5,
      "prestamos_activos": 0
    }
  ]
}
```

### Reporte de Usuarios Morosos
```
GET /api/reportes/reporte_usuarios_morosos/
Response: {
  "total_usuarios_morosos": 1,
  "usuarios": [
    {
      "usuario": {
        "id": 1,
        "nombre": "Juan García",
        "documento": "1073456789",
        "correo": "juan@ejemplo.com",
        "telefono": "3121234567"
      },
      "prestamos_vencidos": [
        {
          "instrumento": "Violín",
          "referencia": "VLN-001",
          "fecha_prestamo": "2024-01-10",
          "fecha_vencimiento": "2024-01-17",
          "dias_vencido": 5
        }
      ]
    }
  ]
}
```

### Reporte Detallado de Préstamos
```
GET /api/reportes/reporte_detalles_prestamos/
Response: {
  "total_prestamos": 5,
  "prestamos": [
    {
      "id": 1,
      "instrumento": "Violín Yamaha",
      "referencia": "VLN-001",
      "usuario": "Juan García",
      "documento": "1073456789",
      "fecha_prestamo": "2024-01-10",
      "fecha_vencimiento": "2024-01-17",
      "fecha_devolucion": null,
      "estado": "enuso",
      "dias_permitidos": 7,
      "dias_transcurridos": 2,
      "dias_vencimiento": -5,
      "estado_vencimiento": "vigente|vencido|proximo_vencer",
      "observaciones": "..."
    }
  ]
}
```

### Exportar Reporte Completo a Excel (Múltiples hojas)
```
GET /api/reportes/exportar_reporte_excel/
Response: archivo .xlsx con hojas:
  - Estadísticas generales
  - Préstamos
  - Instrumentos
```

---

## Códigos de Estado HTTP

| Código | Significado |
|--------|------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado |
| 204 | No Content - Solicitud exitosa sin contenido |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Autenticación requerida |
| 403 | Forbidden - Permiso insuficiente |
| 404 | Not Found - Recurso no encontrado |
| 500 | Server Error - Error del servidor |

---

## Roles y Permisos

| Operación | Admin | Almacenista | Profesor | Estudiante |
|-----------|-------|-------------|----------|-----------|
| Ver Categorías | ✓ | ✓ | ✓ | ✗ |
| Crear Categorías | ✓ | ✗ | ✗ | ✗ |
| Crear Instrumentos | ✓ | ✓ | ✗ | ✗ |
| Deshabilitar Instrumentos | ✓ | ✓ | ✗ | ✗ |
| Ver Usuarios | ✓ | ✓ | ✗ | ✗ |
| Registrar Préstamos | ✓ | ✓ | ✗ | ✗ |
| Devolver Instrumentos | ✓ | ✓ | ✗ | ✗ |
| Ver Reportes | ✓ | ✓ | ✗ | ✗ |

---

## Manejo de Errores

Todas las respuestas de error incluyen detalles:

```json
{
  "error": "Mensaje de error descriptivo",
  "detalles": {...}
}
```

### Ejemplo de Error de Validación
```
POST /api/instrumentos/
Body: { "nombre": "" }

Response (400):
{
  "nombre": [
    "El nombre del instrumento no puede estar vacío."
  ]
}
```

---

## Notas Importantes

1. **Autenticación**: Los endpoints protegidos requieren sesión activa; para operaciones mutables usar CSRF (`/api/csrf-token/` + `X-CSRFToken`)
2. **Paginación**: Los listados usan paginación por defecto (20 items por página)
3. **Búsqueda**: El parámetro `search` es case-insensitive
4. **Ordenamiento**: Usar `-` al inicio para orden descendente
5. **Fechas**: Usar formato ISO 8601: `YYYY-MM-DD`
6. **Sincronización de Estados**: Los cambios de estado del instrumento se registran automáticamente en el historial

---

## Ejemplos de Uso (cURL)

### Login
```bash
curl -c cookies.txt http://localhost:8000/api/csrf-token/

curl -X POST http://localhost:8000/api/login/ \
  -b cookies.txt -c cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <csrftoken_de_cookie>" \
  -d '{"username":"admin","password":"admin123"}'
```

### Crear Instrumento
```bash
curl -X POST http://localhost:8000/api/instrumentos/ \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <csrftoken_de_cookie>" \
  -d '{
    "nombre": "Violín Yamaha",
    "referencia": "VLN-001",
    "categoria": 1,
    "estado": "disponible"
  }'
```

### Obtener Préstamos Vencidos
```bash
curl -X GET http://localhost:8000/api/prestamos/vencidos/ \
  -b cookies.txt
```

---

## Instalar y Ejecutar

1. **Instalar dependencias**
```bash
pip install -r requirements.txt
```

2. **Aplicar migraciones**
```bash
python manage.py migrate
```

3. **Cargar datos iniciales**
```bash
python manage.py cargar_datos_iniciales
```

4. **Iniciar servidor**
```bash
python manage.py runserver
```

5. **Acceder a admin**
```
http://localhost:8000/admin/
Usuario: admin
Contraseña: admin123
```
