from rest_framework import serializers
from django.core.exceptions import ValidationError
from .models import Categoria, Instrumento, Usuario, Prestamo, Perfil, HistorialEstadoInstrumento


# =========================
# CATEGORIA
# =========================
class CategoriaSerializer(serializers.ModelSerializer):

    class Meta:
        model = Categoria
        fields = '__all__'

    def validate_nombre(self, value):
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("El nombre de la categoría no puede estar vacío.")
        return value.strip()


# =========================
# HISTORIAL ESTADO
# =========================
class HistorialEstadoInstrumentoSerializer(serializers.ModelSerializer):

    cambiado_por_nombre = serializers.CharField(source='cambiado_por.username', read_only=True, allow_blank=True)

    class Meta:
        model = HistorialEstadoInstrumento
        fields = '__all__'
        read_only_fields = ['fecha_cambio']


# =========================
# INSTRUMENTO
# =========================
class InstrumentoSerializer(serializers.ModelSerializer):

    categoria_nombre = serializers.ReadOnlyField(source='categoria.nombre')

    class Meta:
        model = Instrumento
        fields = '__all__'
        read_only_fields = ['estado', 'fecha_creacion', 'fecha_actualizacion']

    def validate_referencia(self, value):
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("La referencia no puede estar vacía.")
        return value.strip().upper()

    def validate_nombre(self, value):
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("El nombre del instrumento no puede estar vacío.")
        return value.strip()

    def validate(self, attrs):
        if 'categoria' not in attrs:
            raise serializers.ValidationError("La categoría es requerida.")
        return attrs


# =========================
# INSTRUMENTO CON HISTORIAL
# =========================
class InstrumentoDetailSerializer(serializers.ModelSerializer):

    categoria_nombre = serializers.ReadOnlyField(source='categoria.nombre')
    historial_movimientos = HistorialEstadoInstrumentoSerializer(many=True, read_only=True)

    class Meta:
        model = Instrumento
        fields = '__all__'
        read_only_fields = ['estado', 'fecha_creacion', 'fecha_actualizacion']


# =========================
# USUARIO (PERSONA A QUIEN SE PRESTA)
# =========================
class UsuarioSerializer(serializers.ModelSerializer):

    class Meta:
        model = Usuario
        fields = '__all__'

    def validate_nombre(self, value):
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("El nombre no puede estar vacío.")
        return value.strip()

    def validate_documento(self, value):
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("El documento es requerido.")
        return value.strip()

    def validate_correo(self, value):
        if value and '@' not in value:
            raise serializers.ValidationError("Ingrese un correo válido.")
        return value

    def validate(self, attrs):
        if 'tipo' not in attrs:
            raise serializers.ValidationError("El tipo de usuario es requerido.")
        return attrs


# =========================
# PRESTAMO
# =========================
class PrestamoSerializer(serializers.ModelSerializer):

    instrumento_nombre = serializers.ReadOnlyField(source='instrumento.nombre')
    instrumento_referencia = serializers.ReadOnlyField(source='instrumento.referencia')
    usuario_nombre = serializers.ReadOnlyField(source='usuario.nombre')
    usuario_documento = serializers.ReadOnlyField(source='usuario.documento')
    instrumento_estado = serializers.ReadOnlyField(source='instrumento.estado')

    class Meta:
        model = Prestamo
        fields = '__all__'
        read_only_fields = ['fecha_creacion', 'fecha_actualizacion']

    def validate(self, attrs):

        instrumento = attrs.get('instrumento')

        if instrumento and attrs.get('estado') == 'enuso':
            if instrumento.estado != 'disponible':
                raise serializers.ValidationError(
                    f"El instrumento no está disponible. Estado actual: {instrumento.estado}"
                )

        return attrs

    def create(self, validated_data):

        request = self.context.get('request')

        prestamo = Prestamo(**validated_data)

        # Guardar usuario del sistema para historial
        prestamo._usuario_sistema = request.user

        prestamo.save()

        return prestamo

    def update(self, instance, validated_data):

        request = self.context.get('request')

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance._usuario_sistema = request.user

        instance.save()

        return instance


# =========================
# REPORTE DE PRÉSTAMOS VENCIDOS
# =========================
class ReporteVencidoSerializer(serializers.ModelSerializer):

    instrumento_nombre = serializers.ReadOnlyField(source='instrumento.nombre')
    instrumento_referencia = serializers.ReadOnlyField(source='instrumento.referencia')
    usuario_nombre = serializers.ReadOnlyField(source='usuario.nombre')
    usuario_documento = serializers.ReadOnlyField(source='usuario.documento')
    usuario_telefono = serializers.ReadOnlyField(source='usuario.telefono')
    usuario_correo = serializers.ReadOnlyField(source='usuario.correo')
    dias_vencimiento = serializers.SerializerMethodField()

    class Meta:
        model = Prestamo
        fields = [
            'id',
            'instrumento_nombre',
            'instrumento_referencia',
            'usuario_nombre',
            'usuario_documento',
            'usuario_telefono',
            'usuario_correo',
            'fecha_prestamo',
            'fecha_vencimiento',
            'dias_vencimiento',
            'estado'
        ]

    def get_dias_vencimiento(self, obj):
        from django.utils import timezone
        hoy = timezone.now().date()
        dias = (hoy - obj.fecha_vencimiento).days if obj.fecha_vencimiento else 0
        return dias


# =========================
# REPORTE DE ESTADO DE INSTRUMENTOS
# =========================
class ReporteEstadoInstrumentoSerializer(serializers.ModelSerializer):

    categoria_nombre = serializers.ReadOnlyField(source='categoria.nombre')
    cantidad_prestamos = serializers.SerializerMethodField()
    ultimo_cambio = serializers.SerializerMethodField()

    class Meta:
        model = Instrumento
        fields = [
            'id',
            'nombre',
            'referencia',
            'categoria_nombre',
            'estado',
            'marca',
            'modelo',
            'ubicacion_fisica',
            'cantidad',
            'cantidad_prestamos',
            'valor_reemplazo',
            'fecha_adquisicion',
            'ultimo_cambio'
        ]

    def get_cantidad_prestamos(self, obj):
        return obj.prestamo_set.filter(estado='enuso').count()

    def get_ultimo_cambio(self, obj):
        ultimo = obj.historial_movimientos.order_by('-fecha_cambio').first()
        return ultimo.fecha_cambio if ultimo else None


# =========================
# ESTADÍSTICAS
# =========================
class EstadisticasSerializer(serializers.Serializer):

    total_instrumentos = serializers.IntegerField()
    instrumentos_disponibles = serializers.IntegerField()
    instrumentos_prestados = serializers.IntegerField()
    instrumentos_mantenimiento = serializers.IntegerField()
    instrumentos_baja = serializers.IntegerField()
    total_prestamos_activos = serializers.IntegerField()
    prestamos_vencidos = serializers.IntegerField()
    total_usuarios = serializers.IntegerField()
    total_categorias = serializers.IntegerField()