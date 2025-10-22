import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {

    const inhalt = ("HALLO");
  await page.goto('https://www.bildung-ihk-nordwestfalen.de/tibrosBB/BB_auszubildende.jsp');
  await page.getByRole('textbox', { name: 'Azubinummer' }).click();
  await page.getByRole('textbox', { name: 'Azubinummer' }).fill('0001952101');
  await page.getByRole('textbox', { name: 'Passwort' }).click();
  await page.getByRole('textbox', { name: 'Passwort' }).fill('O.yildiz99');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Ausbildungsnachweise', exact: true }).click();
  await page.getByRole('button', { name: 'Neuer Eintrag' }).first().click();
  await page.locator('textarea[name="ausbinhalt3"]').click();
  await page.locator('textarea[name="ausbinhalt3"]').fill(inhalt);
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
});