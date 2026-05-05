import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User, LoginRequest, LoginResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api';
  private currentUserSubject: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    console.log('🔐 AuthService inicializado (sin localStorage)');
  }

  /**
   * Obtiene el CSRF token del backend
   */
  obtenerCsrfToken(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/csrf-token/`,
      { withCredentials: true }
    )
      .pipe(
        tap(response => {
          console.log('✅ CSRF token recibido');
        })
      );
  }

  /**
   * Realiza el login contra el backend
   * La sesión se mantiene automáticamente en cookies
   */
  login(username: string, password: string): Observable<any> {
    console.log('🔑 Intentando login:', username);
    
    return this.http.post<any>(
      `${this.apiUrl}/login/`, 
      { username, password },
      { withCredentials: true }  // ✅ Incluir cookies de sesión
    )
      .pipe(
        tap(response => {
          const user: User = {
            username: response.username,
            token: '',  // No usamos token con sesiones
            rol: response.rol || 'usuario'
          };
          
          // Guardar en BehaviorSubject (en memoria, no en localStorage)
          this.currentUserSubject.next(user);
          
          console.log('✅ Login exitoso:', {
            usuario: user.username,
            rol: user.rol
          });
        })
      );
  }

  /**
   * Cierra sesión del usuario
   */
  logout(): void {
    console.log('👋 Logout realizado');
    // Limpiar estado local de inmediato para no depender de la respuesta HTTP.
    this.currentUserSubject.next(null);

    this.http.post(`${this.apiUrl}/logout/`, {}, { withCredentials: true })
      .subscribe({
        next: () => {
          console.log('✅ Sesión cerrada en servidor');
        },
        error: (err) => {
          if (err?.status === 401 || err?.status === 403) {
            console.log('ℹ️ Logout sin sesión activa en servidor');
            return;
          }

          console.error('Error al cerrar sesión:', err);
        }
      });
  }

  /**
   * Obtiene el usuario actual desde el servidor
   * Valida que la sesión sea válida
   */
  obtenerUsuarioActual(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/usuario-actual/`,
      { withCredentials: true }
    )
      .pipe(
        tap(response => {
          if (response.is_authenticated) {
            const user: User = {
              username: response.username,
              token: '',
              rol: response.rol || 'usuario'
            };
            this.currentUserSubject.next(user);
            console.log('✅ Usuario actual obtenido:', user.username);
          }
        })
      );
  }

  /**
   * Obtiene el usuario actual desde el BehaviorSubject
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Verifica si el usuario está autenticado
   * Consulta el servidor para validar la sesión
   */
  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  /**
   * Actualiza el usuario actual
   */
  setCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
  }

  /**
   * Getter para obtener token (no usado con sesiones)
   */
  getToken(): string | null {
    return null;  // ✅ No usamos tokens con sesiones
  }

  /**
   * Valida si el token es válido (no usado con sesiones)
   */
  isTokenValid(): boolean {
    return true;  // Con sesiones, la validación ocurre en servidor
  }
}
