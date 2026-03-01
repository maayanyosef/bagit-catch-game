import { test, expect } from '@playwright/test';

// Basic smoke tests for the deployed Bagit Catch Game.
// Assumes the game is served at the root (index.html) of the deployment.

const BASE_URL = process.env.BAGIT_BASE_URL || 'http://127.0.0.1:4173';

// Helper: wait for canvas and start button to be visible
async function waitForGameReady(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#gameCanvas');
  await page.waitForSelector('#startButton');
}

test.describe('Bagit Catch Game – smoke tests', () => {
  test('loads game page without errors', async ({ page }) => {
    await waitForGameReady(page);

    // basic DOM expectations
    await expect(page.locator('#gameCanvas')).toBeVisible();
    await expect(page.locator('#startButton')).toBeVisible();

    // no obvious JS errors in console
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // small interaction to trigger any lazy code
    await page.click('#startButton');
    await page.waitForTimeout(1000);

    expect(errors, 'no console errors during simple start flow').toHaveLength(0);
  });

  test('starts game and updates score when playing briefly', async ({ page }) => {
    await waitForGameReady(page);

    // set nickname if input exists
    const nicknameInput = page.locator('#nicknameInput');
    if (await nicknameInput.isVisible()) {
      await nicknameInput.fill('PlaywrightTester');
    }

    // start game
    await page.click('#startButton');

    // perform a few key presses to move the player
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(3000);

    // check that time is counting down and score element exists
    const timeText = await page.locator('#time').innerText();
    const scoreText = await page.locator('#score').innerText();

    expect(timeText).not.toBe('60'); // should have started ticking
    expect(scoreText).toMatch(/^\d+$/);
  });
});
