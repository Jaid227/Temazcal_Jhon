// ============================================
// CONFIGURACIÓN - ¡IMPORTANTE CAMBIAR ESTO!
// ============================================
const SHEET_ID = '1w0_zVOF0Zj4AYePMJdkFhS4LEF7oj0wFLrE0hIhKZAQ'; // Reemplaza con el ID de tu hoja
const API_KEY = ''; // No necesitamos API key usando este método

// URL de publicación de Google Sheets (formato CSV)
const PAQUETES_URL = `https://docs.google.com/spreadsheets/d/1w0_zVOF0Zj4AYePMJdkFhS4LEF7oj0wFLrE0hIhKZAQ/edit?gid=0#gid=0`;
const RESERVAS_URL = `https://docs.google.com/spreadsheets/d/1w0_zVOF0Zj4AYePMJdkFhS4LEF7oj0wFLrE0hIhKZAQ/edit?gid=503136049#gid=503136049`;

// Clave de administrador
const ADMIN_PASSWORD = 'Jhon';

// ============================================
// ESTADO GLOBAL
// ============================================
let paquetes = [];
let reservas = [];
let paqueteSeleccionado = null;

// ============================================
// FUNCIONES DE GOOGLE SHEETS
// ============================================

// Función para leer CSV desde Google Sheets
async function leerCSV(url) {
    try {
        const response = await fetch(url);
        const text = await response.text();
        return parseCSV(text);
    } catch (error) {
        console.error('Error al leer CSV:', error);
        return [];
    }
}

// Función para parsear CSV
function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    
    // Obtener encabezados
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Parsear datos
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        data.push(row);
    }
    return data;
}

// Función para guardar datos en Google Sheets (usando Google Apps Script)
// NOTA: Necesitarás crear un script en Google Sheets para esto
async function guardarReserva(reservaData) {
    // Esta función requiere Google Apps Script
    // Por ahora, guardamos localmente y en localStorage
    const reservasLocal = JSON.parse(localStorage.getItem('reservasTemp') || '[]');
    reservasLocal.push(reservaData);
    localStorage.setItem('reservasTemp', JSON.stringify(reservasLocal));
    
    // También intentamos guardar en Google Sheets usando un webhook
    try {
        const response = await fetch(`https://script.google.com/macros/s/TU_SCRIPT_ID/exec`, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reservaData)
        });
        console.log('Reserva guardada exitosamente');
    } catch (error) {
        console.error('Error al guardar en Google Sheets:', error);
        // La reserva queda guardada localmente
    }
}

// ============================================
// FUNCIONES DE CARGA DE DATOS
// ============================================

async function cargarDatos() {
    try {
        // Cargar paquetes
        const paquetesData = await leerCSV(PAQUETES_URL);
        paquetes = paquetesData;
        
        // Cargar reservas (combinar con locales)
        const reservasData = await leerCSV(RESERVAS_URL);
        const reservasLocal = JSON.parse(localStorage.getItem('reservasTemp') || '[]');
        reservas = [...reservasData, ...reservasLocal];
        
        renderPaquetes();
    } catch (error) {
        console.error('Error al cargar datos:', error);
        // Mostrar mensaje de error
        document.getElementById('paquetesContainer').innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 20px;"></i>
                <h3>Error al cargar datos</h3>
                <p>Por favor, verifica que tu hoja de Google Sheets esté publicada correctamente.</p>
                <p style="font-size: 0.9rem; margin-top: 10px;">ID de hoja: ${SHEET_ID}</p>
            </div>
        `;
    }
}

// ============================================
// FUNCIONES DE RENDERIZADO
// ============================================

function renderPaquetes() {
    const container = document.getElementById('paquetesContainer');
    
    if (!paquetes || paquetes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 20px;"></i>
                <h3>No hay paquetes disponibles</h3>
                <p>Agrega paquetes en tu hoja de Google Sheets</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = paquetes.map(paquete => {
        const disponibilidad = calcularDisponibilidad(paquete);
        const estaLleno = disponibilidad <= 0;
        
        return `
            <div class="paquete-card" data-id="${paquete.ID}" onclick="seleccionarPaquete('${paquete.ID}')">
                <img src="${paquete.ImagenURL || 'https://via.placeholder.com/300x200/8b4513/ffffff?text=Temazcal'}" 
                     alt="${paquete.Nombre}" 
                     class="paquete-imagen"
                     onerror="this.src='https://via.placeholder.com/300x200/8b4513/ffffff?text=Temazcal'">
                <div class="paquete-info">
                    <h3>${paquete.Nombre}</h3>
                    <p>${paquete.Descripcion || 'Experiencia de sanación ancestral'}</p>
                    <div class="cupo-info">
                        <span class="${estaLleno ? 'cupo-lleno' : 'cupo-disponible'}">
                            ${estaLleno ? '🔴 Cupo lleno' : `✅ ${disponibilidad} lugares disponibles`}
                        </span>
                        <span>Capacidad: ${paquete.Cupo || 0}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function calcularDisponibilidad(paquete) {
    const reservasPaquete = reservas.filter(r => r.PaqueteID === paquete.ID && r.Estado === 'Confirmado');
    const cupo = parseInt(paquete.Cupo) || 0;
    return Math.max(0, cupo - reservasPaquete.length);
}

// ============================================
// FUNCIONES DE RESERVA
// ============================================

function seleccionarPaquete(id) {
    const paquete = paquetes.find(p => p.ID === id);
    if (!paquete) return;
    
    const disponibles = calcularDisponibilidad(paquete);
    if (disponibles <= 0) {
        alert('❌ Lo sentimos, este paquete está completo. Por favor, elige otra opción.');
        return;
    }
    
    paqueteSeleccionado = paquete;
    mostrarModalReserva(paquete);
}

function mostrarModalReserva(paquete) {
    const modal = document.getElementById('reservaModal');
    const info = document.getElementById('paqueteInfo');
    
    info.innerHTML = `
        <h3>${paquete.Nombre}</h3>
        <p>${paquete.Descripcion || 'Experiencia de sanación ancestral'}</p>
        <p>Lugares disponibles: <strong>${calcularDisponibilidad(paquete)}</strong></p>
    `;
    
    modal.style.display = 'flex';
}

// Manejar envío de reserva
document.getElementById('reservaForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombreUsuario').value.trim();
    const foto = document.getElementById('fotoUsuario').value.trim();
    
    if (!nombre || !foto) {
        alert('Por favor, completa todos los campos.');
        return;
    }
    
    // Verificar disponibilidad nuevamente
    const disponibles = calcularDisponibilidad(paqueteSeleccionado);
    if (disponibles <= 0) {
        alert('❌ Lo sentimos, el cupo se llenó mientras realizabas la reserva.');
        cerrarModal('reservaModal');
        cargarDatos();
        return;
    }
    
    // Crear reserva
    const nuevaReserva = {
        ID: Date.now().toString(),
        PaqueteID: paqueteSeleccionado.ID,
        NombreUsuario: nombre,
        FotoURL: foto,
        Estado: 'Pendiente',
        Fecha: new Date().toISOString()
    };
    
    // Guardar
    await guardarReserva(nuevaReserva);
    reservas.push(nuevaReserva);
    
    alert('✅ ¡Reserva creada exitosamente! Espera la confirmación del administrador.');
    cerrarModal('reservaModal');
    document.getElementById('reservaForm').reset();
    renderPaquetes();
});

