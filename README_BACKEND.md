# Sistema de Gestión de Inventario - Backend (Django)

## Descripción General
Backend desarrollado con **Django 6.0** y **Django REST Framework** para gestionar el inventario de instrumentos musicales del Conservatorio del Huila.

## Características Implementadas

### ✅ Objetivos Cumplidos

#### **Objetivo General**
- ✓ Solución tecnológica estructurada para almacenar información del inventario
- ✓ Procesos optimizados para registro, seguimiento y gestión de instrumentos
- ✓ API REST funcional para integración con frontend

#### **Objetivos Específicos**
- ✓ Registro de estudiantes, instrumentos prestados, fechas de salida y devolución
- ✓ Registro de cambios en estado físico de instrumentos
- ✓ Generación de reportes detallados
- ✓ Búsqueda de instrumentos por criterios múltiples
- ✓ Registro de nuevos instrumentos con detalles completos
- ✓ Sistema de baja de instrumentos dañados
- ✓ Alertas de instrumentos no devueltos en tiempo

### 📋 Funcionalidades Implementadas

#### **Gestión de Categorías**
- Crear, listar, actualizar y eliminar categorías (Solo Admin)
- Búsqueda por nombre/descripción
- Conteo automático de instrumentos por categoría

#### **Gestión de Instrumentos**
- CRUD completo de instrumentos con permisos por rol
- Estados: disponible, prestado, mantenimiento, baja
- Historial completo de movimientos
- Cambios de estado físico con observaciones
- Búsqueda avanzada por múltiples criterios
- Exportación a Excel

#### **Gestión de Usuarios**
- Registrar estudiantes y profesores
- Búsqueda por nombre, documento, correo
- Estado activo/inactivo

#### **Gestión de Préstamos**
- Crear préstamos con validación de disponibilidad
- Devolver instrumentos con registro automático
- Cálculo automático de fecha de vencimiento
- Alertas de préstamos vencidos
- Búsqueda de próximos a vencer (7 días)
- Exportación a Excel

#### **Reportes y Estadísticas**
- Estadísticas generales del sistema
- Reporte de uso de instrumentos
- Reporte de usuarios morosos
- Reporte detallado de préstamos
- Exportación completa a Excel (múltiples hojas)

#### **Sistema de Auditoría**
- Historial de cambios de estado por instrumento
- Registro automático de usuario que realiza cambio
- Observaciones detalladas
- Fechas de cambio registradas

#### **Control de Acceso**
- Autenticación por sesión + CSRF
- 4 Roles definidos: Administrador, Almacenista, Profesor, Estudiante
- Permisos granulares por endpoint
- Admin moderno y funcional

---

## Configuración e Instalación

### Requisitos Previos
- Python 3.8+
- PostgreSQL (o SQLite para desarrollo)
- pip

### Pasos de Instalación

#### 1. Clonar el Repositorio
```bash
cd django_angular
```

#### 2. Crear Entorno Virtual (Ya existe)
```bash
# En Windows
entorno\Scripts\activate

# En macOS/Linux
source entorno/bin/activate
```

#### 3. Instalar Dependencias
```bash
pip install -r requirements.txt
```

Si `requirements.txt` no existe, instalar manualmente:
```bash
pip install Django==6.0.2
pip install djangorestframework==3.16.1
pip install django-cors-headers==4.9.0
pip install python-dotenv==1.2.2
pip install psycopg2-binary==2.9.11
pip install openpyxl==3.1.5
```

#### 4. Configurar Variables de Entorno
El archivo `.env` ya existe con la configuración base. Verificar:
```
DEBUG=True
SECRET_KEY=tu_clave_secreta
DB_ENGINE=django.db.backends.postgresql
DB_NAME=db_conservatorio
DB_USER=postgres
DB_PASSWORD=majo
DB_HOST=localhost
DB_PORT=5433
```

#### 5. Aplicar Migraciones
```bash
python manage.py migrate
```

#### 6. Cargar Datos Iniciales
```bash
python manage.py cargar_datos_iniciales
```

