#!/usr/bin/env python3
"""microCMS の「お知らせ」「活動レポート」API から vov_assets/vov-data.js を作り直す。

VOV の皆さんが microCMS で書いた内容を、サイトのデータファイルに写す役。
GitHub Actions（.github/workflows/sync-microcms.yml）が定期的に実行し、
変わっていれば git に記録して公開する。

必要な環境変数
  MICROCMS_SERVICE_DOMAIN  例 voices-of-vision（https://＜ここ＞.microcms.io）
  MICROCMS_API_KEY         GET 権限の API キー（GitHub の Secrets に入れる）

使い方
  python3 scripts/sync_microcms.py            … microCMS から取得して書き出す
  python3 scripts/sync_microcms.py --sample   … 取得せず、見本のデータで書き出しの形だけ確かめる

microCMS 側の項目（API「お知らせ」 endpoint: news）
  title  タイトル（必須）        date  日付（必須）
  tag    区分（お知らせ／イベント／出演）
  text   一覧に出る短い文        body  本文（空行で段落）
  image  写真・チラシ            link  リンク先（あれば）
  time   時間（イベント用）      place 会場（イベント用）
区分が「イベント」「出演」のものは events に、それ以外は info に入る。

microCMS 側の項目（API「活動レポート」 endpoint: posts）
  title  タイトル（必須）        date  日付（必須）
  image  一覧と記事の写真        body  本文（空行で段落）
  photos 記事に並べる写真（複数画像）
posts の API がまだ無いときは、いまの vov-data.js の posts をそのまま残す。

公開中の記事が1件も無い API は「まだ使いはじめていない」とみなし、サイトのその部分は書き換えない
（下書きしか無い状態で同期して、いまのイベントや活動レポートを消してしまわないため）。
"""
import json, os, sys, urllib.request, urllib.error, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "vov_assets", "vov-data.js")
SAMPLE = {"contents": [
    {"id": "sample-2026-10", "title": "（見本）お知らせの記事ページの例", "date": "2026-10-23T00:00:00.000Z",
     "tag": ["お知らせ"], "text": "お知らせの一覧と、1件ごとの記事ページの見本です。",
     "body": "このページは、お知らせの「記事ページ」の見本です。\n\n写真やチラシを付けることもできます。",
     "image": {"url": "https://images.microcms-assets.io/assets/x/y/sample.jpg", "width": 1600, "height": 1200}},
    {"id": "xmas-2026", "title": "VOVクリスマス自主企画イベント", "date": "2026-12-24T10:00:00.000Z",
     "tag": ["イベント"], "time": "夜", "text": "企画中。"},
    {"id": "waiwai-2026", "title": "第22回 わいわいミュージックフェス in 鶴舞公園奏楽堂", "date": "2026-12-26T00:00:00.000Z",
     "tag": ["出演"], "place": "鶴舞公園奏楽堂", "text": "出演時間は調整中。"},
]}

def fetch_all(domain, key, endpoint="news"):
    items, offset = [], 0
    while True:
        url = f"https://{domain}.microcms.io/api/v1/{endpoint}?limit=100&offset={offset}&orders=-date"
        req = urllib.request.Request(url, headers={"X-MICROCMS-API-KEY": key})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)
        items += data.get("contents", [])
        offset += 100
        if offset >= data.get("totalCount", 0):
            return items

def jst_date(iso):
    """microCMS の日時（UTC の ISO 文字列）を日本時間の YYYY-MM-DD に"""
    d = datetime.datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(datetime.timezone(datetime.timedelta(hours=9)))
    return d.strftime("%Y-%m-%d")

def first(v):
    return v[0] if isinstance(v, list) and v else (v or "")

def image_url(img):
    if not img or not isinstance(img, dict) or not img.get("url"):
        return ""
    return img["url"] + "?w=1600&q=80"          # microCMS の画像は URL に ?w= を付けると縮小して配信される

def convert(items):
    info, events = [], []
    for it in items:
        tag = first(it.get("tag")) or "お知らせ"
        rec = {"id": it.get("id", ""), "date": jst_date(it["date"]) if it.get("date") else "", "tag": tag,
               "title": it.get("title", ""), "text": it.get("text", "") or ""}
        if it.get("link"): rec["link"] = it["link"]
        if image_url(it.get("image")): rec["image"] = image_url(it.get("image"))
        if tag in ("イベント", "出演"):
            rec["time"] = it.get("time", "") or ""; rec["place"] = it.get("place", "") or ""
            if it.get("body"): rec["body"] = it["body"]
            rec.setdefault("link", "vov_schedule.html#events")
            events.append(rec)
        else:
            if it.get("body"): rec["body"] = it["body"]
            info.append(rec)
    info.sort(key=lambda r: r["date"], reverse=True)
    events.sort(key=lambda r: r["date"])
    return info, events

