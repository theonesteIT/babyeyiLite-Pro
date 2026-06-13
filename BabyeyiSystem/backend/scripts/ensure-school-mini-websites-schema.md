# School mini-websites schema

Creates the `school_mini_websites` table if it is missing. Public student lookup (`/api/public/student-code-lookup`) and pay flows (`/api/public/public-pay/student-catalog`) need this table for optional school mini-website slugs.

The backend also runs this automatically on startup (`server.js`).

## Run

```powershell
cd BabyeyiSystem\backend
node scripts/ensure-school-mini-websites-schema.js
```

## When to use

- Error: `Table 'babyeyi.school_mini_websites' doesn't exist`
- Student code or SDMS lookup returns **500** on the public pay page
- Fresh database or clone without full schema migration

## Expected output

```
✅  Database connected
    DB   : babyeyi
    Host : localhost:3306
school_mini_websites table is ready.
```

## Verify

```powershell
Invoke-RestMethod -Uri "http://localhost:5100/api/public/student-code-lookup" -Method POST -ContentType "application/json" -Body '{"code":"040030013"}'
```

Should return `"success": true` and `"found": true` (or `"found": false` if that code is not in your DB — but not a 500 error).
