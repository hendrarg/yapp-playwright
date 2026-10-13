import type { APIRequestContext } from '@playwright/test';
import { creatorsBaseURL } from '@config/env';
import { apiUrl, getHeaders } from '@helpers/api/client';

/**
 * Everything `/customize` writes for the creator, read back through the same endpoints its Save
 * uses — so a test can change the real account's page and put it back. Banner and profile picture
 * are files and are restored through `dbFixtures.protectAppearanceMedia()` instead.
 */
export interface AppearanceSnapshot {
  profile: { name: string; bio: string; role: string; isHideFromExplore: boolean; isSupportPrivate: boolean; isEnableEngagement: boolean };
  tipButton: { isTipButton: boolean; tipButtonText: string; tipButtonTextColor: string; tipButtonColor: string };
  interestIDs: number[];
  customization: { customTheme: { backgroundColor: string; primaryColor: string; secondaryColor: string }; profileLayoutPreference: string };
  quickAmounts: { isEnabled: boolean; rules: Array<{ assetID: number; amount: number }> };
  socialLinks: SocialLink[];
}

export interface SocialLink {
  specialType: string;
  link: string;
  isActive: boolean;
  position: number;
}

const headers = (token?: string) => getHeaders(token, creatorsBaseURL.replace(/\/$/, ''));

async function getData<T>(request: APIRequestContext, path: string, token?: string): Promise<T> {
  const response = await request.get(apiUrl(path), { headers: headers(token) });
  if (!response.ok()) throw new Error(`GET ${path} failed: ${response.status()} ${await response.text()}`);
  return (await response.json()).data as T;
}

async function expectOk(response: Awaited<ReturnType<APIRequestContext['put']>>, what: string) {
  if (!response.ok()) throw new Error(`${what} failed: ${response.status()} ${await response.text()}`);
}

export async function snapshotAppearance(request: APIRequestContext, token?: string): Promise<AppearanceSnapshot> {
  const account = await getData<Record<string, any>>(request, '/api/v1/accounts', token);
  const interests = await getData<Array<{ slug: string }>>(request, '/api/v1/accounts/interests', token);
  const options = await getData<Array<{ id: number; slug: string }>>(request, '/api/v1/accounts/interests/options', token);
  const customization = await getData<AppearanceSnapshot['customization']>(request, '/api/v1/accounts/profile-customization', token);
  const socialLinks = await getData<SocialLink[]>(request, '/api/v1/accounts/social-link', token);
  const quick = await getData<{ isEnabled: boolean; rules: Array<{ assetId: number; amount: number }> }>(request, '/api/v1/quick-amounts', token);
  return {
    profile: {
      name: account.name ?? '',
      bio: account.bio ?? '',
      role: account.role ?? '',
      isHideFromExplore: !!account.isHideFromExplore,
      isSupportPrivate: !!account.isSupportPrivate,
      isEnableEngagement: !!account.isEnableEngagement,
    },
    tipButton: {
      isTipButton: !!account.isTipButton,
      tipButtonText: account.tipButtonText,
      tipButtonTextColor: account.tipButtonTextColor,
      tipButtonColor: account.tipButtonColor,
    },
    interestIDs: interests.map((i) => options.find((o) => o.slug === i.slug)?.id).filter((id): id is number => typeof id === 'number'),
    customization: { customTheme: customization.customTheme, profileLayoutPreference: customization.profileLayoutPreference },
    quickAmounts: { isEnabled: quick.isEnabled, rules: quick.rules.map((r) => ({ assetID: r.assetId, amount: r.amount })) },
    socialLinks: socialLinks.map(({ specialType, link, isActive, position }) => ({ specialType, link, isActive, position })),
  };
}

/** Account fields the profile tests read back: media URLs, the raw payload keys, saved interests. */
export async function getAccountProfile(request: APIRequestContext, token?: string) {
  const account = await getData<Record<string, unknown>>(request, '/api/v1/accounts', token);
  const interests = await getData<Array<{ slug: string; name: string }>>(request, '/api/v1/accounts/interests', token);
  return {
    name: String(account.name ?? ''),
    role: String(account.role ?? ''),
    bio: String(account.bio ?? ''),
    username: String(account.username ?? ''),
    photoPath: String(account.photoProfileUrl ?? '').split('?')[0],
    backgroundPath: String(account.backgroundUrl ?? '').split('?')[0],
    accountKeys: Object.keys(account),
    interestNames: interests.map((i) => i.name),
  };
}

/** Tool slugs the creator picked at onboarding (`users.creator_favorites`). */
export async function getCreatorFavorites(request: APIRequestContext, token?: string): Promise<string[]> {
  return (await getData<{ favorites: string[] }>(request, '/api/v1/accounts/creator-favorites', token)).favorites;
}

export async function restoreAppearance(request: APIRequestContext, snapshot: AppearanceSnapshot, token?: string): Promise<void> {
  const { 'Content-Type': _json, ...multipartHeaders } = headers(token);
  const p = snapshot.profile;
  await expectOk(
    await request.put(apiUrl('/api/v1/accounts'), {
      headers: multipartHeaders,
      multipart: {
        name: p.name,
        bio: p.bio,
        role: p.role,
        isHideFromExplore: String(p.isHideFromExplore),
        isSupportPrivate: String(p.isSupportPrivate),
        isEnableEngagement: String(p.isEnableEngagement),
      },
    }),
    'Restore profile',
  );
  await expectOk(await request.put(apiUrl('/api/v1/accounts/interests'), { headers: headers(token), data: { interestIDs: snapshot.interestIDs } }), 'Restore interests');
  await expectOk(await request.put(apiUrl('/api/v1/accounts/profile-customization'), { headers: headers(token), data: snapshot.customization }), 'Restore theme');
  await expectOk(await request.put(apiUrl('/api/v1/accounts/tip-button'), { headers: headers(token), data: snapshot.tipButton }), 'Restore tip button');
  await expectOk(await request.put(apiUrl('/api/v1/accounts/social-link'), { headers: headers(token), data: { items: snapshot.socialLinks } }), 'Restore social links');
  await expectOk(await request.post(apiUrl('/api/v1/quick-amounts'), { headers: headers(token), data: snapshot.quickAmounts }), 'Restore quick amounts');
}
