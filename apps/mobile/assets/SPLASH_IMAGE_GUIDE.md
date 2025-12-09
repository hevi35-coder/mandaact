# MandaAct Splash Screen Image Guide

## 📐 Image Specifications

- **Size**: 1284 x 2778 pixels (iPhone 14 Pro Max)
- **Format**: PNG
- **Background**: White (#FFFFFF)
- **File Size**: ~200KB or less (optimized)

## 🎨 Design Elements

### 1. Logo (Center)
**"MandaAct" Text**:
- Font: **Pretendard-Bold** (48pt)
- Position: Centered horizontally and vertically
- Spacing: 0px letter-spacing

**"Manda" Part**:
- Color: Black (#000000)

**"Act" Part**:
- Gradient: Linear gradient from left to right
  - Start: Blue (#2563eb)
  - Middle: Purple (#9333ea)
  - End: Pink (#db2777)

### 2. Tagline (Below Logo)
**"Turn Goals into Action" (English)**:
- Font: Pretendard-Regular (16pt)
- Color: Gray (#6b7280)
- Position: 16px below the logo
- Centered horizontally

**"목표를 실천으로" (Korean)**:
- Same styling as English
- Use for Korean locale version (optional)

## 🛠️ How to Create

### Option 1: Canva (Recommended)
1. Go to [canva.com](https://canva.com)
2. Create custom size: 1284 x 2778 px
3. Set background to white
4. Add text elements:
   - "Manda" (Black, Bold, 48pt)
   - "Act" (Gradient: Blue→Purple→Pink, Bold, 48pt)
   - "Turn Goals into Action" (Gray, Regular, 16pt)
5. Download as PNG

### Option 2: Figma
1. Create new frame: 1284 x 2778 px
2. Fill background with white
3. Add text layers with specified styles
4. Export as PNG (2x)

### Option 3: Photoshop/Sketch
1. New document: 1284 x 2778 px, 72 DPI
2. Background: White
3. Add text with specified fonts and colors
4. For gradient text:
   - Create text layer
   - Apply gradient overlay
   - Colors: #2563eb → #9333ea → #db2777
5. Save as PNG

## 📦 Font Installation

**Pretendard Font**:
- Download from: https://github.com/orioncactus/pretendard
- Install both Pretendard-Bold and Pretendard-Regular
- Restart design tool after installation

## 📂 File Placement

After creating the image:

1. Save as: `splash.png`
2. Place in: `/Users/jhsy/mandaact/apps/mobile/assets/splash.png`
3. Update `app.json`:
   ```json
   "splash": {
     "image": "./assets/splash.png",
     "resizeMode": "contain",
     "backgroundColor": "#ffffff"
   }
   ```

## ✅ Checklist

- [ ] Image size is exactly 1284 x 2778 px
- [ ] Background is pure white (#FFFFFF)
- [ ] Pretendard-Bold font used for logo
- [ ] Pretendard-Regular font used for tagline
- [ ] Gradient applied correctly to "Act"
- [ ] File size is under 200KB
- [ ] File saved as PNG format
- [ ] File placed in correct directory
- [ ] app.json updated

## 🎯 Final Result

The splash screen should look clean and minimal, matching the login screen's branding:
- White background
- "MandaAct" logo (with gradient on "Act")
- "Turn Goals into Action" tagline below
- All elements centered

This creates a seamless transition from splash → login screen.
