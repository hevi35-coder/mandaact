#!/usr/bin/env python3
"""
MandaAct Splash Screen Generator
Generates splash.png for iPhone and splash-tablet.png for iPad using Playwright
"""

import subprocess
import sys

def install_playwright():
    """Install playwright if not available"""
    try:
        from playwright.sync_api import sync_playwright
        return True
    except ImportError:
        print("Installing playwright...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright", "-q"])
        subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
        return True

def generate_splash(width, height, output_name, html_content):
    """Generate splash screen image with specified dimensions"""
    install_playwright()
    
    from playwright.sync_api import sync_playwright
    import os
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, output_name)
    
    # Create temp HTML with specified dimensions
    html_template = f'''<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      width: {width}px;
      height: {height}px;
      background-color: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: 'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
    }}
    .logo-container {{ display: flex; flex-direction: row; align-items: baseline; }}
    .manda {{ font-size: {120 if width < 1500 else 160}px; font-weight: 700; color: #000000; letter-spacing: -2px; }}
    .act {{ font-size: {120 if width < 1500 else 160}px; font-weight: 700; background: linear-gradient(90deg, #2563eb, #9333ea, #db2777); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: -2px; }}
    .tagline {{ font-size: {40 if width < 1500 else 56}px; font-weight: 400; color: #6b7280; margin-top: {40 if width < 1500 else 60}px; }}
  </style>
</head>
<body>
  <div class="logo-container">
    <span class="manda">Manda</span><span class="act">Act</span>
  </div>
  <div class="tagline">Turn Goals into Action</div>
</body>
</html>'''
    
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": width, "height": height})
        page.set_content(html_template)
        page.wait_for_timeout(1000)
        page.screenshot(path=output_path, type="png")
        browser.close()
    
    size_kb = os.path.getsize(output_path) / 1024
    print(f"✅ {output_name} saved ({width}x{height}) - {size_kb:.1f} KB")
    return output_path

if __name__ == "__main__":
    # Generate iPhone splash (iPhone 14 Pro Max)
    generate_splash(1284, 2778, "splash.png", None)
    
    # Generate iPad splash (iPad Pro 12.9")
    generate_splash(2048, 2732, "splash-tablet.png", None)
    
    print("\n🎉 All splash screens generated!")
