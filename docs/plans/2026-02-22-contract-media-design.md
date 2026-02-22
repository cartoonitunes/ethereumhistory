# Contract Media Feature — Design Document
*ethereumhistory.com · Feb 22, 2026*

## Goal

Bring contract pages to life with visual context — think Wikipedia image panels, not OpenSea gallery. Each contract page should be able to show historical screenshots, creator photos, era artwork, and other visual evidence that helps readers understand the contract in its historical moment.

---

## What It Is

A **media section on each contract's Overview tab** that displays contextual images with captions and source attribution. Historians can add media when documenting a contract.

**Examples of what media would look like:**
- A Wayback Machine screenshot of the original dApp UI from 2016
- A screenshot of the original blog post announcing the contract
- A photo of the creator (from a public conference talk, etc.)
- A diagram showing how the contract related to other contracts of its era
- An image of the original Ethereum forum discussion

---

## What It Is NOT

- Not a gallery or grid (no thumbnail rows)
- Not a marketplace asset viewer
- Not a place for speculation or hype
- Not optional metadata — it's editorial, like a footnote with visual evidence

---

## User Experience

### Viewing (everyone)

On a contract's **Overview tab**, after the description and historical links section, a "Historical Media" section appears — but **only if media exists**. No empty state shown.

Each media item renders as:

```
┌─────────────────────────────────────┐
│                                     │
│         [image, ~400px wide]        │
│                                     │
└─────────────────────────────────────┘
  Caption text here in muted small type
  Source: [source label] ↗  (links to source_url)
```

- Images are **left-aligned**, not full-width
- Multiple images stack **vertically** (not side by side)
- Click image → expands to full-size overlay (simple lightbox, click outside to close)
- Consistent with the zinc/neutral dark theme of the rest of the site

---

## Adding Media (historians)

In the **edit form** (same area where historians edit descriptions and add historical links), a new "Media" section appears at the bottom.

Fields:
- **Image URL** (required) — must be https://
- **Caption** (required) — short description of what the image shows
- **Source label** (required) — e.g. "Wayback Machine", "GitHub", "Ethereum Blog"
- **Source URL** (required) — link to where the image/evidence came from
- **Media type** (select): Screenshot · Photo · Diagram · Artwork · Other

On save, the media item is added via POST to the media API. It appears immediately on the contract page.

Historians can also **delete** their own media items (small trash icon on the item when logged in). Trusted historians can delete any item.

---

## Database

New table: `contract_media`

```sql
CREATE TABLE contract_media (
  id SERIAL PRIMARY KEY,
  contract_address TEXT NOT NULL REFERENCES contracts(address) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('screenshot', 'photo', 'diagram', 'artwork', 'other')),
  url TEXT NOT NULL,
  caption TEXT NOT NULL,
  source_url TEXT,
  source_label TEXT,
  uploaded_by INTEGER REFERENCES historians(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX contract_media_address_idx ON contract_media (contract_address);
```

---

## API

**GET** `/api/contract/[address]/media`
- Public. Returns array of media items for the contract.

**POST** `/api/contract/[address]/media`
- Requires historian auth (`getHistorianMeFromCookies()`).
- Body: `{ url, caption, source_url, source_label, media_type }`
- Returns created media item.

**DELETE** `/api/contract/[address]/media/[id]`
- Requires auth. Only uploader or trusted historian can delete.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `db/migrations/016_contract_media.sql` | Create — new table |
| `src/lib/db.ts` | Modify — add `getContractMedia()`, `addContractMedia()`, `deleteContractMedia()` following existing raw pg Pool patterns |
| `src/components/ContractMedia.tsx` | Create — the display component |
| `src/app/api/contract/[address]/media/route.ts` | Create — GET + POST + DELETE |
| `src/app/contract/[address]/page.tsx` | Modify — fetch media in server component, pass to client |
| `src/app/contract/[address]/ContractPageClient.tsx` | Modify — render `<ContractMedia>` in Overview tab after historical links |
| `src/components/SuggestEditForm.tsx` | Modify — add media upload section at bottom of edit form |

---

## Implementation Notes

- **Follow existing patterns exactly.** Look at how `historical_links` is handled end-to-end (DB functions in `db.ts`, API in `history/manage/route.ts`, UI in `ContractPageClient.tsx`) and do the same for media.
- The project uses **raw SQL via pg Pool** — NOT Drizzle ORM for most queries.
- Auth follows `getHistorianMeFromCookies()` pattern from `history/manage/route.ts`.
- The DB migration file should be safe to run multiple times (`IF NOT EXISTS`).
- Run `npm run build` at the end to catch TypeScript errors.

---

## Why This Matters

Right now every contract page is text-only. A Wayback Machine screenshot of the original DAO interface, or a photo of Fabian presenting Mist wallet, immediately makes the history feel real and human. That's what turns a data archive into something people want to share and return to.
