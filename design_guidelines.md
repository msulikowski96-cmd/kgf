# Twój Prywatny Szofer – design guidelines

**Purpose**: an Uber-style app – customers book rides in a Tesla (Model 3 / Y / S / X) in Poznań and the surrounding area, track the driver live on the map; drivers take and run rides in the same app.

**Aesthetic**: quiet luxury. Deep black surfaces, white primary actions, a single red accent used sparingly (labels, tail light, logo bar). No yellow "taxi" cues.

## Navigation
Customer tabs: **Start** (full-screen map with nearby cars and "Dokąd jedziemy?"), **Zamów** (booking), **Przejazdy** (my rides), **Profil**. Ride tracking (map + bottom sheet) opens above the tabs; place search opens as a modal. Driver tabs: **Jazda** (map, online switch, offers, current ride), **Kursy** (bookings and history), **Profil**. Login and registration come before the tabs.

## Map
Leaflet in a WebView (iframe on web) with the CARTO dark basemap. Pickup = white circle with a black dot, destination = white square, cars = top-down car icons rotated by heading (the assigned car larger and white), route = white line with a dark casing. Map screens use a bottom sheet (24 radius top corners) over the map.

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
