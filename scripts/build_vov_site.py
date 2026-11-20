#!/usr/bin/env python3
"""vov.jp 用の専用リポジトリに入れる中身を、いまの確認用サイトから作る。

使い方
  python3 scripts/build_vov_site.py 出力先のフォルダ [--public]

やること
  - VOV のページ・写真・データ・同期の仕組みだけを写す（ほかの案件のファイルは写さない）
  - TOP を index.html にも置く（https://vov.jp/ で TOP が開くように）
  - canonical・og:url・サイトマップのアドレスを https://vov.jp/ に書き換える
  - CNAME（vov.jp）を置く
  - --public を付けないときは、検索に出ない設定（noindex と robots.txt の Disallow）のまま
"""
import os, re, shutil, sys

SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD = "https://junnarita-pixel.github.io/30th-anniversary/"
NEW = "https://vov.jp/"
PAGES = ["vov_top.html", "vov_about.html", "vov_schedule.html", "vov_news.html", "vov_posts.html",
         "vov_history.html", "vov_gallery.html", "vov_join.html", "vov_contact.html"]
DOCS = ["vov_docs.html", "vov_sitemap.html", "vov_update.html"]   # VOV 向けの資料。公開後も検索には出さない

def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(2)
    out = os.path.abspath(sys.argv[1]); public = "--public" in sys.argv
    if os.path.exists(out) and os.listdir(out) and not os.path.exists(os.path.join(out, "CNAME")):
        sys.exit(f"{out} は空でなく、前にこのスクリプトで作ったフォルダでもないので止めます")
    os.makedirs(out, exist_ok=True)
    for p in PAGES + DOCS:
        s = open(os.path.join(SRC, p), encoding="utf-8").read().replace(OLD, NEW)
        if public and p not in DOCS:
            s = re.sub(r'\s*<meta name="robots" content="noindex[^"]*">', "", s)
        open(os.path.join(out, p), "w", encoding="utf-8").write(s)
    # TOP を index.html にも
    top = open(os.path.join(out, "vov_top.html"), encoding="utf-8").read()
    top = top.replace(f'<link rel="canonical" href="{NEW}vov_top.html">', f'<link rel="canonical" href="{NEW}">')
    open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(top)
    shutil.copytree(os.path.join(SRC, "vov_assets"), os.path.join(out, "vov_assets"), dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns(".DS_Store"))
    os.makedirs(os.path.join(out, "scripts"), exist_ok=True)
    shutil.copy(os.path.join(SRC, "scripts", "sync_microcms.py"), os.path.join(out, "scripts"))
    wf = os.path.join(SRC, ".github", "workflows", "sync-microcms.yml")
    if os.path.exists(wf):
        os.makedirs(os.path.join(out, ".github", "workflows"), exist_ok=True); shutil.copy(wf, os.path.join(out, ".github", "workflows"))
    sm = open(os.path.join(SRC, "vov_sitemap.xml"), encoding="utf-8").read().replace(OLD, NEW)
    sm = sm.replace(f"<loc>{NEW}vov_top.html</loc>", f"<loc>{NEW}</loc>")
    open(os.path.join(out, "sitemap.xml"), "w", encoding="utf-8").write(sm)
    open(os.path.join(out, "robots.txt"), "w").write(
        "User-agent: *\nAllow: /\nSitemap: https://vov.jp/sitemap.xml\n" if public else "User-agent: *\nDisallow: /\n")
    open(os.path.join(out, "CNAME"), "w").write("vov.jp\n")
    open(os.path.join(out, ".nojekyll"), "w").write("")
    left = [p for p in os.listdir(out) if p.endswith(".html") and OLD in open(os.path.join(out, p), encoding="utf-8").read()]
    print("書き出し:", out, "／ 検索:", "公開" if public else "出ない設定のまま", "／ 古いアドレスが残ったページ:", left or "なし")

if __name__ == "__main__":
    main()
