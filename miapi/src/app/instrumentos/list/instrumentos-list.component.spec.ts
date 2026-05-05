import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { InstrumentosListComponent } from './instrumentos-list.component';
import { InstrumentoService } from '../../services/instrumento.service';

describe('InstrumentosListComponent', () => {
  const instrumentoServiceMock = {
    getCategorias: vi.fn(() => of([{ id: 1, nombre: 'Cuerdas' }])),
    getInstrumentos: vi.fn(() => of([{ id: 1, nombre: 'Violin', referencia: 'V-001', categoria: 1, estado: 'disponible', cantidad: 1 }])),
    crearInstrumento: vi.fn(() => of({})),
    actualizarInstrumento: vi.fn(() => of({})),
    eliminarInstrumento: vi.fn(() => of({})),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [InstrumentosListComponent],
      providers: [{ provide: InstrumentoService, useValue: instrumentoServiceMock }],
    }).compileComponents();
  });

  it('debe crear el componente', () => {
    const fixture = TestBed.createComponent(InstrumentosListComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('debe cargar categorías e instrumentos en ngOnInit', () => {
    const fixture = TestBed.createComponent(InstrumentosListComponent);
    const component = fixture.componentInstance;

    component.ngOnInit();

    expect(instrumentoServiceMock.getCategorias).toHaveBeenCalled();
    expect(instrumentoServiceMock.getInstrumentos).toHaveBeenCalled();
    expect(component.instrumentos.length).toBe(1);
    expect(component.loading).toBe(false);
  });

  it('debe filtrar instrumentos por texto', () => {
    const fixture = TestBed.createComponent(InstrumentosListComponent);
    const component = fixture.componentInstance;

    component.instrumentos = [
      { id: 1, nombre: 'Violin', referencia: 'V-001', categoria: 1, estado: 'disponible', cantidad: 1 },
      { id: 2, nombre: 'Flauta', referencia: 'F-001', categoria: 1, estado: 'prestado', cantidad: 1 }
    ] as any;
    component.searchTerm = 'violin';

    const filtrados = component.filtrarInstrumentos();
    expect(filtrados.length).toBe(1);
    expect(filtrados[0].nombre).toBe('Violin');
  });

  it('debe asignar color de estado correctamente', () => {
    const fixture = TestBed.createComponent(InstrumentosListComponent);
    const component = fixture.componentInstance;

    expect(component.estadoColor('disponible')).toBe('green');
    expect(component.estadoColor('prestado')).toBe('yellow');
    expect(component.estadoColor('otro')).toBe('blue');
  });
});
