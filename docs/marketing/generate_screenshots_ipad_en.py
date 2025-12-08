#!/usr/bin/env python3
"""
App Store Screenshot Generator for MandaAct - iPad English Version
Generates composite images with text overlays for App Store submission.
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(BASE_DIR, "assets/raw/ipad_en")
OUTPUT_DIR = os.path.join(BASE_DIR, "assets/final/ipad_en")

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

# App Store dimensions (iPad Pro 12.9" - 2048x2732 required)
CANVAS_WIDTH = 2048
CANVAS_HEIGHT = 2732

# Colors
GRADIENT_START = (37, 99, 235)  # #2563eb (blue)
GRADIENT_END = (147, 51, 234)   # #9333ea (purple)
WHITE = (255, 255, 255)
LIGHT_GRAY = (220, 220, 220)

# Copy specifications from marketing doc (English)
SCREENS = [
    {
        "filename": "screen_1_vision.png",
        "title": "Visualize Your\nBig Dreams",
        "subtitle": "Structure goals into a 9×9 grid",
        "output": "01_vision.png"
    },
    {
        "filename": "screen_2_action.png",
        "title": "Don't Just Plan.\nDo.",
        "subtitle": "Goals turn into daily to-do lists",
        "output": "02_action.png"
    },
    {
        "filename": "screen_3_magic.png",
        "title": "Snap & Digitize\nInstantly",
        "subtitle": "AI converts your handwriting to digital",
        "output": "03_magic.png"
    },
    {
        "filename": "screen_4_reward.png",
        "title": "Make Growth\nAddictive",
        "subtitle": "Earn XP, badges, and level up",
        "output": "04_reward.png"
    },
    {
        "filename": "screen_5_insight.png",
        "title": "Smart Weekly\nInsights",
        "subtitle": "AI analyzes your habit patterns",
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
    # Create a mask with rounded corners
    mask = Image.new('L', img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), img.size], radius=radius, fill=255)

    # Apply mask
    output = Image.new('RGBA', img.size, (0, 0, 0, 0))
    output.paste(img, mask=mask)
    return output

def add_device_shadow(canvas, x, y, width, height, radius=60):
    """Add a subtle shadow behind the device."""
    shadow_offset = 30

    # Create shadow layer
    shadow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)

    # Draw shadow rectangle (slightly offset and larger)
    shadow_draw.rounded_rectangle(
        [(x + shadow_offset, y + shadow_offset),
         (x + width + shadow_offset, y + height + shadow_offset)],
        radius=radius,
        fill=(0, 0, 0, 50)
    )

    # Composite shadow onto canvas
    return Image.alpha_composite(canvas.convert('RGBA'), shadow)

def generate_screenshot(screen_config):
    """Generate a single App Store screenshot."""
    print(f"Generating: {screen_config['output']}")

    # Create gradient background
    canvas = create_gradient(CANVAS_WIDTH, CANVAS_HEIGHT, GRADIENT_START, GRADIENT_END)
    canvas = canvas.convert('RGBA')

    # Load screenshot
    screenshot_path = os.path.join(RAW_DIR, screen_config['filename'])
    screenshot = Image.open(screenshot_path).convert('RGBA')

    # Scale screenshot to fit nicely (about 85% of canvas width for iPad)
    target_width = int(CANVAS_WIDTH * 0.88)
    scale_ratio = target_width / screenshot.width
    target_height = int(screenshot.height * scale_ratio)

    # Make sure height doesn't exceed canvas
    if target_height > CANVAS_HEIGHT * 0.70:
        target_height = int(CANVAS_HEIGHT * 0.70)
        scale_ratio = target_height / screenshot.height
        target_width = int(screenshot.width * scale_ratio)

    screenshot = screenshot.resize((target_width, target_height), Image.LANCZOS)

    # Add rounded corners to screenshot
    screenshot = add_rounded_corners(screenshot, 40)

    # Calculate position (center horizontally, lower area vertically)
    x = (CANVAS_WIDTH - target_width) // 2
    y = CANVAS_HEIGHT - target_height - 120  # 120px from bottom

    # Add shadow
    canvas = add_device_shadow(canvas, x, y, target_width, target_height)

    # Paste screenshot
    canvas.paste(screenshot, (x, y), screenshot)

    # Add text
    draw = ImageDraw.Draw(canvas)

    # Try to use system fonts
    try:
        # macOS system fonts - larger for iPad
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 120)
        subtitle_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 56)
    except:
        try:
            title_font = ImageFont.truetype("/System/Library/Fonts/SFNSDisplay.ttf", 120)
            subtitle_font = ImageFont.truetype("/System/Library/Fonts/SFNSDisplay.ttf", 56)
        except:
            # Fallback to default
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()

    # Draw title (centered, near top)
    title = screen_config['title']
    title_y = 150

    for i, line in enumerate(title.split('\n')):
        bbox = draw.textbbox((0, 0), line, font=title_font)
        text_width = bbox[2] - bbox[0]
        text_x = (CANVAS_WIDTH - text_width) // 2
        draw.text((text_x, title_y + i * 140), line, font=title_font, fill=WHITE)

    # Draw subtitle (centered, below title)
    subtitle = screen_config['subtitle']
    subtitle_y = title_y + len(title.split('\n')) * 140 + 30

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
    print("MandaAct iPad EN Screenshot Generator")
    print("=" * 50)
    print(f"Canvas size: {CANVAS_WIDTH} x {CANVAS_HEIGHT}")
    print(f"Output directory: {OUTPUT_DIR}")
    print()

    for screen in SCREENS:
        generate_screenshot(screen)

    print()
    print("=" * 50)
    print(f"Done! Generated {len(SCREENS)} screenshots.")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 50)

if __name__ == "__main__":
    main()
