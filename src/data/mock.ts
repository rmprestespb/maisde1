import type { Contact, Instance, Message } from "@/types/crm";

// Sem limite de números por cliente (pedido do dono do produto).
export const MAX_INSTANCES = Number.POSITIVE_INFINITY;

// Números, contatos e mensagens fictícios removidos — agora que a Evolution
// API está rodando de verdade, essas listas ficam vazias até a próxima etapa
// (buscar instâncias/contatos/mensagens reais via Supabase + webhook da
// Evolution API em vez de dados simulados). "Adicionar número" no app ainda
// usa o fluxo simulado do QrModal — é a próxima coisa a plugar na API real.
export const instances: Instance[] = [];
export const contacts: Contact[] = [];

export const messages: Message[] = [];

export const incomingSimulations: string[] = [];
