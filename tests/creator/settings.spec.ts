import { creatorAuthTest as test, expect } from '../test-base';
import {
  settingsBankOptions,
  settingsFeeData,
  settingsIntegrationsData,
} from '@test-data/creator/settings.data';

test.describe('Creator Settings', () => {
  test('Settings — Page Structure, Tab URL State, Empty State, Add Bank Account Form, Form Validation', {
    tag: ['@AUT-SET-001', '@settings', '@creator', '@smoke', '@regression'],
  }, async ({ page, creatorNav, settingsPage }) => {
    await test.step('Verify page structure and default tab (TC-SET-C-001, TC-SET-C-018)', async () => {
      await creatorNav.open('settings');
      await settingsPage.expectLoaded();

      await expect(settingsPage.paymentAndFeeTab).toBeVisible();
      await expect(settingsPage.integrationsTab).toBeVisible();
      await expect(settingsPage.paymentAndFeeTab).toHaveAttribute('aria-selected', 'true');
      await expect(settingsPage.integrationsTab).toHaveAttribute('aria-selected', 'false');

      // Top-level sections on default tab
      await expect(page.locator('main').getByText('Bank Account', { exact: true }).first()).toBeVisible();
      await expect(settingsPage.feeSettingsSection.first()).toBeVisible();
    });

    await test.step('Verify tab URL state and deep link handling (TC-SET-C-002)', async () => {
      expect(page.url()).not.toContain('tab=');

      await settingsPage.switchToIntegrationsTab();
      expect(page.url()).toContain('/settings?tab=integrations');

      // Direct deep link to ?tab=integrations
      await settingsPage.goto('integrations');
      await expect(settingsPage.integrationsTab).toHaveAttribute('aria-selected', 'true');

      // Unknown query param leaves no tab selected
      await settingsPage.goto('bogus');
      await expect(settingsPage.paymentAndFeeTab).toHaveAttribute('aria-selected', 'false');
      await expect(settingsPage.integrationsTab).toHaveAttribute('aria-selected', 'false');

      // Return to default tab
      await settingsPage.goto();
      await expect(settingsPage.paymentAndFeeTab).toHaveAttribute('aria-selected', 'true');
    });

    await test.step('Verify Bank Account empty state (TC-SET-C-010, TC-SET-C-018)', async () => {
      await expect(settingsPage.bankAccountEmptyHeading.first()).toBeVisible();
      const mainContent = page.locator('main');
      await expect(
        mainContent.getByText('Payment access requires a linked bank account. Connect yours to receive funds')
      ).toBeVisible();
      await expect(settingsPage.addBankAccountButton.first()).toBeVisible();

      // Fee Settings remains visible and readable without a bank account
      await expect(settingsPage.feeSettingsSection.first()).toBeVisible();
      await expect(
        mainContent.getByText('Decide how the Transaction fee is split between you and your fans').first()
      ).toBeVisible();
    });

    await test.step('Verify Add Bank Account form fields and banks list (TC-SET-C-011)', async () => {
      await settingsPage.addBankAccountButton.first().click();
      await expect(settingsPage.bankAccountDialog).toBeVisible();
      await expect(settingsPage.bankAccountDialog.getByRole('heading', { name: 'Add Bank Account' })).toBeVisible();

      // 21 Indonesian banks in select from BANK DIGITAL BCA to BANK JATIM
      const options = await settingsPage.bankSelect.locator('option').allTextContents();
      expect(options.length).toBe(21);
      expect(options[0]).toBe('BANK DIGITAL BCA');
      expect(options[1]).toBe('BANK CENTRAL ASIA');
      expect(options[2]).toBe('BANK RAKYAT INDONESIA');
      expect(options[options.length - 1]).toBe('BANK JATIM');

      await expect(settingsPage.accountNameInput).toBeVisible();
      await expect(settingsPage.accountNumberInput).toBeVisible();
      await expect(settingsPage.cancelBankModalButton).toBeVisible();
      await expect(settingsPage.submitBankAccountButton).toBeVisible();
      await expect(settingsPage.closeBankModalButton).toBeVisible();

      // No PIN field in dialog
      await expect(settingsPage.bankAccountDialog.locator('input[type="password"]')).toHaveCount(0);
      await expect(settingsPage.bankAccountDialog.getByText(/pin/i)).toHaveCount(0);
    });

    await test.step('Verify form client validation behaviors (TC-SET-C-012)', async () => {
      // Inputs have no maxlength, pattern, or numeric inputmode
      await expect(settingsPage.accountNameInput).not.toHaveAttribute('maxlength', /.*/);
      await expect(settingsPage.accountNameInput).not.toHaveAttribute('pattern', /.*/);
      await expect(settingsPage.accountNumberInput).not.toHaveAttribute('maxlength', /.*/);
      await expect(settingsPage.accountNumberInput).not.toHaveAttribute('pattern', /.*/);

      // Verify various input variations are accepted without client validation errors
      const variations = [
        { name: 'John Doe', number: 'ABCDEF' },
        { name: 'John Doe', number: '1' },
        { name: 'John Doe', number: '1234567890123456789012345678901234567890' },
        { name: 'John Doe', number: 'ACC123XYZ' },
        { name: '[Bracketed Name]', number: '123456' },
      ];

      for (const v of variations) {
        await settingsPage.accountNameInput.fill(v.name);
        await settingsPage.accountNumberInput.fill(v.number);
        expect(await settingsPage.accountNameInput.inputValue()).toBe(v.name);
        expect(await settingsPage.accountNumberInput.inputValue()).toBe(v.number);
        await expect(settingsPage.submitBankAccountButton).toBeEnabled();
      }

      // Close modal without submitting
      await settingsPage.cancelBankModalButton.click();
      await expect(settingsPage.bankAccountDialog).not.toBeVisible();
    });
  });

  test('Settings — Fee Settings Inventory, Default Fee Values, Received Calculator, Platform Fee Split, Gateway Fee Persistence, Labels, Accessibility', {
    tag: ['@AUT-SET-002', '@settings', '@creator', '@regression'],
  }, async ({ page, creatorNav, settingsPage }) => {
    await creatorNav.open('settings');
    await settingsPage.expectLoaded();

    await test.step('Verify Fee Settings inventory across product categories (TC-SET-C-003)', async () => {
      for (const category of settingsFeeData.monetizationCategories) {
        const card = settingsPage.getMonetizationCard(category);
        await expect(card).toBeVisible();
      }
    });

    const digitalCard = settingsPage.getMonetizationCard('Digital Product Sales');

    await test.step('Verify default fee values and summary transaction (TC-SET-C-004, TC-SET-C-008)', async () => {
      const receivedInput = digitalCard.locator('input[type="text"]').first();
      // Allow for hydration of saved values
      await expect(receivedInput).toHaveValue(settingsFeeData.defaultReceived);

      await expect(digitalCard.getByText('Creator 0%', { exact: true })).toBeVisible();
      await expect(digitalCard.getByText('Fans 4%', { exact: true })).toBeVisible();

      // Summary Transaction expectations
      await expect(digitalCard.getByText('Platform Fee (4%)')).toBeVisible();
      await expect(digitalCard.getByText('Fans (4%)')).toBeVisible();
      await expect(digitalCard.getByText('Creator (0%)')).toBeVisible();
      await expect(digitalCard.getByText('Paid by Fans')).toBeVisible();
      await expect(digitalCard.getByText('Fans Pay')).toBeVisible();
      await expect(digitalCard.getByText('Creator Receive')).toBeVisible();
      await expect(digitalCard.getByText('Rp104.000')).toBeVisible();
      await expect(digitalCard.getByText('Rp100.000')).toBeVisible();

      // Spelling discrepancy across all 5 blocks
      const typoLabels = page.getByText(settingsFeeData.labels.selectorTypo, { exact: true });
      const correctSummary = page.getByText(settingsFeeData.labels.summaryCorrect, { exact: true });
      await expect(typoLabels).toHaveCount(5);
      await expect(correctSummary).toHaveCount(5);
    });

    await test.step('Verify Received calculator is local and updates live without non-GET calls (TC-SET-C-005)', async () => {
      let nonGetRequests = 0;
      const onRequest = (req: any) => {
        if (req.method() !== 'GET' && !req.url().includes('telemetry') && !req.url().includes('log')) {
          nonGetRequests++;
        }
      };
      page.on('request', onRequest);

      const receivedInput = digitalCard.locator('input[type="text"]').first();
      await receivedInput.fill(settingsFeeData.calculatorTest.input);
      await expect(receivedInput).toHaveValue(settingsFeeData.calculatorTest.expectedFormatted);

      // Verify recalculation
      await expect(digitalCard.getByText(settingsFeeData.calculatorTest.platformFee).first()).toBeVisible();
      await expect(digitalCard.getByText(settingsFeeData.calculatorTest.fansPay).first()).toBeVisible();
      await expect(digitalCard.getByText(settingsFeeData.calculatorTest.creatorReceive).first()).toBeVisible();

      expect(nonGetRequests).toBe(0);
      page.off('request', onRequest);

      // Restore default input value
      await receivedInput.fill('100000');
      await expect(receivedInput).toHaveValue(settingsFeeData.defaultReceived);
    });

    await test.step('Verify platform fee split and currency selector are display-only (TC-SET-C-006, TC-SET-C-013)', async () => {
      const setFeeButton = digitalCard.getByText('Set Platform Fee');
      await setFeeButton.click();
      await expect(page.getByRole('dialog')).toHaveCount(0);

      // Badges are plain div without interactive role
      const creatorBadge = digitalCard.getByText('Creator 0%', { exact: true });
      await expect(creatorBadge).not.toHaveAttribute('role', /button|link/);

      // Currency IDR button click does not open a dropdown
      const idrButton = digitalCard.getByRole('button', { name: 'IDR' }).first();
      await idrButton.click();
      await expect(page.getByRole('listbox')).toHaveCount(0);
      await expect(page.getByText('USD', { exact: true })).toHaveCount(0);
    });

    await test.step('Verify Gateway Fee persistence and radio accessibility (TC-SET-C-007, TC-SET-C-009)', async () => {
      // Radios accessibility: verify multiple role=radio instances exist
      const radioElements = digitalCard.getByRole('radio');
      expect(await radioElements.count()).toBeGreaterThanOrEqual(2);

      const creatorRadio = digitalCard.getByText('Creator', { exact: true }).first();
      const fansRadio = digitalCard.getByText('Fans', { exact: true }).first();

      // Toggle Creator bearer -> auto-saves via POST
      const postPromiseCreator = page.waitForResponse(
        (res) => res.url().includes('/api/v1/accounts/fees/products') && res.request().method() === 'POST'
      );
      await creatorRadio.click();
      await postPromiseCreator;
      await expect(digitalCard.getByText('Paid by Creator')).toBeVisible();

      // Toggle back to Fans bearer -> auto-saves via POST and restores default
      const postPromiseFans = page.waitForResponse(
        (res) => res.url().includes('/api/v1/accounts/fees/products') && res.request().method() === 'POST'
      );
      await fansRadio.click();
      await postPromiseFans;
      await expect(digitalCard.getByText('Paid by Fans')).toBeVisible();
    });
  });

  test('Settings — Integration Inventory, Telegram Integration, Facebook Pixel Setup, Tracked Events Catalogue', {
    tag: ['@AUT-SET-003', '@settings', '@creator', '@regression'],
  }, async ({ page, creatorNav, settingsPage }) => {
    await creatorNav.open('settings');
    await settingsPage.switchToIntegrationsTab();

    await test.step('Verify Integration inventory across groups (TC-SET-C-014)', async () => {
      await expect(page.locator('main').getByText('Apps', { exact: true }).first()).toBeVisible();
      await expect(page.locator('main').getByText('Growth & Tracking', { exact: true }).first()).toBeVisible();

      // Apps list
      for (const app of Object.values(settingsIntegrationsData.apps)) {
        const card = settingsPage.getIntegrationCard(app.name);
        await expect(card).toBeVisible();
        await expect(card.getByText(app.description).filter({ visible: true })).toBeVisible();
      }

      // Facebook Pixel card
      await expect(settingsPage.facebookPixelCard).toBeVisible();
    });

    await test.step('Verify Telegram integration details and bot guidance (TC-SET-C-015)', async () => {
      const telegramCard = settingsPage.getIntegrationCard('Telegram');
      await expect(telegramCard.getByText(/Connected @hendrarg/i).filter({ visible: true })).toBeVisible();
      await expect(telegramCard.getByRole('button', { name: 'Add group / channel' }).filter({ visible: true })).toBeVisible();

      // Your chats list
      await expect(telegramCard.getByText('Your chats', { exact: true })).toBeVisible();
      await expect(telegramCard.getByText('Dev Yapp test', { exact: true })).toBeVisible();
      await expect(telegramCard.getByText('supergroup', { exact: true })).toBeVisible();
      await expect(telegramCard.getByText('Ready', { exact: true })).toBeVisible();

      // Bot guidance & help CTA
      await expect(telegramCard.getByText('How to add the bot to a group or channel').filter({ visible: true })).toBeVisible();
      await expect(telegramCard.getByText(/Ban Users/i).filter({ visible: true }).first()).toBeVisible();
      await expect(telegramCard.getByText(/Invite via Link|Invite Users/i).filter({ visible: true }).first()).toBeVisible();
      await expect(telegramCard.getByText('Still not showing up after adding the bot as admin?').filter({ visible: true })).toBeVisible();
    });

    await test.step('Verify Facebook Pixel disconnect and See What We Track carousel (TC-SET-C-014, TC-SET-C-017)', async () => {
      // If currently connected, disconnect to test Not Connected state & carousel
      if (await settingsPage.pixelDisconnectButton.isVisible()) {
        await settingsPage.pixelDisconnectButton.click();
        const confirmDialog = settingsPage.genericDialog;
        await expect(confirmDialog).toBeVisible();
        await expect(confirmDialog.getByText('Disconnect Pixel?')).toBeVisible();
        await confirmDialog.getByRole('button', { name: 'Yes, Disconnect' }).click();

        // Dismiss "Tracking Stopped" success modal
        const successDialog = page.getByRole('dialog').filter({ hasText: 'Tracking Stopped' });
        await expect(successDialog).toBeVisible();
        await successDialog.getByRole('button', { name: 'Back to settings' }).click();
        await expect(successDialog).not.toBeVisible();
      }

      await expect(settingsPage.facebookPixelCard.getByText('Not Connected').filter({ visible: true })).toBeVisible();
      await expect(settingsPage.seeWhatWeTrackButton).toBeVisible();

      // Test "See what we track" 3-step carousel
      await settingsPage.seeWhatWeTrackButton.click();
      const carouselDialog = settingsPage.genericDialog;
      await expect(carouselDialog).toBeVisible();

      for (let i = 0; i < settingsIntegrationsData.facebookPixel.trackedEvents.length; i++) {
        const event = settingsIntegrationsData.facebookPixel.trackedEvents[i];
        await expect(carouselDialog.getByText(event.title).filter({ visible: true })).toBeVisible();
        await expect(carouselDialog.getByText(event.description).filter({ visible: true })).toBeVisible();

        if (i < settingsIntegrationsData.facebookPixel.trackedEvents.length - 1) {
          await carouselDialog.getByRole('button', { name: /Next/i }).filter({ visible: true }).click();
        } else {
          const gotItBtn = carouselDialog.getByRole('button', { name: 'Got it' }).filter({ visible: true });
          await expect(gotItBtn).toBeVisible();
          await gotItBtn.click();
        }
      }

      await expect(carouselDialog).not.toBeVisible();
    });

    await test.step('Verify Facebook Pixel Set Up form validation and reconnect (TC-SET-C-016)', async () => {
      await settingsPage.pixelSetUpButton.click();
      const setupDialog = settingsPage.genericDialog;
      await expect(setupDialog).toBeVisible();
      await expect(setupDialog.getByRole('heading', { name: 'Set Up Facebook Pixel ID' })).toBeVisible();

      const pixelIdInput = setupDialog.locator('input');
      const tokenTextarea = setupDialog.locator('textarea');
      const saveButton = setupDialog.getByRole('button', { name: 'Save' });

      // Save button disabled initially
      await expect(saveButton).toBeDisabled();

      // Only Pixel ID filled -> stays disabled
      await pixelIdInput.fill(settingsIntegrationsData.facebookPixel.pixelId);
      await expect(saveButton).toBeDisabled();

      // Both filled -> enabled
      await tokenTextarea.fill(settingsIntegrationsData.facebookPixel.accessToken);
      await expect(saveButton).toBeEnabled();

      // Save and reconnect
      await saveButton.click();

      // Dismiss "Pixel Connected" success modal
      const connectedDialog = page.getByRole('dialog').filter({ hasText: 'Pixel Connected' });
      await expect(connectedDialog).toBeVisible();
      await connectedDialog.getByRole('button', { name: 'Back to settings' }).click();
      await expect(connectedDialog).not.toBeVisible();

      // Card is restored to Connected state
      await expect(settingsPage.facebookPixelCard.getByText('Connected').filter({ visible: true })).toBeVisible();
      await expect(settingsPage.facebookPixelCard.getByText(settingsIntegrationsData.facebookPixel.pixelId).filter({ visible: true })).toBeVisible();
    });
  });
});
