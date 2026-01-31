#!/usr/bin/env python3
"""
================================================================================
FINAL CONSOLIDATED APP STORE SCREENSHOT GENERATOR FOR MANDAACT
================================================================================
This is the SINGLE SOURCE OF TRUTH for generating App Store screenshots.
All other generate_screenshots_*.py files are redundant and should be ignored.

Design Philosophy:
- Minimalist: Titles only, no subtitles, no background shadows.
- Balanced & Professional: Enough breathing room for content and text.
- Clean Assets: Trusts pre-cleaned raw files (no internal cropping).
================================================================================
"""

from PIL import Image, ImageDraw, ImageFont
import argparse
import os

# --- Configuration ---

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
RAW_DIR = os.path.join(ASSETS_DIR, "raw")
FINAL_DIR = os.path.join(ASSETS_DIR, "final")

# Font Path (repo-relative; avoids absolute machine paths)
FONT_BOLD = os.path.normpath(
    os.path.join(
        BASE_DIR,
        "..",
        "..",
        "apps",
        "mobile",
        "assets",
        "fonts",
        "Pretendard-Bold.otf",
    )
)

# Colors
GRADIENT_START = (37, 99, 235)  # #2563eb (Blue)
GRADIENT_END = (147, 51, 234)   # #9333ea (Purple)
TEXT_WHITE = (255, 255, 255)

# Device Profiles
# NOTE:
# - `iphone` / `ipad` are legacy profiles that match currently committed assets.
# - Prefer `iphone_6_9` / `ipad_13` for future submissions (Apple’s latest default specs).
DEVICES = {
    "iphone": {
        "width": 1284,             # Compatible with 6.5"/6.7" Pro Max slots
        "height": 2778,
        "screenshot_scale": 0.88,  # Slightly smaller for premium balance
        "bottom_margin": 140,      # More space at the bottom 
        "title_step_y": 280,       # Start title higher
        "title_size": 130,
        "line_spacing": 150,
        "corner_radius": 80,
    },
    "iphone_14_pro": {
        "width": 1179,
        "height": 2556,
        "screenshot_scale": 0.88,
        "bottom_margin": 130,
        "title_step_y": 260,
        "title_size": 120,
        "line_spacing": 140,
        "corner_radius": 75,
    },
    "iphone_6_9": {
        # Apple (6.9" Display) portrait: 1320 x 2868
        "width": 1320,
        "height": 2868,
        "screenshot_scale": 0.90,
        "bottom_margin": 140,
        "title_step_y": 300,
        "title_size": 132,
        "line_spacing": 152,
        "corner_radius": 84,
    },
    "ipad": {
        "width": 2048,             # Compatible with 12.9" Pro slots
        "height": 2732,
        "screenshot_scale": 0.72,
        "bottom_margin": 120,
        "title_step_y": 300,
        "title_size": 150,
        "line_spacing": 180,
        "corner_radius": 60,
    },
    "ipad_10_5": {
        "width": 1668,
        "height": 2224,
        "screenshot_scale": 0.72,
        "bottom_margin": 100,
        "title_step_y": 250,
        "title_size": 130,
        "line_spacing": 160,
        "corner_radius": 50,
    },
    "ipad_13": {
        # Apple (iPad Air M2/M3 etc.) portrait: 2064 x 2752
        "width": 2064,
        "height": 2752,
        "screenshot_scale": 0.76,
        "bottom_margin": 120,
        "title_step_y": 300,
        "title_size": 150,
        "line_spacing": 180,
        "corner_radius": 60,
    },
}

# Content Localization (Full 5-screen set for each language)
CONTENT = {
    "en": [
        {"id": "1_home", "title": "Crush Your\nGoals Daily", "raw_filename": "01_home.png", "out_filename": "01_home.png"},
        {"id": "2_modal", "title": "Just Type.\nAI Does the Rest.", "raw_filename": "02_modal.png", "out_filename": "02_modal.png"},
        {"id": "3_report", "title": "Get Your\n1:1 Coaching", "raw_filename": "03_report.png", "out_filename": "03_report.png"},
        {"id": "4_gamification", "title": "Make Success\nAddictive", "raw_filename": "04_gamification.png", "out_filename": "04_gamification.png"}
    ],
    "ko": [
        {"id": "1_home", "title": "목표 달성을\n습관으로", "raw_filename": "01_home.png", "out_filename": "01_home.png"},
        {"id": "2_modal", "title": "입력만 하세요\nAI가 완성합니다", "raw_filename": "02_modal.png", "out_filename": "02_modal.png"},
        {"id": "3_report", "title": "내 손안의\n전담 코치", "raw_filename": "03_report.png", "out_filename": "03_report.png"},
        {"id": "4_gamification", "title": "게임처럼 빠져드는\n성장 시스템", "raw_filename": "04_gamification.png", "out_filename": "04_gamification.png"}
    ]
}

