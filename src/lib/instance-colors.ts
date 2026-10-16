import type { Instance } from "@/types/crm";

/**
 * Fixed identity palette for WhatsApp instances (Fase 1 / Fase 2 of the UX roadmap).
 * Deliberately kept out of the hue ranges already used for connection status
 * (status-online ~158, status-offline ~27, status-syncing ~78) so an instance
 * color is never mistaken for a status color.
 */
const PALETTE_SIZE = 5;

export function instanceAccent(instanceId: string, instances: Instance[]): string {
  const idx = instances.findIndex((i) => i.id === instanceId);
  const slot = ((idx < 0 ? 0 : idx) % PALETTE_SIZE) + 1;
  return `var(--instance-${slot})`;
}
