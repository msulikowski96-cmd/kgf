# Twój Prywatny Szofer

Aplikacja mobilna (iOS / Android / web) do zamawiania przejazdów z kierowcą – działa jak Uber: klient widzi auta na mapie, zamawia kurs „teraz” albo rezerwuje termin, śledzi kierowcę na żywo i ocenia przejazd. Kierowcy mają w tej samej aplikacji swój tryb pracy.

## Co potrafi aplikacja

**Klient**
- zakłada konto (imię, nazwisko, telefon, e-mail, hasło) i od razu może zamawiać
- na ekranie startowym widzi mapę ze swoją lokalizacją i wolnymi autami w pobliżu
- wybiera odbiór i cel: wyszukiwarka adresów, „Moja lokalizacja” (GPS), pinezka na mapie albo popularne miejsca (lotnisko, dworzec…)
- widzi trasę na mapie, odległość, czas przejazdu, **cenę wyliczoną z kilometrów** dla każdego modelu i za ile minut przyjedzie najbliższy kierowca
- zamawia „Teraz” albo **rezerwuje termin** (dzień + godzina co 15 min, do 7 dni naprzód)
- **śledzi kierowcę na mapie na żywo**: „Marek będzie za 4 min”, dane kierowcy, model, kolor i numer rejestracyjny auta, przycisk „Zadzwoń”
- może anulować kurs, dopóki się nie rozpoczął; po kursie wystawia ocenę 1–5 ★

**Kierowca** (konto zakładane w aplikacji opcją „Jestem kierowcą” + dane auta)
- włącza tryb **Online** – aplikacja wysyła jego pozycję GPS, klienci widzą go na mapie
- dostaje listę zleceń dla swojego modelu auta (najbliższe najpierw) i rezerwacji na później; przyjmuje jednym przyciskiem
- prowadzi kurs: „Jestem na miejscu” → „Klient wsiadł – start” → „Zakończ kurs”, nawigacja do klienta / celu (Google Maps / Apple Maps), telefon do klienta
- może zrezygnować z kursu przed jego rozpoczęciem (zlecenie wraca do innych kierowców)
- widzi swoje rezerwacje, historię i zarobek z dnia

**Dyspozytor** – panel WWW `http://<serwer>:5000/admin` (klucz z `ADMIN_API_KEY`):
- lista zamówień z klientem, kierowcą, ceną; może anulować kurs albo odebrać go kierowcy
- lista kierowców: zatwierdzanie nowych, blokowanie, oceny, status online
- **mapa floty na żywo** – gdzie są kierowcy online

### Statusy przejazdu

`Szukamy kierowcy` → `Kierowca przypisany` (rezerwacja na później) → `Kierowca w drodze` → `Kierowca na miejscu` → `W trasie` → `Zakończony` (albo `Anulowany`).

### Kierowcy demo

Poza produkcją serwer uruchamia **8 symulowanych kierowców** jeżdżących po Poznaniu (po 2 na każdy model). Przyjmują zamówienia, których po kilku sekundach nie wziął prawdziwy kierowca, dojeżdżają do klienta i wiozą go do celu – dzięki temu całą aplikację da się przetestować na jednym telefonie. Wyłączasz ich `DEMO_DRIVERS=false`.

## Flota i ceny

W pliku [`shared/fleet.ts`](shared/fleet.ts). Cena = opłata startowa + stawka za km × długość trasy (nie mniej niż minimum):

| Model | Klasa | Miejsca | Opłata startowa | Za km | Minimum |
|---|---|---|---|---|---|
| Tesla Model 3 | Premium | 4 | 15 zł | 4,50 zł | 40 zł |
| Tesla Model Y | Premium SUV | 4 | 18 zł | 5 zł | 50 zł |
| Tesla Model S | Executive | 4 | 25 zł | 7 zł | 80 zł |
| Tesla Model X | Executive XL | 6 | 30 zł | 8 zł | 100 zł |

Tam też są popularne miejsca i domyślny środek mapy (Poznań). Dane kontaktowe biura: [`client/constants/company.ts`](client/constants/company.ts).

## Mapy i trasy

Bez kluczy API, na danych OpenStreetMap:

| Co | Domyślnie | Zmienna |
|---|---|---|
| Kafelki mapy (ciemny styl) | CARTO `dark_all` | `EXPO_PUBLIC_MAP_TILE_URL`, `EXPO_PUBLIC_MAP_ATTRIBUTION` |
| Wyszukiwanie adresów | Nominatim (OSM) | `GEOCODER_URL` |
| Trasa, km i czas | publiczny serwer OSRM | `ROUTER_URL` |

Mapa to Leaflet w WebView (działa w Expo Go). Publiczne serwery OSM są darmowe, ale mają limity – przy większym ruchu ustaw własne instancje albo płatnego dostawcę z tym samym API (np. MapTiler/Stadia dla kafelków). Gdy wyszukiwarka lub routing nie odpowiada, aplikacja dalej działa: trasa jest szacowana w linii prostej × 1,35, a miejsce można wskazać pinezką.

## Uruchomienie

Wymagania: Node.js 20+. PostgreSQL jest opcjonalny w trybie deweloperskim.

```bash
npm install
cp .env.example .env      # uzupełnij wartości
npm run dev               # serwer API (port 5000) + Expo
```

