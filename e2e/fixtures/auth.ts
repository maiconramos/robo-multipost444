/**
 * Authentication helpers for E2E tests.
 *
 * Provides utilities to sign up / sign in users through the real UI
 * and to persist authenticated state for reuse across tests.
 */

import { type Page, type BrowserContext } from "@playwright/test";

interface UserCredentials {
  name: string;
  email: string;
  password: string;
}

/**
 * Sign up a new user through the UI.
 * After signup, the user is redirected to /dashboard.
 */
export async function signUpViaUI(
  page: Page,
  user: UserCredentials
): Promise<void> {
  await page.goto("/signup");

  await page.getByLabel(/name/i).fill(user.name);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);

  await page.getByRole("button", { name: /create account|criar conta/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL("**/dashboard**", { timeout: 30_000 });
}

/**
 * Sign in an existing user through the UI.
 * After login, the user is redirected to /dashboard.
 */
export async function signInViaUI(
  page: Page,
  user: Pick<UserCredentials, "email" | "password">
): Promise<void> {
  await page.goto("/login");

  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);

  await page.getByRole("button", { name: /sign in|entrar/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL("**/dashboard**", { timeout: 30_000 });
}

/**
 * Sign out the current user through the UI.
 */
export async function signOutViaUI(page: Page): Promise<void> {
  // Open user menu and click sign out
  // The sign out button might be in a dropdown
  const signOutButton = page.getByRole("button", { name: /sign out|sair/i });

  if (await signOutButton.isVisible()) {
    await signOutButton.click();
  } else {
    // Try finding it in a dropdown menu
    const userMenu = page.getByRole("button", { name: /user|usuário|menu/i });
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.getByText(/sign out|sair/i).click();
    }
  }

  // Wait for redirect to login or home
  await page.waitForURL(/(\/login|\/|\/signup)/, { timeout: 15_000 });
}

/**
 * Save the current authenticated state (cookies/storage) to a file
 * for reuse in other tests without re-authenticating.
 */
export async function saveAuthState(
  context: BrowserContext,
  path: string
): Promise<void> {
  await context.storageState({ path });
}

/**
 * Navigate to the dashboard, handling any auth redirects.
 * Useful as a starting point for authenticated tests.
 */
export async function navigateToDashboard(page: Page): Promise<void> {
  await page.goto("/dashboard");
  // If redirected to login, we need to sign in first
  if (page.url().includes("/login")) {
    throw new Error(
      "Not authenticated. Use signInViaUI or load stored auth state first."
    );
  }
  await page.waitForLoadState("networkidle");
}
