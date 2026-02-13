import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const sources = pgTable(
  "skills_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: text("kind").notNull(), // clawhub | github_list
    name: text("name").notNull(),
    url: text("url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    urlIdx: uniqueIndex("skills_sources_url_ux").on(t.url),
  })
);

export const skills = pgTable(
  "skills_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),

    homepageUrl: text("homepage_url"),
    repoUrl: text("repo_url"),
    sourceUrl: text("source_url"),

    // lightweight popularity hints
    stars: integer("stars").notNull().default(0),

    // optional extracted content
    readmeMarkdown: text("readme_markdown"),

    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    // admin curated recommendations
    highlighted: boolean("highlighted").notNull().default(false),
    highlightedAt: timestamp("highlighted_at", { withTimezone: true }),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex("skills_skills_slug_ux").on(t.slug),
  })
);

export const tags = pgTable(
  "skills_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    nameIdx: uniqueIndex("skills_tags_name_ux").on(t.name),
  })
);

export const skillTags = pgTable(
  "skills_skill_tags",
  {
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.skillId, t.tagId] }),
  })
);

export const skillSources = pgTable(
  "skills_skill_sources",
  {
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.skillId, t.sourceId] }),
  })
);

// Ingest checkpointing so long-running jobs can resume after interruption.
export const ingestState = pgTable(
  "skills_ingest_state",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // e.g. "clawhub" | "github_list"
    sourceKind: text("source_kind").notNull(),
    // e.g. "ClawHub" | "ComposioHQ/awesome-claude-skills"
    sourceName: text("source_name").notNull(),

    cursor: text("cursor"),
    pageNo: integer("page_no").notNull().default(0),
    upsertedTotal: integer("upserted_total").notNull().default(0),
    done: integer("done").notNull().default(0),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    srcIdx: uniqueIndex("skills_ingest_state_src_ux").on(t.sourceKind, t.sourceName),
  })
);
