<div align="center">

<img src="./public/favicon.svg" width="68" height="68" alt="DevFlow Logo" />

# DevFlow

### Built by a developer, for developers.

A developer-focused workspace for managing projects, tasks, technical knowledge, focus sessions, and GitHub workflows in one streamlined dashboard.

<br />

<p>
  <a href="https://github.com/pavannirmal07/devflow/releases"><img src="https://img.shields.io/badge/version-1.0.0-8b5cf6?style=for-the-badge&logo=github&logoColor=white" alt="Version 1.0.0" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19.2-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19.2" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-2D3748?style=for-the-badge&logo=typescript&logoColor=3178C6" alt="TypeScript 5" /></a>
  <a href="https://vite.dev/"><img src="https://img.shields.io/badge/Vite-8.x-2D3748?style=for-the-badge&logo=vite&logoColor=646CFF" alt="Vite 8" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-4.x-2D3748?style=for-the-badge&logo=tailwindcss&logoColor=06B6D4" alt="Tailwind CSS 4" /></a>
  <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-Database-2D3748?style=for-the-badge&logo=supabase&logoColor=3ECF8E" alt="Supabase" /></a>
</p>

<br />

<p>
  <a href="#overview"><b>Overview</b></a> &bull;
  <a href="#features"><b>Features</b></a> &bull;
  <a href="#technology-stack"><b>Tech Stack</b></a> &bull;
  <a href="#architecture"><b>Architecture</b></a> &bull;
  <a href="#getting-started"><b>Getting Started</b></a> &bull;
  <a href="#github-app-integration"><b>GitHub Integration</b></a> &bull;
  <a href="#developer"><b>Developer</b></a>
</p>

</div>

---

## Overview

**DevFlow** is an all-in-one developer productivity workspace. It eliminates context switching by consolidating project planning, task tracking, focus timer sessions, engineering knowledge documentation, and GitHub repository integration into a cohesive, responsive interface.

Designed with a keyboard-first philosophy, DevFlow includes a global **Command Palette** (`Ctrl+K` / `Cmd+K`) to let engineers navigate, search, and manage tasks without taking their hands off the keyboard.

---

## Features

| Module | Capabilities |
| :--- | :--- |
| <img src="https://img.shields.io/badge/Projects-Workspace-8b5cf6?style=flat-square&logo=folder&logoColor=white" alt="Projects" /> | Multi-project workspace with custom color swatches, active/completed/archived lifecycles, and linked GitHub repository configurations. |
| <img src="https://img.shields.io/badge/Tasks-Kanban_%26_List-3b82f6?style=flat-square&logo=task&logoColor=white" alt="Tasks" /> | Comprehensive task manager with priority tiers (`urgent`, `high`, `medium`, `low`), estimated duration, tags, and GitHub issue associations. |
| <img src="https://img.shields.io/badge/Focus-Pomodoro_Timer-ec4899?style=flat-square&logo=clockify&logoColor=white" alt="Focus Sessions" /> | Deep work focus session tracking with custom interval timers, goal definitions, distraction logging, and completion history. |
| <img src="https://img.shields.io/badge/Knowledge-Engineering_Notes-10b981?style=flat-square&logo=gitbook&logoColor=white" alt="Knowledge Base" /> | Technical documentation base for capturing problem investigations, root cause analyses (RCA), reusable solutions, and code snippets. |
| <img src="https://img.shields.io/badge/GitHub-App_Integration-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub" /> | Native GitHub App workflow for repository search, branch tracking, PR associations, and 1-click issue importing. |
| <img src="https://img.shields.io/badge/Command-Palette-f59e0b?style=flat-square&logo=terminal&logoColor=white" alt="Command Palette" /> | Global keyboard navigation (`Ctrl+K` / `Cmd+K`) for instant global search, rapid task creation, and keyboard-first app control. |
| <img src="https://img.shields.io/badge/Design-Theme_System-6366f1?style=flat-square&logo=color-switch&logoColor=white" alt="Theme System" /> | Engineered dark and light modes with glassmorphic cards, fluid CSS variables, and persistent theme states. |

---

## Screenshots

> **Note**
> Product screenshots and interactive preview assets are being prepared and will be published here shortly.

---

## Technology Stack

<div align="center">

