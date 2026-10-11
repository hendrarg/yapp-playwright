import 'dotenv/config';
import { sheetsClient } from './lib/sheets-client.mjs';
const E = '.playwright-mcp/evidence/2026-10-11/';
export const bugs = [
  ['M-64', 'Medium', 'Product Digital', 'Kartu review di PDP tidak menampilkan indikator Verified Purchase',
    '1. Login sebagai buyer yang sudah membeli digital product (pembayaran completed)\n2. Buka PDP produk, klik "Write a review...", pilih 4 bintang, isi teks, klik "Post Review"\n3. Periksa kartu review di section Reviews & Ratings (sebagai penulis, non-pembeli, guest, maupun creator)',
    'Setiap kartu review menampilkan indikator "Verified Purchase" (PRD Product Review, Epic 2) (TC-PD-B-035).',
    'Kartu review hanya berisi bintang, "4.0 · 1m ago", teks, dan chip penulis ("You" / username). Tidak ada badge Verified Purchase di tampilan mana pun. API sudah benar: GET /api/v1/products/{uuid}/reviews dan /reviews/me mengembalikan "isVerifiedPurchase": true — jadi UI saja yang tidak merender field itu.',
    `Diuji 11 Okt 2026 di dev (buyer anthony_mosciski, produk seed milik hendrarg). PRD: projects/yapp/product-review - prd.\nEvidence: ${E}M-64-no-verified-badge.png`, 'TC-PD-B-035', 'Terbuka', ''],
  ['M-65', 'Medium', 'Product Digital', 'Review yang di-hide creator masih tampil untuk penulisnya sendiri',
    '1. Buyer membeli digital product lalu memberi review\n2. Creator membuka PDP produknya dan klik "Hide" pada review itu\n3. Buka PDP yang sama sebagai buyer penulis review',
    'Review yang di-hide hanya terlihat oleh creator; penulisnya pun tidak melihatnya di PDP dan review tidak dihitung di agregat (TC-PD-B-044).',
    'Pengunjung lain dan agregat sudah benar (review hilang, agregat tidak menghitungnya), tetapi penulis masih melihat reviewnya sebagai kartu "You" tanpa penanda hidden. Akar masalah di API: GET /reviews (list) dan /reviews/summary untuk penulis sudah mengecualikan review hidden, tetapi GET /api/v1/products/{uuid}/reviews/me tetap mengembalikan review itu dengan "isHidden": false dan "hiddenAt": null (list versi creator untuk review yang sama: "isHidden": true). FE me-render review dari /me.',
    `Diuji 11 Okt 2026 di dev (hide via tombol Hide dan via POST /reviews/{id}/hide → 200). Perlu keputusan juga apakah penulis diberi penanda "hidden" atau review disembunyikan total; PRD hanya menyebut "visible only to the creator".\nEvidence: ${E}M-65-author-sees-hidden.png`, 'TC-PD-B-044', 'Terbuka', ''],
  ['L-81', 'Low', 'Product Digital', 'Pesan gate non-pembeli tidak tampil di section Reviews & Ratings',
    '1. Buka PDP digital product yang sudah punya minimal satu review, sebagai buyer login yang belum membeli\n2. Ulangi sebagai guest (tidak login)\n3. Periksa section Reviews & Ratings',
    'Tidak ada CTA menulis review dan tampil pesan "Only buyers who purchased this product can leave a review." (PRD state Write — Not eligible) (TC-PD-B-040, TC-PD-B-041).',
    'Non-pembeli dan guest bisa membaca agregat dan daftar review dan tidak melihat CTA (benar), tetapi pesan gate tidak tampil sama sekali.',
    `Diuji 11 Okt 2026 di dev. Catatan: PRD tidak konsisten — tabel write-flow menyebut pesan ini, tabel display (Non-buyer viewing) hanya "tanpa CTA". Perlu konfirmasi PM.\nEvidence: ${E}L-81-no-gate-nonbuyer.png, L-81-no-gate-guest.png`, 'TC-PD-B-040, TC-PD-B-041', 'Terbuka', ''],
  ['L-82', 'Low', 'Product Digital', 'Daftar review berada di kartu pembelian kanan, bukan di bawah deskripsi produk',
    '1. Buka PDP digital product yang memiliki review aktif (desktop 1440px)\n2. Periksa posisi agregat rating dan daftar review terhadap harga, tombol Purchase, dan deskripsi produk',
    'Agregat rating + jumlah review dekat harga/CTA (pola badge Purchase Social Proof); daftar review di bawah deskripsi produk (PRD Epic 2) (TC-PD-B-047).',
    'Agregat dan daftar review sama-sama berada di kartu pembelian kolom kanan, di bawah Purchase / Add To Cart. Daftar review tidak berada di bawah deskripsi (tab Overview di kolom kiri).',
    `Diuji 11 Okt 2026 di dev. Bisa jadi keputusan desain yang disengaja — perlu konfirmasi desain/PM; bila disengaja, PRD diperbarui dan TC disesuaikan.\nEvidence: ${E}L-82-review-list-placement.png`, 'TC-PD-B-047', 'Terbuka', ''],
];
if (process.argv[2] === 'append') {
  const c = await sheetsClient({ write: true });
  const ids = (await c.values(`'Bugs'!A1:A300`)).map((r) => r[0]);
  if (bugs.some((b) => ids.includes(b[0]))) throw new Error('already there');
  const r = await c.api(`/values/${encodeURIComponent("'Bugs'!A1:K1")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: 'POST', body: JSON.stringify({ values: bugs }) });
  console.log(r.updates?.updatedRange);
}
if (process.argv[2] === 'keys') {
  const keys = JSON.parse(process.argv[3]);
  const c = await sheetsClient({ write: true });
  const ids = (await c.values(`'Bugs'!A1:A300`)).map((r) => r[0]);
  await c.batchUpdate(Object.entries(keys).map(([id, k]) => ({ range: `'Bugs'!K${ids.indexOf(id) + 1}`, values: [[k]] })));
  console.log('keys written');
}
