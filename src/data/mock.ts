import type { Contact, Instance, Message } from "@/types/crm";

export const MAX_INSTANCES = 5;

// Números, contatos e mensagens fictícios removidos — agora que a Evolution
// API está rodando de verdade, essas listas ficam vazias até a próxima etapa
// (buscar instâncias/contatos/mensagens reais via Supabase + webhook da
// Evolution API em vez de dados simulados). "Adicionar número" no app ainda
// usa o fluxo simulado do QrModal — é a próxima coisa a plugar na API real.
export const instances: Instance[] = [];
export const contacts: Contact[] = [];

export const messages: Message[] = [];

export const incomingSimulations: string[] = [];
