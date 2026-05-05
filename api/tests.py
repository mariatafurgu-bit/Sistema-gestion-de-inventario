from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APIClient

from .models import Categoria, Instrumento, Perfil, Prestamo, Usuario
from .serializers import CategoriaSerializer, InstrumentoSerializer, PrestamoSerializer


class SerializerTests(TestCase):
	def setUp(self):
		self.categoria = Categoria.objects.create(nombre="Cuerdas")
		self.instrumento = Instrumento.objects.create(
			nombre="Guitarra",
			referencia="GTR-001",
			categoria=self.categoria,
			estado="disponible",
		)
		self.usuario = Usuario.objects.create(
			nombre="Juan Perez",
			documento="123456",
			tipo="estudiante",
		)

	def test_categoria_serializer_rechaza_nombre_vacio(self):
		serializer = CategoriaSerializer(data={"nombre": "   "})
		self.assertFalse(serializer.is_valid())
		self.assertIn("nombre", serializer.errors)

	def test_instrumento_serializer_normaliza_referencia_y_nombre(self):
		serializer = InstrumentoSerializer(
			data={
				"nombre": "  Violin  ",
				"referencia": "  ref-777  ",
				"categoria": self.categoria.id,
				"cantidad": 1,
			}
		)
		self.assertTrue(serializer.is_valid(), serializer.errors)
		self.assertEqual(serializer.validated_data["referencia"], "REF-777")
		self.assertEqual(serializer.validated_data["nombre"], "Violin")

	def test_prestamo_serializer_valida_disponibilidad(self):
		self.instrumento.estado = "mantenimiento"
		self.instrumento.save(update_fields=["estado"])

		serializer = PrestamoSerializer(
			data={
				"instrumento": self.instrumento.id,
				"usuario": self.usuario.id,
				"estado": "enuso",
			}
		)
		self.assertFalse(serializer.is_valid())
		self.assertIn("non_field_errors", serializer.errors)


class EndpointCriticosTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.web_client = Client(enforce_csrf_checks=True)

		self.admin_user = User.objects.create_user(
			username="admin_test",
			password="ClaveSegura123!",
			email="admin@test.com",
		)
		Perfil.objects.create(user=self.admin_user, rol="administrador")

		self.almacenista_user = User.objects.create_user(
			username="almacen_test",
			password="ClaveSegura123!",
			email="almacen@test.com",
		)
		Perfil.objects.create(user=self.almacenista_user, rol="almacenista")

		self.profesor_user = User.objects.create_user(
			username="profe_test",
			password="ClaveSegura123!",
			email="profe@test.com",
		)
		Perfil.objects.create(user=self.profesor_user, rol="profesor")

		self.categoria = Categoria.objects.create(nombre="Viento")
		self.instrumento = Instrumento.objects.create(
			nombre="Flauta",
			referencia="FLT-001",
			categoria=self.categoria,
			estado="disponible",
		)
		self.usuario = Usuario.objects.create(
			nombre="Ana Lopez",
			documento="987654",
			tipo="estudiante",
		)

	def test_login_solo_permite_admin_o_almacenista(self):
		csrf_response = self.web_client.get("/api/csrf-token/")
		self.assertEqual(csrf_response.status_code, status.HTTP_200_OK)
		csrf_token = csrf_response.cookies["csrftoken"].value

		ok_response = self.web_client.post(
			"/api/login/",
			{"username": "admin_test", "password": "ClaveSegura123!"},
			content_type="application/json",
			HTTP_X_CSRFTOKEN=csrf_token,
		)
		self.assertEqual(ok_response.status_code, status.HTTP_200_OK)
		self.assertEqual(ok_response.json()["rol"], "administrador")

		csrf_response_2 = self.web_client.get("/api/csrf-token/")
		csrf_token_2 = csrf_response_2.cookies["csrftoken"].value
		denied_response = self.web_client.post(
			"/api/login/",
			{"username": "profe_test", "password": "ClaveSegura123!"},
			content_type="application/json",
			HTTP_X_CSRFTOKEN=csrf_token_2,
		)
		self.assertEqual(denied_response.status_code, status.HTTP_403_FORBIDDEN)

	def test_crear_prestamo_y_devolver(self):
		self.client.force_authenticate(user=self.almacenista_user)

		crear_response = self.client.post(
			"/api/prestamos/",
			{
				"instrumento": self.instrumento.id,
				"usuario": self.usuario.id,
				"estado": "enuso",
			},
			format="json",
		)
		self.assertEqual(crear_response.status_code, status.HTTP_201_CREATED)

		prestamo_id = crear_response.json()["id"]
		self.instrumento.refresh_from_db()
		self.assertEqual(self.instrumento.estado, "prestado")

		devolver_response = self.client.post(
			f"/api/prestamos/{prestamo_id}/devolver/",
			{"observacion": "Devolucion de prueba"},
			format="json",
		)
		self.assertEqual(devolver_response.status_code, status.HTTP_200_OK)

		self.instrumento.refresh_from_db()
		prestamo = Prestamo.objects.get(id=prestamo_id)
		self.assertEqual(self.instrumento.estado, "disponible")
		self.assertEqual(prestamo.estado, "disponible")
		self.assertIsNotNone(prestamo.fecha_devolucion)

	def test_reporte_uso_instrumentos(self):
		self.client.force_authenticate(user=self.almacenista_user)

		response = self.client.get("/api/reportes/reporte_uso_instrumentos/")
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn("total_instrumentos", response.json())
		self.assertIn("reportes", response.json())

	def test_login_rechaza_payload_incompleto(self):
		csrf_response = self.web_client.get("/api/csrf-token/")
		csrf_token = csrf_response.cookies["csrftoken"].value

		response = self.web_client.post(
			"/api/login/",
			{"username": "admin_test"},
			content_type="application/json",
			HTTP_X_CSRFTOKEN=csrf_token,
		)
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn("error", response.json())

	def test_login_rechaza_credenciales_invalidas(self):
		csrf_response = self.web_client.get("/api/csrf-token/")
		csrf_token = csrf_response.cookies["csrftoken"].value

		response = self.web_client.post(
			"/api/login/",
			{"username": "admin_test", "password": "incorrecta"},
			content_type="application/json",
			HTTP_X_CSRFTOKEN=csrf_token,
		)
		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_usuario_actual_requiere_autenticacion(self):
		response = self.client.get("/api/usuario-actual/")
		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

	def test_usuario_actual_retorna_datos_en_sesion_activa(self):
		self.client.force_authenticate(user=self.almacenista_user)
		response = self.client.get("/api/usuario-actual/")
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.json()["username"], "almacen_test")
		self.assertEqual(response.json()["rol"], "almacenista")

	def test_logout_es_idempotente(self):
		response_sin_sesion = self.client.post("/api/logout/")
		self.assertEqual(response_sin_sesion.status_code, status.HTTP_200_OK)

		self.client.force_authenticate(user=self.admin_user)
		response_con_sesion = self.client.post("/api/logout/")
		self.assertEqual(response_con_sesion.status_code, status.HTTP_200_OK)

	def test_prestamos_vencidos_retorna_cantidad_correcta(self):
		self.client.force_authenticate(user=self.almacenista_user)
		fecha_pasada = timezone.now().date() - timedelta(days=2)

		Prestamo.objects.create(
			instrumento=self.instrumento,
			usuario=self.usuario,
			estado="enuso",
			fecha_vencimiento=fecha_pasada,
		)

		response = self.client.get("/api/prestamos/vencidos/")
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.json()["cantidad"], 1)

	def test_profesor_no_puede_crear_prestamo(self):
		self.client.force_authenticate(user=self.profesor_user)

		response = self.client.post(
			"/api/prestamos/",
			{
				"instrumento": self.instrumento.id,
				"usuario": self.usuario.id,
				"estado": "enuso",
			},
			format="json",
		)
		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class IntegracionBackendTests(TestCase):
	def setUp(self):
		self.api_client = APIClient()
		self.session_client = Client(enforce_csrf_checks=True)

		self.admin_user = User.objects.create_user(
			username="admin_integracion",
			password="ClaveSegura123!",
			email="admin.int@test.com",
		)
		Perfil.objects.create(user=self.admin_user, rol="administrador")

		self.almacenista_user = User.objects.create_user(
			username="almacen_integracion",
			password="ClaveSegura123!",
			email="almacen.int@test.com",
		)
		Perfil.objects.create(user=self.almacenista_user, rol="almacenista")

		self.categoria = Categoria.objects.create(nombre="Percusion")
		self.instrumento = Instrumento.objects.create(
			nombre="Tambor",
			referencia="PER-001",
			categoria=self.categoria,
			estado="disponible",
		)
		self.usuario = Usuario.objects.create(
			nombre="Carlos Ruiz",
			documento="112233",
			tipo="estudiante",
		)

	def _obtener_csrf(self):
		csrf_response = self.session_client.get("/api/csrf-token/")
		self.assertEqual(csrf_response.status_code, status.HTTP_200_OK)
		return csrf_response.cookies["csrftoken"].value

	def test_flujo_integrado_sesion_csrf_login_usuario_actual_logout(self):
		csrf_token = self._obtener_csrf()

		login_response = self.session_client.post(
			"/api/login/",
			{"username": "almacen_integracion", "password": "ClaveSegura123!"},
			content_type="application/json",
			HTTP_X_CSRFTOKEN=csrf_token,
		)
		self.assertEqual(login_response.status_code, status.HTTP_200_OK)
		self.assertEqual(login_response.json()["rol"], "almacenista")

		usuario_actual_response = self.session_client.get("/api/usuario-actual/")
		self.assertEqual(usuario_actual_response.status_code, status.HTTP_200_OK)
		self.assertEqual(usuario_actual_response.json()["username"], "almacen_integracion")

		csrf_token_sesion = self.session_client.cookies["csrftoken"].value

		logout_response = self.session_client.post(
			"/api/logout/",
			content_type="application/json",
			HTTP_X_CSRFTOKEN=csrf_token_sesion,
		)
		self.assertEqual(logout_response.status_code, status.HTTP_200_OK)

		usuario_actual_post_logout = self.session_client.get("/api/usuario-actual/")
		self.assertNotEqual(usuario_actual_post_logout.status_code, status.HTTP_200_OK)

	def test_permiso_categoria_solo_administrador(self):
		self.api_client.force_authenticate(user=self.almacenista_user)
		response_almacenista = self.api_client.get("/api/categorias/")
		self.assertEqual(response_almacenista.status_code, status.HTTP_403_FORBIDDEN)

		self.api_client.force_authenticate(user=self.admin_user)
		response_admin = self.api_client.get("/api/categorias/")
		self.assertEqual(response_admin.status_code, status.HTTP_200_OK)

	def test_reporte_proximos_a_vencer_filtra_correctamente(self):
		self.api_client.force_authenticate(user=self.almacenista_user)
		hoy = timezone.now().date()

		Prestamo.objects.create(
			instrumento=self.instrumento,
			usuario=self.usuario,
			estado="enuso",
			fecha_vencimiento=hoy + timedelta(days=3),
		)

		instrumento_2 = Instrumento.objects.create(
			nombre="Bombo",
			referencia="PER-002",
			categoria=self.categoria,
			estado="disponible",
		)
		Prestamo.objects.create(
			instrumento=instrumento_2,
			usuario=self.usuario,
			estado="enuso",
			fecha_vencimiento=hoy + timedelta(days=10),
		)

		response = self.api_client.get("/api/prestamos/proximos_a_vencer/")
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.json()["cantidad"], 1)

	def test_exportar_excel_prestamos_retorna_archivo_valido(self):
		self.api_client.force_authenticate(user=self.almacenista_user)
		response = self.api_client.get("/api/prestamos/exportar_excel/")
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(
			response["Content-Type"],
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		)
		self.assertIn("prestamos_reporte.xlsx", response["Content-Disposition"])
		self.assertGreater(len(response.content), 0)

	def test_exportar_reporte_excel_retorna_archivo_valido(self):
		self.api_client.force_authenticate(user=self.almacenista_user)
		response = self.api_client.get("/api/reportes/exportar_reporte_excel/")
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(
			response["Content-Type"],
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		)
		self.assertIn("reporte_completo.xlsx", response["Content-Disposition"])
		self.assertGreater(len(response.content), 0)
