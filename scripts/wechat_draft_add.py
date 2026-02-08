#!/usr/bin/env python3
"""Publish a Markdown file to WeChat Official Account draft box.

- Reads WECHAT_APP_ID / WECHAT_APP_SECRET from env.
- Parses frontmatter for: title, author, summary (digest), cover.
- Uploads cover image as permanent material (type=image) to get thumb_media_id.
- Uploads local inline images via uploadimg and rewrites their URLs.
- Converts Markdown to basic HTML (h1/h2/p/ul/img) and calls draft/add.

This is a pragmatic workaround when wenyan publish/render hangs.
"""

from __future__ import annotations

import json
import os
import re
import urllib.parse
import urllib.request
from pathlib import Path


def http_get_json(url: str, timeout: int = 30) -> dict:
    with urllib.request.urlopen(url, timeout=timeout) as r:
        body = r.read().decode("utf-8", "replace")
    return json.loads(body)


def http_post_json(url: str, obj: dict, timeout: int = 60) -> dict:
    data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        body = r.read().decode("utf-8", "replace")
    return json.loads(body)


def http_post_multipart_file(url: str, field: str, file_path: str, timeout: int = 120) -> dict:
    boundary = "----openclawBoundary7MA4YWxkTrZu0gW"
    filename = os.path.basename(file_path)
    content = Path(file_path).read_bytes()
    head = (
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"{field}\"; filename=\"{filename}\"\r\n"
        f"Content-Type: application/octet-stream\r\n\r\n"
    ).encode("utf-8")
    tail = f"\r\n--{boundary}--\r\n".encode("utf-8")
    body = head + content + tail

    req = urllib.request.Request(url, data=body)
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    req.add_header("Content-Length", str(len(body)))
    with urllib.request.urlopen(req, timeout=timeout) as r:
        resp = r.read().decode("utf-8", "replace")
    return json.loads(resp)


def get_access_token(appid: str, secret: str) -> str:
    qs = urllib.parse.urlencode({"grant_type": "client_credential", "appid": appid, "secret": secret})
    data = http_get_json(f"https://api.weixin.qq.com/cgi-bin/token?{qs}")
    if "access_token" not in data:
        raise RuntimeError(f"token error: {data}")
    return data["access_token"]


def parse_frontmatter(md: str) -> tuple[dict, str]:
    m = re.match(r"^---\n(.*?)\n---\n", md, flags=re.S)
    if not m:
        return {}, md
    fm_raw = m.group(1)
    rest = md[m.end() :]
    fm: dict[str, str] = {}
    for line in fm_raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        k, v = line.split(":", 1)
        fm[k.strip()] = v.strip().strip('"').strip("'")
    return fm, rest


def resolve_path(base_file: str, maybe_rel: str) -> str:
    if re.match(r"^https?://", maybe_rel):
        return maybe_rel
    if os.path.isabs(maybe_rel):
        return maybe_rel
    return str(Path(base_file).parent.joinpath(maybe_rel).resolve())


def md_to_html_basic(md: str) -> str:
    lines = md.splitlines()
    # remove frontmatter if present
    if lines and lines[0].strip() == "---":
        i = 1
        while i < len(lines) and lines[i].strip() != "---":
            i += 1
        if i < len(lines) and lines[i].strip() == "---":
            lines = lines[i + 1 :]

    out: list[str] = []
    in_ul = False
    img_re = re.compile(r"^!\[[^\]]*\]\(([^)]+)\)\s*$")

    for raw in lines:
        line = raw.rstrip()
        if not line.strip():
            if in_ul:
                out.append("</ul>")
                in_ul = False
            continue

        m = img_re.match(line.strip())
        if m:
            if in_ul:
                out.append("</ul>")
                in_ul = False
            src = m.group(1).strip()
            out.append(f'<p><img src="{src}" /></p>')
            continue

        if line.startswith("## "):
            if in_ul:
                out.append("</ul>")
                in_ul = False
            out.append(f"<h2>{line[3:].strip()}</h2>")
            continue

        if line.startswith("# "):
            if in_ul:
                out.append("</ul>")
                in_ul = False
            out.append(f"<h1>{line[2:].strip()}</h1>")
            continue

        if line.lstrip().startswith("- "):
            if not in_ul:
                out.append("<ul>")
                in_ul = True
            out.append(f"<li>{line.lstrip()[2:].strip()}</li>")
            continue

        if in_ul:
            out.append("</ul>")
            in_ul = False
        out.append(f"<p>{line.strip()}</p>")

    if in_ul:
        out.append("</ul>")

    return "\n".join(out)


def main():
    if len(os.sys.argv) < 2:
        raise SystemExit("Usage: wechat_draft_add.py /path/to/article.md")

    md_path = os.sys.argv[1]
    md = Path(md_path).read_text(encoding="utf-8")
    fm, _ = parse_frontmatter(md)

    title = fm.get("title") or "(untitled)"
    author = fm.get("author") or ""
    digest = fm.get("summary") or fm.get("digest") or ""
    cover = fm.get("cover")

    appid = os.environ.get("WECHAT_APP_ID", "")
    secret = os.environ.get("WECHAT_APP_SECRET", "")
    if not appid or not secret:
        raise RuntimeError("Missing env WECHAT_APP_ID/WECHAT_APP_SECRET")

    token = get_access_token(appid, secret)

    # Upload cover to get thumb_media_id
    if not cover:
        raise RuntimeError("Missing frontmatter cover")
    cover_path = resolve_path(md_path, cover)
    if re.match(r"^https?://", cover_path):
        raise RuntimeError("Cover must be a local file path for this script")

    mat_url = f"https://api.weixin.qq.com/cgi-bin/material/add_material?access_token={urllib.parse.quote(token)}&type=image"
    mat_resp = http_post_multipart_file(mat_url, "media", cover_path)
    thumb_media_id = mat_resp.get("media_id")
    if not thumb_media_id:
        raise RuntimeError(f"cover upload error: {mat_resp}")

    # Upload local inline images and rewrite
    img_pat = re.compile(r"!\[[^\]]*\]\(([^)]+)\)")
    cache: dict[str, str] = {}

    def repl(m: re.Match) -> str:
        src = m.group(1).strip()
        if re.match(r"^https?://", src):
            return m.group(0)
        abs_path = resolve_path(md_path, src)
        if abs_path in cache:
            url = cache[abs_path]
        else:
            up_url = f"https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token={urllib.parse.quote(token)}"
            up_resp = http_post_multipart_file(up_url, "media", abs_path)
            url = up_resp.get("url")
            if not url:
                raise RuntimeError(f"uploadimg error for {abs_path}: {up_resp}")
            cache[abs_path] = url
        return m.group(0).replace(src, url)

    md2 = img_pat.sub(repl, md)
    html = md_to_html_basic(md2)

    payload = {
        "articles": [
            {
                "title": title,
                "author": author,
                "digest": digest,
                "content": html,
                "content_source_url": "",
                "thumb_media_id": thumb_media_id,
                "need_open_comment": 0,
                "only_fans_can_comment": 0,
            }
        ]
    }

    resp = http_post_json(
        f"https://api.weixin.qq.com/cgi-bin/draft/add?access_token={urllib.parse.quote(token)}",
        payload,
        timeout=60,
    )
    print(json.dumps(resp, ensure_ascii=False))


if __name__ == "__main__":
    main()
