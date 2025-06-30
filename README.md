# ViaFlow

## Descripción General

ViaFlow es una aplicación híbrida web y móvil diseñada para la **gestión integral de finanzas personales, finanzas empresariales y logística**. El objetivo es consolidar en un solo sistema modular y escalable el control completo del dinero y operaciones logísticas, con un enfoque profesional, colaborativo y adaptable.

---

## Objetivo Principal

Crear una plataforma única que permita a usuarios individuales y equipos gestionar:

- **Finanzas personales y compartidas**: manejar wallets (monederos/cuentas), transacciones, presupuestos, categorías y reportes.
- **Finanzas empresariales**: multiusuario con permisos diferenciados, soporte para múltiples wallets empresariales, control de gastos e ingresos, y reportes detallados.
- **Logística avanzada**: seguimiento en tiempo real de unidades móviles (ambulancias), registro de viajes por trabajador, gestión y control de proveedores, y planificación de rutas óptimas con múltiples destinos.

---

## Público Objetivo

- Usuarios individuales que quieren controlar su economía personal y familiar.
- Equipos y pequeñas empresas que necesitan una solución para gestionar sus finanzas colaborativamente.
- Equipos logísticos que requieren seguimiento en tiempo real, planificación y registro detallado de operaciones.

---

## Tecnologías Clave

- **Frontend**: Next.js 13+ (App Router) con TypeScript y Tailwind CSS para UI rápida, limpia y responsiva.
- **Backend/serverless**: Firebase (Firestore, Authentication, Storage) para gestión de datos, autenticación y hosting.
- **Estado global**: Zustand para manejo eficiente del estado en React.
- **Mapas y logística**: Google Maps API para tracking en tiempo real, planificación y visualización de rutas.
- **Linting y calidad**: ESLint y Prettier configurados para mantener código limpio y uniforme.

---

## Estructura de la App

La app está organizada modularmente para mantener separación clara de responsabilidades y facilitar escalabilidad:

- **src/app/**: Rutas principales divididas en:
  - `(auth)/`: Autenticación y gestión de usuarios.
  - `(main)/`: Dashboard y funciones protegidas.
  - `api/`: Endpoints API para operaciones backend.
  - `lib/`: Configuraciones compartidas y utilidades.
- **src/components/**: Componentes React organizados por funcionalidad:
  - `auth/`, `dashboard/`, `finance/`, `logistics/`, `shared/`, `ui/`
- **src/constants/**: Constantes de la app.
- **src/context/**: Contextos React para estado global específico.
- **src/hooks/**: Custom hooks reutilizables.
- **src/services/**: Clientes y servicios externos (Firebase, Google Maps).
- **src/stores/**: Zustand stores para manejo de estado.
- **src/types/**: Definiciones TypeScript.
- **src/utils/**: Funciones utilitarias.
- **src/styles/**: Estilos globales.

---

## Qué Queremos Lograr

1. Construir un sistema 100% gratuito, personalizable y escalable para finanzas y logística.
2. Facilitar el uso desde dispositivos web, iPhone y Samsung.
3. Permitir múltiples usuarios con roles y permisos diferenciados en cada wallet y módulo.
4. Integrar funcionalidades avanzadas como reportes gráficos, presupuestos, pagos futuros, y gestión de proveedores.
5. Implementar seguimiento en tiempo real para ambulancias con rutas óptimas y registro detallado de viajes y trabajadores.
6. Mantener una arquitectura limpia y modular para fácil mantenimiento y expansión.

---

## Estado Actual / Qué Hicimos

- Proyecto inicial con Next.js 13+ y estructura modular base creada.
- Configuración inicial de TypeScript, ESLint y Tailwind CSS en proceso (pendiente ajustes).
- Firebase conectado para autenticación y Firestore (pendiente endpoints y lógica).
- Estructura de carpetas organizada para separar finanzas, logística, UI y servicios.
- Definidos componentes base para autenticación y dashboard.
- Pendiente integración completa de Google Maps API para módulo logístico.
- Pendiente desarrollo de módulos financieros (wallets, transacciones, presupuestos).
- Pendiente implementación de control multiusuario con permisos.

---

## Comunicación y Control de Cambios

- Usaremos GitHub para control de versiones, issues y pull requests.
- Cada cambio debe pasar por una revisión de código para mantener calidad.
- Documentaremos bien cada módulo y funcionalidad nueva.
- Coordinaremos avances y prioridades en base a milestones semanales.
- Feedback continuo para ajustar funcionalidades y corregir errores rápidamente.



---

**Alex Dauria**  
