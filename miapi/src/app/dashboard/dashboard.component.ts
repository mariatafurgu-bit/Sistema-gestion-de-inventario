import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule  } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { InstrumentoService } from '../services/instrumento.service';
import { PrestamoService } from '../services/prestamo.service';

declare global {
  interface Window {
    dashboard?: DashboardComponent;
  }
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: any;
  historialMovimientos: any[] = [];
  historialInstrumentoNombre: string = '';
  historialLoading: boolean = false;
  instrumentoParaBaja: any = null;
  categorias: any[] = [];
  instrumentForm = this.getEmptyInstrumentForm();
  
  // Data Storage
  instruments: any[] = [];
  loans: any[] = [];
  editingInstrumentId: string | null = null;
  returningLoan: any = null;
  
  // Bloquear reintentos infinitos
  private isLoadingData = false;
  private loadAttempts = 0;
  private maxLoadAttempts = 1;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private instrumentoService: InstrumentoService,
    private prestamoService: PrestamoService
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    window.dashboard = this;

    // Validate session on load; redirects if session is invalid.
    this.authService.obtenerUsuarioActual().subscribe({
      next: (userData) => {
        this.currentUser = userData;
        console.log('✅ Usuario actual cargado:', this.currentUser.username, 'Rol:', this.currentUser.rol);
        
        // Continuar con carga de datos
        this.loadData();
        this.renderDashboard();
      },
      error: (err) => {
        console.error('❌ No se pudo obtener usuario actual:', err);
        if (err.status === 401) {
          console.error('   Sesión inválida o expirada');
          this.authService.logout();
          this.router.navigate(['/login']);
        } else {
          this.showAlert('error', 'Error de Autenticación', 'No se pudo verificar tu sesión. Inicia sesión nuevamente.');
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (window.dashboard === this) {
      window.dashboard = undefined;
    }
  }

  // ==================
  // DATA MANAGEMENT
  // ==================

  loadData(): void {
    // Evitar bucle infinito de peticiones
    if (this.isLoadingData) {
      console.warn('⚠️ loadData() ya está en progreso, ignorando nueva solicitud');
      return;
    }

    // ✅ Con sesiones, no necesitamos verificar token
    // La sesión se valida automáticamente en el servidor

    this.isLoadingData = true;
    this.loadAttempts++;

    console.log('📡 Cargando instrumentos desde API... (intento ' + this.loadAttempts + ')');
    // Categorías solo se requieren para el formulario de alta (solo administrador).
    if (this.isAdmin()) {
      this.instrumentoService.getCategorias().subscribe({
        next: (response: any) => {
          this.categorias = response.results || response || [];
        },
        error: (err) => {
          console.error('❌ Error cargando categorías:', err);
        }
      });
    }

    // Cargar instrumentos desde la base de datos
    this.instrumentoService.getInstrumentos().subscribe({
      next: (response: any) => {
        console.log('✅ Instrumentos cargados:', response);
        this.instruments = response.results || response || [];
        this.renderDashboard();
        this.isLoadingData = false;
      },
      error: (err) => {
        console.error('❌ Error cargando instrumentos:', err);
        this.isLoadingData = false;
        
        if (err.status === 403) {
          console.error('🔐 Sesión inválida o sin permisos');
          
          this.showAlert('error', 'Acceso Denegado', 'Tu sesión ha expirado o no tienes permisos suficientes.');
          
          setTimeout(() => {
            this.authService.logout();
            this.router.navigate(['/login']);
          }, 2000);
        } else if (err.status === 0) {
          this.showAlert('error', 'Error de Conexión', 'No se puede conectar a http://localhost:8000');
        } else {
          this.showAlert('error', 'Error al cargar instrumentos', err.error?.detail || 'Intenta de nuevo');
        }
      }
    });

    console.log('📡 Cargando préstamos desde API...');
    // Cargar préstamos desde la base de datos
    this.prestamoService.getPrestamos().subscribe({
      next: (response: any) => {
        console.log('✅ Préstamos cargados:', response);
        this.loans = response.results || response || [];
        this.renderAlerts();
        this.renderLoans();
        this.renderLoanHistory();
      },
      error: (err) => {
        console.error('❌ Error cargando préstamos:', err);
        
        if (err.status === 403) {
          console.error('🔐 Préstamos: Sesión inválida o sin permisos');
        } else if (err.status === 0) {
          console.error('🔌 No se puede conectar al servidor');
        } else {
          this.showAlert('error', 'Error al cargar préstamos', err.error?.detail || 'Intenta de nuevo');
        }
      }
    });
  }

  private showAlert(type: string, title: string, message: string): void {
    const alertsPanel = document.getElementById('alertsPanel');
    if (!alertsPanel) return;
    
    const alertClass = type === 'error' ? 'alert-danger' : type === 'warning' ? 'alert-warning' : 'alert-info';
    const alertHTML = `
      <div class="alerts-panel">
        <div class="alerts-header">
          ${type === 'error' ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>' : ''}
          ${title}
        </div>
        <div class="alert-item ${alertClass}">
          <p>${message}</p>
        </div>
      </div>
    `;
    alertsPanel.innerHTML = alertHTML;
  }

  // ==================
  // DASHBOARD RENDERING
  // ==================

  renderDashboard(): void {
    this.renderStats();
    this.renderAlerts();
    this.renderInstruments();
    this.renderLoans();
    this.renderLoanHistory();
  }

  renderStats(): void {
    const total = this.instruments.length;
    const disponibles = this.instruments.filter(i => i.estado === 'disponible').length;
    const enUso = this.instruments.filter(i => i.estado === 'prestado').length;
    const enReparacion = this.instruments.filter(i => i.estado === 'mantenimiento').length;

    const stats = [
      { label: 'Total Instrumentos', value: total, color: 'blue', icon: 'package' },
      { label: 'Disponibles', value: disponibles, color: 'green', icon: 'check' },
      { label: 'En Uso', value: enUso, color: 'yellow', icon: 'alert' },
      { label: 'En Reparación', value: enReparacion, color: 'red', icon: 'wrench' }
    ];

    const icons: any = {
      package: '<path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>',
      check: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
      alert: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>',
      wrench: '<path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>'
    };

    const html = stats.map(stat => `
      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-info">
            <p>${stat.label}</p>
            <p class="stat-value stat-${stat.color}">${stat.value}</p>
          </div>
          <div class="stat-icon bg-${stat.color}">
            <svg class="stat-${stat.color}" viewBox="0 0 24 24" fill="currentColor">
              ${icons[stat.icon]}
            </svg>
          </div>
        </div>
      </div>
    `).join('');

    const grid = document.getElementById('statsGrid');
    if (grid) grid.innerHTML = html;
  }

  renderAlerts(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeLoans = this.loans.filter((l: any) => l.estado === 'enuso');
    const alerts: any[] = [];

    activeLoans.forEach((loan: any) => {
      if (!loan.fecha_vencimiento) return;
      
      const dueDate = this.parseDateOnly(loan.fecha_vencimiento);
      dueDate.setHours(0, 0, 0, 0);
      
      const instrumentName = loan.instrumento_nombre || 'Instrumento';
      const userName = loan.usuario_nombre || 'Usuario';
      
      if (dueDate < today) {
        const days = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({
          type: 'danger',
          title: `Préstamo Vencido - ${days} días de retraso`,
          text: `${userName} - ${instrumentName}`,
          date: `Fecha límite: ${this.formatDate(loan.fecha_vencimiento)}`
        });
      } else if (dueDate.getTime() === today.getTime()) {
        alerts.push({
          type: 'warning',
          title: 'Vence Hoy',
          text: `${userName} - ${instrumentName}`
        });
      } else {
        const threeDays = new Date(today);
        threeDays.setDate(today.getDate() + 3);
        if (dueDate <= threeDays) {
          alerts.push({
            type: 'info',
            title: 'Próximo a Vencer',
            text: `${userName} - ${instrumentName}`,
            date: `Fecha límite: ${this.formatDate(loan.fecha_vencimiento)}`
          });
        }
      }
    });

    const panel = document.getElementById('alertsPanel');
    if (!panel) return;

    if (alerts.length === 0) {
      panel.innerHTML = '';
      return;
    }

    panel.innerHTML = `
      <div class="alerts-panel">
        <div class="alerts-header">
          <i class="bi bi-bell"></i>
          <span>Alertas de Devolución (${alerts.length})</span>
        </div>
        ${alerts.map(alert => `
          <div class="alert-item alert-${alert.type}">
            <i class="bi ${alert.type === 'danger' ? 'bi-exclamation-triangle' : 'bi-clock-history'}"></i>
            <div class="alert-content">
              <p>${alert.title}</p>
              <p>${alert.text}</p>
              ${alert.date ? `<p style="font-size: 0.75rem; margin-top: 0.25rem;">${alert.date}</p>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderInstruments(): void {
    const grid = document.getElementById('instrumentsGrid');
    if (!grid) return;
    
    if (this.instruments.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 18V5l12-2v13M9 9l12-2"/>
          </svg>
          <h3>No hay instrumentos registrados</h3>
          <p>Comienza registrando tu primer instrumento</p>
        </div>
      `;
      return;
    }

    const canViewHistory = this.isAdmin();
    const canManageLoans = this.isAdmin() || this.isStorekeeper();

    grid.innerHTML = this.instruments.map((inst: any) => {
      const badgeClass = this.getBadgeClass(inst.estado);
      const estadoLabel = this.getEstadoLabel(inst.estado);
      const referencia = inst.referencia || inst.codigo || 'N/A';
      const categoria = inst.categoria_nombre || this.getCategoriaNombre(inst.categoria) || 'Sin categoría';
      const ubicacion = inst.ubicacion_fisica || 'Sin ubicación';
      const valorReemplazo = inst.valor_reemplazo;
      const fechaAdquisicion = inst.fecha_adquisicion ? this.formatDate(inst.fecha_adquisicion) : 'Sin fecha';
      const numeroSerie = inst.numero_serie || inst.numeroSerie || 'N/A';

      const conditionColors: Record<string, string> = {
        'Excelente': '#16A34A',
        'Buena': '#2563EB',
        'Regular': '#CA8A04',
        'Requiere Reparación': '#DC2626'
      };

      return `
        <div class="instrument-card">
          <div class="instrument-header">
            <div class="instrument-title">
              <div class="instrument-name">
                <h3>${inst.nombre}</h3>
                <span class="badge ${badgeClass}">${estadoLabel}</span>
              </div>
              <p class="instrument-code">Código: ${referencia}</p>
            </div>
            <div class="instrument-actions">
              ${canViewHistory ? `
              <button class="btn-icon btn-history" onclick="dashboard.openHistoryModal('${inst.id}')" title="Ver historial">
                <i class="bi bi-clock-history"></i>
              </button>
              ` : ''}
              <button class="btn-icon btn-edit" onclick="dashboard.editInstrument('${inst.id}')" title="Editar">
                <i class="bi bi-pencil"></i>
              </button>
              ${(this.isAdmin() && inst.estado !== 'baja' && inst.estado !== 'prestado') ? `
              <button class="btn-icon btn-delete" onclick="dashboard.openDarBajaModal('${inst.id}')" title="Dar de baja">
                <i class="bi bi-trash"></i>
              </button>
              ` : ''}
            </div>
          </div>

          <div class="instrument-details">
            <div class="detail-item">
              <p class="detail-label">Categoría</p>
              <p class="detail-value">${categoria}</p>
            </div>
            <div class="detail-item">
              <p class="detail-label">Marca / Modelo</p>
              <p class="detail-value">${inst.marca || ''} ${inst.modelo || ''}</p>
            </div>
            <div class="detail-item">
              <p class="detail-label">Cantidad</p>
              <p class="detail-value">${inst.cantidad ?? 1}</p>
            </div>
            <div class="detail-item">
              <p class="detail-label">No. Serie</p>
              <p class="detail-value">${numeroSerie}</p>
            </div>
            <div class="detail-item">
              <p class="detail-label">Condición</p>
              <p class="detail-value" style="color: ${conditionColors[inst.condicion] || '#374151'}">${inst.condicion || 'Sin dato'}</p>
            </div>
            <div class="detail-item">
              <p class="detail-label">Valor de reemplazo</p>
              <p class="detail-value">${valorReemplazo ?? 'Sin dato'}</p>
            </div>
            <div class="detail-item">
              <p class="detail-label">Fecha de adquisición</p>
              <p class="detail-value">${fechaAdquisicion}</p>
            </div>
          </div>

          <div class="instrument-info">
            <div class="info-row">
              <i class="bi bi-geo-alt"></i>
              <span>${ubicacion}</span>
            </div>
          </div>

          ${inst.observaciones ? `
            <div class="instrument-observations">
              <p class="observations-label">Observaciones</p>
              <p class="observations-text">${inst.observaciones}</p>
            </div>
          ` : ''}

          ${(canManageLoans && inst.estado === 'prestado') ? `
            <div class="instrument-loan-action">
              <button class="btn-return" onclick="dashboard.returnInstrumentFromCard('${inst.id}')">
                <i class="bi bi-arrow-return-left"></i>
                Registrar devolución
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  renderLoans(): void {
    const activeLoans = this.loans.filter((l: any) => l.estado === 'enuso');
    const container = document.getElementById('loansList');
    if (!container) return;

    if (activeLoans.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <h3>No hay préstamos activos</h3>
          <p>Todos los instrumentos han sido devueltos</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="loans-list">
        <div class="loans-header">Préstamos Activos (${activeLoans.length})</div>
        ${activeLoans.map((loan: any) => `
          <div class="loan-item">
            <div class="loan-details">
              <h4>${loan.instrumento_nombre || 'Instrumento'} <span style="color: #6B7280; font-weight: normal;">(${loan.instrumento_referencia || 'N/A'})</span></h4>
              <p><strong>Usuario:</strong> ${loan.usuario_nombre || 'N/A'}</p>
              <p><strong>Documento:</strong> ${loan.usuario_documento || 'N/A'}</p>
              <p><strong>Fecha de Préstamo:</strong> ${this.formatDate(loan.fecha_prestamo)}</p>
              ${loan.fecha_vencimiento ? `<p><strong>Devolución Estimada:</strong> ${this.formatDate(loan.fecha_vencimiento)}</p>` : ''}
            </div>
            <button class="btn-return" onclick="dashboard.openReturnForm('${loan.id}')">
              <i class="bi bi-arrow-return-left"></i>
              Devolver
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderLoanHistory(): void {
    const container = document.getElementById('loanHistoryList');
    if (!container || !this.isAdmin()) return;

    const sortedHistory = [...this.loans].sort((a: any, b: any) => {
      const fechaA = this.parseDateOnly(a.fecha_devolucion || a.fecha_prestamo || '').getTime();
      const fechaB = this.parseDateOnly(b.fecha_devolucion || b.fecha_prestamo || '').getTime();
      return fechaB - fechaA;
    });

    if (sortedHistory.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
          </svg>
          <h3>Sin historial de movimientos</h3>
          <p>Aún no hay préstamos ni devoluciones registradas</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="history-list">
        <div class="loans-header">Historial de Préstamos y Devoluciones (${sortedHistory.length})</div>
        ${sortedHistory.map((loan: any) => {
          const isActive = loan.estado === 'enuso';
          const movementLabel = isActive ? 'Préstamo Activo' : 'Devuelto';
          const movementClass = isActive ? 'history-active' : 'history-returned';
          const movementDate = isActive
            ? this.formatDate(loan.fecha_prestamo)
            : this.formatDate(loan.fecha_devolucion || loan.fecha_prestamo);

          return `
            <div class="loan-item history-item-row">
              <div class="loan-details">
                <h4>${loan.instrumento_nombre || 'Instrumento'} <span style="color: #6B7280; font-weight: normal;">(${loan.instrumento_referencia || 'N/A'})</span></h4>
                <p><strong>Usuario:</strong> ${loan.usuario_nombre || 'N/A'} - <strong>Documento:</strong> ${loan.usuario_documento || 'N/A'}</p>
                <p><strong>Fecha préstamo:</strong> ${this.formatDate(loan.fecha_prestamo)}</p>
                ${loan.fecha_devolucion ? `<p><strong>Fecha devolución:</strong> ${this.formatDate(loan.fecha_devolucion)}</p>` : ''}
              </div>
              <span class="history-status ${movementClass}">${movementLabel} · ${movementDate}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ==================
  // UI INTERACTIONS
  // ==================

  toggleDropdown(): void {
    const menu = document.getElementById('dropdownMenu');
    if (menu) menu.classList.toggle('active');
  }

  switchTab(tab: string): void {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(t => t.classList.remove('active'));
    (event?.target as HTMLElement)?.classList.add('active');

    const instContent = document.getElementById('instrumentsContent');
    const loansContent = document.getElementById('loansContent');
    const historyContent = document.getElementById('historyContent');
    const searchSection = document.getElementById('instrumentsSearch');

    if (tab === 'instruments') {
      if (instContent) instContent.classList.remove('hidden');
      if (loansContent) loansContent.classList.add('hidden');
      if (historyContent) historyContent.classList.add('hidden');
      if (searchSection) (searchSection as HTMLElement).style.display = 'block';
    } else if (tab === 'loans') {
      if (instContent) instContent.classList.add('hidden');
      if (loansContent) loansContent.classList.remove('hidden');
      if (historyContent) historyContent.classList.add('hidden');
      if (searchSection) (searchSection as HTMLElement).style.display = 'none';
    } else {
      if (instContent) instContent.classList.add('hidden');
      if (loansContent) loansContent.classList.add('hidden');
      if (historyContent) historyContent.classList.remove('hidden');
      if (searchSection) (searchSection as HTMLElement).style.display = 'none';
    }
  }

  toggleFilters(): void {
    const panel = document.getElementById('filtersPanel');
    const button = document.getElementById('filterToggle');
    
    if (panel && button) {
      if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        (button as HTMLElement).style.background = '#2563EB';
        (button as HTMLElement).style.color = 'white';
      } else {
        panel.classList.add('hidden');
        (button as HTMLElement).style.background = '';
        (button as HTMLElement).style.color = '';
      }
    }
  }

  filterInstruments(): void {
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const filterCategoria = document.getElementById('filterCategoria') as HTMLSelectElement;
    const filterEstado = document.getElementById('filterEstado') as HTMLSelectElement;
    const filterCondicion = document.getElementById('filterCondicion') as HTMLSelectElement;
    
    const search = searchInput?.value.toLowerCase() || '';
    const categoria = filterCategoria?.value || '';
    const estado = filterEstado?.value || '';
    const condicion = filterCondicion?.value || '';

    const filtered = this.instruments.filter((inst: any) => {
      const referencia = (inst.referencia || inst.codigo || '').toString().toLowerCase();
      const numeroSerie = (inst.numero_serie || inst.numeroSerie || '').toString().toLowerCase();
      const marca = (inst.marca || '').toString().toLowerCase();
      const nombre = (inst.nombre || '').toString().toLowerCase();
      const categoriaNombre = (inst.categoria_nombre || inst.categoria || '').toString();
      const matchesSearch = 
        nombre.includes(search) ||
        referencia.includes(search) ||
        marca.includes(search) ||
        numeroSerie.includes(search);
      
      return matchesSearch && (!categoria || categoriaNombre === categoria) && 
             (!estado || inst.estado === estado) && (!condicion || inst.condicion === condicion);
    });
    
    const grid = document.getElementById('instrumentsGrid');
    const temp = this.instruments;
    this.instruments = filtered;
    this.renderInstruments();
    this.instruments = temp;
  }

  clearFilters(): void {
    const filterCategoria = document.getElementById('filterCategoria') as HTMLSelectElement;
    const filterEstado = document.getElementById('filterEstado') as HTMLSelectElement;
    const filterCondicion = document.getElementById('filterCondicion') as HTMLSelectElement;
    
    if (filterCategoria) filterCategoria.value = '';
    if (filterEstado) filterEstado.value = '';
    if (filterCondicion) filterCondicion.value = '';
    
    this.filterInstruments();
  }

  exportCSV(): void {
    // Client-side export for the current instrument list.
    const headers = ['Código', 'Nombre', 'Categoría', 'Marca', 'Modelo', 'No. Serie', 'Estado', 'Condición', 'Ubicación'];
    const rows = this.instruments.map((i: any) => [
      i.referencia || i.codigo || '',
      i.nombre || '',
      i.categoria_nombre || i.categoria || '',
      i.marca || '',
      i.modelo || '',
      i.numero_serie || i.numeroSerie || '',
      this.getEstadoLabel(i.estado),
      i.condicion || '',
      i.ubicacion_fisica || i.ubicacion || ''
    ]);
    const delimiter = ';';
    const escapeCell = (value: unknown): string => {
      const text = String(value ?? '').replace(/\r?\n/g, ' ');
      const escaped = text.replace(/"/g, '""');
      return `"${escaped}"`;
    };
    const csv = [headers, ...rows]
      .map(row => row.map(escapeCell).join(delimiter))
      .join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario-conservatorio-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  openHistoryModal(id: string): void {
    if (!this.isAdmin()) {
      this.showAlert('error', 'Acceso Denegado', 'Solo administrador puede ver el historial.');
      return;
    }

    const instrumentId = parseInt(id, 10);
    const instrumento = this.instruments.find(i => Number(i.id) === instrumentId);

    this.historialInstrumentoNombre = instrumento?.nombre || `Instrumento #${id}`;
    this.historialMovimientos = [];
    this.historialLoading = true;

    const modal = document.getElementById('historyModal');
    if (modal) {
      modal.classList.add('active');
    }

    this.instrumentoService.obtenerHistorial(instrumentId).subscribe({
      next: (historial: any) => {
        this.historialMovimientos = Array.isArray(historial) ? historial : [];
        this.historialLoading = false;
      },
      error: (err) => {
        console.error('Error cargando historial:', err);
        this.historialLoading = false;
        this.showAlert('error', 'Error', 'No se pudo cargar el historial del instrumento.');
      }
    });
  }

  closeHistoryModal(): void {
    const modal = document.getElementById('historyModal');
    if (modal) {
      modal.classList.remove('active');
    }
    this.historialMovimientos = [];
    this.historialInstrumentoNombre = '';
    this.historialLoading = false;
  }

  formatearFecha(fecha?: string): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleString('es-CO');
  }

  openInstrumentForm(): void {
    // ✅ Validar permiso: solo administrador puede crear instrumentos
    if (!this.isAdmin()) {
      this.showAlert('error', 'Acceso Denegado', 'Solo administrador puede crear instrumentos');
      return;
    }

    this.editingInstrumentId = null;
    this.instrumentForm = this.getEmptyInstrumentForm();

    const title = document.getElementById('instrumentModalTitle');
    const modal = document.getElementById('instrumentModal');
    if (title) title.textContent = 'Registrar Nuevo Instrumento';
    this.cdr.detectChanges();
    if (modal) {
      setTimeout(() => modal.classList.add('active'), 0);
    }
  }

  editInstrument(id: string): void {
    this.editingInstrumentId = id;
    const idNum = Number(id);
    const inst = this.instruments.find(i => Number(i.id) === idNum);
    if (!inst) {
      this.showAlert('error', 'Instrumento no encontrado', 'No se pudo cargar el instrumento seleccionado.');
      return;
    }
    const title = document.getElementById('instrumentModalTitle');
    if (title) title.textContent = 'Editar Instrumento';
    this.instrumentForm = {
      codigo: inst.referencia || inst.codigo || '',
      nombre: inst.nombre || '',
      categoria: inst.categoria || '',
      marca: inst.marca || '',
      modelo: inst.modelo || '',
      numeroSerie: inst.numero_serie || inst.numeroSerie || '',
      fechaAdquisicion: inst.fecha_adquisicion || '',
      valorAdquisicion: inst.valor_reemplazo ?? null,
      estado: inst.estado || 'disponible',
      condicion: inst.condicion || '',
      cantidad: inst.cantidad ?? 1,
      ubicacion: inst.ubicacion_fisica || inst.ubicacion || '',
      observaciones: inst.observaciones || ''
    };
    const modal = document.getElementById('instrumentModal');
    this.cdr.detectChanges();
    if (modal) {
      setTimeout(() => modal.classList.add('active'), 0);
    }
  }

  closeInstrumentForm(): void {
    const modal = document.getElementById('instrumentModal');
    if (modal) modal.classList.remove('active');
  }

  saveInstrument(event: Event): void {
    event.preventDefault();
    const referencia = this.instrumentForm.codigo.trim();
    const categoriaId = Number(this.instrumentForm.categoria);
    const ubicacion = this.instrumentForm.ubicacion.trim();
    const valorReemplazoRaw = this.instrumentForm.valorAdquisicion;
    const valorReemplazo = valorReemplazoRaw === '' || valorReemplazoRaw === null || valorReemplazoRaw === undefined
      ? null
      : Number(valorReemplazoRaw);
    const cantidadRaw = Number(this.instrumentForm.cantidad);
    const cantidad = Number.isFinite(cantidadRaw) && cantidadRaw > 0 ? cantidadRaw : 1;
    const estado = (this.instrumentForm.estado || 'disponible').trim();
    const condicion = (this.instrumentForm.condicion || '').trim();
    const numeroSerie = (this.instrumentForm.numeroSerie || '').trim();
    const observaciones = (this.instrumentForm.observaciones || '').trim();
    const payload: any = {
      referencia,
      nombre: this.instrumentForm.nombre.trim(),
      categoria: categoriaId,
      marca: this.instrumentForm.marca.trim() || null,
      modelo: this.instrumentForm.modelo.trim() || null,
      fecha_adquisicion: this.instrumentForm.fechaAdquisicion || null,
      cantidad,
      ubicacion_fisica: ubicacion || null,
      valor_reemplazo: Number.isFinite(valorReemplazo as number) ? valorReemplazo : null,
      estado,
      condicion: condicion || null,
      numero_serie: numeroSerie || null,
      observaciones: observaciones || null
    };

    if (!payload.nombre || !payload.referencia || !payload.categoria) {
      this.showAlert('error', 'Campos requeridos', 'Nombre, código y categoría son obligatorios.');
      return;
    }

    if (this.editingInstrumentId) {
      // Actualizar instrumento existente
      this.instrumentoService.actualizarInstrumento(parseInt(this.editingInstrumentId), payload).subscribe({
        next: (response) => {
          this.showAlert('success', 'Éxito', 'Instrumento actualizado correctamente');
          this.loadData();
          this.closeInstrumentForm();
        },
        error: (err) => {
          console.error('Error actualizando instrumento:', err);
          this.showAlert('error', 'Error', this.getApiErrorMessage(err, 'No se pudo actualizar el instrumento'));
        }
      });
    } else {
      // Crear nuevo instrumento
      this.instrumentoService.crearInstrumento(payload).subscribe({
        next: (response) => {
          this.showAlert('success', 'Éxito', 'Instrumento registrado correctamente');
          this.loadData();
          this.closeInstrumentForm();
        },
        error: (err) => {
          console.error('Error creando instrumento:', err);
          this.showAlert('error', 'Error', this.getApiErrorMessage(err, 'No se pudo registrar el instrumento'));
        }
      });
    }
  }

  private getApiErrorMessage(err: any, fallback: string): string {
    const apiError = err?.error;

    if (!apiError) return fallback;
    if (typeof apiError === 'string') return apiError;

    const entries = Object.entries(apiError)
      .map(([key, value]) => {
        const valueText = Array.isArray(value) ? value.join(', ') : String(value);
        return `${key}: ${valueText}`;
      });

    return entries.length ? entries.join(' | ') : fallback;
  }

  deleteInstrument(id: string): void {
    if (confirm('¿Está seguro que desea eliminar este instrumento?')) {
      this.instrumentoService.eliminarInstrumento(parseInt(id)).subscribe({
        next: () => {
          this.showAlert('success', 'Éxito', 'Instrumento eliminado correctamente');
          this.loadData();
        },
        error: (err) => {
          console.error('Error eliminando instrumento:', err);
          this.showAlert('error', 'Error', 'No se pudo eliminar el instrumento');
        }
      });
    }
  }

  openLoanForm(): void {
    const select = document.getElementById('loanInstrumentSelect') as HTMLSelectElement;
    const available = this.instruments.filter(i => i.estado === 'disponible');
    if (select) select.innerHTML = '<option>Seleccione instrumento</option>' + available.map(i => `<option value="${i.id}">${i.nombre} (${i.referencia || i.codigo || 'N/A'})</option>`).join('');
    this.clearLoanModalError();
    const modal = document.getElementById('loanModal');
    if (modal) modal.classList.add('active');
  }

  openDarBajaModal(instrumentId: string): void {
    if (!this.isAdmin()) {
      this.showAlert('error', 'Acceso Denegado', 'Solo administrador puede dar de baja instrumentos.');
      return;
    }

    const idNum = parseInt(instrumentId, 10);
    this.instrumentoParaBaja = this.instruments.find(i => Number(i.id) === idNum) || null;

    const modal = document.getElementById('darBajaModal');
    if (modal) {
      this.cdr.detectChanges();
      setTimeout(() => modal.classList.add('active'), 0);
    }

    this.instrumentoService.getInstrumento(idNum).subscribe({
      next: (instrumento: any) => {
        this.instrumentoParaBaja = instrumento;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando instrumento para baja:', err);
      }
    });
  }

  closeDarBajaModal(): void {
    const modal = document.getElementById('darBajaModal');
    if (modal) modal.classList.remove('active');
    this.instrumentoParaBaja = null;
  }

  submitDarBaja(event: Event): void {
    event.preventDefault();

    if (!this.instrumentoParaBaja) return;

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const observacion = (formData.get('observacion') as string) || 'Instrumento dado de baja por administrador';

    this.instrumentoService.darDeBaja(Number(this.instrumentoParaBaja.id), observacion).subscribe({
      next: () => {
        this.showAlert('success', 'Éxito', 'Instrumento dado de baja correctamente.');
        this.closeDarBajaModal();
        this.loadData();
      },
      error: (err) => {
        console.error('Error al dar de baja:', err);
        this.showAlert('error', 'Error', err.error?.error || 'No se pudo dar de baja el instrumento.');
      }
    });
  }

  closeLoanForm(): void {
    const modal = document.getElementById('loanModal');
    if (modal) modal.classList.remove('active');
    this.clearLoanModalError();
  }

  saveLoan(event: Event): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const instrumentId = Number(formData.get('instrumentoId'));
    const estudianteNombre = String(formData.get('estudianteNombre') || '').trim();
    const estudianteDocumento = String(formData.get('estudianteIdentificacion') || '').trim();
    const fechaPrestamo = String(formData.get('fechaPrestamo') || '').trim();
    const fechaVencimiento = String(formData.get('fechaDevolucionEstimada') || '').trim();
    const observaciones = String(formData.get('observaciones') || '').trim();

    this.clearLoanModalError();

    if (!instrumentId || !estudianteNombre || !estudianteDocumento || !fechaPrestamo) {
      this.showLoanModalError('Completa los campos obligatorios para registrar el préstamo.');
      return;
    }

    this.prestamoService.getUsuarios(estudianteDocumento).subscribe({
      next: (data: any) => {
        const usuarios = Array.isArray(data) ? data : data?.results || [];
        const existente = usuarios.find((u: any) => String(u.documento) === estudianteDocumento);

        const crearPrestamoConUsuario = (usuarioId: number) => {
          const loanPayload: any = {
            instrumento: instrumentId,
            usuario: usuarioId,
            fecha_prestamo: fechaPrestamo,
            fecha_vencimiento: fechaVencimiento || null,
            estado: 'enuso',
            observaciones
          };

          this.prestamoService.crearPrestamo(loanPayload).subscribe({
            next: () => {
              this.showAlert('success', 'Éxito', 'Préstamo registrado correctamente');
              form.reset();
              this.loadData();
              this.closeLoanForm();
            },
            error: (err) => {
              console.error('Error creando préstamo:', err);
              this.showLoanModalError(this.getApiErrorMessage(err, 'No se pudo registrar el préstamo.'));
            }
          });
        };

        if (existente?.id) {
          crearPrestamoConUsuario(Number(existente.id));
          return;
        }

        this.prestamoService.crearUsuario({
          nombre: estudianteNombre,
          documento: estudianteDocumento,
          tipo: 'estudiante'
        } as any).subscribe({
          next: (nuevoUsuario: any) => {
            crearPrestamoConUsuario(Number(nuevoUsuario.id));
          },
          error: (err) => {
            console.error('Error creando usuario para préstamo:', err);
            this.showLoanModalError(this.getApiErrorMessage(err, 'No se pudo crear el usuario del préstamo.'));
          }
        });
      },
      error: (err) => {
        console.error('Error buscando usuario para préstamo:', err);
        this.showLoanModalError(this.getApiErrorMessage(err, 'No se pudo validar el usuario del préstamo.'));
      }
    });
  }

  private showLoanModalError(message: string): void {
    const loanModalError = document.getElementById('loanModalError');
    if (!loanModalError) return;

    loanModalError.textContent = message;
    loanModalError.classList.add('active');
  }

  private clearLoanModalError(): void {
    const loanModalError = document.getElementById('loanModalError');
    if (!loanModalError) return;

    loanModalError.textContent = '';
    loanModalError.classList.remove('active');
  }

  openReturnForm(loanId: string): void {
    const loan = this.loans.find(l => l.id === loanId || l.id === parseInt(loanId));
    if (!loan) return;
    this.returningLoan = loan;
    const returnInfo = document.getElementById('returnLoanInfo');
    if (returnInfo) {
      returnInfo.innerHTML = `
        <div class="return-card">
          <div class="return-card-header">
            <div>
              <p class="return-card-title">Préstamo activo</p>
              <p class="return-card-subtitle">Confirma la devolución del instrumento</p>
            </div>
            <span class="return-chip">${loan.estado === 'enuso' ? 'En uso' : loan.estado || 'Estado'}</span>
          </div>
          <div class="return-card-body">
            <div class="return-row">
              <span class="return-label">Instrumento</span>
              <span class="return-value">${loan.instrumento_nombre || loan.instrumentoNombre || 'Instrumento'}</span>
            </div>
            <div class="return-row">
              <span class="return-label">Usuario</span>
              <span class="return-value">${loan.usuario_nombre || loan.estudianteNombre || 'N/A'}</span>
            </div>
            <div class="return-row">
              <span class="return-label">Referencia</span>
              <span class="return-value">${loan.instrumento_referencia || 'N/A'}</span>
            </div>
          </div>
        </div>
      `;
    }
    const modal = document.getElementById('returnModal');
    if (modal) modal.classList.add('active');
  }

  returnInstrumentFromCard(instrumentId: string): void {
    const idNum = parseInt(instrumentId, 10);
    const activeLoan = this.loans.find((l: any) => Number(l.instrumento) === idNum && l.estado === 'enuso');

    if (!activeLoan) {
      this.showAlert('warning', 'Sin préstamo activo', 'No se encontró un préstamo activo para este instrumento.');
      return;
    }

    this.openReturnForm(String(activeLoan.id));
  }

  closeReturnForm(): void {
    const modal = document.getElementById('returnModal');
    if (modal) modal.classList.remove('active');
    this.returningLoan = null;
  }

  saveReturn(event: Event): void {
    event.preventDefault();
    if (!this.returningLoan) return;
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const loanId = this.returningLoan.id || this.returningLoan.pk;
    const observacion = (formData.get('observaciones') as string) || undefined;

    this.prestamoService.devolverPrestamo(parseInt(loanId as string), observacion).subscribe({
      next: (response) => {
        this.showAlert('success', 'Éxito', 'Préstamo devuelto correctamente');
        this.loadData();
        this.closeReturnForm();
      },
      error: (err) => {
        console.error('Error devolviendo préstamo:', err);
        this.showAlert('error', 'Error', 'No se pudo procesar la devolución');
      }
    });
  }

  openReports(): void {
    const total = this.instruments.length;
    const reportsContent = document.getElementById('reportsContent');
    if (reportsContent) {
      reportsContent.innerHTML = `<p>Reportes - Total: ${total} instrumentos</p>`;
    }
    const modal = document.getElementById('reportsModal');
    if (modal) modal.classList.add('active');
  }

  closeReports(): void {
    const modal = document.getElementById('reportsModal');
    if (modal) modal.classList.remove('active');
  }

  exportReportJSON(): void {
    const categorias = Array.from(
      new Set(
        this.instruments
          .map((i: any) => i.categoria_nombre || i.categoria || '')
          .filter((value: string) => value && value.trim())
      )
    );

    const usuariosMap = new Map<string, any>();
    this.loans.forEach((l: any) => {
      const id = (l.usuario ?? '').toString();
      if (!id || usuariosMap.has(id)) return;
      usuariosMap.set(id, {
        id: l.usuario || null,
        nombre: l.usuario_nombre || '',
        documento: l.usuario_documento || ''
      });
    });
    const usuarios = Array.from(usuariosMap.values());

    const instrumentos = this.instruments.map((i: any) => ({
      id: i.id ?? null,
      referencia: i.referencia || i.codigo || '',
      nombre: i.nombre || '',
      categoria: i.categoria_nombre || i.categoria || '',
      marca: i.marca || '',
      modelo: i.modelo || '',
      numero_serie: i.numero_serie || i.numeroSerie || '',
      estado: this.getEstadoLabel(i.estado),
      condicion: i.condicion || '',
      ubicacion: i.ubicacion_fisica || i.ubicacion || '',
      cantidad: i.cantidad ?? 1,
      fecha_adquisicion: i.fecha_adquisicion || null,
      valor_reemplazo: i.valor_reemplazo ?? null
    }));

    const prestamos = this.loans.map((l: any) => ({
      id: l.id ?? l.pk ?? null,
      instrumento_id: l.instrumento || null,
      instrumento_nombre: l.instrumento_nombre || '',
      instrumento_referencia: l.instrumento_referencia || '',
      usuario_id: l.usuario || null,
      usuario_nombre: l.usuario_nombre || '',
      usuario_documento: l.usuario_documento || '',
      estado: l.estado || '',
      fecha_prestamo: l.fecha_prestamo || null,
      fecha_vencimiento: l.fecha_vencimiento || null,
      fecha_devolucion: l.fecha_devolucion || null,
      dias_permitidos: l.dias_permitidos ?? null
    }));

    const report = {
      fecha: new Date().toISOString(),
      total_instrumentos: this.instruments.length,
      prestamos_activos: this.loans.filter(l => l.estado === 'enuso').length,
      categorias,
      total_categorias: categorias.length,
      usuarios,
      total_usuarios: usuarios.length,
      instrumentos,
      prestamos
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    if (dateStr.includes('T')) {
      return new Date(dateStr).toLocaleDateString('es-CO');
    }

    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }

  private parseDateOnly(dateStr: string): Date {
    if (!dateStr) return new Date(0);
    if (dateStr.includes('T')) return new Date(dateStr);
    return new Date(`${dateStr}T00:00:00`);
  }

  private getEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      disponible: 'Disponible',
      prestado: 'En Uso',
      mantenimiento: 'En Reparación',
      baja: 'Fuera de Servicio'
    };

    return labels[estado] || estado;
  }

  isAdmin(): boolean {
    return this.getNormalizedRole() === 'administrador';
  }

  isStorekeeper(): boolean {
    return this.getNormalizedRole() === 'almacenista';
  }

  private getNormalizedRole(): string {
    return (this.currentUser?.rol || '').toString().trim().toLowerCase();
  }

  private getBadgeClass(estado: string): string {
    const classes: Record<string, string> = {
      disponible: 'badge-available',
      prestado: 'badge-in-use',
      mantenimiento: 'badge-repair',
      baja: 'badge-out-of-service'
    };

    return classes[estado] || 'badge-available';
  }

  private getEmptyInstrumentForm(): {
    codigo: string;
    nombre: string;
    categoria: string | number;
    marca: string;
    modelo: string;
    numeroSerie: string;
    fechaAdquisicion: string;
    valorAdquisicion: number | string | null;
    estado: string;
    condicion: string;
    cantidad: number;
    ubicacion: string;
    observaciones: string;
  } {
    return {
      codigo: '',
      nombre: '',
      categoria: '',
      marca: '',
      modelo: '',
      numeroSerie: '',
      fechaAdquisicion: '',
      valorAdquisicion: null,
      estado: 'disponible',
      condicion: '',
      cantidad: 1,
      ubicacion: '',
      observaciones: ''
    };
  }

  private getCategoriaNombre(categoriaId: number | string | undefined): string | null {
    if (!categoriaId) return null;
    const idNumber = Number(categoriaId);
    const categoria = this.categorias.find(cat => Number(cat.id) === idNumber);
    return categoria?.nombre || null;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
