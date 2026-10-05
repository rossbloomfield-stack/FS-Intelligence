import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Irish Life login experience", () => {
  const page = readFileSync(
    join(process.cwd(), "src/app/intelligence/login/page.tsx"),
    "utf8",
  );

  it("uses the official Irish Life visual assets and market-intelligence framing", () => {
    expect(page).toContain("/brand/irish-life-logo.svg");
    expect(page).toContain("/brand/irish-life-login.jpg");
    expect(page).toContain("Welcome to Irish Life Market Intelligence");
  });

  it("preserves passwordless approved-user authentication", () => {
    expect(page).toContain("signInWithOtp");
    expect(page).toContain("shouldCreateUser: false");
    expect(page).toContain("verifyOtp");
    expect(page).toContain('type: "email"');
    expect(page).toContain("Access is limited to approved users");
    expect(page).toContain("password-free sign-in instructions");
    expect(page).toContain('autoComplete="one-time-code"');
    expect(page).toContain('pattern="[0-9]{6,10}"');
    expect(page).toContain("slice(0, 10)");
    expect(page).not.toContain('type="password"');
  });

  it("retains a safe intelligence return path through the auth callback", () => {
    expect(page).toContain('new URL("/api/auth/callback", window.location.origin)');
    expect(page).toContain('target.origin !== base');
    expect(page).toContain('target.pathname.startsWith(`${fallback}/`)');
  });
});
