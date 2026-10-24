import { useCallback, useEffect, useState } from "react";

// Etiquetas coloridas por contato. Ficam guardadas no navegador (localStorage),
// separadas dos dados do WhatsApp: apagar/trocar etiqueta nunca mexe em conversa.
export interface Tag {
  id: string;
  name: string;
  color: string; // #rrggbb
}

export const TAG_COLORS = [
  "#ef4444", // vermelho
  "#f97316", // laranja
  "#eab308", // amarelo
  "#22c55e", // verde
  "#14b8a6", // turquesa
  "#3b82f6", // azul
  "#8b5cf6", // roxo
  "#ec4899", // rosa
];

export const TAG_NAME_MAX = 24;

const TAGS_KEY = "hub.tags.v1";
const ASSIGN_KEY = "hub.tagAssign.v1";

type Assignments = Record<string, string[]>; // chave do contato -> ids das etiquetas

function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sem armazenamento (aba privada, cheio): as etiquetas valem só até recarregar.
  }
}

// O mesmo número de telefone pode existir em dois números conectados, então a
// chave leva também o nome da instância.
export function contactTagKey(c: { instance_id: string; id: string }) {
  return `${c.instance_id}|${c.id}`;
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [assign, setAssign] = useState<Assignments>({});

  // Lê depois de montar (no servidor não existe localStorage). Grava só nas
  // funções abaixo — nunca num efeito — para o estado vazio inicial não
  // sobrescrever o que já estava salvo.
  useEffect(() => {
    const savedTags = load<Tag[]>(TAGS_KEY, []);
    setTags(Array.isArray(savedTags) ? savedTags : []);
    const savedAssign = load<Assignments>(ASSIGN_KEY, {});
    setAssign(savedAssign && typeof savedAssign === "object" ? savedAssign : {});
  }, []);

  const createTag = useCallback(
    (name: string, color: string): Tag | null => {
      const clean = name.trim().slice(0, TAG_NAME_MAX);
      if (!clean) return null;
      const existing = tags.find((t) => t.name.toLowerCase() === clean.toLowerCase());
      if (existing) return existing;
      const tag: Tag = {
        id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        name: clean,
        color: TAG_COLORS.includes(color) ? color : TAG_COLORS[5]!,
      };
      const next = [...tags, tag];
      setTags(next);
      save(TAGS_KEY, next);
      return tag;
    },
    [tags],
  );

  const deleteTag = useCallback(
    (id: string) => {
      const nextTags = tags.filter((t) => t.id !== id);
      setTags(nextTags);
      save(TAGS_KEY, nextTags);
      const nextAssign: Assignments = {};
      for (const [key, ids] of Object.entries(assign)) {
        const kept = ids.filter((x) => x !== id);
        if (kept.length) nextAssign[key] = kept;
      }
      setAssign(nextAssign);
      save(ASSIGN_KEY, nextAssign);
    },
    [tags, assign],
  );

  const toggleTag = useCallback(
    (contactKey: string, tagId: string) => {
      const current = assign[contactKey] ?? [];
      const ids = current.includes(tagId) ? current.filter((x) => x !== tagId) : [...current, tagId];
      const nextAssign = { ...assign };
      if (ids.length) nextAssign[contactKey] = ids;
      else delete nextAssign[contactKey];
      setAssign(nextAssign);
      save(ASSIGN_KEY, nextAssign);
    },
    [assign],
  );

  return { tags, assign, createTag, deleteTag, toggleTag };
}
