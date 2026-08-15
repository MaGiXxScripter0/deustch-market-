export type TurnstileAction = "signup" | "login" | "checkout";

type TurnstileResponse = {
  success?: boolean;
  action?: string;
  hostname?: string;
};

function configuredHostnames() {
  return new Set(
    (process.env.TURNSTILE_HOSTNAMES ?? "")
      .split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
}

function clientIp(headers: Headers) {
  return headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim();
}

export async function verifyTurnstile(
  token: FormDataEntryValue | unknown,
  expectedAction: TurnstileAction,
  headers: Headers,
) {
  const secret = process.env.TURNSTILE_SECRET?.trim();
  const hostnames = configuredHostnames();
  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > 2048 ||
    !secret ||
    hostnames.size === 0
  ) {
    return false;
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    const ip = clientIp(headers);
    if (ip) body.set("remoteip", ip);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const result = (await response.json()) as TurnstileResponse;
    return (
      result.success === true &&
      result.action === expectedAction &&
      typeof result.hostname === "string" &&
      hostnames.has(result.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}
