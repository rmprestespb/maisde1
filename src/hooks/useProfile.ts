import { useCallback, useEffect, useState } from "react";

export interface UserProfile {
  name: string;
  description: string;
  photoUrl: string | null;
}

const DEFAULT_PROFILE: UserProfile = {
  name: "Você",
  description: "",
  photoUrl: null,
};

const STORAGE_KEY = "hub-profile";

/**
 * The app has no backend/auth yet (mock data throughout), so this profile is
 * intentionally local-only — persisted to localStorage the same way
 * useTheme.ts persists the theme choice. It survives reloads on this device,
 * but isn't shared across devices/users until real auth exists.
 */
export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(stored) });
    } catch {
      // localStorage indisponível (modo privado, etc.) — segue com o padrão
    }
  }, []);

  const save = useCallback((next: UserProfile) => {
    setProfile(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // best-effort: se não persistir, ao menos atualiza a sessão atual
    }
  }, []);

  return { profile, save };
}
