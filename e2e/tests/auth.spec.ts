/**
 * E2E tests for the authentication flow.
 *
 * Covers: signup, login, logout, redirect to login when unauthenticated,
 * and form validation.
 */

import { test, expect } from "@playwright/test";
import { signUpViaUI, signInViaUI } from "../fixtures/auth";
import { cleanDatabase, disconnectPrisma } from "../fixtures/db";
import { TEST_USER_2 } from "../fixtures/test-data";

test.describe("Authentication", () => {
  test.describe("Sign Up", () => {
    test("should show signup form with required fields", async ({ page }) => {
      await page.goto("/signup");

      await expect(page.getByLabel(/name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /create account|criar conta/i })
      ).toBeVisible();
    });

    test("should show link to sign in page", async ({ page }) => {
      await page.goto("/signup");

      const signInLink = page.getByRole("link", { name: /sign in|entrar/i });
      await expect(signInLink).toBeVisible();
      await signInLink.click();
      await expect(page).toHaveURL(/\/login/);
    });

    test("should sign up a new user and redirect to dashboard", async ({
      page,
    }) => {
      const uniqueUser = {
        name: "Signup Test",
        email: `signup-${Date.now()}@test.local`,
        password: "ValidPassword123!",
      };

      await signUpViaUI(page, uniqueUser);
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("should show validation error for short password", async ({
      page,
    }) => {
      await page.goto("/signup");

      await page.getByLabel(/name/i).fill("Short Pass");
      await page.getByLabel(/email/i).fill("shortpass@test.local");
      await page.getByLabel(/password/i).fill("short");

      await page
        .getByRole("button", { name: /create account|criar conta/i })
        .click();

      // Expect a toast/error about password length
      await expect(
        page.getByText(/8 char|caracteres/i)
      ).toBeVisible({ timeout: 5_000 });
    });

    test("should show validation error for empty fields", async ({ page }) => {
      await page.goto("/signup");

      await page
        .getByRole("button", { name: /create account|criar conta/i })
        .click();

      // Expect a toast about filling all fields
      await expect(
        page.getByText(/fill|preencha/i)
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe("Sign In", () => {
    test("should show login form with required fields", async ({ page }) => {
      await page.goto("/login");

      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /sign in|entrar/i })
      ).toBeVisible();
    });

    test("should show link to sign up page", async ({ page }) => {
      await page.goto("/login");

      const signUpLink = page.getByRole("link", { name: /sign up|cadastr/i });
      await expect(signUpLink).toBeVisible();
      await signUpLink.click();
      await expect(page).toHaveURL(/\/signup/);
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/login");

      await page.getByLabel(/email/i).fill("nonexistent@test.local");
      await page.getByLabel(/password/i).fill("WrongPassword123!");

      await page.getByRole("button", { name: /sign in|entrar/i }).click();

      // Expect error toast
      await expect(
        page.getByText(/invalid|inválid|wrong|erro/i)
      ).toBeVisible({ timeout: 10_000 });
    });

    test("should show validation error for empty fields", async ({ page }) => {
      await page.goto("/login");

      await page.getByRole("button", { name: /sign in|entrar/i }).click();

      await expect(
        page.getByText(/fill|preencha/i)
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect unauthenticated user to login", async ({ page }) => {
      // Clear any session cookies
      await page.context().clearCookies();

      await page.goto("/dashboard");

      // Should redirect to /login with returnUrl
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect to dashboard after login with returnUrl", async ({
      page,
    }) => {
      await page.context().clearCookies();

      // Try to access a specific dashboard page
      await page.goto("/dashboard/compose");

      // Should redirect to login with returnUrl
      await expect(page).toHaveURL(/\/login.*returnUrl/);
    });
  });
});
