import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReporteService } from '../services/reporte.service';
import { Estadisticas } from '../models/reporte.model';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css']
})
export class ReportesComponent implements OnInit {
  estadisticas: Estadisticas | null = null;
  usuariosMorosos: any[] = [];
  usoInstrumentos: any[] = [];
  loading: boolean = true;
  selectedTab: string = 'estadisticas';
  private reporteService = inject(ReporteService);

  ngOnInit(): void {
    this.cargarReportes();
  }

  cargarReportes(): void {
    this.loading = true;

    Promise.all([
      this.cargarEstadisticas(),
      this.cargarUsuariosMorosos(),
      this.cargarUsoInstrumentos()
    ]).then(() => {
      this.loading = false;
    });
  }

  cargarEstadisticas(): Promise<void> {
    return new Promise((resolve) => {
      this.reporteService.getEstadisticasGenerales().subscribe({
        next: (data: Estadisticas) => {
          this.estadisticas = data;
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  cargarUsuariosMorosos(): Promise<void> {
    return new Promise((resolve) => {
      this.reporteService.getReporteUsuariosMorosos().subscribe({
        next: (data: any) => {
          this.usuariosMorosos = data?.results || [];
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  cargarUsoInstrumentos(): Promise<void> {
    return new Promise((resolve) => {
      this.reporteService.getReporteUsoInstrumentos().subscribe({
        next: (data: any) => {
          this.usoInstrumentos = data?.results || [];
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  exportarReporte(): void {
    this.reporteService.exportarReporteExcel().subscribe({
      next: (blob: Blob) => {
        this.reporteService.descargarArchivo(blob, 'Reporte_Inventario.xlsx');
      },
      error: (err: any) => console.error('Error al exportar:', err)
    });
  }

  selectTab(tab: string): void {
    this.selectedTab = tab;
  }

  getPorcentaje(valor: number, total: number): number {
    return total > 0 ? Math.round((valor / total) * 100) : 0;
  }
}
