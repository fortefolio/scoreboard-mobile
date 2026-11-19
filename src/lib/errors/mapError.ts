/**
 * Maps raw backend/Supabase/network errors to safe, generic user-facing messages
 * so internal SQL, schema, or auth details are never exposed in UI alerts.
 */
export function mapErrorToUserMessage(err: unknown, locale: string = "en", fallback?: string): string {
  const isPt = locale === "pt";
  const defaultMsg =
    fallback || (isPt ? "Ocorreu um erro. Por favor, tenta novamente." : "An error occurred. Please try again.");

  const raw =
    typeof err === "string"
      ? err
      : (err as any)?.message || (err as any)?.error_description || "";
  const msg = String(raw).toLowerCase();
  const code = String((err as any)?.code || "").toLowerCase();

  if (!msg && !code) return defaultMsg;

  if (msg.includes("invalid login credentials") || code === "invalid_credentials") {
    return isPt ? "Email ou palavra-passe inválidos." : "Invalid email or password.";
  }
  if (msg.includes("email not confirmed")) {
    return isPt ? "Confirma o teu email antes de iniciar sessão." : "Please confirm your email before signing in.";
  }
  if (msg.includes("user already registered") || code === "user_already_exists") {
    return isPt ? "Já existe uma conta com este email." : "An account with this email already exists.";
  }
  if (msg.includes("rate limit") || msg.includes("too many requests") || code === "over_request_rate_limit") {
    return isPt ? "Demasiadas tentativas. Aguarda um momento." : "Too many attempts. Please wait a moment.";
  }
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("offline") || code === "econnrefused") {
    return isPt ? "Sem ligação à internet. Verifica a tua rede." : "Network error. Please check your connection.";
  }
  if (code === "42501" || msg.includes("permission denied") || msg.includes("unauthorized") || msg.includes("forbidden")) {
    return isPt ? "Não tens permissão para realizar esta ação." : "You do not have permission to perform this action.";
  }

  return defaultMsg;
}
