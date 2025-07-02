# ViaFlow - Gestión Financiera y Logística

## 📌 Descripción General

ViaFlow es una aplicación web/móvil para **gestión financiera colaborativa** y **logística avanzada**, diseñada para:
- Control de finanzas personales y empresariales
- Seguimiento logístico en tiempo real
- Gestión de equipos y proveedores

## 🎯 Funcionalidades Implementadas

### 💰 Módulo Financiero (Completo)
✔️ **Wallets Multi-moneda**  
- Creación con iconos personalizados  
- Soportes para USD, EUR, ARS, CHF  
- Compartición entre usuarios  

✔️ **Sistema de Transacciones**  
- Ingresos/Egresos con categorías  
- Transferencias entre contribuidores  
- Historial mensual organizado  

✔️ **Subwallets (Contribuidores)**  
- Balances individuales  
- Visualización clara de aportes  
- Transferencias internas  

✔️ **Visualización de Datos**  
- Balances por mes y total  
- Detalle de transacciones expandible  
- Resumen por contribuidor  

## 🚧 Próximos Desarrollos

### 📅 En Progreso
- Módulo de logística con Google Maps API
- Sistema de roles y permisos

### 📋 Pendientes
- Reportes gráficos avanzados
- Presupuestos y pagos programados
- Optimización móvil

## 🛠 Tecnologías Principales

```bash
Frontend:  Next.js 13+ | TypeScript | Tailwind CSS  
Backend:   Firebase (Auth/Firestore)  
Estado:    Zustand  
Mapas:     Google Maps API  
Calidad:   ESLint | Prettier  

## 🛠 Estructura del Proyecto

src/
├── app/            # Rutas principales
├── components/     # Componentes React
│   ├── finance/    # Módulo financiero
│   ├── logistics/  # Módulo logístico
│   └── shared/     # Componentes comunes
├── services/       # Conexiones a APIs
├── stores/         # Gestión de estado
└── types/          # Definiciones TS

# Alex Dauria