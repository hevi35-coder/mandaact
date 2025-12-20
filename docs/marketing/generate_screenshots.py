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

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

# --- Configuration ---

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
RAW_DIR = os.path.join(ASSETS_DIR, "raw")
FINAL_DIR = os.path.join(ASSETS_DIR, "final")

# Font Path (repo-relative)
FONT_BOLD = os.path.normpath(
    os.path.join(BASE_DIR, "..", "..", "apps", "mobile", "assets", "fonts", "Pretendard-Bold.otf")
)

# Colors
GRADIENT_START = (37, 99, 235)  # #2563eb (Blue)
GRADIENT_END = (147, 51, 234)   # #9333ea (Purple)
TEXT_WHITE = (255, 255, 255)

# Device Profiles
DEVICES = {
    "iphone": {
        "width": 1284,             # Compatible with 6.5"/6.7" Pro Max slots
        "height": 2778,
        "screenshot_scale": 0.95,  # Larger for readability
        "bottom_margin": 90,       # More room for UI
        "title_step_y": 190,       # Reduce title block height
        "title_size": 120,
        "line_spacing": 138,
        "corner_radius": 80,
        # Optional crop to enlarge content area (ratios of the raw screenshot)
        "content_crop": {"top": 0.06, "bottom": 0.08, "left": 0.00, "right": 0.00},
    },
    "ipad": {
        "width": 2048,             # Compatible with 12.9" Pro slots
        "height": 2732,
        "screenshot_scale": 0.82,  # Larger for readability
        "bottom_margin": 110,
        "title_step_y": 210,
        "title_size": 140,
        "line_spacing": 165,
        "corner_radius": 60,
        "content_crop": {"top": 0.04, "bottom": 0.06, "left": 0.00, "right": 0.00},
    }
}

# Content Localization (Full 5-screen set for each language)
CONTENT = {
    "en": [
        {"id": "1_vision", "title": "Visualize Your\nBig Dreams", "raw_filename": "screen_1_vision.png", "out_filename": "01_vision.png"},
        {"id": "2_action", "title": "Don't Just Plan.\nDo.", "raw_filename": "screen_2_action.png", "out_filename": "02_action.png"},
        {"id": "3_magic", "title": "Snap & Digitize\nInstantly", "raw_filename": "screen_3_magic.png", "out_filename": "03_magic.png"},
        {"id": "4_reward", "title": "Make Growth\nAddictive", "raw_filename": "screen_4_reward.png", "out_filename": "04_reward.png"},
        {"id": "5_insight", "title": "Smart Weekly\nInsights", "raw_filename": "screen_5_insight.png", "out_filename": "05_insight.png"}
    ],
    "ko": [
        {"id": "1_vision", "title": "원대한 꿈을\n시각화하세요", "raw_filename": "screen_1_vision.png", "out_filename": "01_vision.png"},
        {"id": "2_action", "title": "계획만 하지 말고,\n실천하세요", "raw_filename": "screen_2_action.png", "out_filename": "02_action.png"},
        {"id": "3_magic", "title": "찰나의 순간,\n디지털로 변환", "raw_filename": "screen_3_magic.png", "out_filename": "03_magic.png"},
        {"id": "4_reward", "title": "성장이 즐거운\n갓생 루틴", "raw_filename": "screen_4_reward.png", "out_filename": "04_reward.png"},
        {"id": "5_insight", "title": "똑똑한\n주간 리포트", "raw_filename": "screen_5_insight.png", "out_filename": "05_insight.png"}
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

def apply_content_crop(img, crop):
    """Crop out UI chrome (status/tab bars) to enlarge the meaningful area."""
    if not crop:
        return img
    w, h = img.size
    left = int(w * crop.get("left", 0))
    right = int(w * (1 - crop.get("right", 0)))
    top = int(h * crop.get("top", 0))
    bottom = int(h * (1 - crop.get("bottom", 0)))
    if right <= left or bottom <= top:
        return img
    return img.crop((left, top, right, bottom))

def add_shadow(card, blur=18, opacity=110, offset=(0, 16)):
    """Create a soft shadow for an RGBA image with transparency."""
    shadow = Image.new("RGBA", (card.width + blur * 4, card.height + blur * 4), (0, 0, 0, 0))
    alpha = card.split()[-1]
    shadow_alpha = Image.new("L", alpha.size, 0)
    shadow_alpha.paste(alpha, (0, 0))
    shadow_layer = Image.new("RGBA", alpha.size, (0, 0, 0, opacity))
    shadow_layer.putalpha(shadow_alpha)
    shadow.paste(shadow_layer, (blur * 2, blur * 2))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=blur))
    result = Image.new("RGBA", shadow.size, (0, 0, 0, 0))
    result.paste(shadow, offset, shadow)
    result.paste(card, (blur * 2, blur * 2), card)
    return result

# --- Generator ---

def generate_screenshot(lang, device_key):
    device = DEVICES[device_key]
    lang_dir = f"ipad_{lang}" if device_key == "ipad" else lang
    
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

        # Crop UI chrome to increase legibility (optional, per device)
        ss = apply_content_crop(ss, device.get("content_crop"))
        
        # Scale
        target_w = int(device["width"] * device["screenshot_scale"])
        scale_ratio = target_w / ss.width
        target_h = int(ss.height * scale_ratio)
        ss = ss.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        # Apply Rounded Corners
        ss = apply_rounded_corners(ss, device["corner_radius"])

        # Add subtle shadow for separation from gradient background
        ss_with_shadow = add_shadow(ss, blur=18 if device_key == "iphone" else 14, opacity=120)
        
        # Position (Centered horizontally, specific bottom margin)
        ss_x = (device["width"] - target_w) // 2
        ss_y = device["height"] - target_h - device["bottom_margin"]
        
        # Paste onto background
        shadow_x = ss_x - (ss_with_shadow.width - ss.width) // 2
        shadow_y = ss_y - (ss_with_shadow.height - ss.height) // 2
        canvas.paste(ss_with_shadow, (shadow_x, shadow_y), ss_with_shadow)
        
        # 4. Save Final Image
        out_path = os.path.join(output_dir, item["out_filename"])
        canvas.convert('RGB').save(out_path, 'PNG', quality=95)
        print(f"  - Saved: {out_path}")

def main():
    print(f"Generating screenshots for English and Korean...")
    for lang in ["en", "ko"]:
        for device_key in ["iphone", "ipad"]:
            generate_screenshot(lang, device_key)
    print("\nAll tasks completed successfully!")

if __name__ == "__main__":
    main()
