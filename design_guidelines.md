# KGF Taxi - Android App Design Guidelines

## Brand Identity
**Purpose**: Mobile app for KGF Taxi company enabling customers to quickly book rides, view pricing, contact drivers, and learn about services.

**Aesthetic Direction**: Professional & Bold - High contrast design with strong taxi-yellow accent, clean typography, and maximum readability. The app should feel reliable, efficient, and instantly recognizable as a taxi service. Think "taxi sign on black sedan" - bold yellow on dark, professional surfaces.

**Memorable Element**: Striking taxi-yellow (#FFC107) used generously against deep charcoal surfaces. Every action button pulses with confidence.

## Navigation Architecture
**Type**: Tab Navigation (4 tabs) + Floating Action Button

**Tabs**:
1. **Główna** (Home) - Quick booking, recent rides
2. **Cennik** (Pricing) - Rate tables, route calculator
3. **Flota** (Fleet) - Vehicle showcase, features
4. **Profil** (Profile) - Account, contact, settings

**Floating Action Button**: "Zamów teraz" (Book Now) - persistent across all tabs, bottom-right corner

**Additional Screens** (Stack/Modal):
- Booking confirmation screen
- Contact screen (phone, email, address)
- About company screen
- Service areas map screen
- Settings screen

## Screen-by-Screen Specifications

### Home Screen
- **Purpose**: Quick access to booking and recent ride history
- **Layout**:
  - Transparent header, no header buttons, no search
  - Scrollable main content
  - Safe area: top = headerHeight + 24, bottom = tabBarHeight + 84 (tab + FAB clearance)
- **Components**:
  - Hero section: Company logo, tagline "Twoja wygodna jazda po Radomiu"
  - Quick info cards: Phone number (tap to call), Operating hours
  - "Najpopularniejsze trasy" section - 3-4 common route cards
  - "Nasze usługi" section - Service highlights grid (2 columns)
- **Empty State**: N/A (always shows content)

### Pricing Screen
- **Purpose**: Display rate tables and route pricing
- **Layout**:
  - Default header with title "Cennik"
  - Scrollable content
  - Safe area: top = 24, bottom = tabBarHeight + 84
- **Components**:
  - Rate table card: Base fare, per km, waiting time
  - Popular routes list with prices
  - Additional fees section (night rate, extra passengers)
  - Route calculator tool (from/to inputs, calculate button)
- **Empty State**: N/A

### Fleet Screen
- **Purpose**: Showcase available vehicles and their features
- **Layout**:
  - Default header with title "Nasza Flota"
  - Scrollable grid (2 columns on larger screens, 1 on small)
  - Safe area: top = 24, bottom = tabBarHeight + 84
- **Components**:
  - Vehicle cards with: Photo, model name, passenger capacity, trunk space, features (A/C, card payment)
  - Filter chips at top: "Wszystkie", "Sedan", "Kombi", "Premium"
- **Empty State**: N/A

### Profile Screen
- **Purpose**: User preferences and company contact
- **Layout**:
  - Default header with title "Profil"
  - Scrollable content
  - Safe area: top = 24, bottom = tabBarHeight + 24
- **Components**:
  - Avatar (preset taxi icon), display name field
  - "Kontakt" section: Phone (tap to call), Email, Address (tap for maps)
  - "O firmie" button
  - "Obszar działania" button
  - App preferences toggle: Notifications, Dark mode
  - App version footer
- **Empty State**: N/A

### Booking Confirmation Screen (Modal)
- **Purpose**: Confirm ride details after FAB tap
- **Layout**:
  - Custom header: "Potwierdź zamówienie", X close button (left), "Zamów" button (right)
  - Scrollable form
  - Safe area: top = 24, bottom = insets.bottom + 24
- **Components**:
  - Pickup location input (with current location option)
  - Destination input
  - Date/time picker
  - Passenger count selector
  - Special requests text field
  - Price estimate display
  - "Zadzwoń do nas" alternative button

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
- **Font**: Roboto (Material Design default) - professional, highly legible
- **Type Scale**:
  - Hero: 32sp, Bold
  - Title: 24sp, Bold
  - Heading: 18sp, Medium
  - Body: 16sp, Regular
  - Caption: 14sp, Regular
  - Button: 16sp, Medium, Uppercase

## Visual Design
- Touchables: Ripple effect (Material Design standard), no shadows except FAB
- FAB shadow: shadowOffset {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2
- Cards: 12dp corner radius, elevation 2
- Buttons: 8dp corner radius
- Icons: Material Icons from @expo/vector-icons

## Assets to Generate
1. **icon.png** - App icon featuring taxi cab silhouette on yellow circle
2. **splash-icon.png** - KGF Taxi logo for launch screen
3. **hero-taxi.png** - Professional taxi vehicle photo for Home hero section
4. **sedan.png** - Sedan vehicle for Fleet screen
5. **kombi.png** - Station wagon vehicle for Fleet screen
6. **premium.png** - Premium vehicle for Fleet screen
7. **avatar-preset.png** - Default taxi icon avatar for Profile screen
8. **service-transfer.png** - Airport transfer illustration for services grid
9. **service-city.png** - City rides illustration for services grid
10. **service-comfort.png** - Comfortable ride illustration for services grid
11. **empty-routes.png** - Empty state for route calculator (if no results)

**Asset Style**: Clean, modern photography for vehicles. Simple line-art style for service illustrations in taxi yellow on dark surfaces. Professional, not playful.