| Layer | Technologies |
| :--- | :--- |
| **Core & Framework** | <img src="https://img.shields.io/badge/React-19.2-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React" /> <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/Vite-8.x-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" /> |
| **Styling & UI** | <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /> <img src="https://img.shields.io/badge/Radix_UI-Primitives-161618?style=flat-square&logo=radix-ui&logoColor=white" alt="Radix UI" /> <img src="https://img.shields.io/badge/Lucide-Icons-F56565?style=flat-square&logo=feather&logoColor=white" alt="Lucide Icons" /> |
| **Backend & Data** | <img src="https://img.shields.io/badge/Supabase-Platform-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" /> <img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" /> <img src="https://img.shields.io/badge/GitHub-REST_API-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub API" /> |
| **Tooling & Quality** | <img src="https://img.shields.io/badge/ESLint-v10-4B32C3?style=flat-square&logo=eslint&logoColor=white" alt="ESLint" /> <img src="https://img.shields.io/badge/pnpm-Package_Manager-F69220?style=flat-square&logo=pnpm&logoColor=white" alt="pnpm" /> |

</div>

---

## Architecture

DevFlow follows a modular, feature-first structure for scalability and maintainability:

```text
devflow/
├── src/
│   ├── assets/              # Static assets and icons
│   ├── components/          # Reusable design system primitives (shadcn / Radix UI)
│   │   ├── command/         # Global Command Palette component & styles
│   │   ├── layout/          # AppShell, Navbar, Sidebar, Navigation
│   │   └── ui/              # Buttons, inputs, dialogs, badges, dropdowns
│   ├── features/            # Feature modules
│   │   ├── about/           # DevFlow info & dynamic version display
│   │   ├── auth/            # Supabase authentication & user session state
│   │   ├── dashboard/       # Productivity analytics, activity feed, metrics
│   │   ├── github/          # GitHub App integration, repo picker, issue linking
│   │   ├── knowledge/       # Technical notes, RCA documentation, tag filters
│   │   ├── profile/         # User profile preferences
│   │   ├── projects/        # Project creation, editing, color theming
│   │   ├── sessions/        # Focus timer, Pomodoro clock, productivity stats
│   │   ├── settings/        # App configuration & preferences
│   │   ├── tasks/           # Task management, Kanban/list views, priority tagging
│   │   └── theme/           # Theme provider (Dark / Light / System)
│   ├── lib/                 # Supabase client, utils, and helper functions
│   └── main.tsx             # Application bootstrap & providers
├── supabase/                # Migrations, schema definitions, Edge Functions
├── package.json             # Application version & dependency manifest
└── vite.config.ts           # Vite configuration & environment definitions
```

---

## Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **pnpm** 9.x or higher (or `npm` / `yarn`)
- A **Supabase** project (free tier works great)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pavannirmal07/devflow.git
   cd devflow
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Start the development server:**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

<details>
<summary><b>Supabase Database Setup</b></summary>

<br />

1. Apply the database migrations located in the [`supabase/migrations`](./supabase/migrations) directory to your Supabase SQL Editor.
2. Ensure Row Level Security (RLS) is enabled to ensure user isolation.
3. Enable Email Authentication in your Supabase Auth settings.

</details>

---

## GitHub App Integration

DevFlow integrates with GitHub using the official GitHub App flow:

1. **Repository Selection**: Browse and filter public and private repositories from connected GitHub organizations or personal accounts directly inside the Create/Edit Project modals.
2. **Issue Import**: Convert GitHub issues directly into actionable DevFlow tasks.
3. **Context Linking**: Link Git branches, pull requests, and commit hashes to tasks for comprehensive development tracking.

---

## Developer

**DevFlow** is designed and crafted by **Pavan Nirmal**.

<br />

<p align="center">
  <a href="https://pavannirmal07.github.io/Portfolio/"><img src="https://img.shields.io/badge/Portfolio-pavannirmal07-8b5cf6?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Portfolio" /></a>
  &nbsp;
  <a href="https://github.com/pavannirmal07"><img src="https://img.shields.io/badge/GitHub-@pavannirmal07-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" /></a>
  &nbsp;
  <a href="https://pavannirmal.vercel.app/"><img src="https://img.shields.io/badge/Blog-Lekhani-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Blog" /></a>
  &nbsp;
  <a href="https://www.instagram.com/pavan__nirmal/"><img src="https://img.shields.io/badge/Instagram-@pavan____nirmal-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram" /></a>
</p>

---

## License

DevFlow is currently proprietary software. All rights reserved. Licensing and open-source availability may be decided at a later stage.