Esto creará:
- 5 categorías de instrumentos
- 8 instrumentos de ejemplo
- 7 usuarios (estudiantes y profesores)
- 3 usuarios del sistema (admin, almacenista, profesor)

#### 7. Crear Superusuario (Opcional)
```bash
python manage.py createsuperuser
```

#### 8. Iniciar Servidor
```bash
python manage.py runserver
```

El servidor estará disponible en: `http://localhost:8000`

---

## Acceso al Sistema

### API REST
- **URL Base**: `http://localhost:8000/api/`
- **Documentación Completa**: Ver `API_DOCUMENTATION.md`

### Admin Django
- **URL**: `http://localhost:8000/admin/`
- **Usuario**: `admin`
- **Contraseña**: `admin123`

### Usuarios de Prueba
| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | admin123 | Administrador |
| almacenista | almacen123 | Almacenista |
| profesor | profesor123 | Profesor |

---

## Estructura del Proyecto

```
api/
├── models.py              # Modelos de datos
├── views.py               # ViewSets de API REST
├── serializers.py         # Serializadores DRF
├── admin.py               # Configuración panel admin
├── urls.py                # Rutas de API
├── signals.py             # Automación de cambios
├── tests.py               # Tests unitarios
├── management/
│   └── commands/
│       └── cargar_datos_iniciales.py   # Cargar datos de prueba
├── fixtures/
│   ├── categorias.json
│   ├── instrumentos.json
│   └── usuarios.json
└── migrations/            # Migraciones de BD

Inventario/
├── settings.py            # Configuración Django
├── urls.py                # Rutas principales
└── wsgi.py                # WSGI para producción
```

---

## Endpoints Principales

### 🔐 Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/csrf-token/` | Obtener cookie/token CSRF |
| POST | `/api/login/` | Iniciar sesión |
| GET | `/api/usuario-actual/` | Consultar sesión actual |
| POST | `/api/logout/` | Cerrar sesión |

### 📁 Categorías
| Método | Endpoint | Permisos |
|--------|----------|----------|
| GET | `/api/categorias/` | Todos autenticados |
| POST | `/api/categorias/` | Admin |
| PUT/PATCH | `/api/categorias/{id}/` | Admin |
| DELETE | `/api/categorias/{id}/` | Admin |

### 🎸 Instrumentos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/instrumentos/` | Listar todos |
| POST | `/api/instrumentos/` | Crear nuevo |
| GET | `/api/instrumentos/{id}/` | Detalle con historial |
| POST | `/api/instrumentos/{id}/dar_baja/` | Dar de baja |
| POST | `/api/instrumentos/{id}/enviar_mantenimiento/` | Enviar a reparación |
| POST | `/api/instrumentos/{id}/cambiar_estado_fisico/` | Cambiar estado físico |
| GET | `/api/instrumentos/{id}/historial/` | Ver historial de movimientos |

### 👥 Usuarios
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/usuarios/` | Listar todos |
| POST | `/api/usuarios/` | Crear nuevo |
| GET | `/api/usuarios/{id}/` | Detalle |
| PUT/PATCH | `/api/usuarios/{id}/` | Actualizar |
| DELETE | `/api/usuarios/{id}/` | Eliminar |

### 📦 Préstamos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/prestamos/` | Listar todos |
| POST | `/api/prestamos/` | Crear nuevo préstamo |
| GET | `/api/prestamos/{id}/` | Detalle |
| POST | `/api/prestamos/{id}/devolver/` | Devolver instrumento |
| GET | `/api/prestamos/vencidos/` | Alertas vencidas |
| GET | `/api/prestamos/proximos_a_vencer/` | Próximos 7 días |
| GET | `/api/prestamos/exportar_excel/` | Descargar Excel |

### 📊 Reportes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/reportes/estadisticas_generales/` | Dashboard stats |
| GET | `/api/reportes/reporte_uso_instrumentos/` | Uso por instrumento |
| GET | `/api/reportes/reporte_usuarios_morosos/` | Usuarios con atrasos |
| GET | `/api/reportes/reporte_detalles_prestamos/` | Detalle completo |
| GET | `/api/reportes/exportar_reporte_excel/` | Descargar reporte |