// ============================================
// FUNCIONES ADMINISTRATIVAS
// ============================================

document.getElementById('adminBtn').addEventListener('click', function() {
    document.getElementById('adminModal').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('adminPassword').value = '';
});

document.getElementById('loginAdminBtn').addEventListener('click', function() {
    const password = document.getElementById('adminPassword').value;
    if (password === ADMIN_PASSWORD) {
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('adminPassword').parentElement.style.display = 'none';
        cargarAdminData();
    } else {
        alert('❌ Clave incorrecta');
    }
});

function cargarAdminData() {
    // Cargar pendientes
    const pendientes = reservas.filter(r => r.Estado === 'Pendiente');
    const confirmados = reservas.filter(r => r.Estado === 'Confirmado');
    
    mostrarTabla('pendientes', pendientes);
    mostrarTabla('confirmados', confirmados);
    mostrarGestion();
}

function mostrarTabla(tipo, datos) {
    const container = document.getElementById('adminContent');
    let html = `
        <h3>${tipo === 'pendientes' ? '📋 Reservas Pendientes' : '✅ Reservas Confirmadas'}</h3>
        ${datos.length === 0 ? '<p>No hay reservas en esta categoría</p>' : `
        <div style="overflow-x: auto;">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Foto</th>
                        <th>Paquete</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${datos.map(reserva => `
                        <tr>
                            <td>${reserva.NombreUsuario}</td>
                            <td><img src="${reserva.FotoURL}" alt="${reserva.NombreUsuario}" onerror="this.src='https://via.placeholder.com/50/8b4513/ffffff?text=User'"></td>
                            <td>${paquetes.find(p => p.ID === reserva.PaqueteID)?.Nombre || 'N/A'}</td>
                            <td>${new Date(reserva.Fecha).toLocaleDateString()}</td>
                            <td>
                                <div class="admin-actions">
                                    ${tipo === 'pendientes' ? `
                                        <button class="btn-confirm" onclick="confirmarReserva('${reserva.ID}')">✓ Confirmar</button>
                                    ` : ''}
                                    <button class="btn-delete" onclick="eliminarReserva('${reserva.ID}')">🗑 Eliminar</button>
                                    <button class="btn-move" onclick="moverReserva('${reserva.ID}')">↻ Mover</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        `}
    `;
    
    // Actualizar el contenido según la pestaña activa
    const tab = document.querySelector('.tab-btn.active')?.dataset.tab || 'pendientes';
    if (tab === tipo) {
        container.innerHTML = html;
    }
}

function mostrarGestion() {
    // Gestión de paquetes
    const container = document.getElementById('adminContent');
    const currentTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    
    if (currentTab === 'gestion') {
        let html = `
            <h3>📦 Gestión de Paquetes</h3>
            <div style="margin: 20px 0;">
                <h4>Editar nombre de paquete</h4>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <select id="paqueteSelect" style="flex:1; padding: 10px; border-radius: 10px; border: 2px solid var(--border); background: var(--bg-primary); color: var(--text-primary);">
                        ${paquetes.map(p => `<option value="${p.ID}">${p.Nombre}</option>`).join('')}
                    </select>
                    <input type="text" id="nuevoNombre" placeholder="Nuevo nombre" style="flex:1; padding: 10px; border-radius: 10px; border: 2px solid var(--border); background: var(--bg-primary); color: var(--text-primary);">
                    <button onclick="editarNombrePaquete()" class="btn-primary" style="flex:0 1 auto;">Actualizar</button>
                </div>
            </div>
            
            <div style="margin: 20px 0; border-top: 2px solid var(--border); padding-top: 20px;">
                <h4>Lista de Paquetes</h4>
                ${paquetes.map(p => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--border);">
                        <span><strong>${p.Nombre}</strong> - Cupo: ${p.Cupo} | Disponibles: ${calcularDisponibilidad(p)}</span>
                    </div>
                `).join('')}
            </div>
        `;
        container.innerHTML = html;
    }
}

// Funciones de administración (se ejecutan desde los botones)
window.confirmarReserva = function(id) {
    const reserva = reservas.find(r => r.ID === id);
    if (reserva) {
        reserva.Estado = 'Confirmado';
        // Actualizar localStorage
        actualizarLocalStorage();
        alert('✅ Reserva confirmada');
        cargarAdminData();
        renderPaquetes();
    }
};

window.eliminarReserva = function(id) {
    if (confirm('¿Estás seguro de eliminar esta reserva?')) {
        reservas = reservas.filter(r => r.ID !== id);
        actualizarLocalStorage();
        alert('🗑 Reserva eliminada');
        cargarAdminData();
        renderPaquetes();
    }
};

window.moverReserva = function(id) {
    const reserva = reservas.find(r => r.ID === id);
    if (!reserva) return;
    
    const paqueteActual = paquetes.find(p => p.ID === reserva.PaqueteID);
    const otrosPaquetes = paquetes.filter(p => p.ID !== reserva.PaqueteID);
    
    if (otrosPaquetes.length === 0) {
        alert('No hay otros paquetes disponibles para mover');
        return;
    }
    
    const opciones = otrosPaquetes.map((p, i) => `${i+1}. ${p.Nombre}`).join('\n');
    const seleccion = prompt(`Mover de "${paqueteActual?.Nombre}" a:\n${opciones}\n\nEscribe el número del paquete destino:`);
    
    if (seleccion) {
        const index = parseInt(seleccion) - 1;
        if (index >= 0 && index < otrosPaquetes.length) {
            reserva.PaqueteID = otrosPaquetes[index].ID;
            actualizarLocalStorage();
            alert('✅ Reserva movida exitosamente');
            cargarAdminData();
            renderPaquetes();
        } else {
            alert('❌ Selección inválida');
        }
    }
};

window.editarNombrePaquete = function() {
    const select = document.getElementById('paqueteSelect');
    const nuevoNombre = document.getElementById('nuevoNombre').value.trim();
    
    if (!nuevoNombre) {
        alert('Por favor, ingresa un nuevo nombre');
        return;
    }
    
    const paquete = paquetes.find(p => p.ID === select.value);
    if (paquete) {
        paquete.Nombre = nuevoNombre;
        alert('✅ Nombre actualizado');
        cargarAdminData();
        renderPaquetes();
    }
};

function actualizarLocalStorage() {
    const reservasTemp = reservas.filter(r => !r._fromGoogle);
    localStorage.setItem('reservasTemp', JSON.stringify(reservasTemp));
}

// ============================================
// FUNCIONES DE MODALES
// ============================================

function cerrarModal(id) {
    document.getElementById(id).style.display = 'none';
}

// Cerrar modales al hacer clic fuera
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Cerrar modales con el botón X
document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', function() {
        this.closest('.modal').style.display = 'none';
    });
});

// ============================================
// TABS ADMIN
// ============================================

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const tab = this.dataset.tab;
        if (tab === 'pendientes' || tab === 'confirmados') {
            const datos = reservas.filter(r => r.Estado === (tab === 'pendientes' ? 'Pendiente' : 'Confirmado'));
            mostrarTabla(tab, datos);
        } else if (tab === 'gestion') {
            mostrarGestion();
        }
    });
});

// ============================================
// MODO OSCURO/CLARO
// ============================================

const themeToggle = document.getElementById('themeToggle');
let darkMode = localStorage.getItem('darkMode') === 'true';

function aplicarTema() {
    if (darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

themeToggle.addEventListener('click', function() {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', darkMode);
    aplicarTema();
});

aplicarTema();

// ============================================
// INICIALIZACIÓN
// ============================================

// Cargar datos al inicio
cargarDatos();

// Recargar cada 30 segundos (opcional)
setInterval(cargarDatos, 30000);

console.log('🌿 Sistema de Reservas Temazcal iniciado');
console.log('🔑 Clave de administrador:', ADMIN_PASSWORD);
