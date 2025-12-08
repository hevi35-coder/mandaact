#!/usr/bin/env python3
"""
App Store Screenshot Generator for MandaAct - Korean Version
Generates composite images with Korean text overlays for App Store submission.
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(BASE_DIR, "assets/raw/ko")
OUTPUT_DIR = os.path.join(BASE_DIR, "assets/final/ko")

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

# App Store dimensions (iPhone 6.7" - 1284x2778 required)
CANVAS_WIDTH = 1284
CANVAS_HEIGHT = 2778

# Colors
GRADIENT_START = (37, 99, 235)  # #2563eb (blue)
GRADIENT_END = (147, 51, 234)   # #9333ea (purple)
WHITE = (255, 255, 255)
LIGHT_GRAY = (200, 200, 200)

# Copy specifications from marketing doc (Korean)
SCREENS = [
    {
        "filename": "screen_1_vision.png",
        "title": "꿈을 현실로\n그리는 지도",
        "subtitle": "만다라트로 목표를 시각화하세요",
        "output": "01_vision.png"
    },
    {
        "filename": "screen_2_action.png",
        "title": "계획만 세우지 말고\n실천하세요",
        "subtitle": "목표가 자동으로 '오늘의 할 일'이 됩니다",
        "output": "02_action.png"
    },
    {
        "filename": "screen_3_magic.png",
        "title": "손글씨도\n1초 만에 입력",
        "subtitle": "사진만 찍으면 AI가 자동으로 인식해요",
        "output": "03_magic.png"
    },
    {
        "filename": "screen_4_reward.png",
        "title": "게임처럼 즐기는\n자기계발",
        "subtitle": "매일 XP를 모으고 레벨업하세요",
        "output": "04_reward.png"
    },
    {
        "filename": "screen_5_insight.png",
        "title": "AI가 분석하는\n성장 리포트",
        "subtitle": "데이터로 내 루틴을 점검받으세요",
        "output": "05_insight.png"
    }
]

def create_gradient(width, height, start_color, end_color):
    """Create a vertical gradient image."""
    img = Image.new('RGB', (width, height))
    for y in range(height):
        ratio = y / height
        r = int(start_color[0] * (1 - ratio) + end_color[0] * ratio)
        g = int(start_color[1] * (1 - ratio) + end_color[1] * ratio)
        b = int(start_color[2] * (1 - ratio) + end_color[2] * ratio)
        for x in range(width):
            img.putpixel((x, y), (r, g, b))
    return img

def add_rounded_corners(img, radius):
    """Add rounded corners to an image."""
    mask = Image.new('L', img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), img.size], radius=radius, fill=255)
    output = Image.new('RGBA', img.size, (0, 0, 0, 0))
    output.paste(img, mask=mask)
    return output

def add_device_shadow(canvas, x, y, width, height, radius=60):
    """Add a subtle shadow behind the device."""
    shadow_offset = 20
    shadow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        [(x + shadow_offset, y + shadow_offset),
         (x + width + shadow_offset, y + height + shadow_offset)],
        radius=radius,
        fill=(0, 0, 0, 60)
    )
    return Image.alpha_composite(canvas.convert('RGBA'), shadow)

def get_korean_font(size):
    """Get a Korean-compatible font."""
    font_paths = [
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
        "/Library/Fonts/NanumGothic.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in font_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except:
                continue
    return ImageFont.load_default()

def generate_screenshot(screen_config):
    """Generate a single App Store screenshot."""
    print(f"Generating: {screen_config['output']}")

    # Create gradient background
    canvas = create_gradient(CANVAS_WIDTH, CANVAS_HEIGHT, GRADIENT_START, GRADIENT_END)
    canvas = canvas.convert('RGBA')

    # Load screenshot
    screenshot_path = os.path.join(RAW_DIR, screen_config['filename'])
    screenshot = Image.open(screenshot_path).convert('RGBA')

    # Scale screenshot to fit nicely (about 70% of canvas width)
    target_width = int(CANVAS_WIDTH * 0.75)
    scale_ratio = target_width / screenshot.width
    target_height = int(screenshot.height * scale_ratio)
    screenshot = screenshot.resize((target_width, target_height), Image.LANCZOS)

    # Add rounded corners to screenshot
    screenshot = add_rounded_corners(screenshot, 50)

    # Calculate position (center horizontally, lower third vertically)
    x = (CANVAS_WIDTH - target_width) // 2
    y = CANVAS_HEIGHT - target_height - 150

    # Add shadow
    canvas = add_device_shadow(canvas, x, y, target_width, target_height)

    # Paste screenshot
    canvas.paste(screenshot, (x, y), screenshot)

    # Add text
    draw = ImageDraw.Draw(canvas)

    # Use Korean-compatible fonts
    title_font = get_korean_font(100)
    subtitle_font = get_korean_font(48)

    # Draw title (centered, near top)
    title = screen_config['title']
    title_y = 180

    for i, line in enumerate(title.split('\n')):
        bbox = draw.textbbox((0, 0), line, font=title_font)
        text_width = bbox[2] - bbox[0]
        text_x = (CANVAS_WIDTH - text_width) // 2
        draw.text((text_x, title_y + i * 120), line, font=title_font, fill=WHITE)

    # Draw subtitle (centered, below title)
    subtitle = screen_config['subtitle']
    subtitle_y = title_y + len(title.split('\n')) * 120 + 40

    bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    text_width = bbox[2] - bbox[0]
    text_x = (CANVAS_WIDTH - text_width) // 2
    draw.text((text_x, subtitle_y), subtitle, font=subtitle_font, fill=LIGHT_GRAY)

    # Save
    output_path = os.path.join(OUTPUT_DIR, screen_config['output'])
    canvas.convert('RGB').save(output_path, 'PNG', quality=95)
    print(f"  Saved: {output_path}")

def main():
    print("=" * 50)
    print("MandaAct App Store Screenshot Generator (Korean)")
    print("=" * 50)
    print(f"Canvas size: {CANVAS_WIDTH} x {CANVAS_HEIGHT}")
    print(f"Output directory: {OUTPUT_DIR}")
    print()

    for screen in SCREENS:
        generate_screenshot(screen)

    print()
    print("=" * 50)
    print(f"Done! Generated {len(SCREENS)} Korean screenshots.")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 50)

if __name__ == "__main__":
    main()
