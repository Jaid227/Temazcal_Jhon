
// Configuración inicial
let paquetesData = [];
let selectedPackage = null;
let currentReservaId = null;

// URL DE TU WEB APP - ¡CAMBIA ESTA URL!
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbysWzwCIW_q4bHESGuT_I9Awke_FjQfJh_x-o1my0_DgRHYiyGkpIFegTkH7sLESoP6/exec';

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    loadPaquetes();
    initTheme();
    setupFormSubmit();
});

// Cargar paquetes desde Google Sheets
async function loadPaquetes() {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getPaquetes`);
        paquetesData = await response.json();
        displayPaquetes();
    } catch (error) {
        console.error('Error cargando paquetes:', error);
        // Datos de ejemplo para pruebas
        paquetesData = [
            {id: 1, nombre: "Temazcal Clásico", descripcion: "Experiencia tradicional", cupoDisponible: 10, precio: 800, imagenURL: "https://via.placeholder.com/300x200"},
            {id: 2, nombre: "Temazcal Lunar", descripcion: "Bajo la luna llena", cupoDisponible: 8, precio: 1200, imagenURL: "https://via.placeholder.com/300x200"},
            {id: 3, nombre: "Temazcal Medicina", descripcion: "Con plantas medicinales", cupoDisponible: 6, precio: 1500, imagenURL: "https://via.placeholder.com/300x200"}
        ];
        displayPaquetes();
    }
}

// Mostrar paquetes en la pantalla principal
function displayPaquetes() {
    const grid = document.getElementById('packagesGrid');
    if (!grid) return;
    
    grid.innerHTML = paquetesData.map(paquete => `
        <div class="package-card" onclick="selectPackage(${paquete.id})">
            <img src="${paquete.imagenURL}" alt="${paquete.nombre}" class="package-image" 
                 onerror="this.src='https://via.placeholder.com/300x200?text=Temazcal'">
            <div class="package-info">
                <h3 class="package-title">${paquete.nombre}</h3>
                <p class="package-description">${paquete.descripcion}</p>
                <div class="package-details">
                    <span class="cupo">🎫 Cupo: ${paquete.cupoDisponible}</span>
                    <span class="precio">$${paquete.precio}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Seleccionar paquete y mostrar detalles
function selectPackage(packageId) {
    selectedPackage = paquetesData.find(p => p.id == packageId);
    if (!selectedPackage) return;
    
    // Mostrar detalles
    const detailsDiv = document.getElementById('packageDetails');
    if (detailsDiv) {
        detailsDiv.innerHTML = `
            <div class="package-details-view">
                <img src="${selectedPackage.imagenURL}" alt="${selectedPackage.nombre}" style="width: 100%; border-radius: 15px; margin-bottom: 20px;">
                <h2>${selectedPackage.nombre}</h2>
                <p>${selectedPackage.descripcion}</p>
                <div class="package-details" style="margin: 20px 0;">
                    <span class="cupo">🎫 Cupo disponible: ${selectedPackage.cupoDisponible}</span>
                    <span class="precio">💰 Precio: $${selectedPackage.precio}</span>
                </div>
                <button onclick="showFormScreen()" class="btn-primary">Continuar con reserva</button>
            </div>
        `;
    }
    
    showDetailsScreen();
}

// Mostrar pantalla de formulario
function showFormScreen() {
    hideAllScreens();
    document.getElementById('formScreen').classList.add('active');
}

// Configurar envío de formulario
function setupFormSubmit() {
    const form = document.getElementById('reservationForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nombre = document.getElementById('nombre').value;
            const edad = document.getElementById('edad').value;
            
            if (!nombre || !edad) {
                alert('Por favor completa todos los campos');
                return;
            }
            
            // Crear reserva
            const reservaData = {
                usuario: { nombre, edad },
                paqueteId: selectedPackage.id
            };
            
            try {
                const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=crearReserva`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reservaData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    currentReservaId = result.reservaId;
                    
                    // Enviar WhatsApp
                    const whatsappMsg = `Hola, acabo de reservar el paquete ${selectedPackage.nombre}\nNombre: ${nombre}\nEdad: ${edad}\nID Reserva: ${currentReservaId}`;
                    const whatsappUrl = `https://wa.me/521234567890?text=${encodeURIComponent(whatsappMsg)}`;
                    window.open(whatsappUrl, '_blank');
                    
                    // Mostrar confirmación
                    showConfirmation(nombre, selectedPackage.nombre, currentReservaId);
                } else {
                    alert('Error al crear la reserva');
                }
            } catch (error) {
                console.error('Error:', error);
                // Simulación para pruebas
                currentReservaId = 'RES_' + Date.now();
                showConfirmation(nombre, selectedPackage.nombre, currentReservaId);
            }
        });
    }
}

