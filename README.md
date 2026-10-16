# Connect Hub Pro

Create a modern, full-featured WhatsApp/CRM Multi-Instance Web Hub Dashboard inspired by WhatsApp Web and high-end CRM platforms. Use React, Tailwind CSS, Lucide Icons, and Shadcn UI components. Ensure the layout is clean, highly usable, responsive, and styled with a professional corporate light/dark slate theme.

---

### 1. CORE ARCHITECTURE & LAYOUT STRUCTURE

The layout should feature a 3-column split view plus a persistent top-header bar:

#### A. TOP HEADER BAR (Multi-Number / Multi-Instance Status Bar)

- Display top horizontal cards representing connected WhatsApp numbers/instances.

- Each card shows:

  - Country flag badge (e.g., 🇧🇷 Brazil, 🇺🇸 USA, 🇨🇦 Canada).

  - Instance label and phone number (e.g., "Vendas PR: +55 (46) 9123-4557", "Suporte RS: +55 (51) 9876-5432").

  - Connection status indicator (Green dot for Connected, Red dot for Disconnected, Amber for Syncing).

- Right side of the top header:

  - A main dropdown/filter button styled as "TODOS OS NÚMEROS" with a filter/phone icon. Selecting a number filters the contact list and chat view below.

  - Quick action buttons: Add New WhatsApp Instance (opens QR Code scanner modal), System Settings, and User Profile.

#### B. LEFT NAVIGATION SIDEBAR (Icon Rail)

- Vertical dark navigation rail with icons:

  - Chat/Messages (Active state)

  - Contacts / Leads

  - Broadcast / Bulk Sender

  - Instance Management & QR Code Generator

  - Settings & Webhook Config

- Bottom sidebar icons: Log out, Theme Toggle (Dark/Light).

#### C. MIDDLE COLUMN (Contact List & Search)

- Top Bar:

  - Search input ("Buscar contato ou número...").

  - Sort selector (Alphabetical A-Z, Recent Messages, Tag/Department filter).

- Contact List Cards:

  - Avatar / Profile Picture.

  - Contact Name (e.g., "Ana Santos", "Carlos Diaz").

  - Formatted Phone Number.

  - Instance Badge tag showing which connected WhatsApp line received the contact (e.g., `[Vendas PR]`, `[Suporte RS]`).

  - Timestamp of last message (e.g., "15 min ago").

  - Message preview snippet and unread message counter badge.

#### D. RIGHT COLUMN (Active Chat & Media Interface)

- Header:

  - Selected Contact Avatar & Name.

  - Connected Instance Tag (e.g., `Vendas PR`).

  - Action buttons: Google Calendar integration shortcut, Favorite Star, Search in conversation, More Options (3 dots).

- Chat Canvas / Message History:

  - Support for multiple message content types:

    1. Text messages (Inbound white/slate bubbles, Outbound light green/emerald bubbles) with timestamps and double-check read receipts (✓✓).

    2. Voice Notes / Audio Player: Waveform preview, play/pause toggle, current time counter (e.g., 0:00 / 13:33).

    3. Images & Media: Thumbnail preview with file size (e.g., "Foto • 7,63 MB"). Clicking opens a lightbox modal.

    4. Video Player: Thumbnail preview with inline play overlay button and duration badge (e.g., "02:39").

    5. Document / PDF Attachments: PDF icon card displaying file name (e.g., "Arquivo PDF") and file size (133 MB) with a download button.

- Bottom Input & Action Bar:

  - Textarea input field ("Enviar Mensagem...").

  - Right attachment trigger buttons: Camera (Photo), Video, Voice Recorder (Mic), File Upload.

  - Below input bar: Quick media action buttons:

    - [📷 Enviar Foto]

    - [🎥 Enviar Vídeo]

    - [🎙️ Enviar Áudio]

    - [📁 Enviar Arquivo]

---

### 2. MODALS & INTERACTIVE DIALOGS

1. **WhatsApp QR Code Scanner Modal:**

   - Displayed when clicking "Adicionar Novo Número".

   - Shows a mock QR Code generated for scanning via WhatsApp mobile app (Simulating Evolution API / Z-API connection process).

   - Display connection steps: 1. Open WhatsApp -> 2. Linked Devices -> 3. Scan QR Code.

2. **Instance Limits Warning:**

   - Show account plan limit indicator (e.g., "3 of 5 WhatsApp instances connected").

---

### 3. TECH & SUPABASE INTEGRATION READINESS

- Design state hooks for:

  - `selectedInstanceId` (null for "All Numbers", or specific ID to filter).

  - `activeContactId` for current open conversation.

  - Real-time message list updating simulator.

- Prepare types/interfaces for:

  - `Instance` (id, label, phone_number, country_code, status)

  - `Contact` (id, name, phone, instance_id, unread_count, last_message, last_updated)

  - `Message` (id, contact_id, sender_type, content_type, payload_url, text, timestamp, status)

---

### 4. VISUAL STYLE & POLISH

- Follow the visual layout provided in the reference image: Clean top bar with rounded country-flag instance pills, structured contact sidebar, rich media chat feed with native-looking audio/video/PDF cards.

- High contrast, modern typography, crisp borders (`border-slate-200 dark:border-slate-800`).

- Ensure mobile responsiveness (collapsible sidebar into drawer menu on smaller viewports).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://maisdeum.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/233bc1d8-5af0-4a13-9281-9581299a616d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
