/**
 * Database Schema for Ethereum History
 *
 * Uses Drizzle ORM for type-safe database queries.
 * Compatible with Vercel Postgres (Neon) for production.
 */

import {
  pgTable,
  text,
  integer,
  serial,
  boolean,
  real,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

// =============================================================================
// Contracts Table
// =============================================================================

export const contracts = pgTable(
  "contracts",
  {
    // Primary key
    address: text("address").primaryKey(),

    // On-chain data
    runtimeBytecode: text("runtime_bytecode"),
    deployerAddress: text("deployer_address"),
    deploymentTxHash: text("deployment_tx_hash"),
    deploymentBlock: integer("deployment_block"),
    deploymentTimestamp: timestamp("deployment_timestamp"),

    // Decompiled code
    decompiledCode: text("decompiled_code"),
    decompilationSuccess: boolean("decompilation_success").default(false),

    // Deployment info
    gasUsed: integer("gas_used"),
    gasPrice: text("gas_price"),
    codeSizeBytes: integer("code_size_bytes"),

    // Era classification
    eraId: text("era_id"),

    // Heuristics
    contractType: text("contract_type"),
    confidence: real("confidence").default(0.5),
    isProxy: boolean("is_proxy").default(false),
    hasSelfDestruct: boolean("has_selfdestruct").default(false),
    isErc20Like: boolean("is_erc20_like").default(false),

    // External data
    ensName: text("ens_name"),
    deployerEnsName: text("deployer_ens_name"),
    etherscanContractName: text("etherscan_contract_name"),
    sourceCode: text("source_code"),
    abi: text("abi"),

    // Token metadata
    tokenName: text("token_name"),
    tokenSymbol: text("token_symbol"),
    tokenDecimals: integer("token_decimals"),
    tokenLogo: text("token_logo"),

    // Editorial / historical content
    shortDescription: text("short_description"),
    description: text("description"),
    historicalSummary: text("historical_summary"),
    historicalSignificance: text("historical_significance"),
    historicalContext: text("historical_context"),
    featured: boolean("featured").default(false),

    // Bytecode fingerprints for fast similarity matching
    trigramHash: text("trigram_hash"),
    controlFlowSignature: text("control_flow_signature"),
    shapeSignature: text("shape_signature"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Indexes for common queries
    eraIdx: index("contracts_era_idx").on(table.eraId),
    deploymentIdx: index("contracts_deployment_idx").on(table.deploymentTimestamp),
    typeIdx: index("contracts_type_idx").on(table.contractType),
    decompiledIdx: index("contracts_decompiled_idx").on(table.decompilationSuccess),
    featuredIdx: index("contracts_featured_idx").on(table.shortDescription),
    featuredFlagIdx: index("contracts_featured_flag_idx").on(table.featured),
    // Partial index for decompiled code search (if DB supports)
    // trigramIdx would need pg_trgm extension for similarity search
  })
);

// =============================================================================
// Similarity Index Table
// =============================================================================

export const similarityIndex = pgTable(
  "similarity_index",
  {
    contractAddress: text("contract_address").notNull(),
    matchedAddress: text("matched_address").notNull(),

    // Similarity scores
    similarityScore: real("similarity_score").notNull(),
    ngramSimilarity: real("ngram_similarity"),
    controlFlowSimilarity: real("control_flow_similarity"),
    shapeSimilarity: real("shape_similarity"),

    // Classification
    similarityType: text("similarity_type"), // exact, structural, weak, none

    // Explainability
    explanation: text("explanation"),
    sharedPatterns: text("shared_patterns"), // JSON array

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contractAddress, table.matchedAddress] }),
    contractIdx: index("similarity_contract_idx").on(table.contractAddress),
    scoreIdx: index("similarity_score_idx").on(table.similarityScore),
  })
);

// =============================================================================
// Function Signatures Table (optional, for lookup)
// =============================================================================

export const functionSignatures = pgTable(
  "function_signatures",
  {
    selector: text("selector").primaryKey(), // e.g., "0xa9059cbb"
    signature: text("signature"), // e.g., "transfer(address,uint256)"
    name: text("name"), // e.g., "transfer"
    source: text("source"), // 4byte_directory, verified_source, etc.
  },
  (table) => ({
    nameIdx: index("signatures_name_idx").on(table.name),
  })
);

// =============================================================================
// Historical Links (sources, articles, posts, etc.)
// =============================================================================

export const historicalLinks = pgTable(
  "historical_links",
  {
    id: serial("id").primaryKey(),
    contractAddress: text("contract_address")
      .notNull()
      .references(() => contracts.address, { onDelete: "cascade" }),
    title: text("title"),
    url: text("url").notNull(),
    source: text("source"),
    note: text("note"),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    contractIdx: index("historical_links_contract_idx").on(table.contractAddress),
    urlIdx: index("historical_links_url_idx").on(table.url),
    createdByIdx: index("historical_links_created_by_idx").on(table.createdBy),
  })
);

