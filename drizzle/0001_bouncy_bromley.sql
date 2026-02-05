CREATE TABLE "skills_skill_sources" (
	"skill_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	CONSTRAINT "skills_skill_sources_skill_id_source_id_pk" PRIMARY KEY("skill_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "skills_skill_tags" (
	"skill_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "skills_skill_tags_skill_id_tag_id_pk" PRIMARY KEY("skill_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "skills_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"homepage_url" text,
	"repo_url" text,
	"source_url" text,
	"stars" integer DEFAULT 0 NOT NULL,
	"readme_markdown" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "skill_sources" CASCADE;--> statement-breakpoint
DROP TABLE "skill_tags" CASCADE;--> statement-breakpoint
DROP TABLE "skills" CASCADE;--> statement-breakpoint
DROP TABLE "sources" CASCADE;--> statement-breakpoint
DROP TABLE "tags" CASCADE;--> statement-breakpoint
ALTER TABLE "skills_skill_sources" ADD CONSTRAINT "skills_skill_sources_skill_id_skills_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills_skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills_skill_sources" ADD CONSTRAINT "skills_skill_sources_source_id_skills_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."skills_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills_skill_tags" ADD CONSTRAINT "skills_skill_tags_skill_id_skills_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills_skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills_skill_tags" ADD CONSTRAINT "skills_skill_tags_tag_id_skills_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."skills_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "skills_skills_slug_ux" ON "skills_skills" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_sources_url_ux" ON "skills_sources" USING btree ("url");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_tags_name_ux" ON "skills_tags" USING btree ("name");