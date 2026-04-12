#!/usr/bin/env python3
"""
小红书热点数据采集脚本
定时爬取热门笔记，存入本地JSON文件，供文章写作参考
"""
import subprocess
import os
import json
from datetime import datetime

PLAYWRIGHT_ENV = "/tmp/playwright_env"
DATA_DIR = "/mnt/e/Code/DataAgent-Maker/DataAgent/data"
TODAY_FILE = f"{DATA_DIR}/xiaohongshu_daily.json"

SCRIPT = '''
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
    
    # 访问发现页
    page.goto("https://www.xiaohongshu.com/explore", timeout=30000)
    page.wait_for_timeout(5000)
    
    text = page.inner_text('body')
    lines = [l.strip() for l in text.split('\\n') if l.strip()]
    
    notes = []
    current_note = {}
    
    for i, line in enumerate(lines):
        if len(line) > 3 and len(line) < 100:
            # 检测作者名（通常是两个字且后面跟数字）
            if i > 0 and lines[i-1].strip() == '':
                if any(c.isdigit() for c in line) and '万' in line:
                    parts = line.split()
                    for part in parts:
                        if '万' in part:
                            current_note['heat'] = part
                    if current_note.get('title') and current_note.get('author'):
                        notes.append(current_note)
                    current_note = {}
    
    # 用另一种方式提取：遍历所有文本行找规律
    notes = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # 热度标识：数字 + 万
        if '万' in line and any(c.isdigit() for c in line) and len(line) < 20:
            note = {'heat': line}
            # 向上找标题（标题通常在热度前2-4行，且较长）
            for j in range(max(0, i-5), i):
                prev = lines[j]
                if len(prev) > 5 and len(prev) < 80 and not any(c.isdigit() for c in prev):
                    note['title'] = prev
                    # 再向上找作者
                    for k in range(max(0, j-3), j):
                        author_line = lines[k]
                        if len(author_line) > 1 and len(author_line) < 20 and not '万' in author_line:
                            note['author'] = author_line
                            break
                    break
            if note.get('title'):
                notes.append(note)
        i += 1
    
    # 去重
    seen = set()
    unique = []
    for n in notes:
        key = n.get('title', '')
        if key and key not in seen:
            seen.add(key)
            unique.append(n)
    
    notes = unique[:20]  # 保留20条
    
    print(json.dumps({'notes': notes, 'count': len(notes), 'ok': True}, ensure_ascii=False))
    
    browser.close()
'''

def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    
    result = subprocess.run(
        [f"{PLAYWRIGHT_ENV}/bin/python", "-c", SCRIPT],
        capture_output=True, text=True, timeout=60
    )
    
    if result.returncode != 0:
        print(f"Error: {result.stderr[:200]}")
        return
    
    try:
        data = json.loads(result.stdout)
    except:
        print(f"JSON parse error: {result.stdout[:200]}")
        return
    
    today = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    # 读取历史数据
    history = []
    if os.path.exists(TODAY_FILE):
        try:
            with open(TODAY_FILE, 'r', encoding='utf-8') as f:
                history = json.load(f)
        except:
            history = []
    
    # 添加今天的采集记录
    record = {
        'date': today,
        'notes': data.get('notes', []),
        'count': data.get('count', 0)
    }
    
    # 只保留最近30天的数据
    history = history[-29:] + [record]
    
    with open(TODAY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)
    
    print(f"[{today}] 采集到 {data.get('count', 0)} 条笔记，已保存")
    print(f"数据文件: {TODAY_FILE}")

if __name__ == '__main__':
    main()
