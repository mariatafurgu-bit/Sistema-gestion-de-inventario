from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.contrib.auth.models import User
from datetime import timedelta


# =========================
# CATEGORIA
# =========================
class Categoria(models.Model):

    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nombre


# =========================
# INSTRUMENTO
# =========================
class Instrumento(models.Model):

    ESTADOS = [
        ('disponible', 'Disponible'),
        ('prestado', 'En Préstamo'),
        ('mantenimiento', 'En Mantenimiento'),
        ('baja', 'Dado de Baja'),
    ]

    nombre = models.CharField(max_length=100)
    referencia = models.CharField(max_length=50, unique=True)
    marca = models.CharField(max_length=100, blank=True, null=True)
    modelo = models.CharField(max_length=100, blank=True, null=True)
    fecha_adquisicion = models.DateField(blank=True, null=True)

    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.CASCADE
    )

    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default='disponible'
    )
    cantidad = models.PositiveIntegerField(default=1)
    ubicacion_fisica = models.CharField(max_length=100, blank=True, null=True)
    valor_reemplazo = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True, null=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)


    # =========================
    # CAMBIAR ESTADO
    # =========================
    def cambiar_estado(self, nuevo_estado, usuario=None, observacion=None):

        estado_anterior = self.estado
        self.estado = nuevo_estado
        self.save(update_fields=["estado"])

        HistorialEstadoInstrumento.objects.create(
            instrumento=self,
            tipo_movimiento="cambio_estado",
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            cambiado_por=usuario,
            observacion=observacion
        )


    # =========================
    # GUARDAR INSTRUMENTO
    # =========================
    def save(self, *args, **kwargs):

        es_nuevo = self.pk is None

        super().save(*args, **kwargs)

        # Registrar historial si es un instrumento nuevo
        if es_nuevo:
            HistorialEstadoInstrumento.objects.create(
                instrumento=self,
                tipo_movimiento="registro",
                estado_anterior=None,
                estado_nuevo=self.estado,
                cambiado_por=None,
                observacion="Registro inicial del instrumento"
            )


    def __str__(self):
        return f"{self.nombre} ({self.referencia})"
# =========================
# HISTORIAL MOVIMIENTOS
# =========================
class HistorialEstadoInstrumento(models.Model):

    TIPOS_MOVIMIENTO = [
        ('registro', 'Registro de instrumento'),
        ('prestamo', 'Préstamo de instrumento'),
        ('devolucion', 'Devolución de instrumento'),
        ('reparacion', 'Envío a reparación'),
        ('baja', 'Baja de instrumento'),
        ('cambio_estado', 'Cambio manual de estado'),
    ]

    instrumento = models.ForeignKey(
        Instrumento,
        on_delete=models.CASCADE,
        related_name="historial_movimientos"
    )

    tipo_movimiento = models.CharField(
        max_length=20,
        choices=TIPOS_MOVIMIENTO
    )

    estado_anterior = models.CharField(
        max_length=20,
        choices=Instrumento.ESTADOS,
        null=True,
        blank=True
    )

    estado_nuevo = models.CharField(
        max_length=20,
        choices=Instrumento.ESTADOS
    )

    fecha_cambio = models.DateTimeField(auto_now_add=True)

    cambiado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    observacion = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.instrumento.nombre} - {self.tipo_movimiento} - {self.fecha_cambio}"


