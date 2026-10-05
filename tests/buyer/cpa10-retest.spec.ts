// TEMPORARY retest harness for Monkies CPA-10 — checkout "Send Verification Code" + captcha readiness.
// Not a mapped AUT: deleted after the retest. See .agents/skills/monkies-tickets.
import { test } from '@playwright/test';
import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';

dotenv.config({ path: 'D:/yapp/.env', quiet: true });

const API = (process.env.YAPP_API_BASE_URL || '').replace(/\/$/, '');
const BUYER = (process.env.YAPP_BASE_URL || '').replace(/\/$/, '');
const CREATOR = (process.env.YAPP_CREATORS_BASE_URL || '').replace(/\/$/, '');
const TOKEN = (process.env.YAPP_TEST_ACCESS_TOKEN || '').replace(/"/g, '');
const NS = process.env.TESTMAIL_NAMESPACE || 'x7nv1';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';
const EVIDENCE = 'D:/yapp/.playwright-mcp/evidence/2026-10-05';
const h = { authorization: `Bearer ${TOKEN}`, origin: CREATOR, referer: `${CREATOR}/`, 'user-agent': UA };

async function seedProduct() {
  const fs = await import('node:fs');
  const buf = fs.readFileSync('D:/yapp/src/test-data/assets/gallery-1.png');
  const create = await (await fetch(`${API}/api/v1/file/upload/create`, {
    method: 'POST', headers: { ...h, 'content-type': 'application/json' },
    body: JSON.stringify({ filename: 'gallery-1.png', filetype: 'image/png' }),
  })).json();
  const uploadId = create.uploadId ?? create.data?.uploadId;
  const key = create.key ?? create.data?.key;
  const sign = await (await fetch(`${API}/api/v1/file/upload/sign?uploadId=${encodeURIComponent(uploadId)}&key=${encodeURIComponent(key)}&partNumber=1`, { headers: h })).json();
  const put = await fetch(sign.url ?? sign.data?.url ?? sign.presignedUrl, { method: 'PUT', headers: { 'content-type': 'image/png' }, body: buf });
  await fetch(`${API}/api/v1/file/upload/complete`, {
    method: 'POST', headers: { ...h, 'content-type': 'application/json' },
    body: JSON.stringify({ uploadId, key, parts: [{ PartNumber: 1, ETag: put.headers.get('etag'), 'content-length': String(buf.length) }] }),
  });
  const res = await fetch(`${API}/api/v1/shop/products`, {
    method: 'POST', headers: { ...h, 'content-type': 'application/json' },
    body: JSON.stringify({
      title: `CPA-10 retest ${faker.string.alphanumeric(6)}`,
      description: 'Seeded for the CPA-10 checkout captcha retest.',
      thumbnailImage: uploadId, productImages: [], shortUrl: '',
      isSetPrice: true, price: 25000, isSetDiscount: false, discount: 0, discountType: 'percentage',
      isFlexiblePrice: false, maximumFlexiblePrice: null, isSchedulePublish: false, isHideFromExplore: false,
      isAvailability: false, status: 'active',
      pages: [{ chapterName: 'Chapter title', position: 1, pages: [{ videoUrl: '', videoThumbnail: '', thumbnailType: '', pageName: 'New Page', content: '', position: 1, files: [] }] }],
      additionalQuestions: [],
      contentSetting: { isDownloadable: false, isRequireLoginToPurchase: false, isNSFW: false, isBlurContent: false, isOneTimeView: false },
      isAllowCustomerChooseQuantity: false, isLimitProductSales: false, limitProductSales: 0,
      isEnableCrypto: false, isCryptoFlexiblePrice: false, categoryIDs: [],
      isAcceptPublicAffiliator: false, affiliateCommissionType: 'percentage', affiliateCommission: 0,
      affiliateCommissionCrypto: 0, isFreeForMembers: false, purchaseButtonText: 'Purchase',
      privateDescription: '', thankYouNote: '', salesLinks: [], productType: 'online_course',
    }),
  });
  const body = await res.json();
  console.log('[seed] status=%s shortUrl=%s', res.status, body.data?.shortUrl);
  return body.data?.shortUrl as string;
}

async function openCheckout(page: import('@playwright/test').Page, shortUrl: string, email: string, net: string[]) {
  page.on('response', (res) => {
    const u = res.url();
    if (/\/api\//i.test(u)) net.push(`${res.status()} ${res.request().method()} ${u.replace(BUYER, '')}`);
  });
  await page.context().clearCookies();
  await page.goto(`${BUYER}/s/${shortUrl}`, { waitUntil: 'domcontentloaded', timeout: 40_000 });
  await page.waitForTimeout(2000);
  const purchase = page.getByRole('button', { name: /^(Get Product|Purchase)$/ }).first();
  const rect = await purchase.boundingBox({ timeout: 15_000 }).catch(() => null);
  if (rect) await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.waitForTimeout(1500);
  await page.waitForURL(/checkout/, { timeout: 25_000 }).catch(() => {});
  const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[name*="email" i]').first();
  if (await emailInput.isVisible().catch(() => false)) await emailInput.fill(email).catch(() => {});
  console.log('[nav] url =', page.url());
}

async function clickSend(page: import('@playwright/test').Page) {
  const btn = page.getByRole('button', { name: /send verification code/i }).first();
  const rect = await btn.boundingBox({ timeout: 10_000 }).catch(() => null);
  if (!rect) return null;
  const t = Date.now();
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  return t;
}

/** Reads the send button's rendered state without waiting for actionability. */
async function sendState(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /send verification code|send code/i.test(x.textContent || ''));
    if (!b) return { found: false };
    const r = b.getBoundingClientRect();
    return {
      found: true,
      disabled: (b as HTMLButtonElement).disabled,
      ariaDisabled: b.getAttribute('aria-disabled'),
      text: (b.textContent || '').trim().slice(0, 40),
      hasSpinner: !!b.querySelector('svg, [class*="spinner"], [class*="animate"]'),
      box: `${Math.round(r.width)}x${Math.round(r.height)}`,
    };
  });
}

