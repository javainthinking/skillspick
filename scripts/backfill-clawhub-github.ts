import postgres from "postgres";

const OPENCLAW_SKILLS_REPO = "https://github.com/openclaw/skills";

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is missing`);
  return v;
}

async function main() {
  const DATABASE_URL = mustEnv("DATABASE_URL");

  const sql = postgres(DATABASE_URL, {
    ssl: "require",
    max: 1,
    connect_timeout: 10,
    idle_timeout: 20,
  });

  // Backfill rules:
  // - only skills that have a clawhub source in skills_skill_sources
  // - if skills.source_url is a clawhub.ai/<owner>/<slug> URL, convert it to the corresponding
  //   GitHub directory in openclaw/skills.
  // - preserve the ClawHub URL in homepage_url if homepage_url is empty.
  // - fill repo_url with openclaw/skills if missing.

  const rows = await sql/* sql */ `
    with clawhub_skills as (
      select distinct s.id, s.source_url
      from skills_skills s
      join skills_skill_sources ss on ss.skill_id = s.id
      join skills_sources src on src.id = ss.source_id
      where src.kind = 'clawhub'
        and s.source_url is not null
        and s.source_url ~ '^https?://clawhub\\.ai/[^/]+/[^/?#]+'
    ),
    parsed as (
      select
        id,
        source_url as clawhub_url,
        (regexp_match(source_url, '^https?://clawhub\\.ai/([^/]+)/([^/?#]+)'))[1] as owner,
        (regexp_match(source_url, '^https?://clawhub\\.ai/([^/]+)/([^/?#]+)'))[2] as slug
      from clawhub_skills
    )
    update skills_skills s
    set
      homepage_url = coalesce(s.homepage_url, p.clawhub_url),
      repo_url = coalesce(s.repo_url, ${OPENCLAW_SKILLS_REPO}),
      source_url = ('https://github.com/openclaw/skills/tree/main/skills/' || p.owner || '/' || p.slug),
      updated_at = now()
    from parsed p
    where s.id = p.id
      and p.owner is not null
      and p.slug is not null
    returning s.id;
  `;

  console.log(`[backfill] updated skills: ${rows.length}`);

  await sql.end({ timeout: 2 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
