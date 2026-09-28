import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
const getUser = vi.fn();
const signOut = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession, getUser, signOut },
  })),
}));

vi.mock("@/lib/auth/access", () => ({
  isApprovedEmail: (email?: string | null) => email === "approved@example.com",
}));

import { GET } from "@/app/api/auth/callback/route";

describe("auth callback", () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    getUser.mockReset();
    signOut.mockReset();
  });

  it("accepts an OTP-created session and preserves a safe intelligence destination", async () => {
    getUser.mockResolvedValue({
      data: { user: { email: "approved@example.com" } },
      error: null,
    });

    const response = await GET(new Request(
      "https://www.rossbloomfield.com/api/auth/callback?next=%2Fintelligence%2Fsignals%3Fperiod%3Dweek",
    ));

    expect(response.headers.get("location")).toBe(
      "https://www.rossbloomfield.com/intelligence/signals?period=week",
    );
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("rejects an external return URL", async () => {
    getUser.mockResolvedValue({
      data: { user: { email: "approved@example.com" } },
      error: null,
    });

    const response = await GET(new Request(
      "https://www.rossbloomfield.com/api/auth/callback?next=https%3A%2F%2Fevil.example%2Fcollect",
    ));

    expect(response.headers.get("location")).toBe(
      "https://www.rossbloomfield.com/intelligence",
    );
  });

  it("returns failed magic-link exchanges to login", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { user: null },
      error: new Error("invalid code"),
    });

    const response = await GET(new Request(
      "https://www.rossbloomfield.com/api/auth/callback?code=expired&next=%2Fintelligence%2Fai",
    ));
    const location = new URL(response.headers.get("location")!);

    expect(location.pathname).toBe("/intelligence/login");
    expect(location.searchParams.get("error")).toBe("invalid-or-expired");
    expect(location.searchParams.get("next")).toBe("/intelligence/ai");
  });

  it("rejects callbacks without a code or authenticated session", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await GET(new Request(
      "https://www.rossbloomfield.com/api/auth/callback",
    ));
    const location = new URL(response.headers.get("location")!);

    expect(location.pathname).toBe("/intelligence/login");
    expect(location.searchParams.get("error")).toBe("missing-session");
  });

  it("signs out authenticated users who are not approved", async () => {
    getUser.mockResolvedValue({
      data: { user: { email: "unapproved@example.com" } },
      error: null,
    });

    const response = await GET(new Request(
      "https://www.rossbloomfield.com/api/auth/callback?next=%2Fintelligence",
    ));
    const location = new URL(response.headers.get("location")!);

    expect(signOut).toHaveBeenCalledOnce();
    expect(location.searchParams.get("error")).toBe("not-approved");
  });
});
