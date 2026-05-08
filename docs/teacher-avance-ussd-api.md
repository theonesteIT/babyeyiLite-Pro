# Teacher Avance USSD API

Small API guide for USSD integrations using the Teacher Portal cashout flow.

## Base URL

- Local: `http://localhost:5100`
- API prefix: `/api/teacher-portal/avance/ussd`

Full example base:

- `http://localhost:5100/api/teacher-portal/avance/ussd`

---

## 1) Login (Teacher Code / Staff Code + Password)

Authenticates a teacher and returns a short-lived `access_token` for USSD calls.

- Method: `POST`
- URL: `/api/teacher-portal/avance/ussd/login`
- Content-Type: `application/json`

### Request body

```json
{
  "identifier": "TR-007",
  "password": "YourPassword123",
  "school_code": "001"
}
```

For **BabyeyiPro / Manager HR Central** (`HRCentral.jsx`), set **`identifier`** to the **Staff ID / Code** the manager sees on employment step — the same value stored as **`staff.staff_id`** in the database (auto-generated style such as `TR-007`, `DEP-003`, depending on department/role).

`identifier` also matches (backend):
- `staff.staff_id` (preferred for USSD when staff code exists)
- `users.user_uid`
- `staff.username`

### Success response (example)

```json
{
  "success": true,
  "message": "Teacher login successful",
  "data": {
    "access_token": "token_here",
    "token_type": "Bearer",
    "expires_in_minutes": 30,
    "teacher": {
      "id": 125,
      "code": "TCH-00123",
      "full_name": "John Doe",
      "email": "john@school.rw",
      "school_id": 14,
      "school_code": "001",
      "school_name": "Kigali Smart School"
    },
    "avance_policy": {
      "auto_approval_ratio": 0.4,
      "net_salary": 300000,
      "auto_approval_limit": 120000
    }
  }
}
```

### cURL

```bash
curl -X POST "http://localhost:5100/api/teacher-portal/avance/ussd/login" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"TR-007\",\"password\":\"YourPassword123\",\"school_code\":\"001\"}"
```

### Postman

- Method: `POST`
- URL: `{{baseUrl}}/api/teacher-portal/avance/ussd/login`
- Body (raw / JSON):

```json
{
  "identifier": "{{teacherStaffId}}",
  "password": "{{password}}",
  "school_code": "{{schoolCode}}"
}
```

Set **`teacherStaffId`** in the environment to the teacher’s **Staff ID / Code** from Manager **HR Central** (same as `staff.staff_id`).

---

## 2) Create Cashout Request

Creates a teacher cashout request.

- Method: `POST`
- URL: `/api/teacher-portal/avance/ussd/cashout-request`
- Auth: Bearer token from login
- Content-Type: `application/json`

If amount is less than or equal to 40% of net salary, it is auto-approved.

### Request body

```json
{
  "amount_requested": 120000,
  "reason": "Medical emergency",
  "cashout_category_slug": "general"
}
```

### Success response (example)

```json
{
  "success": true,
  "message": "Cashout auto-approved (<= 40% of net salary)",
  "data": {
    "request_id": 981,
    "status": "approved",
    "amount_rwf": 120000,
    "auto_approved": true,
    "net_salary": 300000,
    "auto_approval_limit": 120000
  }
}
```

### cURL

```bash
curl -X POST "http://localhost:5100/api/teacher-portal/avance/ussd/cashout-request" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d "{\"amount_requested\":120000,\"reason\":\"Medical emergency\",\"cashout_category_slug\":\"general\"}"
```

### Postman

- Method: `POST`
- URL: `{{baseUrl}}/api/teacher-portal/avance/ussd/cashout-request`
- Authorization: `Bearer Token` => `{{accessToken}}`
- Body (raw / JSON):

```json
{
  "amount_requested": 120000,
  "reason": "Medical emergency",
  "cashout_category_slug": "general"
}
```

---

## 3) List Teacher Requests + Status

Returns the authenticated teacher's avance request history and statuses.

- Method: `GET`
- URL: `/api/teacher-portal/avance/ussd/requests`
- Auth: Bearer token from login

### Success response (example)

```json
{
  "success": true,
  "data": [
    {
      "request_id": 981,
      "request_type": "cashout",
      "amount_rwf": 120000,
      "status": "approved",
      "reason": "Medical emergency",
      "cashout_category_slug": "general",
      "submitted_at": "2026-05-07T09:30:00.000Z",
      "accountant_note": null,
      "manager_feedback": null
    }
  ]
}
```

### cURL

```bash
curl -X GET "http://localhost:5100/api/teacher-portal/avance/ussd/requests" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Postman

- Method: `GET`
- URL: `{{baseUrl}}/api/teacher-portal/avance/ussd/requests`
- Authorization: `Bearer Token` => `{{accessToken}}`

---

## Suggested Postman Environment

Create environment variables:

- `baseUrl` = `http://localhost:5100`
- `accessToken` = (set after login)

Optional script in Login request (Tests tab) to auto-save token:

```javascript
const token = pm.response.json()?.data?.access_token;
if (token) pm.environment.set("accessToken", token);
```

---

## Error Notes

- `401` invalid/expired token or bad credentials
- `403` role not allowed / account inactive
- `400` validation error (missing amount, missing reason, etc.)
- `500` server error
