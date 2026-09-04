import { creatorAuthTest as test, expect } from '../test-base';

/**
 * Manual test cases from the Livestream sheet that were blocked on automation mechanics
 * rather than on the product: TC-LS-C-176, C-177, C-180, C-187, C-189, C-190, C-191.
 *
 * These carry no Automation Mapping ID yet — every Livestream creator row in Automation
 * Mapping is still `Planned`, and AGENTS.md forbids tagging a test with a Planned ID.
 * Feature, role and priority tags are present; the `@AUT-*` tag is added by
 * `/automation <AUT-ID>` once the mapping row is validated.
 */
test.describe('Creator Streamer Overlays', () => {
  // The widget panel has desktop and narrow twins; at a small viewport the desktop copy
  // renders zero-sized, so its fields cannot take focus. Pin a large viewport.
  test.use({ viewport: { width: 1600, height: 1400 } });

  test('Subathon Gacha ships off and gates every field behind its master switch', { tag: ['@streaming', '@creator', '@regression'] }, async ({ streamerOverlaysPage }) => {
    await streamerOverlaysPage.goto('subathongacha');
    await streamerOverlaysPage.expectLoaded();
    await streamerOverlaysPage.expandAllPanels();

    expect(await streamerOverlaysPage.switchState('Subathon Gacha'), 'Subathon Gacha should ship off').toBe(false);
    expect(await streamerOverlaysPage.isTypeable('subathonGacha.title'), 'Wheel Title should be locked while the widget is off').toBe(false);

    await streamerOverlaysPage.toggleSwitch('Subathon Gacha');
    expect(await streamerOverlaysPage.switchState('Subathon Gacha')).toBe(true);

    await streamerOverlaysPage.expandAllPanels();
    expect(await streamerOverlaysPage.isTypeable('subathonGacha.title'), 'Wheel Title should unlock once the widget is on').toBe(true);
  });

  test('Wheel Title counts characters and stops at its 45-character cap', { tag: ['@streaming', '@creator', '@regression'] }, async ({ streamerOverlaysPage }) => {
    await streamerOverlaysPage.goto('subathongacha');
    await streamerOverlaysPage.expandAllPanels();
    if ((await streamerOverlaysPage.switchState('Subathon Gacha')) === false) {
      await streamerOverlaysPage.toggleSwitch('Subathon Gacha');
    }
    await streamerOverlaysPage.expandAllPanels();

    await streamerOverlaysPage.typeInto('subathonGacha.title', 'B'.repeat(45));
    expect(await streamerOverlaysPage.fieldValue('subathonGacha.title')).toHaveLength(45);
    expect(await streamerOverlaysPage.fieldCounter('subathonGacha.title')).toBe('45/45');

    await streamerOverlaysPage.typeInto('subathonGacha.title', 'C', { clear: false });
    expect(await streamerOverlaysPage.fieldValue('subathonGacha.title'), 'the 46th character must be refused').toHaveLength(45);
  });

  test('Tip Running Text is a separate widget with no message field', { tag: ['@streaming', '@creator', '@regression'] }, async ({ streamerOverlaysPage }) => {
    await streamerOverlaysPage.goto('runningtext');
    await streamerOverlaysPage.expandAllPanels();
    expect(await streamerOverlaysPage.fieldValue('runningtext-text'), 'Tip Running Text must not own a message field').toBeNull();
    expect(await streamerOverlaysPage.switchState('Show tip amounts'), 'Show tip amounts belongs to Tip Running Text').not.toBeNull();

    await streamerOverlaysPage.goto('runningtextoverlay');
    await streamerOverlaysPage.expandAllPanels();
    expect(await streamerOverlaysPage.fieldValue('runningtext-text'), 'Running Text owns the creator-authored line').not.toBeNull();
    expect(await streamerOverlaysPage.switchState('Show tip amounts'), 'Show tip amounts must not appear on Running Text').toBeNull();
  });

  test('LABEL TEXT stops at 30 characters on both running-text widgets', { tag: ['@streaming', '@creator', '@regression'] }, async ({ streamerOverlaysPage }) => {
    for (const [tab, field] of [['runningtext', 'tipRunningText-additional-text'], ['runningtextoverlay', 'runningTextOverlay-additional-text']] as const) {
      await streamerOverlaysPage.goto(tab);
      await streamerOverlaysPage.expandAllPanels();
      const original = await streamerOverlaysPage.fieldValue(field);

      await streamerOverlaysPage.typeInto(field, 'D'.repeat(30));
      expect(await streamerOverlaysPage.fieldValue(field), `${tab}: 30 characters should be accepted`).toHaveLength(30);
      await streamerOverlaysPage.typeInto(field, 'E', { clear: false });
      expect(await streamerOverlaysPage.fieldValue(field), `${tab}: the 31st character must be refused`).toHaveLength(30);

      await streamerOverlaysPage.typeInto(field, original ?? '');
    }
  });

  test('every widget offers both appearance presets and the reset control', { tag: ['@streaming', '@creator', '@regression'] }, async ({ streamerOverlaysPage }) => {
    for (const tab of ['songshare', 'milestone', 'qrcode', 'voting', 'leaderboard'] as const) {
      await streamerOverlaysPage.goto(tab);
      await streamerOverlaysPage.expandAllPanels();
      await streamerOverlaysPage.expectAppearanceContract();
    }
  });

  test('the Font picker is optional per widget, not part of the shared contract', { tag: ['@streaming', '@creator', '@regression'] }, async ({ streamerOverlaysPage }) => {
    const withFont: string[] = [];
    const withoutFont: string[] = [];
    for (const tab of ['milestone', 'subathon', 'songshare', 'qrcode', 'voting', 'leaderboard'] as const) {
      await streamerOverlaysPage.goto(tab);
      await streamerOverlaysPage.expandAllPanels();
      ((await streamerOverlaysPage.hasFontPicker()) ? withFont : withoutFont).push(tab);
    }
    expect(withFont.length, `no widget offered a Font picker (checked ${withFont.length + withoutFont.length})`).toBeGreaterThan(0);
    expect(withoutFont.length, 'Font was expected to be absent from at least one widget').toBeGreaterThan(0);
  });
});