// =============================================================================
// Historians (editor accounts for curated content)
// =============================================================================

export const historians = pgTable(
  "historians",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    tokenHash: text("token_hash"),
    active: boolean("active").notNull().default(true),
    trusted: boolean("trusted").notNull().default(false),
    trustedOverride: boolean("trusted_override"), // NULL = auto, TRUE/FALSE = manual
    // GitHub OAuth
    githubId: text("github_id"),
    githubUsername: text("github_username"),
    // Profile personalization
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    websiteUrl: text("website_url"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex("historians_email_unique").on(table.email),
    activeIdx: index("historians_active_idx").on(table.active),
    trustedIdx: index("historians_trusted_idx").on(table.trusted),
    githubIdIdx: uniqueIndex("historians_github_id_unique").on(table.githubId),
  })
);

// =============================================================================
// Contract Edits (tracks historian edits to contracts)
// =============================================================================

export const contractEdits = pgTable(
  "contract_edits",
  {
    id: serial("id").primaryKey(),
    contractAddress: text("contract_address")
      .notNull()
      .references(() => contracts.address, { onDelete: "cascade" }),
    historianId: integer("historian_id")
      .notNull()
      .references(() => historians.id, { onDelete: "cascade" }),
    editedAt: timestamp("edited_at").defaultNow().notNull(),
    fieldsChanged: text("fields_changed").array(), // Array of field names changed
  },
  (table) => ({
    historianIdx: index("contract_edits_historian_idx").on(table.historianId, table.editedAt),
    contractIdx: index("contract_edits_contract_idx").on(table.contractAddress, table.historianId),
    editedAtIdx: index("contract_edits_edited_at_idx").on(table.editedAt),
    firstEditIdx: index("contract_edits_first_edit_idx").on(table.contractAddress, table.historianId, table.editedAt),
  })
);

// =============================================================================
// Contract Metadata (extensible key/value metadata)
// =============================================================================

export const contractMetadata = pgTable(
  "contract_metadata",
  {
    id: serial("id").primaryKey(),
    contractAddress: text("contract_address")
      .notNull()
      .references(() => contracts.address, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value"),
    jsonValue: jsonb("json_value"),
    sourceUrl: text("source_url"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    contractIdx: index("contract_metadata_contract_idx").on(table.contractAddress),
    keyIdx: index("contract_metadata_key_idx").on(table.key),
  })
);

// =============================================================================
// People (known deployers / historical figures)
// =============================================================================

export const people = pgTable(
  "people",
  {
    // Primary key (wallet / deployer address)
    address: text("address").primaryKey(),

    // Display
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    role: text("role"),
    shortBio: text("short_bio"),
    bio: text("bio"),
    highlights: jsonb("highlights"), // JSON array of strings

    // References
    websiteUrl: text("website_url"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    slugIdx: index("people_slug_idx").on(table.slug),
  })
);

export const peopleWallets = pgTable(
  "people_wallets",
  {
    address: text("address").primaryKey(),
    personAddress: text("person_address")
      .notNull()
      .references(() => people.address, { onDelete: "cascade" }),
    label: text("label"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    personIdx: index("people_wallets_person_idx").on(table.personAddress),
  })
);

// =============================================================================
// Type exports for use with Drizzle
// =============================================================================

export type Contract = typeof contracts.$inferSelect;
export type NewContract = typeof contracts.$inferInsert;
export type SimilarityRecord = typeof similarityIndex.$inferSelect;
export type NewSimilarityRecord = typeof similarityIndex.$inferInsert;
export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
export type PersonWallet = typeof peopleWallets.$inferSelect;
export type NewPersonWallet = typeof peopleWallets.$inferInsert;
export type Historian = typeof historians.$inferSelect;
export type NewHistorian = typeof historians.$inferInsert;
export type ContractEdit = typeof contractEdits.$inferSelect;
export type NewContractEdit = typeof contractEdits.$inferInsert;

// =============================================================================
// Historian Invitations
// =============================================================================

export const historianInvitations = pgTable(
  "historian_invitations",
  {
    id: serial("id").primaryKey(),
    inviterId: integer("inviter_id")
      .notNull()
      .references(() => historians.id, { onDelete: "cascade" }),
    inviteeId: integer("invitee_id").references(() => historians.id, { onDelete: "set null" }),
    inviteToken: text("invite_token").notNull(),
    invitedEmail: text("invited_email"), // Optional - can be filled by invitee
    invitedName: text("invited_name"),
    createdAt: timestamp("created_at").defaultNow(),
    acceptedAt: timestamp("accepted_at"),
    expiresAt: timestamp("expires_at"),
    notes: text("notes"),
  },
  (table) => ({
    tokenIdx: index("historian_invitations_token_idx").on(table.inviteToken),
    inviterIdx: index("historian_invitations_inviter_idx").on(table.inviterId),
    inviteeIdx: index("historian_invitations_invitee_idx").on(table.inviteeId),
    expiresIdx: index("historian_invitations_expires_idx").on(table.expiresAt),
    tokenUnique: uniqueIndex("historian_invitations_token_unique").on(table.inviteToken),
  })
);

export type HistorianInvitation = typeof historianInvitations.$inferSelect;
export type NewHistorianInvitation = typeof historianInvitations.$inferInsert;

// =============================================================================
// Analytics Events (self-hosted engagement tracking)
// =============================================================================

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: serial("id").primaryKey(),
    // Event classification
    eventType: text("event_type").notNull(), // page_view, tab_click, search, contract_view, etc.
    // Page / contract context
    pagePath: text("page_path"),
    contractAddress: text("contract_address"),
    // Event-specific payload (e.g. search query, tab name, scroll depth)
    eventData: jsonb("event_data"),
    // Anonymous visitor fingerprint (hashed, no PII)
    sessionId: text("session_id"),
    // Referrer
    referrer: text("referrer"),
    // Timestamp
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    eventTypeIdx: index("analytics_event_type_idx").on(table.eventType),
    createdAtIdx: index("analytics_created_at_idx").on(table.createdAt),
    contractIdx: index("analytics_contract_idx").on(table.contractAddress),
    sessionIdx: index("analytics_session_idx").on(table.sessionId),
  })
);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;

