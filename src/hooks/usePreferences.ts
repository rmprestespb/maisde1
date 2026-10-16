import { useCallback, useEffect, useState } from "react";
import type { SortMode } from "./useHub";

export interface AppPreferences {
  /** Toca um aviso sonoro quando chega mensagem nova (simulada) de outro contato. */
  soundOnNewMessage: boolean;
  /** Enter envia a mensagem (padrão do WhatsApp). Desligado: Enter só quebra linha. */
  sendOnEnter: boolean;
  /** Ordenação usada ao abrir a lista de contatos. */
  defaultSort: SortMode;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  soundOnNewMessage: true,
  sendOnEnter: true,
  defaultSort: "recent",
};

const STORAGE_KEY = "hub-preferences";

// Sem backend ainda, então — como o perfil e o tema — isso é local a este
// navegador/computador, não uma preferência de conta sincronizada.
export function readPreferences(): AppPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
  } catch {
    // localStorage indisponível — segue com o padrão
  }
  return DEFAULT_PREFERENCES;
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<AppPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    setPrefs(readPreferences());
  }, []);

  const update = useCallback(<K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // best-effort
      }
      return next;
    });
  }, []);

  return { prefs, update };
}