# =========================
# PERFIL (ROL DEL SISTEMA)
# =========================
class Perfil(models.Model):

    ROLES = [
        ('administrador', 'Administrador'),
        ('almacenista', 'Almacenista'),
        ('profesor', 'Profesor'),
        ('estudiante', 'Estudiante'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)

    rol = models.CharField(
        max_length=20,
        choices=ROLES
    )

    def __str__(self):
        return f"{self.user.username} - {self.rol}"


# =========================
# PERSONA (A QUIEN SE LE PRESTA)
# =========================
class Usuario(models.Model):

    TIPOS = [
        ('profesor', 'Profesor'),
        ('estudiante', 'Estudiante'),
    ]

    nombre = models.CharField(max_length=100)

    documento = models.CharField(
        max_length=20,
        unique=True
    )

    telefono = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    correo = models.EmailField(
        blank=True,
        null=True
    )

    tipo = models.CharField(
        max_length=20,
        choices=TIPOS,
        default='estudiante'
    )
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True, null=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

# =========================
# PRESTAMO
# =========================
class Prestamo(models.Model):

    ESTADOS = [
        ('disponible', 'Disponible'),
        ('enuso', 'En uso'),
        ('reparacion', 'Reparación'),
    ]

    instrumento = models.ForeignKey(
        Instrumento,
        on_delete=models.CASCADE
    )

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE
    )

    fecha_prestamo = models.DateField(blank=True, null=True)
    fecha_vencimiento = models.DateField(blank=True, null=True)
    fecha_devolucion = models.DateField(blank=True, null=True)
    dias_permitidos = models.PositiveIntegerField(default=7)
    fecha_creacion = models.DateTimeField(auto_now_add=True, null=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default='disponible'
    )

    observaciones = models.TextField(blank=True, null=True)

    def clean(self):

        if self.estado == 'enuso' and self.instrumento.estado != 'disponible':
            raise ValidationError("El instrumento no está disponible.")

    def save(self, *args, **kwargs):

        self.full_clean()

        usuario_sistema = getattr(self, '_usuario_sistema', None)

        if not self.fecha_prestamo:
            self.fecha_prestamo = timezone.now().date()

        if self.estado == 'enuso' and not self.fecha_vencimiento:
            self.fecha_vencimiento = self.fecha_prestamo + timedelta(days=self.dias_permitidos)

        super().save(*args, **kwargs)

        # SINCRONIZAR ESTADO DEL INSTRUMENTO

        if self.estado == 'enuso':

            estado_anterior = self.instrumento.estado

            self.instrumento.estado = 'prestado'
            self.instrumento.save(update_fields=["estado"])

            HistorialEstadoInstrumento.objects.create(
                instrumento=self.instrumento,
                tipo_movimiento="prestamo",
                estado_anterior=estado_anterior,
                estado_nuevo="prestado",
                cambiado_por=usuario_sistema,
                observacion="Instrumento prestado"
            )

        elif self.estado == 'disponible':

            if not self.fecha_devolucion:
                self.fecha_devolucion = timezone.now().date()

            estado_anterior = self.instrumento.estado

            self.instrumento.estado = 'disponible'
            self.instrumento.save(update_fields=["estado"])

            HistorialEstadoInstrumento.objects.create(
                instrumento=self.instrumento,
                tipo_movimiento="devolucion",
                estado_anterior=estado_anterior,
                estado_nuevo="disponible",
                cambiado_por=usuario_sistema,
                observacion="Instrumento devuelto"
            )

        elif self.estado == 'reparacion':

            estado_anterior = self.instrumento.estado

            self.instrumento.estado = 'mantenimiento'
            self.instrumento.save(update_fields=["estado"])

            HistorialEstadoInstrumento.objects.create(
                instrumento=self.instrumento,
                tipo_movimiento="reparacion",
                estado_anterior=estado_anterior,
                estado_nuevo="mantenimiento",
                cambiado_por=usuario_sistema,
                observacion="Instrumento enviado a reparación"
            )

    @classmethod
    def prestamos_vencidos(cls):
        """Retorna préstamos vencidos y no devueltos."""
        hoy = timezone.now().date()
        return cls.objects.filter(
            estado='enuso',
            fecha_vencimiento__lt=hoy,
            fecha_devolucion__isnull=True
        )

    def __str__(self):
        return f"Préstamo de {self.instrumento.nombre} a {self.usuario.nombre}"