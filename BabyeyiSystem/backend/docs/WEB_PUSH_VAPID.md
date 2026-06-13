# Web Push — VAPID keys (Babyeyi)

Fee reminders (guest public pay + parent portal) use **Web Push** with **VAPID** keys on the backend.

## Generate new VAPID keys

From the backend folder:

```bash
cd BabyeyiSystem/backend
node -e "const w=require('web-push');const k=w.generateVAPIDKeys();console.log(k)"
```

Copy the output into `BabyeyiSystem/backend/.env`:

```env
VAPID_PUBLIC_KEY=<publicKey from output>
VAPID_PRIVATE_KEY=<privateKey from output>
VAPID_SUBJECT=mailto:your-contact@example.com
```

`VAPID_SUBJECT` must be a `mailto:` contact (often the same email as `SMTP_USER`).

Restart the API after changing `.env`:

```bash
npm run dev
```

## Verify keys load

```bash
cd BabyeyiSystem/backend
node -e "require('dotenv').config(); const { isWebPushConfigured } = require('./BabyeyiRoutes/webPushSubscriptions'); console.log('configured:', isWebPushConfigured());"
```

Should print: `configured: true`

## Why you may not see “Allow” when opening the site

Web push uses a **two-step** flow (by design — browsers block permission prompts on first paint):

1. **Babyeyi intro** (home page `/` only) — “Stay Updated Instantly” with **Enable Notifications** / **Maybe Later**
   - Appears after ~**2.8 seconds**, or up to **12 seconds** on first visit
   - Does **not** show on every route — only `PublicPage.jsx` (landing `/`)

2. **Chrome native Allow / Block** — only after you click **Enable Notifications** on the Babyeyi card

You will **not** get Chrome’s Allow popup immediately on refresh; you must click Enable first.

### If the Babyeyi intro never appears

| Cause | Fix |
|--------|-----|
| Already answered before | Reset in browser DevTools → Application → Local Storage → remove `babyeyi_notif_prompt_answered` |
| Clicked “Maybe Later” this tab | Close tab or clear session storage key `babyeyi_notif_prompt_session_hide` |
| Notifications already allowed | Chrome site settings already Allow — no prompt needed |
| Notifications blocked | Chrome → Site settings → Notifications → Allow for `localhost:5173` |
| Not on home page | Open `http://localhost:5173/` (not `/paid-at-school` only) |
| `Notification` API unsupported | Use Chrome/Edge on desktop or Android |

### Reset notification prompt (browser console on home page)

```javascript
localStorage.removeItem('babyeyi_notif_prompt_answered');
localStorage.removeItem('babyeyi_public_push_banner_dismissed');
sessionStorage.removeItem('babyeyi_notif_prompt_session_hide');
location.reload();
```

## When real fee reminders are sent

Reminders are **not** sent on every page load. They are sent when:

1. User allows notifications (guest push registered)
2. User makes a **partial** school fee payment and selects a **promise date**
3. Backend scheduler runs daily (~every hour) until balance is paid or promise date is reached

Reminder links open: `/remainder-student-pay-fees?code=STUDENT_CODE&remain=...`
