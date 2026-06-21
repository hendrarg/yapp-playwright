# Test Cases

Folder ini berisi dokumen test case (`.md`) yang ditulis dalam bahasa manusia.
Setiap file akan dibaca oleh AI untuk menghasilkan automation test (Playwright spec).

## Struktur folder

```
test-cases/
  buyer/          ← test case untuk buyer flows
  creator/        ← test case untuk creator flows
  auth/           ← test case untuk auth flows
```

## Cara tulis test case

Buat file `.md` di folder domain yang sesuai.

Nama file: `{AT}-{Domain}-{Type}-{Number}.md`

Contoh: `AT-B-E2E-001.md`

## Format template

```markdown
# AT-B-E2E-001: Judul Test Case

**Feature:** @explore | @cart | @products | dll
**Role:** @buyer | @creator
**Priority:** @smoke | @regression | @sanity

## Steps

1. Goto {page}
2. {action 1}
3. {action 2}
4. ...

## Expected

- {expected result 1}
- {expected result 2}

## Test Data

- name: "E-Book"
- price: 29.99
```

## TC ID Pattern

Format: `AT-{Domain}-{Type}-{Number}`

| Kode | Arti |
|------|------|
| AT | Automation Test |
| Domain: B (Buyer), C (Creator), A (Auth) |
| Type: E2E, FV, API |
| Number: 3 digit nomor urut |

Contoh:

| File | Lokasi | Arti |
|------|--------|------|
| `AT-B-E2E-001.md` | `test-cases/buyer/` | Buyer E2E test #1 |
| `AT-C-E2E-001.md` | `test-cases/creator/` | Creator E2E test #1 |
| `AT-B-FV-001.md` | `test-cases/buyer/` | Buyer FV test #1 |
| `AT-A-API-001.md` | `test-cases/auth/` | Auth API test #1 |
