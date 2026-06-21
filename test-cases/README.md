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

Buat file `.md` dengan nama `{TC-ID}-{description}.md`.

Contoh: `AT-E2E-001-explore.md`

## Format template

```markdown
# AT-XXX-001: Judul Test Case

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

| ID | Type | Description |
|----|------|-------------|
| AT-E2E-* | End-to-End | Full browser test via Playwright page objects |
| AT-FV-* | Functional Verification | Flow-specific test (lighter, helpers-based) |
| AT-API-* | API | API-only test via `request` fixture |
