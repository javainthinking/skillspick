CREATE TABLE "skills_ingest_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_kind" text NOT NULL,
	"source_name" text NOT NULL,
	"cursor" text,
	"page_no" integer DEFAULT 0 NOT NULL,
	"upserted_total" integer DEFAULT 0 NOT NULL,
	"done" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "skills_ingest_state_src_ux" ON "skills_ingest_state" USING btree ("source_kind","source_name");