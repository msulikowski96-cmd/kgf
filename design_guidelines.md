# KGF Taxi - Android App Design Guidelines

## Brand Identity
**Purpose**: Mobile app for KGF Taxi company enabling customers to quickly book rides, view services, contact drivers, and learn about the company.

**Location**: Poznań and surrounding areas, Poland

**Aesthetic Direction**: Professional & Bold - High contrast design with strong taxi-yellow accent, clean typography, and maximum readability. The app should feel reliable, efficient, and instantly recognizable as a taxi service.

**Memorable Element**: Striking taxi-yellow (#FFC107) used generously against deep charcoal surfaces. Every action button pulses with confidence.

## Navigation Architecture
**Type**: Tab Navigation (4 tabs)

**Tabs**:
1. **Główna** (Home) - Hero section, services overview, call button
2. **Usługi** (Services) - Detailed service descriptions
3. **Kontakt** (Contact) - Phone, SMS, Instagram, hours
4. **O nas** (About) - Company info, stats, links

## Contact Information
- **Phone**: +48 537 353 052
- **Instagram**: @kgf_taxi
- **Website**: kgf-taxi.pl
- **Hours**: 24/7

## Services
1. **Poznań i okolice** - City rides and surrounding areas
2. **Przejazdy VIP** - Exclusive luxury car rides
3. **Przejazdy Biznesowe** - Business transfers

## Color Palette
- **Primary**: #FFC107 (Taxi Yellow) - CTAs, FAB, highlights
- **Primary Dark**: #FFA000 - pressed states, shadows
- **Background**: #121212 (Dark charcoal)
- **Surface**: #1E1E1E (Elevated surfaces, cards)
- **Surface Variant**: #2C2C2C (Secondary cards)
- **Text Primary**: #FFFFFF
- **Text Secondary**: #B0B0B0
- **Border**: #3A3A3A
- **Success**: #4CAF50 (available status)
- **Error**: #F44336 (alerts)

## Typography
- **Font**: System font (Roboto on Android)
- **Type Scale**:
  - Hero: 32sp, Bold
  - Title: 24sp, Bold
  - Heading: 18sp, Medium
  - Body: 16sp, Regular
  - Caption: 14sp, Regular
  - Button: 16sp, Medium

## Visual Design
- Touchables: Spring animation on press
- Cards: 24dp corner radius, elevation via background color
- Buttons: 12dp corner radius
- Icons: Feather icons from @expo/vector-icons
- FAB shadow: shadowOffset {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8

## Generated Assets
1. **icon.png** - App icon with taxi silhouette on yellow
2. **splash-icon.png** - Splash screen icon
3. **hero-taxi.png** - Hero section background image
4. **service-city.png** - City service illustration
5. **service-vip.png** - VIP service illustration
6. **service-business.png** - Business service illustration

## Key Taglines (Polish)
- "Przejazdy takie jak lubisz" - Rides the way you like them
- "Podróżuj komfortowo i bezpiecznie" - Travel comfortably and safely
