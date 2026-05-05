import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subject, firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  // Form data
  username: string = '';
  password: string = '';
  
  // UI state
  loading: boolean = false;
  error: string = '';
  success: string = '';
  showPassword: boolean = false;
  usernameError: string = '';
  passwordError: string = '';
  formSubmitted: boolean = false;
  private loginFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private loginHttpErrorHandler: ((event: Event) => void) | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService, 
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
  ) {}

  ngOnInit(): void {
    this.loginHttpErrorHandler = (event: Event) => {
      const customEvent = event as CustomEvent<{ status?: number; message?: string }>;

      this.zone.run(() => {
        this.clearLoginFallbackTimer();
        this.loading = false;
        this.success = '';
        this.error = customEvent.detail?.message || 'Usuario o contraseña incorrecta';
        this.cdr.detectChanges();
      });
    };

    window.addEventListener('login-http-error', this.loginHttpErrorHandler);

    // Si ya está autenticado, ir al dashboard
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnDestroy(): void {
    if (this.loginHttpErrorHandler) {
      window.removeEventListener('login-http-error', this.loginHttpErrorHandler);
    }

    this.clearLoginFallbackTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Valida el username en tiempo real
   */
  validateUsername(): void {
    if (this.loading) {
      this.loading = false;
      this.clearLoginFallbackTimer();
    }

    this.usernameError = '';
    if (!this.username || this.username.trim() === '') {
      this.usernameError = 'Usuario requerido';
      return;
    }
    if (this.username.trim().length < 3) {
      this.usernameError = 'Mínimo 3 caracteres';
      return;
    }
  }

  /**
   * Valida la contraseña en tiempo real
   */
  validatePassword(): void {
    if (this.loading) {
      this.loading = false;
      this.clearLoginFallbackTimer();
    }

    this.passwordError = '';
    if (!this.password) {
      this.passwordError = 'Contraseña requerida';
      return;
    }
    if (this.password.length < 1) {
      this.passwordError = 'Ingresa tu contraseña';
      return;
    }
  }

  /**
   * Verifica si el formulario es válido
   */
  isFormValid(): boolean {
    const usernameValid = !!this.username && this.username.trim().length >= 3;
    const passwordValid = !!this.password && this.password.length > 0;
    return !!(usernameValid && passwordValid);
  }

  /**
   * Realiza la autenticación contra el backend
   */
  login(): void {
    this.executeLogin();
  }

  private async executeLogin(): Promise<void> {
    if (this.loading) {
      return;
    }

    // Limpiar mensajes previos
    this.error = '';
    this.success = '';
    this.formSubmitted = true;
    this.validateUsername();
    this.validatePassword();

    // Validar que el formulario sea válido
    if (!this.isFormValid()) {
      if (!this.usernameError) this.usernameError = 'Usuario requerido';
      if (!this.passwordError) this.passwordError = 'Contraseña requerida';
      return;
    }

    // Iniciar proceso de login
    this.loading = true;

    // Failsafe: evita que la UI quede bloqueada si alguna capa no finaliza correctamente.
    this.clearLoginFallbackTimer();
    this.loginFallbackTimer = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.error = '⏱️ No se pudo completar el login. Verifica credenciales e intenta nuevamente.';
      }
    }, 20000);

    try {
      await firstValueFrom(
        this.authService.obtenerCsrfToken().pipe(timeout(15000))
      );

      const response = await firstValueFrom(
        this.authService.login(this.username.trim(), this.password).pipe(timeout(15000))
      );

      this.success = '✅ Autenticación exitosa. Redirigiendo al dashboard...';
      console.log('✅ Login exitoso:', response.username, 'rol:', response.rol);

      setTimeout(() => {
        this.redirectByRole(response?.rol);
      }, 300);
    } catch (err: any) {
      this.handleLoginError(err);
    } finally {
      this.clearLoginFallbackTimer();
      this.loading = false;
      this.cdr.detectChanges();
    }
  }


  /**
   * Maneja errores de autenticación
   */
  private handleLoginError(err: any): void {
    // Limpiar éxito si hay error
    this.success = '';

    if (err?.name === 'TimeoutError') {
      this.error = '⏱️ El servidor tardó demasiado en responder. Intenta de nuevo.';
      return;
    }

    // Mapear errores por código HTTP
    if (err.status === 0) {
      this.error = '🔌 Sin conexión al servidor. ¿Django está corriendo?';
    } else if (err.status === 400) {
      const detail = err.error?.detail || '';
      if (detail.toLowerCase().includes('username')) {
        this.error = '❌ Usuario no existe en el sistema';
      } else if (detail.toLowerCase().includes('password')) {
        this.error = '❌ Contraseña incorrecta';
      } else {
        this.error = detail || '❌ Datos inválidos';
      }
    } else if (err.status === 401) {
      this.error = err.error?.error || 'Usuario o contraseña incorrecta';
    } else if (err.status === 403) {
      this.error = 'Acceso denegado';
    } else if (err.status === 404) {
      this.error = '❌ Usuario no encontrado';
    } else if (err.status === 429) {
      this.error = '⏱️ Demasiados intentos. Espera e intenta después';
    } else if (err.status >= 500) {
      this.error = '⚠️ Error en el servidor. Intenta más tarde';
    } else {
      this.error = `❌ Error: ${err.error?.detail || err.statusText || 'Desconocido'}`;
    }
  }

  /**
   * Alterna visibilidad de contraseña
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Maneja Enter en los inputs
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.loading && this.isFormValid()) {
      event.preventDefault();
      this.login();
    }
  }

  /**
   * Limpia el formulario
   */
  resetForm(): void {
    this.username = '';
    this.password = '';
    this.error = '';
    this.success = '';
    this.usernameError = '';
    this.passwordError = '';
    this.formSubmitted = false;
    this.showPassword = false;
  }

  private clearLoginFallbackTimer(): void {
    if (this.loginFallbackTimer) {
      clearTimeout(this.loginFallbackTimer);
      this.loginFallbackTimer = null;
    }
  }

  private redirectByRole(role: string | undefined): void {
    if (role === 'almacenista') {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.router.navigate(['/dashboard']);
  }
}

