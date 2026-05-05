# 🎼 Sistema de Gestión de Inventario - Conservatorio del Huila

## ¿Qué es esto?

Sistema completo para gestionar instrumentos musicales, préstamos y devoluciones del Conservatorio del Huila.

- **Backend**: Django + Django REST Framework (Funcional ✓)
- **Frontend**: Angular (Trabajo futuro)
- **BD**: PostgreSQL

---

## 🚀 Inicio Rápido (Desarrollo)

### 1️⃣ Activar Entorno Virtual
```bash
cd django_angular
entorno\Scripts\activate  # Windows
source entorno/bin/activate  # macOS/Linux
```

### 2️⃣ Instalar Dependencias
```bash
pip install -r requirements.txt
```

### 3️⃣ Configurar Base de Datos
Asegúrese que PostgreSQL está corriendo en `localhost:5433`

```bash
# Aplicar migraciones
python manage.py migrate
```

### 4️⃣ Cargar Datos de Prueba
```bash
python manage.py cargar_datos_iniciales
```

### 5️⃣ Iniciar Servidor
```bash
python manage.py runserver
```

---

## 📍 Acceso al Sistema

### API REST
```
http://localhost:8000/api/
```

**Ejemplos de uso:**
```bash
# 1) Obtener cookie CSRF
curl -c cookies.txt http://localhost:8000/api/csrf-token/

# 2) Login por sesión (envía cookie + header CSRF)
curl -X POST http://localhost:8000/api/login/ \
  -b cookies.txt -c cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <csrftoken_de_cookie>" \
  -d '{"username":"admin","password":"admin123"}'

# 3) Consumir endpoint autenticado usando la cookie de sesión
curl -X GET http://localhost:8000/api/instrumentos/ -b cookies.txt
```

### Panel Administrativo
```
http://localhost:8000/admin/
Usuario: admin
Contraseña: admin123
```

---

## 👥 Usuarios de Prueba

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| **admin** | admin123 | Administrador |
| **almacenista** | almacen123 | Almacenista |
| **profesor** | profesor123 | Profesor |

---

## 📚 Documentación

### Backend
- [README_BACKEND.md](README_BACKEND.md) - Guía completa del backend
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Documentación detallada de endpoints
- [EVIDENCIA_GA8-220501096-AA1-EV01.md](EVIDENCIA_GA8-220501096-AA1-EV01.md) - Documento de evidencia academica

### Frontend (Próximamente)
- [miapi/README.md](miapi/README.md) - Instrucciones de Angular

---

## ✅ Características Implementadas

### 🎸 Gestión de Instrumentos
- ✓ CRUD completo con permisos
- ✓ Historial de cambios automático
- ✓ Estados: disponible, prestado, mantenimiento, baja
- ✓ Búsqueda avanzada
- ✓ Exportación a Excel

### 📦 Control de Préstamos
- ✓ Crear préstamos con validación
- ✓ Devolver instrumentos
- ✓ **Alertas de préstamos vencidos**
- ✓ Próximos a vencer (7 días)
- ✓ Cálculo automático de vencimiento

### 👥 Gestión de Usuarios
- ✓ Registro de estudiantes y profesores
- ✓ Búsqueda y filtrado
- ✓ Estado activo/inactivo

### 📊 Reportes y Estadísticas
- ✓ Dashboard de estadísticas
- ✓ Reporte de usuarios morosos
- ✓ Reporte de uso de instrumentos
- ✓ Exportación masiva a Excel

### 🔒 Seguridad
- ✓ Autenticación por sesión + CSRF
- ✓ 4 Roles con permisos granulares
- ✓ Auditoría completa
- ✓ Validaciones en todos los campos

---

## 🛠 Comandos Útiles

### Base de Datos
```bash
# Ver migraciones
python manage.py showmigrations

# Hacer migraciones
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser
```

### Datos
```bash
# Cargar fixtures
python manage.py loaddata categorias instrumentos usuarios

# Exportar datos
python manage.py dumpdata api > backup.json

# Cargar backup
python manage.py loaddata backup.json
```

### Desarrollo
```bash
# Ejecutar tests
python manage.py test api

# Shell interactivo
python manage.py shell
```

---

## 📋 Estructura del Proyecto

