# Greenhouse Microclimate & Irrigation Telemetry Monitoring 🌿

> Industrial telemetry, irrigation analytics, and microclimate compliance monitoring system for high-yield multi-sector greenhouse complexes.

[![React](https://img.shields.io/badge/React-19.0-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646cff.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

---

## Architecture & System Overview

**Greenhouse Telemetry Dashboard** is an enterprise operations management suite engineered for modern industrial greenhouse facilities. It digitizes the daily operational cycle across 5 dedicated greenhouse blocks and multiple sectors.

```
 [Sensors & Manual Input]
 (Drip/Drain, EC, pH, Temp, Lux)
             │
             ▼
   [Express API Server] ──► [Telemetry & Criteria Engine]
             │                          │
             │                          ├──► [Out-of-Bounds Threshold Alarm]
             │                          │           │
             │                          │           ▼ (SMTP Nodemailer)
             │                          │    [Real-time Email Alerts]
             ▼                          ▼
 [Local JSON Store / SQLite]   [Analytical Aggregator (Recharts)]
             ▲
             │
   [React 19 SPA Frontend]
   (Operator, Lab, Agronomist, Analytics & Editor Views)
```

---

## Core Capabilities

- **Role-Based Access Control (RBAC)**: Distinct purpose-built workspaces for Operators, Laboratory Analysts, Head Agronomists, Monitoring Analysts, and System Administrators.
- **Irrigation & Drainage Telemetry**: Precision logging of drip volume ($ml$), drainage volume ($ml$), drainage percentage, and overnight dry-down metrics (`night_drop`).
- **Agrochemistry & pH/EC Compliance**: Real-time validation of nutrient solution parameters against week-specific dynamic criteria envelopes (`besin_ec`, `besin_ph`, `drenaj_ec`, `drenaj_ph`).
- **Automated Incident Dispatch**: Instant SMTP notification triggers whenever chemical or drainage thresholds deviate from agronomical guidelines.
- **Agronomic Plant Phenotyping**: Quantitative tracking of stem diameter ($mm$), weekly stem elongation, leaf dimensions, fruit count per plant, and $kg/m^2$ yield estimation.
- **Microclimate Solar Radiation Integration**: Solar radiation ($J/cm^2$ or radiation units), sunrise/sunset tracking, and 24h mean temperature profiling.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide React, Recharts
- **Backend & Middleware**: Node.js, Express, TSX, Vite (Middleware mode), Nodemailer
- **Persistence**: Low-overhead JSON Document Store (`parnik_store.json`) with atomic flush
- **Tooling**: Esbuild, Vite, PWA integration

---

## Quick Start

### 1. Installation

```bash
git clone https://github.com/butterflydrunk/parnik-monitoring.git
cd parnik-monitoring
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
# Configure SMTP alert credentials and port settings if necessary
```

### 3. Run Development Server

```bash
npm run dev
```

The application will be live at `http://localhost:3000`.

---

## Roles & Default Access Profiles

| Role | Username | Permissions |
| :--- | :--- | :--- |
| **Operator** | `operator` | Drip/drain logging, environmental parameters |
| **Laboratory** | `laboratoriya` | Solution EC/pH chemical testing & quality controls |
| **Agronomist** | `agronom` | Plant phenotyping, yield estimation, cluster health |
| **Monitoring** | `monitoring` | Facility-wide telemetry charts & trend reporting |
| **Editor** | `redaktor` | Full audit log revision, record deletion, criteria management |

---

## License

MIT License. Open for adaptation in smart agriculture and controlled-environment agricultural facilities.
