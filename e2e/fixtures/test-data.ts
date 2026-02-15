/**
 * Test data constants used across E2E tests.
 *
 * These provide deterministic values for user accounts, workspaces,
 * social accounts, posts, and queues used in test scenarios.
 */

export const TEST_USER = {
  name: "Test User",
  email: "test@robo-multipost.local",
  password: "TestPassword123!",
} as const;

export const TEST_USER_2 = {
  name: "Second User",
  email: "test2@robo-multipost.local",
  password: "TestPassword456!",
} as const;

export const TEST_WORKSPACE = {
  name: "Test Workspace",
  slug: "test-workspace",
} as const;

export const TEST_SOCIAL_ACCOUNT = {
  platform: "INSTAGRAM" as const,
  connectionMethod: "BYO_OAUTH" as const,
  providerIdentifier: "byo_oauth.instagram",
  handle: "@testaccount",
  username: "testaccount",
  displayName: "Test Account",
} as const;

export const TEST_MEDIA_ASSET = {
  type: "image" as const,
  url: "https://mock-blob.vercel-storage.com/test-image.jpg",
  filename: "test-image.jpg",
  contentType: "image/jpeg",
  size: 102400,
} as const;

export const TEST_POST = {
  content: "Hello from E2E test! This is a test post. #testing",
  scheduledContent: "Scheduled post from E2E test. #scheduled",
} as const;

export const TEST_QUEUE = {
  name: "Test Queue",
  timezone: "America/Sao_Paulo",
  slots: [
    { dayOfWeek: 1, time: "09:00" }, // Monday 9am
    { dayOfWeek: 3, time: "14:00" }, // Wednesday 2pm
    { dayOfWeek: 5, time: "10:00" }, // Friday 10am
  ],
} as const;

/** Fake OAuth tokens used when mocking BYO connections */
export const FAKE_TOKENS = {
  accessToken: "fake-access-token-e2e-test",
  refreshToken: "fake-refresh-token-e2e-test",
} as const;

/** Fake Late API key for mocking Late provider */
export const FAKE_LATE_API_KEY = "late_test_key_e2e_fake_1234567890" as const;
