#!/usr/bin/env python3
"""
Fix hardcoded localhost:5100 references in BabyeyiLite-Pro frontend source files.
Run this on your server: python3 fix_localhost.py
"""

import os
import re

BASE = "/root/apps/babyeyiLite-Pro"
PROD_URL = "https://babyeyi.rw"

# Files with FULLY hardcoded localhost (no import.meta.env fallback)
EXACT_FIXES = {
    # ---- BabyeyiSystem ----
    f"{BASE}/BabyeyiSystem/frontend/src/Pages/Nesa Page/NESAPages/FeeLimitsView.jsx": [
        ('const BASE_URL = "http://localhost:5100"',
         f'const BASE_URL = import.meta.env.VITE_API_URL || "{PROD_URL}"'),
    ],
    f"{BASE}/BabyeyiSystem/frontend/src/Pages/Public Page/ApplicationStatusTracker.jsx": [
        ('const SERVER       = "http://localhost:5100"',
         f'const SERVER = import.meta.env.VITE_API_URL || "{PROD_URL}"'),
    ],
    f"{BASE}/BabyeyiSystem/frontend/src/Pages/School Manager/components/SchoolMiniWebsitePage.jsx": [
        ('const SERVER        = "http://localhost:5100"',
         f'const SERVER = import.meta.env.VITE_API_URL || "{PROD_URL}"'),
    ],
    f"{BASE}/BabyeyiSystem/frontend/src/Pages/School Manager/components/UpdateBabyeyi.jsx": [
        ('const API_BASE   = "http://localhost:5100/api"',
         f'const API_BASE = (import.meta.env.VITE_API_URL || "{PROD_URL}") + "/api"'),
        ('const ASSET_BASE = "http://localhost:5100"',
         f'const ASSET_BASE = import.meta.env.VITE_API_URL || "{PROD_URL}"'),
    ],
    f"{BASE}/BabyeyiSystem/frontend/src/Pages/School Manager/components/BabyeyiList.jsx": [
        ('const API_BASE        = "http://localhost:5100/api"',
         f'const API_BASE = (import.meta.env.VITE_API_URL || "{PROD_URL}") + "/api"'),
        ('const ASSET_BASE      = "http://localhost:5100"',
         f'const ASSET_BASE = import.meta.env.VITE_API_URL || "{PROD_URL}"'),
    ],
    f"{BASE}/BabyeyiSystem/frontend/src/Pages/School Manager/components/OtherPages.jsx": [
        ('const API_BASE = "http://localhost:5100/api"',
         f'const API_BASE = (import.meta.env.VITE_API_URL || "{PROD_URL}") + "/api"'),
    ],
    f"{BASE}/BabyeyiSystem/frontend/src/Pages/School Manager/components/BabyeyiVerifyPage.jsx": [
        ('const API_BASE        = "http://localhost:5100/api"',
         f'const API_BASE = (import.meta.env.VITE_API_URL || "{PROD_URL}") + "/api"'),
        ('const ASSET_BASE      = "http://localhost:5100"',
         f'const ASSET_BASE = import.meta.env.VITE_API_URL || "{PROD_URL}"'),
    ],
    f"{BASE}/BabyeyiSystem/frontend/src/Pages/School Manager/components/AdmissionApplyPage.jsx": [
        ('const API = "http://localhost:5100/api/admissions"',
         f'const API = (import.meta.env.VITE_API_URL || "{PROD_URL}") + "/api/admissions"'),
        ('const SERVER = "http://localhost:5100"',
         f'const SERVER = import.meta.env.VITE_API_URL || "{PROD_URL}"'),
    ],
    f"{BASE}/BabyeyiSystem/frontend/src/Pages/School Manager/components/BabyeyiPDF.jsx": [
        ('const API_BASE   = "http://localhost:5100/api"',
         f'const API_BASE = (import.meta.env.VITE_API_URL || "{PROD_URL}") + "/api"'),
        ('const ASSET_BASE = "http://localhost:5100"',
         f'const ASSET_BASE = import.meta.env.VITE_API_URL || "{PROD_URL}"'),
    ],
    f"{BASE}/BabyeyiSystem/frontend/src/Pages/School Manager/components/AdmissionFormBuilder.jsx": [
        ('const API = "http://localhost:5100/api/admissions"',
         f'const API = (import.meta.env.VITE_API_URL || "{PROD_URL}") + "/api/admissions"'),
    ],
    f"{BASE}/BabyeyiSystem/frontend/src/Pages/School Manager/components/ApplicantDetailModal.jsx": [
        ('const SERVER = "http://localhost:5100"',
         f'const SERVER = import.meta.env.VITE_API_URL || "{PROD_URL}"'),
    ],
    f"{BASE}/BabyeyiSystem/frontend/src/Pages/School Manager/components/Babyeyi.jsx": [
        ('const API_BASE   = "http://localhost:5100/api"',
         f'const API_BASE = (import.meta.env.VITE_API_URL || "{PROD_URL}") + "/api"'),
        ('const ASSET_BASE = "http://localhost:5100"',
         f'const ASSET_BASE = import.meta.env.VITE_API_URL || "{PROD_URL}"'),
    ],

    # ---- babyeyipro ----
    f"{BASE}/babyeyipro/Frontend/web/src/manager/pages/Students.jsx": [
        ('src={`http://localhost:5100${student.student_photo_url}`}',
         'src={`${import.meta.env.VITE_API_URL || "' + PROD_URL + '"}${student.student_photo_url}`}'),
        ('src={`http://localhost:5100${s.student_photo_url}`}',
         'src={`${import.meta.env.VITE_API_URL || "' + PROD_URL + '"}${s.student_photo_url}`}'),
    ],
    f"{BASE}/babyeyipro/Frontend/web/src/displine_staff_portal/frontend/src/components/StudentDisciplineModal.jsx": [
        ('src={`http://localhost:5100${student.student_photo_url}`}',
         'src={`${import.meta.env.VITE_API_URL || "' + PROD_URL + '"}${student.student_photo_url}`}'),
    ],
    f"{BASE}/babyeyipro/Frontend/web/src/accountant_portal/frontend/src/components/StudentDisciplineModal.jsx": [
        ('src={`http://localhost:5100${student.student_photo_url}`}',
         'src={`${import.meta.env.VITE_API_URL || "' + PROD_URL + '"}${student.student_photo_url}`}'),
    ],
}

fixed_count = 0
skipped_count = 0
error_count = 0

for filepath, replacements in EXACT_FIXES.items():
    if not os.path.exists(filepath):
        print(f"  [SKIP] Not found: {filepath}")
        skipped_count += 1
        continue

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
            print(f"  [FIXED] {filepath.replace(BASE+'/', '')}")
            print(f"          - {old[:60]}...")
        else:
            print(f"  [WARN]  Pattern not found in {filepath.replace(BASE+'/', '')}")
            print(f"          - {old[:60]}...")

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        fixed_count += 1
    else:
        skipped_count += 1

print(f"\n{'='*60}")
print(f"Done! Fixed: {fixed_count} files | Skipped/Not found: {skipped_count}")
print(f"\nNow verify no bare hardcoded localhost remain:")
print(f"  grep -rn 'http://localhost:5100' {BASE}/BabyeyiSystem/frontend/src/ | grep -v 'import.meta.env' | grep -v 'VITE_'")