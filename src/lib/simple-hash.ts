// Lightweight helper so the password isn't stored as plain text in
// localStorage. This is NOT real security: there's no backend, so this
// code (and the hash it produces) still lives in the browser bundle — a
// technically determined visitor could work around it. It's meant to keep
// casual visitors out once the app is reachable through the public tunnel
// link, not to protect sensitive data with encryption-grade guarantees.
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