def convert_posts(items):
    out = []
    for it in items:
        rec = {"id": it.get("id", ""), "date": jst_date(it["date"]) if it.get("date") else "", "title": it.get("title", "")}
        if image_url(it.get("image")): rec["image"] = image_url(it.get("image"))
        if it.get("body"): rec["body"] = it["body"]
        photos = [image_url(p) for p in (it.get("photos") or []) if image_url(p)]
        if photos: rec["photos"] = photos
        out.append(rec)
    out.sort(key=lambda r: r["date"], reverse=True)
    return out

def current_posts():
    """いまの vov-data.js にある posts（microCMS に活動レポートの API が無いときに残す）"""
    if not os.path.exists(OUT): return []
    s = open(OUT, encoding="utf-8").read()
    i = s.find("posts:")
    if i < 0: return []
    j = s.find("[", i); depth = 0
    for k in range(j, len(s)):
        depth += s[k] == "["; depth -= s[k] == "]"
        if depth == 0: return json.loads(s[j:k + 1])
    return []

def js(v):
    return json.dumps(v, ensure_ascii=False, indent=2)

def replace_posts_only(posts):
    """お知らせ側は書き換えず、posts の部分だけを差し替える"""
    s = open(OUT, encoding="utf-8").read()
    i = s.find("posts:")
    if i < 0: return False
    j = s.find("[", i); depth = 0
    for k in range(j, len(s)):
        depth += s[k] == "["; depth -= s[k] == "]"
        if depth == 0: break
    new = s[:j] + json.dumps(posts, ensure_ascii=False, indent=2).replace("\n", "\n  ") + s[k + 1:]
    if new == s: return False
    open(OUT, "w", encoding="utf-8").write(new); return True

def write(info, events, posts, source):
    stamp = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%Y-%m-%d %H:%M")
    out = ("/* =====================================================================\n"
           "   VOV サイトの「お知らせ」「イベント・出演」「活動レポート」のデータ\n"
           "   ---------------------------------------------------------------------\n"
           "   このファイルは microCMS（https://voices-of-vision.microcms.io）の内容から\n"
           "   scripts/sync_microcms.py が自動で作ります。手で直しても次の同期で戻るので、\n"
           "   書き換えは microCMS で行ってください。\n"
           f"   最終同期: {stamp}（{source}）\n"
           "   ===================================================================== */\n"
           "window.VOV_DATA = {\n"
           f"  info: {js(info)},\n"
           f"  events: {js(events)},\n"
           f"  posts: {js(posts)}\n"
           "};\n")
    old = open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else ""
    changed = old.split("最終同期")[0] != out.split("最終同期")[0] or "最終同期" not in old
    if changed:
        open(OUT, "w", encoding="utf-8").write(out)
    print(f"お知らせ {len(info)} 件 / イベント {len(events)} 件 / 活動レポート {len(posts)} 件 → {'書き出しました' if changed else '変更なし'}")
    return changed

if __name__ == "__main__":
    if "--sample" in sys.argv:
        info, events = convert(SAMPLE["contents"])
        print(js({"info": info, "events": events}))
        sys.exit(0)
    domain, key = os.environ.get("MICROCMS_SERVICE_DOMAIN", "voices-of-vision"), os.environ.get("MICROCMS_API_KEY", "")
    if not key:
        print("MICROCMS_API_KEY が設定されていないので、何もせずに終わります（GitHub の Secrets に入れると動きます）"); sys.exit(3)
    try:
        items = fetch_all(domain, key)
    except urllib.error.HTTPError as e:
        print(f"microCMS から取得できません: HTTP {e.code}", file=sys.stderr); sys.exit(1)
    try:
        post_items = fetch_all(domain, key, "posts")
    except urllib.error.HTTPError as e:
        if e.code != 404: print(f"活動レポートを取得できません: HTTP {e.code}", file=sys.stderr); sys.exit(1)
        post_items = []                  # まだ API が無い
    posts = convert_posts(post_items) if post_items else current_posts()
    print(f"microCMS の公開中：お知らせ {len(items)} 件 / 活動レポート {len(post_items)} 件")
    if not items:
        # お知らせ側はまだ使いはじめていない → いまの info・events を残し、posts だけ必要なら差し替える
        changed = bool(post_items) and replace_posts_only(posts)
        print("お知らせは書き換えません（公開中の記事が無いため）" + ("／活動レポートを差し替えました" if changed else "／変更なし"))
        sys.exit(0 if changed else 3)
    info, events = convert(items)
    changed = write(info, events, posts, "microCMS")
    sys.exit(0 if changed else 3)      # 3 = 変更なし（Actions 側でコミットを飛ばす）