# --- Utility Functions ---

def create_gradient(width, height, start_color, end_color):
    """Create a high-quality vertical gradient."""
    top = Image.new('RGB', (width, height), start_color)
    bottom = Image.new('RGB', (width, height), end_color)
    mask = Image.new('L', (width, height))
    for y in range(height):
        mask.paste(int(255 * (y / height)), (0, y, width, y + 1))
    return Image.composite(bottom, top, mask)

def apply_rounded_corners(img, radius):
    """Apply rounded corners with transparency support."""
    mask = Image.new('L', img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0) + img.size, radius=radius, fill=255)
    output = Image.new('RGBA', img.size, (0, 0, 0, 0))
    output.paste(img, (0, 0), mask)
    return output

# --- Generator ---

def generate_screenshot(lang, device_key, only_id=None):
    device = DEVICES[device_key]
    lang_dir = f"ipad_{lang}" if device_key == "ipad" else lang
    if device_key == "ipad_13":
        lang_dir = f"ipad_{lang}"
    
    input_dir = os.path.join(RAW_DIR, lang_dir)
    output_dir = os.path.join(FINAL_DIR, lang_dir)
    os.makedirs(output_dir, exist_ok=True)
    
    # Load Font
    try:
        title_font = ImageFont.truetype(FONT_BOLD, device["title_size"])
    except Exception as e:
        print(f"  Warning: Could not load Pretendard font: {e}. Falling back to default.")
        title_font = ImageFont.load_default()

    for item in CONTENT[lang]:
        if only_id and item["id"] != only_id:
            continue
        # 1. Create Canvas
        canvas = create_gradient(device["width"], device["height"], GRADIENT_START, GRADIENT_END)
        canvas = canvas.convert('RGBA')
        draw = ImageDraw.Draw(canvas)
        
        # 2. Draw Text (Title Only)
        y_cursor = device["title_step_y"]
        lines = item["title"].split('\n')
        for line in lines:
            bbox = draw.textbbox((0, 0), line, font=title_font)
            w = bbox[2] - bbox[0]
            draw.text(((device["width"] - w) // 2, y_cursor), line, font=title_font, fill=TEXT_WHITE)
            y_cursor += device["line_spacing"]
        
        # 3. Process App Screenshot
        ss_path = os.path.join(input_dir, item["raw_filename"])
        if not os.path.exists(ss_path):
            print(f"  [Error] {ss_path} not found. Skipping.")
            continue
            
        ss = Image.open(ss_path).convert('RGBA')
        
        # Auto-trim transparency (shadows/padding)
        bbox = ss.getbbox()
        if bbox:
            ss = ss.crop(bbox)
        
        # Scale
        target_w = int(device["width"] * device["screenshot_scale"])
        scale_ratio = target_w / ss.width
        target_h = int(ss.height * scale_ratio)
        ss = ss.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        # Apply Rounded Corners
        ss = apply_rounded_corners(ss, device["corner_radius"])
        
        # Position (Centered horizontally, specific bottom margin)
        ss_x = (device["width"] - target_w) // 2
        ss_y = device["height"] - target_h - device["bottom_margin"]
        
        # Paste onto background
        canvas.paste(ss, (ss_x, ss_y), ss)
        
        # 4. Save Final Image
        out_path = os.path.join(output_dir, item["out_filename"])
        canvas.convert('RGB').save(out_path, 'PNG', quality=95)
        print(f"  - Saved: {out_path}")

def main():
    parser = argparse.ArgumentParser(description="Generate App Store screenshots (MandaAct).")
    parser.add_argument("--lang", choices=["en", "ko"], help="Generate only one language.")
    parser.add_argument(
        "--device",
        choices=list(DEVICES.keys()),
        help="Generate only one device profile.",
    )
    parser.add_argument(
        "--id",
        help="Generate only one screen id (e.g., 1_vision, 2_action, 3_magic, 4_reward, 5_insight).",
    )
    args = parser.parse_args()

    langs = [args.lang] if args.lang else ["en", "ko"]
    devices = [args.device] if args.device else ["iphone", "ipad"]

    print("Generating screenshots...")
    for lang in langs:
        for device_key in devices:
            generate_screenshot(lang, device_key, only_id=args.id)
    print("\nAll tasks completed successfully!")

if __name__ == "__main__":
    main()
