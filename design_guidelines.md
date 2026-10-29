# KGF Premium – design guidelines

**Purpose**: customers book premium rides in a Tesla (Model 3 / Y / S / X) in Poznań and the surrounding area.

**Aesthetic**: quiet luxury. Deep black surfaces, white primary actions, a single red accent used sparingly (labels, tail light, logo bar). No yellow "taxi" cues.

## Navigation
Bottom tabs: **Start** (home), **Zamów** (booking), **Przejazdy** (my rides), **Profil**. Ride details open as a full screen above the tabs. Login and registration come before the tabs.

## Colours (`client/constants/theme.ts`)
- Background `#0A0A0B`, surfaces `#141416` / `#1C1C1F` / `#26262A`
- Border `#2A2A2E`, strong border `#3A3A3F`
- Text `#F5F5F7`, secondary `#9A9AA0`, tertiary `#6C6C72`
- Primary button: white `#F5F5F7` with black text
- Accent red `#E82127`
- Status: pending `#FFD60A`, confirmed `#64D2FF`, in progress `#30D158`, cancelled `#FF453A`

## Type
System font. Large titles 28–34 with slight negative tracking; section labels 12 pt, uppercase, wide tracking.

## Components
- Cards: 16–24 radius, 1 px border, no shadows
- Buttons: 56 high, 12 radius, spring press animation
- Car illustrations: `TeslaCar` SVG (sedan / SUV roofline, colour per model). Never use the Tesla logo.
- Icons: Feather (`@expo/vector-icons`)

## Contact
Phone +48 537 353 052 · Instagram @kgf_taxi · 24/7
