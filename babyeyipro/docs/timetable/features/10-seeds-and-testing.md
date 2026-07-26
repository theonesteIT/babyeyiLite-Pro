# 10 — Seeds and Testing

Use seed scripts for fast QA environments.

## Demo seed

```powershell
cd BabyeyiSystem\backend
node scripts/seed-timetable-demo.js
```

## Wisdom P5 seed

```powershell
cd BabyeyiSystem\backend
node scripts/seed-wisdom-p5-timetable.js --school-id=7
```

## Validation checklist after seeding

1. Open `/dos/timetable` and load all 7 tabs.
2. Confirm assignments exist.
3. Generate and apply timetable.
4. Check teacher portal `/teacher/timetable`.
5. Open attendance modules and verify timetable linkage.

