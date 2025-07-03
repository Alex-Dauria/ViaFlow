# ViaFlow - Gestión Financiera y Logística

## 📌 Descripción General

**ViaFlow** es una aplicación web/móvil para gestión financiera colaborativa y logística avanzada, diseñada para:

- 💸 Control de finanzas personales y empresariales  
- 🚑 Seguimiento logístico en tiempo real  
- 👥 Gestión de equipos y proveedores  

---

## 🎯 Funcionalidades Implementadas

### 💰 Módulo Financiero (Completo)

#### ✔️ Wallets Multi-moneda

- Creación con iconos personalizados  
- Soporte para USD, EUR, ARS, CHF  
- Compartición entre usuarios  
- Marca de wallets compartidas (`isShared`)  

#### ✔️ Sistema de Transacciones Avanzado

- Ingresos / Egresos con categorías  
- Transferencias entre contribuidores  
- Historial mensual organizado  
- **Nuevo**: Aportes por grupo y transferencias de grupo para equilibrar balances  
- **Nuevo**: Transacciones de tipo `group-adjust` para ajustes de grupo  

#### ✔️ Sistema de Grupos Colaborativos

- Creación de grupos de contribuidores por categoría  
- Cálculo automático de diferencias en aportes  
- Recomendaciones de transferencias para equilibrar balances  
- Registro de transferencias de grupo con ajuste automático  

#### ✔️ Subwallets (Contribuidores)

- Balances individuales  
- Visualización clara de aportes  
- Transferencias internas  

#### ✔️ Visualización de Datos Mejorada

- Balances por mes y total  
- Detalle de transacciones expandible  
- Resumen por contribuidor  
- **Nuevo**: Sección de aportes por grupo con diferencias y recomendaciones  

---

## 🚧 Próximos Desarrollos

### 📅 En Progreso

- Módulo de logística con Google Maps API  
- Sistema de roles y permisos  

### 📋 Pendientes

- Reportes gráficos avanzados  
- Presupuestos y pagos programados  
- Optimización para dispositivos móviles  

---

## 🛠 Tecnologías Principales

```bash
Frontend:  Next.js 13+ | TypeScript | Tailwind CSS  
Backend:   Firebase (Auth / Firestore)  
Estado:    Zustand  
Mapas:     Google Maps API  
Calidad:   ESLint | Prettier  
```

## 🛠 Estructura del Proyecto

```bash
Copiar
Editar
src/
├── app/            # Rutas principales
├── components/     # Componentes React
│   ├── finance/    # Módulo financiero
│   │   ├── Wallets.tsx
│   │   └── Transactions.tsx
│   ├── logistics/  # Módulo logístico
│   └── shared/     # Componentes comunes
├── services/       # Conexiones a APIs
├── stores/         # Gestión de estado
└── types/          # Definiciones TS
```

## ✨ Características Destacadas

### Módulo Financiero

**Wallets:**

- Creación y edición de wallets con iconos personalizados  
- Compartir wallets con otros usuarios  
- Marcar wallets como compartidas (`isShared`)  
- Ordenamiento por fecha de creación  

**Transacciones:**

- Soporte para múltiples tipos: `income`, `expense`, `transfer`, `contribution`, `group-adjust`  
- Gestión de categorías y contribuidores  
- Filtros avanzados por tipo, categoría, contribuidor, moneda y fecha  
- Historial organizado por meses con secciones expandibles  

**Grupos:**

- Creación de categorías de tipo `contribution` con grupos de contribuidores  
- Cálculo automático de diferencias en los aportes por grupo  
- Recomendaciones de transferencias para equilibrar los aportes  
- Modal para registrar transferencias de grupo con ajuste automático  

---

### Módulo Logístico (En desarrollo)

- Integración con Google Maps API  
- Seguimiento de rutas y entregas en tiempo real  

---

## 🌟 Próximas Mejoras

- Dashboard de resumen financiero  
- Sincronización multicloud  
- Integración con APIs bancarias  
- Sistema de alertas y notificaciones  

---

**Alex Dauria**
