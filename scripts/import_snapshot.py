#!/usr/bin/env python3
"""Restore the exact source snapshot and verify every included media file."""
import base64, concurrent.futures, hashlib, json, pathlib, urllib.parse, urllib.request, zlib
ROOT = pathlib.Path.cwd().resolve()
EXPECTED = "d914210ef327df780097f862928714ac8593afbfbf971e9431d93adbc2963458"
raw = zlib.decompress(base64.b64decode((ROOT / ".transfer/pink-snapshot.b64").read_text()))
if hashlib.sha256(raw).hexdigest() != EXPECTED:
    raise SystemExit("Source snapshot checksum mismatch")
snapshot = json.loads(raw)
# Preserve the originating platform CI as reference, without enabling it here.
for entry in snapshot["entries"]:
    if entry["path"].startswith(".github/workflows/"):
        entry["archived_original_path"] = entry["path"]
        entry["path"] = "docs/original-platform-workflows/" + pathlib.PurePosixPath(entry["path"]).name + ".txt"
overrides = json.loads((ROOT / ".transfer/media-sources.json").read_text())
for media in snapshot["media"]:
    media["url"] = overrides[media["path"]]
def destination(relative):
    p = pathlib.PurePosixPath(relative)
    if p.is_absolute() or ".." in p.parts or ".git" in p.parts:
        raise ValueError("Unsafe export path")
    target = ROOT.joinpath(*p.parts)
    if not target.resolve().is_relative_to(ROOT):
        raise ValueError("Export path escapes repository")
    target.parent.mkdir(parents=True, exist_ok=True)
    return target
def verified_write(item, data):
    if hashlib.sha256(data).hexdigest() != item["sha256"]:
        raise ValueError("Checksum mismatch for " + item["path"])
    destination(item["path"]).write_bytes(data)
for item in snapshot["entries"]:
    data = item["text"].encode("utf-8") if "text" in item else base64.b64decode(item["base64"])
    verified_write(item, data)
def fetch_media(item):
    u = urllib.parse.urlparse(item["url"])
    if u.scheme != "https" or u.hostname not in {
        "univers-in-pink.higgsfield.app", "d8j0ntlcm91z4.cloudfront.net",
        "d2ol7oe51mr4n9.cloudfront.net"
    }:
        raise ValueError("Unexpected media source")
    request = urllib.request.Request(item["url"], headers={"User-Agent": "UniversInPink-SourceExport/1.0"})
    with urllib.request.urlopen(request, timeout=90) as response:
        data = response.read(32 * 1024 * 1024 + 1)
    if len(data) > 32 * 1024 * 1024:
        raise ValueError("Media file exceeded export limit")
    verified_write(item, data)
    return {"path": item["path"], "bytes": len(data), "sha256": item["sha256"]}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    imported_media = list(pool.map(fetch_media, snapshot["media"]))
report = {
    "source_commit": snapshot["source_commit"],
    "snapshot_sha256": EXPECTED,
    "source_files": len(snapshot["entries"]),
    "media_files": len(imported_media),
    "verified_media": imported_media,
    "note": "Source snapshot for retrieval. Hostinger adaptation is a separate step."
}
(ROOT / "IMPORT_REPORT.json").write_text(json.dumps(report, indent=2) + "\n")
paths = [x["path"] for x in snapshot["entries"] + snapshot["media"]]
(ROOT / ".transfer/imported-paths.txt").write_bytes(b"\0".join(p.encode() for p in paths) + b"\0")
(ROOT / "README.md").write_text("""# Univers in Pink

Complete source snapshot of the cinematic storefront for UniverseinPink.com.

## Retrieve the project

Use **Code → Download ZIP**, or clone this repository. The complete application lives in the app folder, including the generated images, desktop/mobile films, posters, icons, and favicon family.

- Click-to-play pink-world entrance with the boutique reveal
- Search, collections, shade filters, product details, and size selection
- Browser-saved favorites and shopping bag
- Responsive layouts, keyboard controls, and reduced-motion handling

The source came from commit """ + snapshot["source_commit"] + """. IMPORT_REPORT.json records checksums for every imported media file. This is a snapshot, not automatic synchronization with the currently hosted site.

## Hosting

Current site: https://univers-in-pink.higgsfield.app

The original app uses React 19, TanStack Start, and the Higgsfield Cloudflare Worker scaffold, with vendored workspace packages. It is not yet a Hostinger-ready Node.js deployment. Preserve this copy before adapting the runtime.

The package manifest and lockfile are inside the app folder. Use the pinned dependencies there. The originating platform build passed after the entrance fix; a separate GitHub/Hostinger build has not been validated.

Original platform CI workflows are preserved as text under docs/original-platform-workflows instead of being activated in this repository.

## Store status

Products and prices are samples. Payments, real inventory, fulfillment, shipping, and return policies are not connected.
""")
print(json.dumps({"source_files":len(snapshot["entries"]), "media_files":len(imported_media), "all_checksums_verified":True}))