// =============================================================================
// Edit Suggestions (anonymous community suggestions)
// =============================================================================

export const editSuggestions = pgTable(
  "edit_suggestions",
  {
    id: serial("id").primaryKey(),
    contractAddress: text("contract_address")
      .notNull()
      .references(() => contracts.address, { onDelete: "cascade" }),
    // What they want to change
    fieldName: text("field_name").notNull(), // description, historical_context, etc.
    suggestedValue: text("suggested_value").notNull(),
    // Optional context
    reason: text("reason"),
    // Submitter identity (optional — GitHub username if authed, null if anonymous)
    submitterGithub: text("submitter_github"),
    submitterName: text("submitter_name"),
    // Linked historian account (for moderated edits from untrusted historians)
    submitterHistorianId: integer("submitter_historian_id").references(() => historians.id, { onDelete: "set null" }),
    batchId: text("batch_id"),
    // Moderation
    status: text("status").notNull().default("pending"), // pending, approved, rejected
    reviewedBy: integer("reviewed_by").references(() => historians.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at"),
    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    contractIdx: index("edit_suggestions_contract_idx").on(table.contractAddress),
    statusIdx: index("edit_suggestions_status_idx").on(table.status),
    createdAtIdx: index("edit_suggestions_created_at_idx").on(table.createdAt),
    historianIdx: index("edit_suggestions_historian_idx").on(table.submitterHistorianId),
    batchIdx: index("edit_suggestions_batch_idx").on(table.batchId),
  })
);

export type EditSuggestion = typeof editSuggestions.$inferSelect;
export type NewEditSuggestion = typeof editSuggestions.$inferInsert;

// =============================================================================
// Capability Classification (Beta)
// =============================================================================

export const contractCapabilities = pgTable(
  "contract_capabilities",
  {
    contractAddress: text("contract_address")
      .notNull()
      .references(() => contracts.address, { onDelete: "cascade" }),
    capabilityKey: text("capability_key").notNull(),
    status: text("status").notNull().default("probable"), // present | probable | absent
    confidence: real("confidence").notNull().default(0.5),
    primaryEvidenceType: text("primary_evidence_type"),
    detectorVersion: text("detector_version"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contractAddress, table.capabilityKey] }),
    capabilityIdx: index("contract_capabilities_key_idx").on(table.capabilityKey),
    statusIdx: index("contract_capabilities_status_idx").on(table.status),
    confidenceIdx: index("contract_capabilities_confidence_idx").on(table.confidence),
  })
);

export const capabilityEvidence = pgTable(
  "capability_evidence",
  {
    id: serial("id").primaryKey(),
    contractAddress: text("contract_address")
      .notNull()
      .references(() => contracts.address, { onDelete: "cascade" }),
    capabilityKey: text("capability_key").notNull(),
    evidenceType: text("evidence_type").notNull(), // source | decompiled | selector | opcode | event | trace
    evidenceKey: text("evidence_key"),
    evidenceValue: text("evidence_value"),
    snippet: text("snippet"),
    confidence: real("confidence").notNull().default(0.5),
    detectorVersion: text("detector_version"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    contractIdx: index("capability_evidence_contract_idx").on(table.contractAddress),
    capabilityIdx: index("capability_evidence_key_idx").on(table.capabilityKey),
    evidenceTypeIdx: index("capability_evidence_type_idx").on(table.evidenceType),
  })
);

export type ContractCapability = typeof contractCapabilities.$inferSelect;
export type NewContractCapability = typeof contractCapabilities.$inferInsert;
export type CapabilityEvidence = typeof capabilityEvidence.$inferSelect;
export type NewCapabilityEvidence = typeof capabilityEvidence.$inferInsert;