```
django_angular/
├── api/                          # Aplicación principal
│   ├── models.py                 # Modelos (Categoria, Instrumento, etc.)
│   ├── views.py                  # ViewSets API REST
│   ├── serializers.py            # Serializadores
│   ├── admin.py                  # Panel administrativo
│   ├── signals.py                # Automatización
│   ├── urls.py                   # Rutas API
│   ├── fixtures/                 # Datos de prueba
│   └── management/commands/      # Comandos personalizados
│
├── Inventario/                   # Configuración Django
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
│
├── miapi/                        # Frontend Angular
├── manage.py                     # Comando Django
├── .env                          # Variables de entorno
├── requirements.txt              # Dependencias Python
│
├── API_DOCUMENTATION.md          # Documentación de endpoints
├── README_BACKEND.md             # Guía backend
└── README.md                     # Este archivo
```

---

## 🔗 Endpoints Principales

### Autenticación
```
POST   /api/login/
```

### Categorías
```
GET    /api/categorias/
POST   /api/categorias/
```

### Instrumentos
```
GET    /api/instrumentos/
POST   /api/instrumentos/
GET    /api/instrumentos/{id}/
POST   /api/instrumentos/{id}/dar_baja/
POST   /api/instrumentos/{id}/enviar_mantenimiento/
POST   /api/instrumentos/{id}/cambiar_estado_fisico/
GET    /api/instrumentos/{id}/historial/
```

### Préstamos
```
GET    /api/prestamos/
POST   /api/prestamos/
GET    /api/prestamos/vencidos/                  ⚠️ ALERTAS
GET    /api/prestamos/proximos_a_vencer/        🔔 PRÓXIMOS
POST   /api/prestamos/{id}/devolver/
GET    /api/prestamos/exportar_excel/
```

### Reportes
```
GET    /api/reportes/estadisticas_generales/
GET    /api/reportes/reporte_usuarios_morosos/
GET    /api/reportes/reporte_uso_instrumentos/
GET    /api/reportes/exportar_reporte_excel/
```

---

## ⚠️ Solución de Problemas

### "No module named 'psycopg2'"
```bash
pip install psycopg2-binary
```

### "Connection refused" a PostgreSQL
```bash
# Windows - Verificar que PostgreSQL está en puerto 5433
# O cambiar en .env: DB_PORT=5432
```

### Errores de sesión/CSRF
```bash
# Renovar cookie CSRF y volver a autenticar sesión
curl -c cookies.txt http://localhost:8000/api/csrf-token/
curl -X POST http://localhost:8000/api/login/ \
  -b cookies.txt -c cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <csrftoken_de_cookie>" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## 📝 Variables de Entorno (.env)

```
# Django
DEBUG=True
SECRET_KEY=tu_clave_secreta

# Base de Datos PostgreSQL
DB_ENGINE=django.db.backends.postgresql
DB_NAME=db_conservatorio
DB_USER=postgres
DB_PASSWORD=majo
DB_HOST=localhost
DB_PORT=5433

# CORS
CORS_ALLOW_ALL_ORIGINS=True

# Localización
LANGUAGE_CODE=es-mx
TIME_ZONE=America/Mexico_City
```

---

## 🎯 Requerimientos Cumplidos

- ✅ Registrar datos de estudiante, instrumento, fechas
- ✅ Cambios de estado físico de instrumentos
- ✅ Generación de reportes detallados
- ✅ Búsqueda por criterios múltiples
- ✅ Registro de nuevos instrumentos
- ✅ Sistema de baja de instrumentos
- ✅ **Alertas de no devueltos en tiempo**

---

## 🧪 Testing

```bash
# Ejecutar todos los tests
python manage.py test

# Test específico
python manage.py test api.tests.PrestamoTestCase
```

---

## 📦 Producción

Para desplegar en producción:

1. Cambiar `DEBUG=False`
2. Usar base de datos PostgreSQL
3. Configurar `ALLOWED_HOSTS`
4. Usar un servidor WSGI (Gunicorn, uWSGI)
5. Configurar HTTPS
6. Usar variables de entorno seguras

```bash
# Ejemplo con Gunicorn
gunicorn Inventario.wsgi:application --bind 0.0.0.0:8000
```

---

## 📞 Soporte

Para reportar issues o sugerencias, contactar al equipo de desarrollo.

---

**Estado**: ✅ Backend Completamente Funcional  
**Último Update**: Marzo 2026
