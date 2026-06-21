# AT-API-001: Health Check

**Feature:** @api
**Role:** @buyer
**Priority:** @smoke
**Domain:** @api

## Steps

1. Send GET request to `/api/health`

## Expected

- Response status 200
- Response body contains `status: "ok"`

## Test Data

- endpoint: /api/health
