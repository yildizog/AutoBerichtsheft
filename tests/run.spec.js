import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

test('test', async ({ page }) => {

  const username = process.env.USERNAME;
  const password = process.env.PASS;

  await page.goto('https://webuntis.com/#/basic/login');
  await page.getByText('Search for School Name, City or Address').click();
  await page.getByRole('combobox').fill('Ludwig-Erhard-Berufskolleg Münster');
  await page.getByRole('combobox').press('Enter');
  await page.goto('https://niobe.webuntis.com/WebUntis/?school=le-bk-muenster#/basic/login');
  await page.getByRole('textbox', { name: 'Benutzername' }).click();
  await page.getByRole('textbox', { name: 'Benutzername' }).fill(username);
  await page.getByRole('textbox', { name: 'Passwort' }).click();
  await page.getByRole('textbox', { name: 'Passwort' }).fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Mein Stundenplan' }).click();
  await page.getByTestId('date-picker-with-arrows-previous').click();
  await page.getByTestId('date-picker-with-arrows-previous').click();
  await page.getByRole('link', { name: 'Mein Stundenplan' }).click();
  await page.getByTestId('lesson-card-row').nth(2).click();
  const locator = page.locator('textarea.ant-input');
  const EVP = await locator.inputValue();
  console.log("Montag:")
  console.log("Entwicklung Vernetzter Prozesse:\n",EVP);
  console.log("\n")
  await page.getByRole('button', { name: 'Close' }).click();
  await page.locator('div').filter({ hasText: /^D$/ }).nth(1).click();
  const DE = await locator.inputValue();
  console.log("Deutsch:", DE);
  console.log("\n")
  await page.getByRole('button', { name: 'Close' }).click();
  await page.locator('div').filter({ hasText: /^STDM$/ }).first().click();
  const STDM = await locator.inputValue();
  console.log("Softwaretechnologie und Datenmanagement:\n", STDM);
  console.log("\n")
  await page.getByRole('button', { name: 'Close' }).click();
  await page.locator('div').filter({ hasText: /^C26$/ }).nth(3).click();
  const Kryp = await locator.inputValue();
  console.log("Kryptologie:\n", Kryp);
  console.log("\n")
  await page.getByRole('button', { name: 'Close' }).click();
  console.log("\n")
  console.log("\n")
  console.log("Freitag:")
  await page.locator('div').filter({ hasText: /^N127$/ }).first().click();
  const GID = await locator.inputValue();
  console.log("Gestaltung IT Dienstleistungen:\n", GID);
  console.log("\n")
  await page.getByRole('button', { name: 'Close' }).click();
  await page.locator('div').filter({ hasText: /^E$/ }).nth(3).click();
  const EN = await locator.inputValue();
  console.log("Englisch:\n", EN);
  console.log("\n")
  await page.getByRole('button', { name: 'Close' }).click();
  await page.locator('div').filter({ hasText: /^EVP$/ }).nth(3).click();
  const EVP2 = await locator.inputValue();
  console.log("Entwicklung Vernetzter Prozesse:\n", EVP2);
  await page.getByRole('button', { name: 'Close' }).click();
});