test.describe('CPA-10 retest', () => {
  test('checkout verification code waits for captcha readiness', async ({ browser }) => {
    test.setTimeout(300_000);
    const fs = await import('node:fs');
    fs.mkdirSync(EVIDENCE, { recursive: true });
    const email = `${NS}.cpa10@inbox.testmail.app`;
    const shortUrl = process.env.CPA10_SHORT_URL || (await seedProduct());
    console.log('[product] share path =', shortUrl);

    // ---------- Part 1: normal cold start ----------
    const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p1 = await ctx1.newPage();
    const net1: string[] = [];
    await openCheckout(p1, shortUrl, email, net1);
    await p1.screenshot({ path: `${EVIDENCE}/cpa10-01-checkout.png`, fullPage: true });
    console.log('[P1] before click: %s', JSON.stringify(await sendState(p1)));
    const t0 = await clickSend(p1);
    if (!t0) console.log('[P1] send button missing');
    else {
      await p1.waitForTimeout(300);
      console.log('[P1] +300ms: %s', JSON.stringify(await sendState(p1)));
      await p1.screenshot({ path: `${EVIDENCE}/cpa10-02-normal-spinner.png` });
      let sawHuman = false; let sawOtp = false; let codeRequest = '';
      for (let i = 0; i < 25; i++) {
        await p1.waitForTimeout(1000);
        const st = await sendState(p1);
        const text = await p1.evaluate(() => document.body.innerText).catch(() => '');
        const otpInputs = await p1.locator('input[data-input-otp], input[inputmode="numeric"]').count().catch(() => 0);
        const req = net1.find((n) => /otp|verif/i.test(n) && /POST/.test(n));
        if (req) codeRequest = req;
        if (/verify that you are human/i.test(text)) { sawHuman = true; console.log('[P1] human toast at +%dms state=%s', Date.now() - t0, JSON.stringify(st)); break; }
        if (otpInputs > 0) { sawOtp = true; console.log('[P1] otp inputs at +%dms state=%s', Date.now() - t0, JSON.stringify(st)); break; }
        if (i === 4 || i === 11) console.log('[P1] +%ds state=%s req=%s', (Date.now() - t0) / 1000, JSON.stringify(st), req || '-');
      }
      console.log('[P1] RESULT humanToast=%s otpScreen=%s sendRequest=%s elapsed=%dms', sawHuman, sawOtp, codeRequest || '(none)', Date.now() - t0);
      console.log('[P1] after: %s', JSON.stringify(await sendState(p1)));
      await p1.screenshot({ path: `${EVIDENCE}/cpa10-03-normal-after.png` });
      console.log('[P1] api calls:\n  %s', net1.filter((n) => /otp|verif|captcha/i.test(n)).join('\n  ') || '(no otp/captcha calls)');
    }
    await ctx1.close();

    // ---------- Part 2: captcha script blocked ----------
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx2.route('**google.com/recaptcha/**', (r) => r.abort());
    await ctx2.route('**gstatic.com/recaptcha/**', (r) => r.abort());
    await ctx2.route('**/recaptcha/**', (r) => r.abort());
    const p2 = await ctx2.newPage();
    const net2: string[] = [];
    await openCheckout(p2, shortUrl, email, net2);
    console.log('[P2] before click: %s', JSON.stringify(await sendState(p2)));
    const t1 = await clickSend(p2);
    if (!t1) console.log('[P2] send button missing');
    else {
      await p2.waitForTimeout(300);
      console.log('[P2] +300ms: %s', JSON.stringify(await sendState(p2)));
      await p2.screenshot({ path: `${EVIDENCE}/cpa10-04-blocked-spinner.png` });
      let toastAt = 0;
      for (let i = 0; i < 25; i++) {
        await p2.waitForTimeout(1000);
        const text = await p2.evaluate(() => document.body.innerText).catch(() => '');
        if (/verify that you are human/i.test(text)) { toastAt = Date.now() - t1; break; }
      }
      await p2.waitForTimeout(1000);
      console.log('[P2] RESULT humanToastAt=%dms after=%s', toastAt, JSON.stringify(await sendState(p2)));
      await p2.screenshot({ path: `${EVIDENCE}/cpa10-05-blocked-after.png` });
      console.log('[P2] api calls:\n  %s', net2.filter((n) => /otp|verif|captcha/i.test(n)).join('\n  ') || '(no otp/captcha calls)');
    }
    await ctx2.close();
  });
});
