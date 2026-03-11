# RealityDB H2-S4 — Reality Pack Sharing & Registry

**Project:** RealityDB — Developer Reality Platform
**Horizon:** 2 — Ecosystem & Integrations
**Sprint:** H2-S4 — Pack Sharing
**Status:** DRAFT
**Depends on:** H2-S3 (demo mode, realitydb@0.7.0)
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)
**Executor:** Claude Code (Staff Engineer)

---

## Sprint Objective

Enable developers to share Reality Packs via URL and discover community packs from a registry. After this sprint, `realitydb load https://gist.github.com/.../pack.json --confirm` works, and `realitydb packs search saas` finds community-shared packs.

---

## What Must Be True After This Sprint

1. `realitydb share <file> --gist` uploads pack to GitHub Gist and returns URL.
2. `realitydb load <url> --confirm` downloads and imports a pack from a URL.
3. `realitydb share <file> --gist --description "Bug 4821 repro"` sets gist description.
4. `realitydb packs list` shows built-in demo packs available for download.
5. Pack files are gzip-compressed when sharing (reduce file size 5-10x).
6. Version bumped to 0.8.0.

---

## Why This Matters

The viral loop for RealityDB depends on frictionless sharing:
- Developer A captures a bug environment → shares via Gist → pastes URL in GitHub issue
- Developer B clicks link → `realitydb load <url>` → reproduces instantly

Today the sharing step is manual file transfer. Gist integration makes it one command. This is the mechanic that makes Reality Packs spread through teams organically.

---

## Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | Gist upload service | `packages/core/src/sharing/gistUpload.ts` |
| D2 | URL download service | `packages/core/src/sharing/urlDownload.ts` |
| D3 | Pack compression (gzip) | `packages/core/src/sharing/compress.ts` |
| D4 | Enhanced share command | `apps/cli/src/commands/share.ts` |
| D5 | URL support in load command | `apps/cli/src/commands/load.ts` |
| D6 | Packs list command | `apps/cli/src/commands/packs.ts` |
| D7 | Pack size display (compressed vs raw) | CLI output |
| D8 | Version bump to 0.8.0 | `apps/cli/package.json` |

---

## Sprint Prompt (for Claude Code)

```
Read: packages/core/src/sharePipeline.ts,
      apps/cli/src/commands/share.ts, apps/cli/src/commands/load.ts,
      packages/generators/src/packExporter.ts,
      apps/cli/src/cli.ts, README.md, CHANGELOG.md

CONTEXT:
RealityDB v0.7.0 has demo mode, custom templates, and framework init.
The share command exists but only reports file info. The load command
only reads local files. We need URL-based sharing for the viral loop.

OBJECTIVE:
Add Gist upload, URL download, and pack compression for frictionless sharing.

REQUIREMENTS:

--- Gist Upload (packages/core) ---

1. src/sharing/gistUpload.ts:
   - uploadToGist(content: string, options: GistOptions) → Promise<GistResult>
   - GistOptions { filename: string, description?: string, public?: boolean }
   - GistResult { url: string, rawUrl: string, gistId: string }
   - Uses GitHub REST API: POST https://api.github.com/gists
   - Requires GITHUB_TOKEN environment variable
   - If no token: return clear error message with setup instructions
   - Uses node:https (no external dependencies)

--- URL Download ---

2. src/sharing/urlDownload.ts:
   - downloadPack(url: string) → Promise<string>
   - Supports:
     - Direct .json URLs
     - GitHub Gist URLs (resolve to raw URL)
     - Gzip-compressed packs (.realitydb-pack.json.gz)
   - Returns the pack JSON content as string
   - Validates it's a valid Reality Pack before returning
   - Uses node:https (no external dependencies)

--- Pack Compression ---

3. src/sharing/compress.ts:
   - compressPack(jsonString: string) → Promise<Buffer>
   - decompressPack(buffer: Buffer) → Promise<string>
   - Uses node:zlib (built-in, no external deps)
   - Compression used when sharing (not for local saves)

--- Enhanced Share Command ---

4. apps/cli/src/commands/share.ts:
   - realitydb share <file> [--gist] [--description <desc>]
   - Without --gist: same as before (file info + instructions)
   - With --gist:
     a. Read pack file
     b. Upload to GitHub Gist
     c. Print:
        RealityDB Share
        ═══════════════════════════════════════
        Pack: bug-4821 (4 tables, 2000 rows)
        Uploaded to GitHub Gist.

        Share this URL:
          https://gist.github.com/user/abc123

        The receiver can load it with:
          realitydb load https://gist.github.com/user/abc123 --confirm

   - Without GITHUB_TOKEN:
     "To share via Gist, set the GITHUB_TOKEN environment variable.
      Create a token at: https://github.com/settings/tokens
      Required scope: gist"

--- URL Support in Load ---

5. apps/cli/src/commands/load.ts:
   - If argument starts with http:// or https://, download first
   - Then proceed with normal import flow
   - Show download progress for CI mode

--- Packs List Command ---

6. apps/cli/src/commands/packs.ts:
   - realitydb packs list
   - Lists built-in demo packs with name, template, persona, row count
   - Output:
     Available Demo Packs:
       saas-startup      SaaS demo (startup)        ~200 rows
       saas-growth        SaaS demo (growth)         ~2000 rows
       ecommerce-growth   E-commerce demo (growth)   ~2000 rows
       fintech-growth     Fintech demo (growth)      ~2000 rows

--- README Update ---

7. Update Environment Reproduction section with Gist sharing workflow

--- Version + Changelog ---

8. Bump version to 0.8.0
9. Update CHANGELOG.md

CONSTRAINTS:
- Gist upload requires GITHUB_TOKEN (graceful fallback without it)
- URL download must validate pack format before importing
- No external HTTP dependencies (use node:https)
- Gzip compression optional (detect by file extension)
- Pack size limit for Gist: warn if > 10MB
- Commit message: "feat: add Gist sharing and URL loading for Reality Packs"

VERIFICATION:
1. pnpm build succeeds
2. realitydb share <file> --gist (with GITHUB_TOKEN) uploads
3. realitydb load <gist-url> --confirm imports
4. realitydb packs list shows available packs
Report: build status, share + load round-trip
```

---

## Sprint Checklist

```
## H2-S4 — Pack Sharing

### Gist Upload (3 points)
- [ ] uploadToGist creates public gist via GitHub API
- [ ] Returns gist URL and raw URL
- [ ] Graceful error without GITHUB_TOKEN

### URL Download (3 points)
- [ ] downloadPack fetches from direct URLs
- [ ] Resolves GitHub Gist URLs to raw content
- [ ] Validates downloaded content is valid Reality Pack

### Pack Compression (2 points)
- [ ] compressPack produces valid gzip
- [ ] decompressPack restores original JSON

### Share Command (2 points)
- [ ] realitydb share <file> --gist uploads and prints URL
- [ ] CI mode outputs JSON with gist URL

### Load from URL (2 points)
- [ ] realitydb load <url> --confirm downloads and imports
- [ ] Works with Gist URLs

### Packs List (1 point)
- [ ] realitydb packs list shows available demo packs

### README + Version (2 points)
- [ ] Sharing workflow in README
- [ ] Version 0.8.0, CHANGELOG updated

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with correct message

Score: __/17 PASS
Gate: ALL must be ✅ before npm publish 0.8.0
```
