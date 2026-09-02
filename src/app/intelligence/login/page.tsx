"use client";

import { FormEvent, useState } from "react";
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
  const [state, setState] = useState<LoginState>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/api/auth/callback` },
      });

      setState(error
        ? { kind: "error", text: "We couldn’t send the secure link. Check your email and try again." }
        : { kind: "success", text: "Check your email for your secure sign-in link." });
    } catch {
      setState({ kind: "error", text: "Secure sign-in is temporarily unavailable. Please try again." });
    } finally {
      setPending(false);
    }
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
            <h2>Log in</h2>
            <p>Access is limited to approved users.</p>

            <form onSubmit={submit}>
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
              <p id="login-email-hint" className="irishlife-login-hint">We’ll email you a secure, password-free sign-in link.</p>

              <button type="submit" disabled={pending}>
                <span>{pending ? "Sending link…" : "Continue"}</span>
                <span className="irishlife-login-button-icon" aria-hidden="true"><ArrowRight size={20} /></span>
              </button>
            </form>

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
