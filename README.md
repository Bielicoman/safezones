# Safe Zones for Adobe Premiere Pro 🎬📐

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Adobe Premiere Pro](https://img.shields.io/badge/Premiere%20Pro-2020--2025%2B-purple.svg)](https://www.adobe.com/products/premiere.html)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-brightgreen.svg)]()
[![Apple Silicon](https://img.shields.io/badge/Apple%20Silicon-M1%20%2F%20M2%20%2F%20M3%20%2F%20M4%20Native-orange.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-cyan.svg)](https://github.com/Bielicoman/safezones/pulls)

> **The ultimate free, open-source safe zones overlay, cinematic letterbox, and in-panel vector design studio for Adobe Premiere Pro.**  
> Never guess mobile UI danger zones or cut off essential faces, subtitles, and CTA buttons again.

---

## ⚡ Key Highlights

- 🎯 **1-Click Live Timeline Sync (`ON AIR`):** Automatically creates a dedicated top overlay track and locks it (`V4`). Zero timeline clutter, zero accidental edits.
- 🎨 **Zone Studio Pro (In-Panel Vector Suite):** Full Photoshop-like vector workbench inside Premiere. Pen Tool with smooth Bézier spline curves, rounded boxes, reticles, dimension rulers, and smart snapping (🧲).
- 📱 **2025 Calibrated Social Media Safe Zones:** Pixel-perfect UI overlays for **TikTok**, **Instagram Reels**, **YouTube Shorts**, **Stories**, **Facebook Reels**, and **X / Twitter**.
- 📐 **Cinematic Aspect Ratios & Letterboxing:** Preview 2.39:1 Anamorphic Cinemascope, 1.85:1 Academy Flat, 16:9, 4:3, 1:1, and 9:16 with customizable matte alpha and guide lines.
- 🧮 **Mathematical Composition Grids:** Rule of Thirds 3x3, Golden Ratio (Phi 1:1.618), Dynamic Symmetry Diagonals, and Broadcast Title & Action Safe Margins (SMPTE / EBU R95).
- 💾 **Team JSON Presets & Context Menu:** Right-click custom presets to **Edit in Studio**, **Duplicate**, **Export .JSON**, or **Delete**.
- 🚀 **Zero Playback Lag:** Generates a lightweight PNG overlay clip with 0ms performance impact during timeline playback.

---

## 📦 Quick Installation (60 Seconds)

### 🪟 Windows Setup

1. [**Download the latest ZIP**](https://github.com/Bielicoman/safezones/archive/refs/heads/main.zip) and extract it.
2. Press <kbd>Win</kbd> + <kbd>R</kbd>, paste `%APPDATA%\Adobe\CEP\extensions\` and press **Enter**.
3. Copy the `com.alexascencio.safezones` folder into this directory.
4. Run this one-liner in **PowerShell** to enable developer extensions:
   ```powershell
   reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d "1" /f
   ```
5. Launch **Adobe Premiere Pro** and open:
   `Window` ➔ `Extensions` ➔ `Safe Zones`

---

### 🍎 macOS Setup (Intel & Apple Silicon M1/M2/M3/M4)

1. [**Download the latest ZIP**](https://github.com/Bielicoman/safezones/archive/refs/heads/main.zip) and extract it.
2. Open Finder, press <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>G</kbd> and paste:
   `~/Library/Application Support/Adobe/CEP/extensions/`
3. Copy the `com.alexascencio.safezones` folder into this directory.
4. Open **Terminal** and run:
   ```bash
   defaults write com.adobe.CSXS.11 PlayerDebugMode 1
   defaults write com.adobe.CSXS.12 PlayerDebugMode 1
   ```
5. Launch **Adobe Premiere Pro** and open:
   `Window` ➔ `Extensions` ➔ `Safe Zones`

---

## ⌨️ Zone Studio Pro Keyboard Shortcuts

| Key | Action | Description |
|:---:|:---|:---|
| <kbd>V</kbd> | **Select & Move** | Select, drag, and transform vector layers |
| <kbd>P</kbd> | **Vector Pen Tool** | Place anchor nodes with Bézier curvature |
| <kbd>R</kbd> | **Rectangle** | Draw bounding boxes and safe zones |
| <kbd>U</kbd> | **Rounded Box** | Draw boxes with corner radius curvature |
| <kbd>O</kbd> | **Ellipse / Circle** | Facecam and circular boundary frames |
| <kbd>C</kbd> | **Center Reticle** | Precise crosshair aiming target |
| <kbd>Y</kbd> | **Polygon / Triangle** | Multi-sided vector shapes |
| <kbd>G</kbd> | **Thirds Grid** | Rule of Thirds 3x3 overlay |
| <kbd>L</kbd> | **Guide Line** | Horizontal or vertical alignment lines |
| <kbd>M</kbd> | **Dimension Ruler** | Pixel-accurate measurement ruler |
| <kbd>B</kbd> | **Brush** | Freehand annotations |
| <kbd>E</kbd> | **Eraser** | Delete clicked elements |
| <kbd>T</kbd> | **Text** | Label notes and dimension callouts |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | **Undo** | Step backward in design history |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> | **Redo** | Step forward in design history |
| <kbd>Ctrl</kbd> + <kbd>D</kbd> | **Duplicate** | Clone selected layer with offset |
| <kbd>Del</kbd> | **Delete** | Remove selected element |
| <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> | **Nudge** | Move selection by 1 pixel |
| <kbd>Shift</kbd> + <kbd>Arrows</kbd> | **Fast Nudge** | Move selection by 10 pixels |
| <kbd>Enter</kbd> | **Commit Path** | Finalize open or closed Pen path |

---

## 🏗️ Architecture & Technology Stack

```
Safe Zones/
├── com.alexascencio.safezones/       # Adobe CEP 9-12 Extension Package
│   ├── CSXS/
│   │   └── manifest.xml             # Adobe CEP extension manifest
│   ├── css/
│   │   └── style.css                # Obsidian dark theme design tokens & styles
│   ├── js/
│   │   ├── main.js                  # Main panel controller, presets & bridge
│   │   ├── studio.js                # Vector engine, Pen tool, Undo/Redo & layers
│   │   ├── draw.js                  # Catmull-Rom to cubic Bézier spline renderer
│   │   └── zones.js                 # Social safe zone coordinate definitions
│   ├── jsx/
│   │   └── SafeZones.jsx            # ExtendScript ES3 Premiere Pro timeline sync
│   └── index.html                   # Main extension UI & accordions
├── website/                         # Official Promotional Landing Page (Vercel)
│   ├── index.html                   # Interactive browser simulator & showcase
│   ├── css/site.css                 # Web design system
│   ├── js/site.js                   # Interactive HTML5 Canvas simulator
│   └── vercel.json                  # Vercel deployment configuration
└── README.md                        # Documentation & setup guide
```

---

## 🤝 Contributing

Contributions, feature ideas, and pull requests are warmly welcome!

1. Fork the Project (`https://github.com/Bielicoman/safezones/fork`)
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add new safe zone platform'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

Developed with ❤️ by **Alex Ascencio** for editors, creators, and filmmakers worldwide.
