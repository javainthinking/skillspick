#!/usr/bin/env python3
"""Daily Instagram -> WeChat draft pipeline (MVP).

Reads config:
  ~/.openclaw/workspace/ig-wechat/config.json

For each username:
  - Fetch latest post metadata via instaloader (no-login by default)
  - If new since last run, download the post into workspace
  - Build a WeChat-ready Markdown (frontmatter + up to 16 images)
  - Publish to WeChat Draft Box via scripts/wechat_draft_add.py

Notes:
  - Public accounts only unless you log in to Instagram for instaloader.
  - This creates ONE WeChat draft per updated creator.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

WORKSPACE = Path.home() / ".openclaw" / "workspace"
CONFIG_PATH = WORKSPACE / "ig-wechat" / "config.json"
STATE_PATH = WORKSPACE / "ig-wechat" / "state.json"
DOWNLOADS_DIR = WORKSPACE / "ig-wechat" / "downloads"
DRAFTS_DIR = WORKSPACE / "ig-wechat" / "drafts"


@dataclass
class Config:
    usernames: list[str]
    max_images: int = 16
    include_source_link: bool = True
    title_template: str = "{username}｜今日更新"
    digest_template: str = "来自 Instagram：@{username}（自动搬运测试，请人工审核后发布）"


def load_config() -> Config:
    if not CONFIG_PATH.exists():
        raise SystemExit(
            f"Missing config: {CONFIG_PATH}\n"
            f"Copy ig-wechat/config.example.json -> ig-wechat/config.json and edit usernames."
        )
    data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    return Config(
        usernames=data.get("usernames", []),
        max_images=int(data.get("maxImagesPerPost", 16)),
        include_source_link=bool(data.get("includeSourceLink", True)),
        title_template=data.get("titleTemplate", "{username}｜今日更新"),
        digest_template=data.get(
            "digestTemplate",
            "来自 Instagram：@{username}（自动搬运测试，请人工审核后发布）",
        ),
    )


def load_state() -> dict:
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    return {"lastSeen": {}}


def save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def run(cmd: list[str], timeout: int = 120) -> str:
    return subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True, timeout=timeout)


def fetch_latest_shortcode(username: str) -> tuple[str | None, str | None]:
    """Return (shortcode, post_url) for latest post via instaloader --no-pictures metadata.

    We use: instaloader --no-pictures --no-videos --no-metadata-json --count 1 <profile>
    But we DO want metadata to find shortcode. Best is to keep json and parse.

    Instaloader writes: <target>/<date>_UTC.json
    We'll run in a temp folder and parse the newest .json.
    """
    tmp_dir = DOWNLOADS_DIR / "_probe" / username
    if tmp_dir.exists():
        # keep small; remove old probe files
        for p in tmp_dir.glob("*"):
            try:
                p.unlink()
            except Exception:
                pass
    tmp_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        "instaloader",
        "--quiet",
        "--max-connection-attempts=1",
        "--request-timeout=60",
        "--no-pictures",
        "--no-videos",
        "--no-compress-json",
        "--count=1",
        "--dirname-pattern",
        str(tmp_dir),
        username,
    ]
    try:
        run(cmd, timeout=120)
    except subprocess.CalledProcessError as e:
        # Often private/blocked => error
        return None, None

    json_files = sorted(tmp_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not json_files:
        return None, None
    data = json.loads(json_files[0].read_text(encoding="utf-8"))
    node = data.get("node") or data
    shortcode = node.get("shortcode")
    if not shortcode:
        return None, None
    return shortcode, f"https://www.instagram.com/p/{shortcode}/"


def download_post(username: str, shortcode: str) -> Path:
    out_dir = DOWNLOADS_DIR / username / shortcode
    out_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        "instaloader",
        "--quiet",
        "--max-connection-attempts=1",
        "--request-timeout=120",
        "--dirname-pattern",
        str(out_dir),
        "--filename-pattern",
        "{date_utc}_UTC_{shortcode}",
        "--no-video-thumbnails",
        "--no-metadata-json",
        f"https://www.instagram.com/p/{shortcode}/",
    ]
    run(cmd, timeout=300)
    return out_dir


def pick_images(post_dir: Path, max_images: int) -> list[Path]:
    imgs = []
    for ext in ("*.jpg", "*.jpeg", "*.png", "*.webp"):
        imgs.extend(post_dir.glob(ext))
    # Prefer numbered suffixes if any; otherwise mtime
    imgs = sorted(imgs, key=lambda p: (p.name, p.stat().st_mtime))
    return imgs[:max_images]


def make_markdown(username: str, post_url: str | None, images: list[Path], out_md: Path) -> None:
    if not images:
        raise RuntimeError("No images to publish")

    # Cover = first image (local path relative to md)
    cover_rel = Path("./assets") / images[0].name
    title = cfg.title_template.format(username=username)
    digest = cfg.digest_template.format(username=username)

    out_md.parent.mkdir(parents=True, exist_ok=True)
    assets_dir = out_md.parent / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)

    # Copy images into assets for stable relative paths
    copied = []
    for img in images:
        dst = assets_dir / img.name
        if not dst.exists():
            dst.write_bytes(img.read_bytes())
        copied.append(dst)

    lines = [
        "---",
        f"title: {title}",
        f"cover: {cover_rel.as_posix()}",
        "author: 麻辣戈壁",
        f"date: {datetime.now().strftime('%Y-%m-%d')}",
        f"summary: {digest}",
        "tags: [Instagram, 搬运, 测试]",
        "---",
        "",
        f"# {title}",
        "",
        digest,
    ]
    if cfg.include_source_link and post_url:
        lines += ["", f"来源：{post_url}"]

    lines += ["", "---", ""]

    for dst in copied:
        rel = Path("./assets") / dst.name
        lines.append(f"![]({rel.as_posix()})")
        lines.append("")

    out_md.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")


def publish_draft(md_path: Path) -> str:
    cmd = [sys.executable, str(WORKSPACE / "scripts" / "wechat_draft_add.py"), str(md_path)]
    out = run(cmd, timeout=180)
    return out.strip()


if __name__ == "__main__":
    cfg = load_config()
    if not cfg.usernames:
        raise SystemExit("No usernames in config.json")

    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
    DRAFTS_DIR.mkdir(parents=True, exist_ok=True)

    state = load_state()
    last_seen = state.setdefault("lastSeen", {})

    results = []

    for username in cfg.usernames:
        shortcode, post_url = fetch_latest_shortcode(username)
        if not shortcode:
            results.append({"username": username, "status": "skip", "reason": "no shortcode / private / fetch failed"})
            continue

        if last_seen.get(username) == shortcode:
            results.append({"username": username, "status": "skip", "reason": "no update"})
            continue

        post_dir = download_post(username, shortcode)
        imgs = pick_images(post_dir, cfg.max_images)
        if not imgs:
            results.append({"username": username, "status": "skip", "reason": "no images"})
            continue

        out_md = DRAFTS_DIR / username / f"{datetime.now().strftime('%Y-%m-%d')}-{shortcode}.md"
        make_markdown(username, post_url, imgs, out_md)

        try:
            resp = publish_draft(out_md)
            results.append({"username": username, "status": "published", "shortcode": shortcode, "draft": resp})
            last_seen[username] = shortcode
            save_state(state)
        except Exception as e:
            results.append({"username": username, "status": "error", "shortcode": shortcode, "error": str(e)})

    print(json.dumps({"ok": True, "results": results}, ensure_ascii=False, indent=2))
