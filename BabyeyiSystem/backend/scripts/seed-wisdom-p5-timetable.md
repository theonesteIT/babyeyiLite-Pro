# Wisdom P5 timetable seed (ST THEO)

Imports P5A–P5H courses, teachers, and assignments. Clears existing timetables, courses, assignments, and teachers for the school first.

**Teacher password:** `Wisdom2026`

## Run

```powershell
cd BabyeyiSystem\backend
node scripts/seed-wisdom-p5-timetable.js --school-id=7
```

## Options

| Flag | Description |
|------|-------------|
| `--school-id=7` | Target school (default: first school in DB) |
| `--no-clear` | Skip full wipe; only upsert seed data |

## Teacher portal login

After import, each teacher signs in at **http://localhost:5173** (Teacher Portal):

| Field | Value |
|-------|--------|
| Email | On each teacher card in DOS → Timetable → **Teachers** |
| Password | `Wisdom2026` |

Teachers record marks: **Marks → Record marks** → pick assignment → enter scores → Publish.

## Seed marks & reports (one term)

DOS → Timetable → **Teachers** → **Seed term marks**

Or CLI:

```powershell
node -e "require('dotenv').config(); const {promisePool}=require('./config/database'); const {runTermMarksSeed}=require('./utils/marksReportsDemoSeed'); (async()=>{ const r=await runTermMarksSeed(7,1,{term:'Term 1',generateReports:true}); console.log(r.summary); await promisePool.end(); })();"
```

Then open **Student Marks Reports → Mid-Term / Final Reports**.

## API (optional)

```http
POST /api/dos/timetable-system/seed-wisdom-p5
{ "full_clear": true, "sync_teacher_assignments": true }
```
