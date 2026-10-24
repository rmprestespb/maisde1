export type InstanceStatus = "connected" | "disconnected" | "syncing";

export interface Instance {
  id: string;
  label: string;
  phone_number: string;
  country_code: string;
  flag: string;
  status: InstanceStatus;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  instance_id: string;
  unread_count: number;
  last_message: string;
  last_updated: string; // ISO
  tag: string;
  avatar_hue: number;
  starred: boolean;
}

export type SenderType = "inbound" | "outbound";
export type ContentType = "text" | "audio" | "image" | "video" | "document";
export type MessageStatus = "sent" | "delivered" | "read" | "failed";

export interface Message {
  id: string;
  contact_id: string;
  sender_type: SenderType;
  content_type: ContentType;
  payload_url?: string;
  text?: string;
  file_name?: string;
  file_size?: string;
  duration?: string;
  timestamp: string; // ISO
  status: MessageStatus;
  // Mídia recebida do WhatsApp: a tela busca o arquivo sob demanda por estes dados.
  wa_message_id?: string;
  wa_instance?: string;
}