Otwórz **Expo Go** na telefonie (ten sam Wi-Fi co komputer) i zeskanuj kod QR. Adres API ustawia się automatycznie na IP komputera. Zezwól na lokalizację – wtedy odbiór ustawi się sam, a kierowca będzie widoczny na mapie.

Bez `DATABASE_URL` serwer działa na pamięci – konta i przejazdy znikają po restarcie. Z bazą danych:

```bash
npm run db:push           # tworzy / aktualizuje tabele (users, drivers, rides)
```

Jak przetestować oba tryby: załóż konto klienta na jednym urządzeniu (lub w przeglądarce, `w` w terminalu Expo) i konto „Jestem kierowcą” na drugim. Poza produkcją konta kierowców są zatwierdzane automatycznie (`DRIVER_AUTO_APPROVE`).

### Zmienne środowiskowe

| Zmienna | Opis |
|---|---|
| `DATABASE_URL` | PostgreSQL (np. Neon). Wymagana w produkcji. |
| `JWT_SECRET` | Długi losowy ciąg do podpisywania sesji. Wymagany w produkcji. |
| `ADMIN_API_KEY` | Hasło do panelu dyspozytora `/admin`. Bez niego panel jest wyłączony. |
| `EXPO_PUBLIC_API_URL` | Publiczny adres API dla zbudowanej aplikacji, np. `https://api.szofer.pl`. |
| `PORT` | Port serwera (domyślnie 5000). |
| `DEMO_DRIVERS` | `true`/`false` – symulowani kierowcy (domyślnie włączeni poza produkcją). |
| `DEMO_SPEED` | Ile razy szybciej jeżdżą kierowcy demo (domyślnie 3). |
| `DEMO_ACCEPT_DELAY_S` | Po ilu sekundach kierowca demo bierze zlecenie (domyślnie 8). |
| `DRIVER_AUTO_APPROVE` | Nowi kierowcy od razu zatwierdzeni (domyślnie tak poza produkcją; w produkcji zatwierdza dyspozytor). |
| `GEOCODER_URL`, `ROUTER_URL` | Własny Nominatim / OSRM. |
| `EXPO_PUBLIC_MAP_TILE_URL` | Własne kafelki mapy. |

Plik `.env` nie trafia do repozytorium (jest w `.gitignore`).

## Budowanie aplikacji

```bash
npx eas build --platform android   # lub ios
```

Przed buildem ustaw `EXPO_PUBLIC_API_URL` na publiczny adres serwera (HTTPS).

Ograniczenia obecnej wersji: pozycja kierowcy jest wysyłana, gdy aplikacja jest otwarta (śledzenie w tle wymaga własnego builda z `expo-task-manager`); powiadomienia push i płatności online nie są jeszcze podłączone – płatność odbywa się u kierowcy (karta / gotówka).

## Struktura

```
client/     aplikacja React Native (Expo): ekrany klienta, ekrany kierowcy (screens/driver), mapa (components/map)
server/     API Express: logowanie, przejazdy, kierowcy, mapy (geo.ts), pozycje na żywo (dispatch.ts),
            kierowcy demo (simulator.ts), panel dyspozytora
shared/     wspólne: schemat bazy i walidacja (Drizzle + Zod), flota i ceny, geometria
migrations/ migracje bazy danych
```

## API

| Metoda | Ścieżka | Opis |
|---|---|---|
| POST | `/api/auth/register` | rejestracja (z polem `driver` = konto kierowcy) |
| POST | `/api/auth/login` | logowanie |
| GET | `/api/auth/me` | zalogowany użytkownik |
| PUT | `/api/profile` | zmiana danych kontaktowych |
| GET | `/api/geo/search?q=` | wyszukiwanie adresów |
| GET | `/api/geo/reverse?lat=&lng=` | adres dla punktu na mapie |
| GET | `/api/drivers/nearby?lat=&lng=` | wolne auta w pobliżu (anonimowo) |
| POST | `/api/rides/estimate` | trasa, km, czas, ceny i czas dojazdu kierowcy |
| POST | `/api/rides` | nowe zamówienie |
| GET | `/api/rides` | moje przejazdy |
| GET | `/api/rides/:id` | przejazd z kierowcą i jego pozycją na żywo |
| POST | `/api/rides/:id/cancel` | anulowanie |
| POST | `/api/rides/:id/rate` | ocena kierowcy |
| GET | `/api/driver/me` | profil kierowcy, ocena, zarobek dziś |
| POST | `/api/driver/online` | tryb online / offline |
| POST | `/api/driver/location` | pozycja GPS kierowcy |
| GET | `/api/driver/offers` | zlecenia do przyjęcia |
| GET | `/api/driver/rides` | kursy kierowcy |
| POST | `/api/driver/rides/:id/accept` | przyjęcie zlecenia |
| POST | `/api/driver/rides/:id/status` | kolejny etap kursu |
| POST | `/api/driver/rides/:id/release` | rezygnacja z kursu |
| GET | `/api/admin/rides` | wszystkie zamówienia (nagłówek `x-admin-key`) |
| PATCH | `/api/admin/rides/:id` | zmiana statusu przez dyspozytora |
| GET | `/api/admin/drivers` | kierowcy z pozycjami |
| PATCH | `/api/admin/drivers/:id` | zatwierdzenie / blokada kierowcy |
