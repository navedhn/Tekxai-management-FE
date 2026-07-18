# Tekxai Management Platform 🚀

**Tekxai** is a high-performance, modern administrative ecosystem designed to streamline team management, project tracking, and productivity workflows. Built with a focus on speed, responsiveness, and premium aesthetics, Tekxai provides a seamless experience for both administrators and employees.

---

## ✨ Key Features

### 📊 Advanced Administrative Dashboard
- **Real-time Insights**: Adaptive stats cards for projects, hours, and check-ins.
- **Activity Streams**: High-fidelity recent activity tracking with interactive project cards.
- **Project Summaries**: Instant access to ongoing work with smart filtering and search.

### 👥 User & Team Management
- **Role-Based Control**: Manage access levels, departments, and designations with ease.
- **Member Invites**: Dedicated invitation system with secure token-based onboarding.
- **Team Structure**: Organize members into specialized teams (UI/UX, Frontend, Backend).

### ⏳ Effortless Timesheet Tracking
- **Interactive Logs**: Comprehensive view of daily entries, check-ins, and durations.
- **Request Workflows**: Integrated systems for handling time-entry edits and time-off requests.
- **Productivity Metrics**: Visual progress tracking for tasks and project hours.

### 🔍 Optimized Data Interaction
- **Instant Search**: Debounced frontend-filtering for ultra-responsive data lookups.
- **Global Filters**: Standardized, high-speed filtering across all management modules.

---

## 🛠 Tech Stack

- **Framework**: [React 18](https://reactjs.org/) + [Vite 5](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Vanilla CSS](https://developer.mozilla.org/en-US/docs/Web/CSS)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **State & Data**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## ⚡ Performance Optimizations

Tekxai is engineered for speed and scalability:
- **Manual Chunking**: Third-party libraries (React, Framer Motion, TanStack Query) are split into optimized chunks to ensure initial load times remain minimal.
- **Frontend Filtering**: Datasets are fetched efficiently once and filtered on the client-side for instantaneous UI feedback.
- **Lazy Loading**: All routes are code-split using `React.lazy` to provide on-demand component loading.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yodo-dev/Tekxai-management-FE.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

---

## 📁 Project Structure

```text
src/
├── assets/         # Global assets and brand icons
├── components/     # Reusable UI components (Modals, Tables, Inputs)
├── hooks/          # Custom logical hooks (useDebounce, useAuth)
├── layouts/        # Page wrappers (AdminLayout, EmployeeLayout)
├── lib/            # External library configurations (QueryClient)
├── pages/          # Feature-specific page components
├── services/       # API integration layers
├── stores/         # Global state management
└── styles/         # Global typography and design system tokens
```

---

## 🖥️ Desktop Release Process

The `desktop-app/` folder contains the TekXAI time-tracking desktop agent (Electron). Release documentation lives under `docs/`:

- **Release notes** (per-version changelog, artifacts, verification evidence): [`docs/releases/desktop/`](docs/releases/desktop/) — see [`RELEASE_v1.0.0.md`](docs/releases/desktop/RELEASE_v1.0.0.md) for the current release
- **CI/CD restoration plan** (proposal for automating build/deploy/verify/rollback — not yet implemented): [`docs/ci-cd/DESKTOP_CICD_RESTORATION_PLAN.md`](docs/ci-cd/DESKTOP_CICD_RESTORATION_PLAN.md)
- **QA improvement plan** (proposal for automated desktop testing — not yet implemented): [`docs/qa/DESKTOP_QA_IMPROVEMENT_PLAN.md`](docs/qa/DESKTOP_QA_IMPROVEMENT_PLAN.md)

There is currently no automated CI/CD pipeline for the desktop app — releases are built and deployed manually. See the CI/CD restoration plan above before making changes to the release process.

---

## 📝 License

This project is maintained by the **TEKXAI** team.
