import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InstrumentoService } from '../../services/instrumento.service';
import { Instrumento, Categoria } from '../../models/instrumento.model';

@Component({
  selector: 'app-instrumentos-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './instrumentos-list.component.html',
  styleUrls: ['./instrumentos-list.component.css']
})
export class InstrumentosListComponent implements OnInit {
  Number = Number;
  
  // Data
  instrumentos: Instrumento[] = [];
  categorias: Categoria[] = [];
  
  // Filtros
  filtroEstado: string = '';
  filtroCategoria: string = '';
  searchTerm: string = '';
  
  // UI State
  loading: boolean = true;
  showNewInstrumentoModal: boolean = false;
  editingInstrumento: Instrumento | null = null;
  errorMessage: string = '';
  successMessage: string = '';

  // Objeto para el formulario
  newInstrumento: Instrumento = this.resetInstrumento();

  constructor(private instrumentoService: InstrumentoService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  /**
   * Carga categorías e instrumentos del backend
   */
  private cargarDatos(): void {
    this.loading = true;
    
    // Cargar categorías
    this.instrumentoService.getCategorias().subscribe({
      next: (data) => {
        this.categorias = Array.isArray(data) ? data : [];
        console.log('✅ Categorías cargadas:', this.categorias.length);
      },
      error: (err) => {
        console.error('❌ Error cargando categorías:', err);
        this.mostrarError('No se pudieron cargar las categorías');
      }
    });

    // Cargar instrumentos
    this.instrumentoService.getInstrumentos().subscribe({
      next: (data) => {
        this.instrumentos = Array.isArray(data) ? data : data.results || [];
        this.loading = false;
        console.log('✅ Instrumentos cargados:', this.instrumentos.length);
      },
      error: (err) => {
        console.error('❌ Error cargando instrumentos:', err);
        this.mostrarError('No se pudieron cargar los instrumentos');
        this.loading = false;
      }
    });
  }

  /**
   * Filtra la lista de instrumentos según criterios
   */
  filtrarInstrumentos(): Instrumento[] {
    return this.instrumentos.filter(inst => {
      const cumpleEstado = !this.filtroEstado || inst.estado === this.filtroEstado;
      const cumpleCategoria = !this.filtroCategoria || inst.categoria?.toString() === this.filtroCategoria;
      const cumpleBusqueda = !this.searchTerm || 
        (inst.nombre && inst.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (inst.referencia && inst.referencia.toLowerCase().includes(this.searchTerm.toLowerCase()));
      
      return cumpleEstado && cumpleCategoria && cumpleBusqueda;
    });
  }

  /**
   * Retorna el color del estado para visualización
   */
  estadoColor(estado: string): string {
    const colores: { [key: string]: string } = {
      'disponible': 'green',
      'prestado': 'yellow',
      'mantenimiento': 'red',
      'baja': 'gray'
    };
    return colores[estado] || 'blue';
  }

  /**
   * Obtiene el nombre de la categoría por ID
   */
  getCategoriaName(categoriaId: number): string {
    const categoria = this.categorias.find(c => c.id === categoriaId);
    return categoria ? categoria.nombre : 'Sin categoría';
  }

  /**
   * Abre el modal para crear nuevo instrumento
   */
  abrirNuevoInstrumento(): void {
    this.editingInstrumento = null;
    this.newInstrumento = this.resetInstrumento();
    this.errorMessage = '';
    this.showNewInstrumentoModal = true;
  }

  /**
   * Abre el modal para editar instrumento
   */
  abrirEditar(instrumento: Instrumento): void {
    this.editingInstrumento = instrumento;
    this.newInstrumento = { ...instrumento };
    this.errorMessage = '';
    this.showNewInstrumentoModal = true;
  }

  /**
   * Valida los datos del instrumento
   */
  private validarInstrumento(): { valido: boolean; mensaje?: string } {
    // Validar nombre
    if (!this.newInstrumento.nombre || this.newInstrumento.nombre.trim() === '') {
      return { valido: false, mensaje: '❌ El nombre es obligatorio' };
    }

    if (this.newInstrumento.nombre.length < 3) {
      return { valido: false, mensaje: '❌ El nombre debe tener al menos 3 caracteres' };
    }

    // Validar referencia
    if (!this.newInstrumento.referencia || this.newInstrumento.referencia.trim() === '') {
      return { valido: false, mensaje: '❌ La referencia es obligatoria' };
    }

    // Validar cantidad
    if (!this.newInstrumento.cantidad || this.newInstrumento.cantidad <= 0) {
      return { valido: false, mensaje: '❌ La cantidad debe ser mayor a 0' };
    }

    // Validar categoría
    if (this.categorias.length > 0 && (!this.newInstrumento.categoria || this.newInstrumento.categoria === 0)) {
      return { valido: false, mensaje: '❌ Selecciona una categoría' };
    }

    return { valido: true };
  }

  /**
   * Guarda o actualiza un instrumento en BD
   */
  guardarInstrumento(): void {
    // Validar datos
    const validacion = this.validarInstrumento();
    if (!validacion.valido) {
      this.errorMessage = validacion.mensaje || 'Error de validación';
      return;
    }

    const payload = this.buildInstrumentoPayload();

    // Actualizar fecha
    this.newInstrumento.fecha_actualizacion = new Date().toISOString();

    if (this.editingInstrumento && this.editingInstrumento.id) {
      // Actualizar instrumento existente
      this.instrumentoService.actualizarInstrumento(Number(this.editingInstrumento.id), payload).subscribe({
        next: () => {
          this.mostrarExito('✅ Instrumento actualizado correctamente');
          this.cargarDatos();
          this.closeModal();
        },
        error: (err) => {
          console.error('Error al actualizar:', err);
          this.mostrarError(`❌ Error al actualizar: ${err.error?.error || err.message}`);
        }
      });
    } else {
      // Crear nuevo instrumento
      this.instrumentoService.crearInstrumento(payload).subscribe({
        next: () => {
          this.mostrarExito('✅ Instrumento registrado correctamente');
          this.cargarDatos();
          this.closeModal();
        },
        error: (err) => {
          console.error('Error al crear:', err);
          this.mostrarError(`❌ Error al crear: ${err.error?.error || err.message}`);
        }
      });
    }
  }

  /**
   * Elimina un instrumento previa confirmación
   */
  eliminarInstrumento(id: number): void {
    const instrumento = this.instrumentos.find(i => i.id === id);
    const nombre = instrumento ? instrumento.nombre : 'Este instrumento';
    
    if (confirm(`⚠️ ¿Estás seguro de que deseas eliminar "${nombre}"? Esta acción no se puede deshacer.`)) {
      this.instrumentoService.eliminarInstrumento(id).subscribe({
        next: () => {
          this.mostrarExito('✅ Instrumento eliminado correctamente');
          this.cargarDatos();
        },
        error: (err) => {
          console.error('Error al eliminar:', err);
          this.mostrarError(`❌ Error al eliminar: ${err.error?.error || err.message}`);
        }
      });
    }
  }

  /**
   * Cierra el modal
   */
  closeModal(): void {
    this.showNewInstrumentoModal = false;
    this.editingInstrumento = null;
    this.newInstrumento = this.resetInstrumento();
    this.errorMessage = '';
  }

  /**
   * Reinicia el objeto instrumento
   */
  private resetInstrumento(): Instrumento {
    return {
      nombre: '',
      referencia: '',
      categoria: 0,
      cantidad: 1,
      estado: 'disponible',
      marca: '',
      modelo: '',
      numero_serie: '',
      condicion: '',
      ubicacion_fisica: '',
      valor_reemplazo: null,
      fecha_adquisicion: '',
      observaciones: '',
      fecha_actualizacion: new Date().toISOString()
    };
  }

  private buildInstrumentoPayload(): Instrumento {
    return {
      nombre: this.newInstrumento.nombre.trim(),
      referencia: this.newInstrumento.referencia.trim(),
      categoria: this.newInstrumento.categoria,
      estado: this.newInstrumento.estado || 'disponible',
      cantidad: this.newInstrumento.cantidad || 1,
      marca: this.newInstrumento.marca?.trim() || null,
      modelo: this.newInstrumento.modelo?.trim() || null,
      numero_serie: this.newInstrumento.numero_serie?.trim() || null,
      fecha_adquisicion: this.newInstrumento.fecha_adquisicion || null,
      condicion: this.newInstrumento.condicion || null,
      ubicacion_fisica: this.newInstrumento.ubicacion_fisica?.trim() || null,
      valor_reemplazo: this.newInstrumento.valor_reemplazo ?? null,
      observaciones: this.newInstrumento.observaciones?.trim() || null
    };
  }

  /**
   * Muestra mensaje de error
   */
  private mostrarError(mensaje: string): void {
    this.errorMessage = mensaje;
    setTimeout(() => this.errorMessage = '', 5000);
  }

  /**
   * Muestra mensaje de éxito
   */
  private mostrarExito(mensaje: string): void {
    this.successMessage = mensaje;
    setTimeout(() => this.successMessage = '', 3000);
  }
}
