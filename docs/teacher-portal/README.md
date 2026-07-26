# Teacher Portal — Developer Documentation

> **Product name:** Shule Teacher (Babyeyi Teacher Portal)  
> **Production URL:** [https://ticha.babyeyi.rw](https://ticha.babyeyi.rw)  
> **Standalone app:** `teacher-portal/` (Vite, port **5173**)  
> **Backend:** `BabyeyiSystem/backend` → `/api/teacher-portal/*` (port **5100**)

The Teacher Portal is a teacher-facing React SPA for daily school operations: attendance, marks, timetable, payroll, procurement, permissions, chat, and TichaAvance financing. It shares authentication and APIs with the wider Babyeyi platform.

---

## Who this guide is for

Developers who need to **understand, extend, or rebuild** the Teacher Portal without reading every source file first. Use this index to jump to architecture, routes, APIs, database tables, and local setup.

---

## Deployment shapes

The same feature set is implemented in three places. **Treat `teacher-portal/` as canonical** for the fullest UI.

| Deployment | Path | Notes |
|------------|------|-------|
| **Standalone** | `teacher-portal/` | Full marks hub, classroom QR, purchase requests |
| **Babyeyi Lite** | `BabyeyiSystem/frontend/src/lite/teacher/` | Embedded at `/lite/teacher/*` |
| **Babyeyi Pro** | `babyeyipro/Frontend/web/src/teacher/` | Embedded at `/teacher/*` |

```mermaid
flowchart LR
  subgraph clients [Frontends]
    TP[teacher-portal :5173]
    LITE[/lite/teacher]
    PRO[/teacher]
  end
  subgraph api [Babyeyi Backend :5100]
    TPR[teacherPortal.js]
    PO[portalOperations.js]
    AUTH[auth + session]
    CHAT[chat + ticha-ai]
    SA[shuleAvanceServices.js]
  end
  DB[(MySQL)]
  TP --> AUTH
  LITE --> AUTH
  PRO --> AUTH
  TP --> TPR
  TP --> PO
  TP --> SA
  TPR --> DB
```

---

## Design language

| Element | Value |
|---------|--------|
| **Navy shell** | `#000435` sidebar, dark theme |
| **Gold accent** | `#FEBF10` active nav, badges |
| **Typography** | Montserrat, 10–13px nav labels |
| **Cards** | `rounded-xl` / `rounded-2xl`, white on light pages |
| **Mobile** | Bottom nav + collapsible sidebar |

---

## Sidebar navigation (standalone)

| Section | Features |
|---------|----------|
| **Academic → Teaching** | Students, English Club, Timetable |
| **Academic → Attendance** | Period attendance, Classroom QR, Round roll call, Teacher attendance |
| **Academic → Marks & Exams** | Marks dashboard, Record marks, Marks center, Assessments, Class/student performance, At-risk |
| **Work & Finance** | My payroll, Purchase requests |
| **School Services** | Shule Avance (TichaAvance), TichaDeals, Permissions, School calendar |
| **Communication** | TichaAI, Chat center |
| **Account** | My Profile |

Additional routes exist in `App.jsx` but may be hidden from the sidebar (requisitions, legacy marks paths, exam eligibility).

---

## Core documentation

| Doc | Contents |
|-----|----------|
| [00-architecture](./00-architecture.md) | Folder map, tech stack, services, embedded copies |
| [01-features-and-routes](./01-features-and-routes.md) | Every page, user flows, marks hub sub-routes |
| [02-api-reference](./02-api-reference.md) | REST endpoints the portal calls |
| [03-database-and-auth](./03-database-and-auth.md) | Tables, session auth, SSO, roles |
| [04-developer-guide](./04-developer-guide.md) | Env vars, run/build, extending the portal |

---

## Related documentation

| Topic | Location |
|-------|----------|
| **TichaAvance** (payroll advances) | [../ticha-avance/README.md](../ticha-avance/README.md) |
| **USSD cashout API** | [../teacher-avance-ussd-api.md](../teacher-avance-ussd-api.md) |
| **Web Push (VAPID)** | `BabyeyiSystem/backend/docs/WEB_PUSH_VAPID.md` |

---

## Quick start

```powershell
# Terminal 1 — Backend
cd BabyeyiSystem/backend
npm install
npm run dev          # http://localhost:5100

# Terminal 2 — Teacher Portal
cd teacher-portal
npm install
npm run dev          # http://localhost:5173
```

Log in with a user whose role is `TEACHER`. See [04-developer-guide](./04-developer-guide.md) for seed data and production build.

---

## Key source files

| File | Role |
|------|------|
| `teacher-portal/src/App.jsx` | Route map |
| `teacher-portal/src/context/AuthContext.jsx` | Login, SSO, session |
| `teacher-portal/src/services/api.js` | Axios client (`withCredentials`) |
| `teacher-portal/src/components/Sidebar.jsx` | Navigation structure |
| `BabyeyiSystem/backend/BabyeyiRoutes/teacherPortal.js` | Core APIs + schema bootstrap |
| `BabyeyiSystem/backend/BabyeyiRoutes/portalOperations.js` | Requisitions, permissions |
