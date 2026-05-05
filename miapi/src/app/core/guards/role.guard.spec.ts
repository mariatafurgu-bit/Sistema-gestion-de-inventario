import { RoleGuard } from './role.guard';
import { vi } from 'vitest';

describe('RoleGuard', () => {
  it('debe permitir acceso cuando el rol del usuario está autorizado', () => {
    const authServiceMock = {
      getCurrentUser: vi.fn(() => ({ username: 'admin', rol: 'administrador' }))
    };
    const routerMock = { navigate: vi.fn() };

    const guard = new RoleGuard(authServiceMock as any, routerMock as any);
    const canActivate = guard.canActivate(['administrador', 'almacenista']);

    expect(canActivate).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('debe redirigir cuando el rol no está autorizado', () => {
    const authServiceMock = {
      getCurrentUser: vi.fn(() => ({ username: 'profe', rol: 'profesor' }))
    };
    const routerMock = { navigate: vi.fn() };

    const guard = new RoleGuard(authServiceMock as any, routerMock as any);
    const canActivate = guard.canActivate(['administrador', 'almacenista']);

    expect(canActivate).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });
});