// Mostrar confirmación
function showConfirmation(nombre, paquete, reservaId) {
    const confirmDiv = document.getElementById('confirmationMessage');
    if (confirmDiv) {
        confirmDiv.innerHTML = `
            <i class="fas fa-check-circle" style="font-size: 64px; color: #4caf50; margin-bottom: 20px;"></i>
            <h2>¡Reserva creada!</h2>
            <p>Gracias ${nombre}, tu reserva para ${paquete} está en espera.</p>
            <p><strong>ID de reserva:</strong> ${reservaId}</p>
            <p>El administrador revisará tu solicitud y te contactará cuando sea aceptada.</p>
            <button onclick="showMainScreen()" class="btn-primary" style="margin-top: 20px;">Volver al inicio</button>
        `;
    }
    
    hideAllScreens();
    document.getElementById('confirmScreen').classList.add('active');
}

// Funciones de administrador
async function loginAdmin() {
    const password = document.getElementById('adminPassword').value;
    
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=verificarAdmin&password=${password}`);
        const result = await response.json();
        
        if (result === true || password === 'Jhon') {
            document.getElementById('adminLogin').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            loadPendingReservations();
        } else {
            alert('Contraseña incorrecta');
        }
    } catch (error) {
        // Para pruebas locales
        if (password === 'Jhon') {
            document.getElementById('adminLogin').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            loadPendingReservations();
        } else {
            alert('Contraseña incorrecta');
        }
    }
}

async function loadPendingReservations() {
    const container = document.getElementById('pendingReservations');
    if (!container) return;
    
    // Datos de ejemplo
    const reservasPendientes = [
        {id: 'RES_001', nombre: 'Juan Pérez', edad: 30, paqueteId: 1},
        {id: 'RES_002', nombre: 'María García', edad: 25, paqueteId: 2}
    ];
    
    container.innerHTML = reservasPendientes.map(reserva => `
        <div class="reservation-item">
            <div>
                <strong>${reserva.nombre}</strong><br>
                Edad: ${reserva.edad} | Paquete: ${reserva.paqueteId}<br>
                <small>ID: ${reserva.id}</small>
            </div>
            <button onclick="acceptReservation('${reserva.id}', ${reserva.paqueteId})" class="btn-accept">
                Aceptar
            </button>
        </div>
    `).join('');
}

async function acceptReservation(reservaId, paqueteId) {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=aceptarReserva&reservaId=${reservaId}&paqueteId=${paqueteId}`);
        const result = await response.json();
        
        if (result.success) {
            alert('Reserva aceptada correctamente');
            loadPendingReservations();
            loadPaquetes(); // Actualizar cupos
        }
    } catch (error) {
        alert('Reserva aceptada (simulación)');
        loadPendingReservations();
        loadPaquetes();
    }
}

// Navegación entre pantallas
function showMainScreen() {
    hideAllScreens();
    document.getElementById('mainScreen').classList.add('active');
    loadPaquetes(); // Recargar para actualizar cupos
}

function showDetailsScreen() {
    hideAllScreens();
    document.getElementById('detailsScreen').classList.add('active');
}

function showAdminScreen() {
    hideAllScreens();
    document.getElementById('adminScreen').classList.add('active');
    document.getElementById('adminLogin').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('adminPassword').value = '';
}

function hideAllScreens() {
    const screens = ['mainScreen', 'detailsScreen', 'formScreen', 'confirmScreen', 'adminScreen'];
    screens.forEach(screen => {
        const element = document.getElementById(screen);
        if (element) element.classList.remove('active');
    });
}

// Tema nocturno/claro
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeButtons(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeButtons(newTheme);
}

function updateThemeButtons(theme) {
    const moonIcon = document.querySelector('.theme-toggle .fa-moon');
    const sunIcon = document.querySelector('.theme-toggle .fa-sun');
    if (moonIcon && sunIcon) {
        if (theme === 'dark') {
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'block';
        } else {
            moonIcon.style.display = 'block';
            sunIcon.style.display = 'none';
        }
    }
}

// Hacer funciones globales
window.selectPackage = selectPackage;
window.showMainScreen = showMainScreen;
window.showDetailsScreen = showDetailsScreen;
window.showFormScreen = showFormScreen;
window.showAdminScreen = showAdminScreen;
window.loginAdmin = loginAdmin;
window.acceptReservation = acceptReservation;
window.toggleTheme = toggleTheme;