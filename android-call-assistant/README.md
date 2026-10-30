# KGF Asystent rozmów (Android)

Aplikacja dla dyspozytora. Gdy odbierzesz połączenie przychodzące, nad ekranem rozmowy pojawia się panel:

- **Skrypt krok po kroku** – co powiedzieć klientowi: powitanie, skąd, dokąd, kiedy, ile osób, który model Tesli (z ceną), płatność, kontakt, uwagi, potwierdzenie, pożegnanie. Pod każdym krokiem jest pole na odpowiedź klienta.
- **Kto dzwoni** – jeśli numer jest w bazie KGF, panel pokazuje imię klienta, liczbę przejazdów i ostatnią trasę (przycisk „Ta sama trasa”).
- **Pytania klientów** – gotowe odpowiedzi: cena, flota, czas oczekiwania, płatność, lotnisko, fotelik, odwołanie.
- **Zapisz zamówienie** – zamówienie trafia do systemu KGF (panel `/admin`, oznaczone ☎). Bez ustawionego serwera podsumowanie jest kopiowane do schowka.

Panel można przesunąć (przeciągnij nagłówek), zwinąć („—”) i zamknąć („✕”). Po rozłączeniu zostaje na ekranie, żeby dokończyć zamówienie.

## Instalacja

1. Skopiuj plik `KGF-Asystent.apk` na telefon i otwórz go. Zezwól na instalację z tego źródła.
2. Otwórz **KGF Asystent** i nadaj uprawnienia: *Telefon i rejestr połączeń*, *Wyświetlanie nad innymi aplikacjami*, opcjonalnie *Powiadomienia*.
3. Wpisz adres serwera KGF (np. `https://kgf.twoja-domena.pl`) i klucz dyspozytora (`ADMIN_API_KEY` z serwera), potem „Sprawdź połączenie”.
4. „Pokaż podgląd skryptu” – panel pojawi się bez dzwonienia.

Wymagany Android 8.0 lub nowszy. Na Xiaomi, Huawei i Oppo włącz też autostart i działanie w tle dla aplikacji.

Podczas rozmowy używaj głośnika lub słuchawek – przy telefonie przy uchu ekran się wygasza.

## Ograniczenia

- Android nie daje aplikacjom dostępu do dźwięku rozmowy, więc asystent nie „słucha” klienta – prowadzi Cię skryptem.
- Działa dla połączeń przychodzących. Połączenia wychodzące są pomijane.
- Teksty skryptu i odpowiedzi są w `app/src/main/java/pl/kgfpremium/callassistant/CallOverlay.kt` (kroki) i `Model.kt` (`Faq`, cennik `Fleet` – trzymaj go w zgodzie z `shared/fleet.ts`).

## Budowanie

Wymaga JDK 17+ i Android SDK (platforma 34).

```bash
cd android-call-assistant
echo "sdk.dir=/ścieżka/do/android-sdk" > local.properties
./gradlew assembleDebug        # APK: app/build/outputs/apk/debug/app-debug.apk
./gradlew testDebugUnitTest    # testy logiki i przejście całego skryptu w Robolectric
```

APK jest podpisany kluczem debug. Do publikacji w Google Play trzeba wygenerować własny klucz i zbudować `assembleRelease`.

## Serwer

Aplikacja korzysta z dwóch endpointów serwera KGF (nagłówek `x-admin-key`):

| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/api/admin/customer?phone=+48…` | kto dzwoni: imię, konto, ostatnie przejazdy |
| POST | `/api/admin/rides` | zamówienie przyjęte telefonicznie |

Na bazie danych uruchom `npm run db:push` (migracja `0003_phone_orders`).
