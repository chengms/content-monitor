#!/usr/bin/env python3
"""
小红书热点采集 -> 飞书多维表格

默认模式:
- 采集数据
- 写入本地归档和日志
- 清空飞书旧记录并写入新记录

安全模式:
- --dry-run: 只采集和打印预览, 不写本地, 不写飞书
- --dry-run-local: 采集并写本地, 但不写飞书
"""
import argparse
import json
import os
import subprocess
from datetime import datetime
from pathlib import Path


PLAYWRIGHT_ENV = "/tmp/playwright_env"
ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
TODAY_FILE = DATA_DIR / "xiaohongshu_daily.json"
LOG_FILE = DATA_DIR / "collector.log"
ENV_FILE = ROOT_DIR / ".env.local"
FEISHU_BASE_URL = "https://open.feishu.cn/open-apis"

SCRIPT = r'''
import json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=[
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
    ])
    context = browser.new_context(
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport={'width': 1920, 'height': 1080},
        locale='zh-CN'
    )
    page = context.new_page()
    page.goto("https://www.xiaohongshu.com/explore", timeout=30000)
    page.wait_for_timeout(5000)

    result = page.evaluate("""
        () => {
            const notes = [];
            const items = document.querySelectorAll('.note-item');

            items.forEach((item, idx) => {
                if (idx > 19) return;

                const footer = item.querySelector('.footer');
                const authorWrap = footer?.querySelector('.author-wrapper');
                const name = authorWrap?.querySelector('.name')?.textContent?.trim();
                const heat = authorWrap?.querySelector('.count')?.textContent?.trim();

                if (footer) {
                    const clone = footer.cloneNode(true);
                    const authorEl = clone.querySelector('.author-wrapper');
                    if (authorEl) authorEl.remove();
                    const title = clone.textContent?.trim() || '';

                    const link = item.querySelector('a[href]')?.href || '';
                    const img = item.querySelector('img')?.src || '';

                    if (title && name) {
                        notes.push({ title, name, heat, link, img: img.substring(0, 100) });
                    }
                }
            });
            return JSON.stringify(notes);
        }
    """)

    print(result)
    browser.close()
'''


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description="采集小红书热点并推送到飞书多维表格。")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--dry-run", action="store_true", help="只采集并打印预览, 不写本地也不写飞书。")
    group.add_argument("--dry-run-local", action="store_true", help="采集并写本地, 但不写飞书。")
    return parser.parse_args(argv)


def determine_run_mode(args) -> str:
    if getattr(args, "dry_run", False):
        return "dry-run"
    if getattr(args, "dry_run_local", False):
        return "dry-run-local"
    return "live"


def build_run_plan(mode: str) -> dict[str, bool]:
    if mode == "dry-run":
        return {"write_local": False, "sync_feishu": False}
    if mode == "dry-run-local":
        return {"write_local": True, "sync_feishu": False}
    return {"write_local": True, "sync_feishu": True}


def parse_env_file(path: str | Path) -> dict[str, str]:
    env_path = Path(path)
    if not env_path.exists():
        return {}

    result: dict[str, str] = {}
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export "):].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        result[key] = value
    return result


def load_env_file(path: str | Path = ENV_FILE) -> dict[str, str]:
    loaded = parse_env_file(path)
    for key, value in loaded.items():
        os.environ.setdefault(key, value)
    return loaded


def get_feishu_config(env: dict[str, str] | None = None, required: bool = True) -> dict[str, str]:
    source = env if env is not None else os.environ
    config = {
        "app_id": str(source.get("FEISHU_APP_ID", "")),
        "app_secret": str(source.get("FEISHU_APP_SECRET", "")),
        "app_token": str(source.get("FEISHU_APP_TOKEN", "")),
        "table_id": str(source.get("FEISHU_TABLE_ID", "")),
    }
    if required:
        missing = [
            env_key
            for env_key, value in {
                "FEISHU_APP_ID": config["app_id"],
                "FEISHU_APP_SECRET": config["app_secret"],
                "FEISHU_APP_TOKEN": config["app_token"],
                "FEISHU_TABLE_ID": config["table_id"],
            }.items()
            if not value
        ]
        if missing:
            raise ValueError(f"缺少飞书配置: {', '.join(missing)}。请在 .env.local 中补齐后再执行 live 模式。")
    return config


def collect_notes() -> list[dict[str, str]]:
    result = subprocess.run(
        [f"{PLAYWRIGHT_ENV}/bin/python", "-c", SCRIPT],
        capture_output=True,
        text=True,
        timeout=60,
    )

    if result.returncode != 0:
        raise RuntimeError(f"采集失败: {result.stderr[:200]}")

    try:
        notes = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"解析失败: {result.stdout[:200]}") from error

    if not isinstance(notes, list):
        raise RuntimeError("解析失败: 返回结果不是笔记列表。")

    return notes


