/**
 * Iniciais para o círculo do contato (até 2 letras). Só conta palavras que
 * começam com letra ou número — emoji e símbolos são ignorados, e o corte é por
 * caractere inteiro (um emoji nunca vira "�").
 */
export function initials(name: string): string {
  const letters: string[] = [];
  for (const word of name.split(/\s+/).filter(Boolean)) {
    const first = Array.from(word)[0] ?? "";
    if (/^[\p{L}\p{N}]$/u.test(first)) letters.push(first.toUpperCase());
    if (letters.length === 2) break;
  }
  return letters.length ? letters.join("") : "#";
}
