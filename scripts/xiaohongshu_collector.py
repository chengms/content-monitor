#!/usr/bin/env python3
"""
小红书热点数据采集脚本 v3
DOM 结构：section.note-item → .footer（标题） / .author-wrapper（作者+热度）
"""
import subprocess
import os
import json
from datetime import datetime

PLAYWRIGHT_ENV = "/tmp/playwright_env"
DATA_DIR = "/mnt/e/Code/DataAgent-Maker/DataAgent/data"
TODAY_FILE = f"{DATA_DIR}/xiaohongshu_daily.json"
LOG_FILE = f"{DATA_DIR}/collector.log"

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
                
                // 标题：footer 里去掉 author-wrapper 后的文本
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

def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    
    result = subprocess.run(
        [f"{PLAYWRIGHT_ENV}/bin/python", "-c", SCRIPT],
        capture_output=True, text=True, timeout=60
    )
    
    if result.returncode != 0:
        msg = f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Error: {result.stderr[:200]}"
        print(msg)
        return
    
    try:
        notes = json.loads(result.stdout)
    except:
        msg = f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] JSON parse error: {result.stdout[:200]}"
        print(msg)
        return
    
    today = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    # 读取历史
    history = []
    if os.path.exists(TODAY_FILE):
        try:
            with open(TODAY_FILE, 'r', encoding='utf-8') as f:
                history = json.load(f)
        except:
            history = []
    
    record = {
        'date': today,
        'notes': notes,
        'count': len(notes)
    }
    
    # 保留最近30天
    history = history[-29:] + [record]
    
    with open(TODAY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)
    
    msg = f"[{today}] 采集到 {len(notes)} 条笔记"
    print(msg)
    
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(msg + '\n')
    
    for n in notes[:5]:
        print(f"  {n['heat']:>8} | {n['title'][:35]:<35} | {n['name']}")
    
    return notes  # 供飞书推送用

if __name__ == '__main__':
    main()