def load_history(path: str | Path = TODAY_FILE) -> list[dict[str, object]]:
    history_path = Path(path)
    if not history_path.exists():
        return []
    try:
        return json.loads(history_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def write_local_snapshot(notes, timestamp: str, today_path: str | Path = TODAY_FILE, log_path: str | Path = LOG_FILE):
    today_file = Path(today_path)
    log_file = Path(log_path)
    today_file.parent.mkdir(parents=True, exist_ok=True)

    history = load_history(today_file)
    record = {"date": timestamp, "notes": notes, "count": len(notes)}
    history = history[-29:] + [record]

    today_file.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")
    with log_file.open("a", encoding="utf-8") as handle:
        handle.write(f"[{timestamp}] 采集{len(notes)}条 | {notes[0]['title'][:20] if notes else '无'}...\n")


def parse_heat(heat_str):
    """解析热度字符串为数字"""
    if not heat_str:
        return 0
    heat_str = str(heat_str).strip()
    if "万+" in heat_str:
        return int(float(heat_str.replace("万+", "")) * 10000 + 9999)
    if "万" in heat_str:
        return int(float(heat_str.replace("万", "")) * 10000)
    try:
        return int(heat_str)
    except ValueError:
        return 0


def get_feishu_token(config: dict[str, str]):
    """获取飞书 tenant_access_token"""
    import urllib.request

    url = f"{FEISHU_BASE_URL}/auth/v3/tenant_access_token/internal"
    data = json.dumps({"app_id": config["app_id"], "app_secret": config["app_secret"]}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})

    with urllib.request.urlopen(req, timeout=10) as resp:
        result = json.loads(resp.read())

    if result.get("code") != 0:
        raise RuntimeError(f"获取 token 失败: {result}")

    return result["tenant_access_token"]


def get_all_records(token: str, config: dict[str, str]):
    """获取所有记录 ID"""
    import urllib.request

    url = f"{FEISHU_BASE_URL}/bitable/v1/apps/{config['app_token']}/tables/{config['table_id']}/records?page_size=500"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

    with urllib.request.urlopen(req, timeout=10) as resp:
        result = json.loads(resp.read())

    if result.get("code") != 0:
        raise RuntimeError(f"获取记录失败: {result}")

    records = result.get("data", {}).get("items", [])
    return [record["record_id"] for record in records]


def delete_all_records(token: str, record_ids: list[str], config: dict[str, str]):
    """批量删除记录"""
    import urllib.request

    if not record_ids:
        return

    url = f"{FEISHU_BASE_URL}/bitable/v1/apps/{config['app_token']}/tables/{config['table_id']}/records/batch_delete"
    data = json.dumps({"records": record_ids}).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )

    with urllib.request.urlopen(req, timeout=10) as resp:
        result = json.loads(resp.read())

    if result.get("code") != 0:
        raise RuntimeError(f"删除旧记录失败: {result}")


def batch_create_records(token: str, notes, config: dict[str, str]):
    """批量写入记录（最多100条/批）"""
    import urllib.request

    url = f"{FEISHU_BASE_URL}/bitable/v1/apps/{config['app_token']}/tables/{config['table_id']}/records/batch_create"
    batch_size = 100
    total = 0

    for index in range(0, len(notes), batch_size):
        batch = notes[index:index + batch_size]
        records = []

        for note in batch:
            heat_num = parse_heat(note.get("heat", ""))
            records.append(
                {
                    "fields": {
                        "文本": note.get("title", ""),
                        "作者": note.get("name", ""),
                        "热度": heat_num,
                        "链接": note.get("link", ""),
                    }
                }
            )

        data = json.dumps({"records": records}).encode()
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())

        if result.get("code") != 0:
            raise RuntimeError(f"写入第{index // batch_size + 1}批失败: {result.get('msg')}")
        total += len(records)

    return total


def sync_to_feishu(notes, config: dict[str, str]):
    token = get_feishu_token(config)
    old_ids = get_all_records(token, config)
    if old_ids:
        delete_all_records(token, old_ids, config)
        print(f"  已删除 {len(old_ids)} 条旧记录")

    written = batch_create_records(token, notes, config)
    print(f"  写入 {written} 条新记录")
    print(f"✅ 完成！表格地址: https://my.feishu.cn/base/{config['app_token']}")


def print_preview(notes, limit: int = 3):
    for note in notes[:limit]:
        print(f"  {note.get('heat', ''):>8} | {note.get('title', '')[:30]}")


def run(mode: str) -> int:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    plan = build_run_plan(mode)

    print(f"[{timestamp}] 开始采集小红书... mode={mode}")
    try:
        notes = collect_notes()
    except Exception as error:
        print(f"  {error}")
        return 1

    print(f"  采集到 {len(notes)} 条笔记")

    if plan["write_local"]:
        write_local_snapshot(notes, timestamp)
        print("  已更新本地归档和日志")
    else:
        print("  dry-run: 已跳过本地归档和日志写入")

    if plan["sync_feishu"]:
        print("  写入飞书多维表格...")
        try:
            config = get_feishu_config(required=True)
            sync_to_feishu(notes, config)
        except Exception as error:
            print(f"  飞书写入失败: {error}")
            print_preview(notes)
            return 1
    else:
        print("  已跳过飞书写入")
        print_preview(notes)

    if plan["sync_feishu"]:
        print_preview(notes)

    return 0


def main(argv=None) -> int:
    args = parse_args(argv)
    load_env_file()
    mode = determine_run_mode(args)
    return run(mode)


if __name__ == "__main__":
    raise SystemExit(main())
