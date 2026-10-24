import { useCallback, useEffect, useState } from "react";

// Conversas arquivadas. Ficam guardadas no navegador (localStorage); arquivar só
// esconde a conversa da lista principal, nada é apagado do WhatsApp.
const KEY = "hub.archived.v1";

function load(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function save(set: Set<string>) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    // Sem armazenamento: vale só até recarregar a página.
  }
}

export function useArchived() {
  const [archived, setArchivedState] = useState<Set<string>>(() => new Set());

  // Lê depois de montar (no servidor não existe localStorage). Só grava nas
  // funções abaixo, e só quando algo muda, para o estado vazio inicial nunca
  // sobrescrever o que já estava salvo.
  useEffect(() => {
    setArchivedState(new Set(load()));
  }, []);

  const setArchived = useCallback((key: string, value: boolean) => {
    setArchivedState((prev) => {
      if (prev.has(key) === value) return prev;
      const next = new Set(prev);
      if (value) next.add(key);
      else next.delete(key);
      save(next);
      return next;
    });
  }, []);

  // Chegou mensagem nova numa conversa arquivada: ela volta para a lista
  // principal, senão um cliente poderia ficar sem resposta sem você perceber.
  const unarchiveMany = useCallback((keys: string[]) => {
    setArchivedState((prev) => {
      if (!keys.some((k) => prev.has(k))) return prev;
      const next = new Set(prev);
      for (const k of keys) next.delete(k);
      save(next);
      return next;
    });
  }, []);

  return { archived, setArchived, unarchiveMany };
}
