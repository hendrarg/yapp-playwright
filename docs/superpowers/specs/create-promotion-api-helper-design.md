# Desain API Helper Create dan Delete Promotion

## Tujuan

Menambahkan helper API yang dapat dipakai ulang oleh test atau setup E2E untuk
membuat dan menghapus promo melalui endpoint `POST /api/v1/promos` dan
`DELETE /api/v1/promos/:id`.

## Desain

Tambahkan `src/helpers/api/promotion.ts` dengan:

- `CreatePromotionOptions` berisi field payload promo: `name`, `discountType`,
  `discount`, `code`, `promoProductType`, `periodStartAt`, `periodEndAt`, dan
  `isSetAffiliate`.
- `createPromotion(request, options, token?)` yang mengirim request ke
  `apiUrl('/api/v1/promos')` menggunakan `getHeaders(token)` dari helper API
  yang sudah ada.
- `deletePromotion(request, promotionId, token?)` yang mengirim DELETE ke
  `apiUrl('/api/v1/promos/:id')` dengan ID yang di-encode.
- Jika response bukan 2xx, helper melempar error yang menyertakan status dan
  body response.
- Jika create berhasil, helper mengembalikan JSON response tanpa mengubah
  bentuk response API. Delete selesai tanpa nilai return.

Tambahkan `src/test-data/creator/promotion.data.ts` dengan
`generatePromotionData(status, overrides?)`:

- Nama berurutan `promo001`, `promo002`, dan seterusnya.
- Diskon selalu `11` dengan tipe `percentage`.
- Kode selalu unik dalam proses, 8 karakter, terdiri dari 4 huruf dan 4 angka.
- `expired`: seluruh periode sudah lewat.
- `active`: mulai sekarang sampai 7 hari ke depan.
- `inactive`: mulai 7 hari dari sekarang sampai 14 hari dari sekarang.

## Testing

Tidak membuat TC atau menjalankan test untuk penambahan helper/data ini sesuai
instruksi pengguna.

## Di luar scope

Tidak menambahkan perubahan fixture atau mengeksekusi request staging secara
langsung. Token tetap berasal dari argumen
atau `YAPP_TEST_ACCESS_TOKEN`; token yang diberikan di chat tidak disimpan.
