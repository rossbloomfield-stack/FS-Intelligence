# Email sign-in: scanner-resistant OTP

## Why the sign-in link failed

Production Auth logs show that the one-time verification URL was redeemed four
seconds after Supabase sent it, from a different automated client. The user's
later request then failed with `One-time token not found`. This is consistent
with Microsoft Safe Links or another corporate email-security scanner
prefetching the URL.

Increasing `mailer_otp_exp` does not address this failure: a redeemed token is
invalid regardless of its remaining lifetime. Keep the email OTP validity at
one hour (`3600` seconds).

## Hosted Supabase configuration

In **Authentication → Email Templates**, update both **Confirm signup** and
**Magic Link**. Each template must include `{{ .Token }}` and must not include
`{{ .ConfirmationURL }}` or another token-bearing link.

Recommended subject:

```text
Your Market Intelligence sign-in code
```

Recommended body:

```html
<h2>Your sign-in code</h2>
<p>Enter this code in Irish Life Market Intelligence:</p>
<p style="font-size: 32px; font-weight: 700; letter-spacing: 8px;">{{ .Token }}</p>
<p>This code can be used once and expires in one hour.</p>
<p>If you did not request this code, you can ignore this email.</p>
```

Do not leave a direct confirmation link in either template. A scanner that
opens that link can invalidate the code as well.

## Delivery configuration

Use the configured Resend account as Supabase Custom SMTP rather than the
hosted Supabase test mailer. Disable click tracking for authentication email.
The built-in mailer has restrictive rate limits and is not intended for a
production demonstration.

## Verification checklist

1. Request a code from an approved corporate address.
2. Confirm the email contains a six-digit code and no sign-in link.
3. Enter the code on `/intelligence/login`.
4. Confirm `/intelligence` loads with an authenticated session.
5. Confirm an incorrect or reused code produces a clear error.
6. Confirm an unapproved address cannot create an account or enter the app.

