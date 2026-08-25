export function isApprovedEmail(email?: string | null) {
  if (!email) return false;
  const configured = process.env.APPROVED_USER_EMAILS ?? process.env.ADMIN_EMAILS ?? "";
  const approved = configured.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return approved.includes(email.toLowerCase());
}
