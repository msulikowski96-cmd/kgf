# KGF Premium – przejazdy premium Teslą

Aplikacja mobilna (iOS / Android) do zamawiania przejazdów premium Teslą w Poznaniu i okolicach.

## Co potrafi aplikacja

**Klient**
- zakłada konto: imię, nazwisko, telefon, e-mail, hasło (numer bez kierunkowego traktujemy jako polski, +48)
- zamawia przejazd: miejsce odbioru, cel, „teraz” lub zaplanowany termin (dzień + godzina co 15 min, do 7 dni naprzód), model Tesli, liczba pasażerów, uwagi dla kierowcy, osoba i telefon kontaktowy, płatność (karta u kierowcy / gotówka)
- widzi swoje przejazdy i ich status (odświeżany automatycznie), może anulować przejazd, dopóki nie wystartował
- edytuje dane kontaktowe w profilu, dzwoni / pisze do firmy

**Flota i ceny** – w pliku [`shared/fleet.ts`](shared/fleet.ts):

| Model | Klasa | Miejsca | Opłata startowa | Za km | Minimum |
|---|---|---|---|---|---|
| Tesla Model 3 | Premium | 4 | 15 zł | 4,50 zł | 40 zł |
| Tesla Model Y | Premium SUV | 4 | 18 zł | 5 zł | 50 zł |
| Tesla Model S | Executive | 4 | 25 zł | 7 zł | 80 zł |
| Tesla Model X | Executive XL | 6 | 30 zł | 8 zł | 100 zł |

Ceny są przykładowe – zmień je w `shared/fleet.ts`. Aplikacja nie liczy trasy (brak map), więc pokazuje cennik, a dokładną cenę podaje dyspozytor.

**Dyspozytor** – panel WWW pod adresem `http://<serwer>:5000/admin`. Logowanie kluczem z `ADMIN_API_KEY`. Widać w nim zamówienia z danymi kontaktowymi klienta; dyspozytor zmienia status: Oczekuje → Potwierdzony → W trakcie → Zakończony (lub Anulowany). Klient widzi zmianę w aplikacji.

Dane kontaktowe firmy (telefon, Instagram) są w [`client/constants/company.ts`](client/constants/company.ts).

## Uruchomienie

Wymagania: Node.js 20+. PostgreSQL jest opcjonalny w trybie deweloperskim.

```bash
npm install
cp .env.example .env      # uzupełnij wartości
npm run dev               # serwer API (port 5000) + Expo
```

Otwórz aplikację **Expo Go** na telefonie (ten sam Wi-Fi co komputer) i zeskanuj kod QR z terminala. Adres API jest ustawiany automatycznie na IP komputera.

Bez `DATABASE_URL` serwer działa na pamięci – konta i przejazdy znikają po restarcie. Z bazą danych:

```bash
npm run db:push           # tworzy / aktualizuje tabele users i rides
```

### Zmienne środowiskowe

| Zmienna | Opis |
|---|---|
| `DATABASE_URL` | PostgreSQL (np. Neon). Wymagana w produkcji. |
| `JWT_SECRET` | Długi losowy ciąg do podpisywania sesji. Wymagany w produkcji. |
| `ADMIN_API_KEY` | Hasło do panelu dyspozytora `/admin`. Bez niego panel jest wyłączony. |
| `EXPO_PUBLIC_API_URL` | Publiczny adres API dla zbudowanej aplikacji, np. `https://api.kgf-taxi.pl`. |
| `PORT` | Port serwera (domyślnie 5000). |

Plik `.env` nie trafia do repozytorium (jest w `.gitignore`).

## Budowanie aplikacji

```bash
npx eas build --platform android   # lub ios
```

Przed buildem ustaw `EXPO_PUBLIC_API_URL` na publiczny adres serwera (HTTPS).

## Struktura

```
client/     aplikacja React Native (Expo): ekrany, komponenty, nawigacja
server/     API Express: logowanie, profil, przejazdy, panel dyspozytora
shared/     wspólne: schemat bazy i walidacja (Drizzle + Zod), flota, telefony
migrations/ migracje bazy danych
```

## API

| Metoda | Ścieżka | Opis |
|---|---|---|
| POST | `/api/auth/register` | rejestracja |
| POST | `/api/auth/login` | logowanie |
| GET | `/api/auth/me` | zalogowany użytkownik |
| PUT | `/api/profile` | zmiana danych kontaktowych |
| POST | `/api/rides` | nowe zamówienie |
| GET | `/api/rides` | moje przejazdy |
| GET | `/api/rides/:id` | szczegóły przejazdu |
| POST | `/api/rides/:id/cancel` | anulowanie |
| GET | `/api/admin/rides` | wszystkie zamówienia (nagłówek `x-admin-key`) |
| PATCH | `/api/admin/rides/:id` | zmiana statusu (nagłówek `x-admin-key`) |