---

## Validaciones Implementadas

### Categorías
- ✓ Nombre único y nunca vacío
- ✓ Descripción opcional

### Instrumentos
- ✓ Referencia única y nunca vacía (convertida a mayúsculas)
- ✓ Nombre obligatorio
- ✓ Categoría requerida
- ✓ No se puede dar de baja si está prestado
- ✓ No se puede prestar si no está disponible

### Usuarios
- ✓ Nombre no vacío
- ✓ Documento único y obligatorio
- ✓ Email válido
- ✓ Tipo (estudiante/profesor) requerido
- ✓ Campo activo para deshabilitar usuarios

### Préstamos
- ✓ Instrumento debe estar disponible para prestar
- ✓ Fecha vencimiento calculada automáticamente
- ✓ Cambio de estado automático del instrumento
- ✓ Registro automático en historial
- ✓ Usuario registrado automáticamente en cambios

---

## Características de Seguridad

### Autenticación
- ✓ Autenticación por sesión + CSRF
- ✓ Contraseñas encriptadas
- ✓ CORS configurado para desarrollo

### Autorización
- ✓ Permisos basados en roles
- ✓ Solo Admin: crear/eliminar categorías
- ✓ Solo Almacenista+Admin: gestión de instrumentos y préstamos
- ✓ Validaciones en serializers

### Auditoría
- ✓ Historial automático de cambios
- ✓ Registro de usuario que realiza cambio
- ✓ Timestamps automáticos
- ✓ Observaciones detalladas

---

## Gestión de Base de Datos

### Migraciones
```bash
# Ver migraciones pendientes
python manage.py showmigrations

# Hacer migraciones de cambios en models
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Revertir a una migración anterior
python manage.py migrate api 0002
```

### Dump de Datos
```bash
# Exportar datos a JSON
python manage.py dumpdata api > backup.json

# Cargar datos desde JSON
python manage.py loaddata backup.json
```

---

## Desarrollo y Testing

### Crear Extensiones
1. Agregar modelo en `models.py`
2. Crear serializer en `serializers.py`
3. Crear viewset en `views.py`
4. Registrar en `urls.py`
5. Ejecutar migraciones

### Ejecutar Tests
```bash
python manage.py test api
```

### Debug
```python
# En settings.py cambiar
DEBUG = True
ALLOWED_HOSTS = ['*']
```

---

## Troubleshooting

### Error: "No module named 'psycopg2'"
```bash
pip install psycopg2-binary
```

### Error: "Connection refused" a PostgreSQL
Verificar que PostgreSQL está corriendo en `localhost:5433`

### Error: "Authentication failed"
Verificar credenciales en `.env`

### Limpiar caché de migraciones
```bash
find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
find . -path "*/migrations/*.pyc" -delete
```

---

## Próximos Pasos (Opcional)

1. **Implementar Notificaciones**
   - Email cuando vence préstamo
   - SMS para alertas

2. **Mejorar Reportes**
   - Gráficos de uso
   - Análisis de tendencias
   - Reportes por período

3. **Optimizaciones**
   - Caché con Redis
   - Paginación mejorada
   - Búsqueda full-text

4. **Características Avanzadas**
   - Búsqueda por código QR
   - Reservas de instrumentos
   - Sistema de mantenimiento preventivo

---

## Documentación Adicional

- **API Endpoints**: Ver `API_DOCUMENTATION.md`
- **Modelos**: Documentación en código en `models.py`
- **Admin Django**: Accesible en `/admin/`

---

## Licencia y Créditos

Proyecto desarrollado para el Conservatorio del Huila.
Sistema de Gestión de Inventario de Instrumentos Musicales.

---

## Contacto y Soporte

Para reportar issues o sugerencias, contactar al equipo de desarrollo.

---

**Última actualización**: Marzo 2026
