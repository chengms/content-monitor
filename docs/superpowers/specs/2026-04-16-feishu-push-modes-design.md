# Feishu Push Modes Design

**Date:** 2026-04-16

**Goal:** Make `scripts/xiaohongshu_to_feishu.py` safer to run by moving Feishu credentials out of source code and adding two non-destructive execution modes.

## Current Problem

- Feishu credentials are hard-coded in the script.
- The script always performs a destructive sync: delete existing Feishu rows, then write new rows.
- There is no safe preview mode for testing collection behavior.

## Proposed Behavior

The script supports three run modes:

1. `live` (default)
Collect Xiaohongshu notes, write local archive/log files, delete old Feishu rows, then write new rows.

2. `dry-run`
Collect Xiaohongshu notes and print a preview only.
Do not write local archive/log files.
Do not call Feishu APIs.

3. `dry-run-local`
Collect Xiaohongshu notes and write local archive/log files.
Do not call Feishu APIs.

## Configuration

The script reads Feishu config from `.env.local`:

- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_APP_TOKEN`
- `FEISHU_TABLE_ID`

If the script is in `live` mode and any required Feishu variable is missing, it exits with a clear error message before attempting Feishu writes.

`dry-run` and `dry-run-local` do not require Feishu env vars.

## CLI Interface

Supported commands:

- `python3 scripts/xiaohongshu_to_feishu.py`
- `python3 scripts/xiaohongshu_to_feishu.py --dry-run`
- `python3 scripts/xiaohongshu_to_feishu.py --dry-run-local`

Invalid mode combinations should fail fast with a clear CLI error from argument parsing.

## Internal Structure

Refactor the script into smaller units:

- env loader: read `.env.local` into process env
- config builder: validate Feishu config only when needed
- collector: run the existing Playwright collection and parse notes
- local persistence: update JSON archive and log
- Feishu sync: delete old rows, then batch create new rows
- mode dispatcher: decide which phases execute

## Error Handling

- Collection failures keep the current behavior: print an error and stop the run.
- Local file write failures should surface as exceptions and stop the run.
- Feishu failures in `live` mode should print a clear failure message and keep local archive behavior intact.

## Testing

Add focused Python unit tests for:

- heat parsing behavior
- `.env.local` parsing helper
- mode-to-phase gating
- Feishu config validation rules

Manual verification:

- `--dry-run` prints preview and leaves local files untouched
- `--dry-run-local` updates local files without touching Feishu
- default mode still performs a real Feishu sync when env is present
