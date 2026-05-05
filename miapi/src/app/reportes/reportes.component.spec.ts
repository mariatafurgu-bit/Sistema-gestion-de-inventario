import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ReportesComponent } from './reportes.component';
import { ReporteService } from '../services/reporte.service';

describe('ReportesComponent', () => {
  const reporteServiceMock = {
    getEstadisticasGenerales: vi.fn(() => of({ total_instrumentos: 10 })),
    getReporteUsuariosMorosos: vi.fn(() => of([])),
    getReporteUsoInstrumentos: vi.fn(() => of([])),
    exportarReporteExcel: vi.fn(() => of(new Blob(['ok']))),
    descargarArchivo: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [ReportesComponent],
      providers: [{ provide: ReporteService, useValue: reporteServiceMock }],
    }).compileComponents();
  });

  it('debe crear el componente', () => {
    const fixture = TestBed.createComponent(ReportesComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('debe cargar reportes en ngOnInit', async () => {
    const fixture = TestBed.createComponent(ReportesComponent);
    const component = fixture.componentInstance;

    component.ngOnInit();
    await fixture.whenStable();

    expect(reporteServiceMock.getEstadisticasGenerales).toHaveBeenCalled();
    expect(reporteServiceMock.getReporteUsuariosMorosos).toHaveBeenCalled();
    expect(reporteServiceMock.getReporteUsoInstrumentos).toHaveBeenCalled();
    expect(component.loading).toBe(false);
  });

  it('debe cambiar pestaña seleccionada', () => {
    const fixture = TestBed.createComponent(ReportesComponent);
    const component = fixture.componentInstance;

    component.selectTab('morosos');

    expect(component.selectedTab).toBe('morosos');
  });

  it('debe calcular porcentaje correctamente', () => {
    const fixture = TestBed.createComponent(ReportesComponent);
    const component = fixture.componentInstance;

    expect(component.getPorcentaje(25, 100)).toBe(25);
    expect(component.getPorcentaje(1, 0)).toBe(0);
  });

  it('debe exportar y descargar archivo', () => {
    const fixture = TestBed.createComponent(ReportesComponent);
    const component = fixture.componentInstance;

    component.exportarReporte();

    expect(reporteServiceMock.exportarReporteExcel).toHaveBeenCalled();
    expect(reporteServiceMock.descargarArchivo).toHaveBeenCalled();
  });
});
