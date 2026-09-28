"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

type LoginState = {
  kind: "error" | "success";
  text: string;
} | null;

const benefits = [
  {
    title: "See what matters sooner",
    description: "Ask across monitored market signals, competitors and regulatory developments.",
  },
  {
    title: "Understand the strategic implication",
    description: "Move from source evidence to an executive conclusion and Irish-market read-across.",
  },
  {
    title: "Inspect the evidence",
    description: "Open the references supporting every material answer.",
  },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [state, setState] = useState<LoginState>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const error = search.get("error") ?? hash.get("error_code") ?? hash.get("error");
    const message = error === "not-approved"
      ? "This email is not approved for this workspace."
      : error
        ? "That sign-in link is no longer valid. Request a new email and try again."
        : null;

    if (!message) return;

    let active = true;
    window.queueMicrotask(() => {
      if (active) setState({ kind: "error", text: message });
    });

    return () => {
      active = false;
    };
  }, []);

  function safeNextPath() {
    const fallback = "/intelligence";
    const requested = new URLSearchParams(window.location.search).get("next");

    if (!requested) return fallback;

    try {
      const base = "https://market-intelligence.invalid";
      const target = new URL(requested, base);
      const isIntelligenceRoute =
        target.pathname === fallback || target.pathname.startsWith(`${fallback}/`);

      if (target.origin !== base || !isIntelligenceRoute || target.pathname === "/intelligence/login") {
        return fallback;
      }

      return `${target.pathname}${target.search}${target.hash}`;
    } catch {
      return fallback;
    }
  }

  async function requestSignIn() {
    setPending(true);
    setState(null);

    try {
      const supabase = createClient();
      const next = safeNextPath();
      const callback = new URL("/api/auth/callback", window.location.origin);
      callback.searchParams.set("next", next);
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: callback.toString(),
          shouldCreateUser: false,
        },
      });

      if (error) {
        setState({
          kind: "error",
          text: "We couldn’t send sign-in instructions. Confirm you’re using an approved email and try again.",
        });
        return;
      }

      setCodeSent(true);
      setToken("");
      setState({
        kind: "success",
        text: "Check your email. Enter the six-digit code if shown, or use the secure sign-in link.",
      });
    } catch {
      setState({ kind: "error", text: "Secure sign-in is temporarily unavailable. Please try again." });
    } finally {
      setPending(false);
    }
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestSignIn();
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type: "email",
      });

      if (error) {
        setState({
          kind: "error",
          text: "That code is invalid or has expired. Request a new email and try again.",
        });
        return;
      }

      setState({ kind: "success", text: "Sign-in confirmed. Opening Market Intelligence…" });
      const callback = new URL("/api/auth/callback", window.location.origin);
      callback.searchParams.set("next", safeNextPath());
      window.location.assign(callback.toString());
    } catch {
      setState({ kind: "error", text: "We couldn’t verify that code. Please try again." });
    } finally {
      setPending(false);
    }
  }

  function changeEmail() {
    setCodeSent(false);
    setToken("");
    setState(null);
  }

  return (
    <main className="irishlife-login">
      <a className="irishlife-login-brand" href="https://www.irishlife.ie/" aria-label="Irish Life home">
        <Image
          src="/brand/irish-life-logo.svg"
          width={120}
          height={60}
          alt="Irish Life"
          unoptimized
        />
      </a>

      <div className="irishlife-login-layout">
        <section className="irishlife-login-content" aria-labelledby="login-title">
          <div className="irishlife-login-intro">
            <p className="irishlife-login-product">Market Intelligence</p>
            <h1 id="login-title">Welcome to Irish Life Market Intelligence</h1>
            <p>Understand the market before it becomes obvious.</p>
          </div>

          <div className="irishlife-login-card">
            <h2>{codeSent ? "Enter your security code" : "Log in"}</h2>
            <p>{codeSent ? `We sent sign-in instructions to ${email.trim()}.` : "Access is limited to approved users."}</p>

            {!codeSent ? (
              <form onSubmit={submitEmail}>
                <label htmlFor="work-email">Work email <span aria-hidden="true">*</span></label>
                <div className="irishlife-login-field">
                  <input
                    id="work-email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    aria-describedby="login-email-hint"
                  />
                </div>
                <p id="login-email-hint" className="irishlife-login-hint">We’ll email secure, password-free sign-in instructions.</p>

                <button type="submit" disabled={pending}>
                  <span>{pending ? "Sending…" : "Continue"}</span>
                  <span className="irishlife-login-button-icon" aria-hidden="true"><ArrowRight size={20} /></span>
                </button>
              </form>
            ) : (
              <form onSubmit={submitCode}>
                <label htmlFor="security-code">Six-digit security code <span aria-hidden="true">*</span></label>
                <div className="irishlife-login-field irishlife-login-code-field">
                  <input
                    id="security-code"
                    required
                    autoFocus
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    type="text"
                    value={token}
                    onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    aria-describedby="login-code-hint"
                  />
                </div>
                <p id="login-code-hint" className="irishlife-login-hint">If your email only contains a secure sign-in link, open that link instead.</p>

                <button type="submit" disabled={pending || token.length !== 6}>
                  <span>{pending ? "Checking…" : "Continue securely"}</span>
                  <span className="irishlife-login-button-icon" aria-hidden="true"><ArrowRight size={20} /></span>
                </button>

                <div className="irishlife-login-alternatives">
                  <button type="button" onClick={changeEmail} disabled={pending}>Use a different email</button>
                  <button type="button" onClick={requestSignIn} disabled={pending}>Send a new email</button>
                </div>
              </form>
            )}

            {state && (
              <p className={`irishlife-login-status irishlife-login-status-${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>
                {state.text}
              </p>
            )}

            <p className="irishlife-login-secure"><LockKeyhole size={17} aria-hidden="true" /> Secure access to a private demonstration workspace.</p>
          </div>

          <ul className="irishlife-login-benefits" aria-label="Market Intelligence benefits">
            {benefits.map((benefit) => (
              <li key={benefit.title}>
                <span aria-hidden="true"><Check size={17} /></span>
                <div>
                  <h2>{benefit.title}</h2>
                  <p>{benefit.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="irishlife-login-image" aria-label="Irish Life digital experience">
          <Image
            src="/brand/irish-life-login.jpg"
            alt="Irish Life customer using a laptop"
            fill
            sizes="(min-width: 900px) 44vw, 100vw"
            preload
          />
        </aside>
      </div>

      <footer className="irishlife-login-footer">
        <span>Irish Life Market Intelligence</span>
        <span>Private demonstration environment</span>
      </footer>
    </main>
  );
}
