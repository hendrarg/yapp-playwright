# AT-B-E2E-006: Buyer Exclusive Content — Locked → Unlock Flow

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-E2E-006 |
| Layer | E2E Journey |
| Priority | Critical |
| Epic | Buyer Discovery |
| Feature | Exclusive + Post Detail + Monetization |

## Objective

Validasi full flow exclusive content: locked post dengan blur + lock icon + price label, post detail dengan konten blur dan unlock button, purchase/unlock konten, verifikasi konten ter-unlock di feed dan detail, serta konsistensi price dan indikator monetization.

## Preconditions

- Buyer logged in
- Create Exclusive content post exists (locked, belum di-unlock) with api another user with price 20000

## Test Flow

### Step 1 — Verify Locked Post in Feed

- Buka halaman Feeds
- **Verify:** Locked post menampilkan blur preview + lock icon

### Step 2 — Open Locked Post Detail

- buka detail post
- **Verify:** Post detail page terbuka
- **Verify:** Konten tetap blur/tersamar
- **Verify:** Unlock button ditampilkan
- **Verify:** Full content TIDAK bisa diakses

### Step 3 — Click Unlock in Content

- Klik Unlock post
- **Verify:** show card Exclusive Content Preview
- **Verify:** post stiill blur and lock
- **Verify:** price displayed

### Step 4 — Verify can't like and comment

- **Verify:** can not like 
- **Verify:** can not comment

### Step 5 — Unlock now

- click button unlock now
- **Verify:** Displayed modal Unlock Exclusive Post
- **Verify:** email auto field 
- **Verify:** payment auto qeis
- input name with random string and number telephone with random number
- click button pay

### Step 6 — going to page post transaction

- **Verify:** QR for payment displayed
- **Verify:** name product
- **Verify:** price product consistent
- **Verify:** order id
- **Verify:** profiel creator and exclusive 
- **Verify:** button refresh to check status

### Step 7 — Pay transaction with api 

- send pay transaction with api
- **Verify:** modal payment succesful displayed
- **Verify:** label Your payment was successful! You can now access your exclusive content.
- **Verify:** button view product and close

### Step 8 — Verify product after puschae

- Click button view product
- **Verify:** direct to detail post page
- **Verify:** post show without blur and lock
- **Verify:** unlock status
post can open and zoom in zoom out


## Expected Result

Full locked → unlock flow berjalan sempurna: indikator monetization benar, konten blur sebelum unlock, unlock bekerja, state konsisten di feed dan detail

## Test Data

- Assets

## Notes

- Consolidates TC-433, TC-448, TC-449, TC-457, TC-472~TC-489 — monetization indicators, post detail locked/unlocked, purchase flow
- Pastikan payment method tersedia untuk test purchase
- Tes ini mencakup verifikasi monetization indicator, locked/unlocked state, dan price consistency
