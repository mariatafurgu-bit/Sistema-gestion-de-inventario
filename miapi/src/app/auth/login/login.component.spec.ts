import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

describe('LoginComponent', () => {
  const authServiceMock = {
    isAuthenticated: vi.fn(() => false),
    obtenerCsrfToken: vi.fn(() => of({ csrfToken: 'abc' })),
    login: vi.fn(() => of({ username: 'user', rol: 'almacenista' })),
  };

  const routerMock = {
    navigate: vi.fn(() => Promise.resolve(true)),
  };

  beforeEach(async () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.obtenerCsrfToken.mockReturnValue(of({ csrfToken: 'abc' }));
    authServiceMock.login.mockReturnValue(of({ username: 'user', rol: 'almacenista' }));
    routerMock.navigate.mockClear();

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();
  });

  it('debe crear el componente', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('debe navegar al dashboard si ya está autenticado en ngOnInit', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('debe validar username vacío', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;

    component.username = '   ';
    component.validateUsername();

    expect(component.usernameError).toContain('Usuario requerido');
  });

  it('debe alternar visibilidad de contraseña', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;

    expect(component.showPassword).toBe(false);
    component.togglePasswordVisibility();
    expect(component.showPassword).toBe(true);
  });

  it('no debe llamar al login backend cuando formulario es inválido', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;

    component.username = '';
    component.password = '';
    component.login();

    expect(authServiceMock.obtenerCsrfToken).not.toHaveBeenCalled();
    expect(authServiceMock.login).not.toHaveBeenCalled();
    expect(component.formSubmitted).toBe(true);
  });
});
