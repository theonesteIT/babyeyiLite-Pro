# Teacher Portal — Developer Guide

Step-by-step guide to run, build, test, and extend the Teacher Portal.

---

## Prerequisites

- Node.js 18+ (LTS recommended)
- MySQL 8+ with Babyeyi schema
- Running `BabyeyiSystem/backend` (port **5100**)

---

## Local development

### 1. Backend

```powershell
cd BabyeyiSystem/backend
cp .env.example .env    # if first time
# Configure: DB_*, SESSION_SECRET, FRONTEND_URL, ALLOWED_ORIGINS
npm install
npm run dev             # nodemon → http://localhost:5100
```

### 2. Teacher Portal (standalone)

```powershell
cd teacher-portal
npm install
npm run dev             # http://localhost:5173 (strict port)
```

Vite proxies `/api` → `VITE_PROXY_TARGET` (default `http://localhost:5100`).

### 3. Login

Use a user with role **`TEACHER`** linked to a school.

**Seed example** (see `BabyeyiSystem/backend/scripts/seed-wisdom-p5-timetable.md`):

- Password: `Wisdom2026`
- Teacher emails visible in DOS → Timetable → Teachers
- Portal URL: `http://localhost:5173`

---

## Dev port map

| App | Port |
|-----|------|
| Teacher portal | 5173 |
| Main Babyeyi frontend | 5174 |
| Manager | 5175 |
| DOS | 5176 |
| Discipline | 5177 |

Configured in each app’s `vite.config.js`.

---

## Environment variables

### Teacher portal (`teacher-portal/.env.development`)

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_API_URL` | Direct API URL; empty = `/api` proxy | empty |
| `VITE_PROXY_TARGET` | Vite proxy target | `http://localhost:5100` |
| `VITE_UPLOADS_BASE` | Static uploads for deal images | API host |

### Backend (required for portal)

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (5100) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL |
| `SESSION_SECRET` | Session signing |
| `BABYEYI_HASH_SECRET` | Token hashing |
| `FRONTEND_URL` | Primary frontend origin |
| `ALLOWED_ORIGINS` | CORS allowlist (include `:5173`) |
| `VAPID_*` | Web push (TichaAvance notifications) |
| `MTN_MOMO_*` | MoMo payments (TichaDeals) |

### Main Babyeyi frontend (public link only)

| Variable | Purpose |
|----------|---------|
| `VITE_TEACHER_PORTAL_URL` | Header link → `https://ticha.babyeyi.rw` |

---

## Production build

```powershell
cd teacher-portal
# Set VITE_API_URL=https://api.your-domain.rw
npm run build        # output: dist/
npm run preview      # local smoke test
```

Deploy `dist/` to `ticha.babyeyi.rw` (or CDN). Ensure backend `ALLOWED_ORIGINS` includes the portal origin and cookies are set with correct `SameSite`/`Secure` for HTTPS.

---

## Adding a new page

### 1. Create the page component

```
teacher-portal/src/pages/MyFeature.jsx
```

### 2. Register route in `App.jsx`

```jsx
<Route
  path="/my-feature"
  element={
    <ProtectedRoute title="My Feature">
      <MyFeature />
    </ProtectedRoute>
  }
/>
```

### 3. Add sidebar entry in `Sidebar.jsx`

Add to the appropriate `navSections` group:

```javascript
{ name: 'My Feature', path: '/my-feature' }
```

### 4. Add backend endpoint (if needed)

In `BabyeyiSystem/backend/BabyeyiRoutes/teacherPortal.js`:

```javascript
router.get('/my-feature', requireTeacherRole, async (req, res) => {
  const schoolId = req.session.schoolId;
  // ...
  res.json({ success: true, data: result });
});
```

### 5. Call API from frontend

```javascript
import api from '../services/api';
const res = await api.get('/teacher-portal/my-feature');
```

---

## Embedded portal sync

When adding features to standalone `teacher-portal/`, decide whether to port to:

- `BabyeyiSystem/frontend/src/lite/teacher/`
- `babyeyipro/Frontend/web/src/teacher/`

Copy patterns: `PortalRoutes.jsx`, shared components, and `services/api.js`.

---

## Marks hub extension

Marks hub lives under `src/pages/StudentsMarksPages/`:

1. Add page in `pages/`
2. Register in `MarksRoutes.jsx`
3. Add API helpers in `services/marksApi.js`
4. Add sidebar sub-item in `components/Layout/Sidebar.tsx` (marks layout)

Mix of `.tsx` and `.jsx` — follow existing file type per folder.

---

## Web push (TichaAvance alerts)

Teacher portal subscribes via `utils/webPushTeacherPortal.js` → `/api/services/shule-avance/applicant/push/*`.

Service worker: `teacher-portal/public/sw.js`

See `BabyeyiSystem/backend/docs/WEB_PUSH_VAPID.md` for key generation.

---

## Testing checklist

| Area | Manual test |
|------|-------------|
| Login | TEACHER role accepted; others rejected |
| SSO | `?sso_token=` handoff from main app |
| Dashboard | Loads without 401 |
| Attendance | Save and reload period |
| Marks | Register marks, patch cell |
| Chat | Socket connects, unread badge |
| TichaAvance | Eligibility card shows net salary |
| Mobile | Bottom nav, sidebar drawer |
| Logout | Session cleared, redirect login |

---

## Common issues

| Symptom | Fix |
|---------|-----|
| 401 on every request | Check `withCredentials`, CORS, `ALLOWED_ORIGINS` |
| Empty students list | Teacher has no class assignments in DB |
| Marks filters empty | Seed DOS subjects/classes; check teaching assignments |
| Proxy ECONNREFUSED | Start backend on 5100 or fix `VITE_PROXY_TARGET` |
| Port 5173 in use | Kill other Vite instance (`strictPort: true`) |

---

## File change map (by task)

| Task | Files |
|------|-------|
| New teacher API | `teacherPortal.js`, optional schema in same file |
| Requisitions/permissions | `portalOperations.js` |
| New nav item | `Sidebar.jsx`, `App.jsx` |
| Auth change | `AuthContext.jsx`, backend `auth.js` |
| Marks feature | `MarksRoutes.jsx`, `marksApi.js`, `teacherPortal.js` |
| TichaAvance UI | `ShuleAvance.jsx`, `shuleAvanceServices.js` |
