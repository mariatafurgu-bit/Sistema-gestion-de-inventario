import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // ✅ Con sesiones: incluir credenciales (cookies) automáticamente
    // Obtener CSRF token de la cookie (Django lo pone en csrftoken)
    const csrfToken = this.getCsrfToken();
    
    // Clonar la solicitud con credenciales
    let clonedRequest = request.clone({
      withCredentials: true,  // Permitir envío de cookies de sesión
    });
    
    // Non-GET requests need CSRF header for Django session auth.
    if (csrfToken && request.method !== 'GET') {
      clonedRequest = clonedRequest.clone({
        setHeaders: {
          'X-CSRFToken': csrfToken
        }
      });
      console.log('🔐 CSRF token enviado en header X-CSRFToken para:', request.method, clonedRequest.url.split('/').pop());
    } else if (!csrfToken && request.method !== 'GET') {
      console.warn('⚠️ NO hay CSRF token en cookies para:', request.method, request.url.split('/').pop());
    }

    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // Manejo de errores de autenticación
        const isAuthEndpoint = this.isAuthEndpoint(error.url || request.url);

        if (error.status === 401 || error.status === 403) {
          console.error('❌ Error 401/403 - Sesión inválida o sin permisos');
          console.error('   URL:', error.url);
          console.error('   Status:', error.status);
          console.error('   Detalle:', error.error?.detail || error.error?.error || error.message);
          console.error('   CSRF token en cookie:', !!csrfToken);

          // Para login/csrf dejamos que el componente de login maneje el mensaje real.
          if (isAuthEndpoint) {
            if ((error.url || request.url).includes('/api/login/')) {
              window.dispatchEvent(new CustomEvent('login-http-error', {
                detail: {
                  status: error.status,
                  message: error.error?.error || error.error?.detail || 'Credenciales inválidas'
                }
              }));
            }
            return throwError(() => error);
          }

          // En 401 sí cerramos sesión (token/cookie inválida o expirada).
          if (error.status === 401) {
            this.authService.logout();
            this.router.navigate(['/login']);
            alert('⚠️ Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
          }

          // En 403 no cerramos sesión automáticamente: puede ser solo falta de permisos.
          if (error.status === 403) {
            console.warn('⚠️ 403 por permisos, se mantiene la sesión activa.');
          }
        } else if (error.status === 0) {
          console.error('❌ Error de conexión - El servidor no está disponible');
          alert('🔌 No se puede conectar al servidor. Verifica que Django esté ejecutándose en http://localhost:8000');
        } else {
          console.error('❌ Error HTTP:', {
            status: error.status,
            statusText: error.statusText,
            message: error.error?.detail || error.message
          });
        }
        
        return throwError(() => error);
      })
    );
  }

  private isAuthEndpoint(url: string): boolean {
    return (
      url.includes('/api/login/') ||
      url.includes('/api/csrf-token/') ||
      url.includes('/api/logout/') ||
      url.includes('/api/usuario-actual/')
    );
  }

  /**
   * Obtiene el CSRF token desde la cookie
   */
  private getCsrfToken(): string | null {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrftoken') {
        return decodeURIComponent(value);
      }
    }
    return null;
  }
}
