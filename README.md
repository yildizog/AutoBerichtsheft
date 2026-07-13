# 🤖 Auto-Berichtsheft

**Die intelligente Automatisierung für dein IHK-Berichtsheft.**

Dieses Tool automatisiert den lästigen Prozess der Berichtsheftpflege. Es zieht sich die Unterrichtsinhalte direkt aus WebUntis und trägt sie automatisch in das digitale Berichtsheft der IHK (TIBROS) ein.

---

## ✨ Features

Die Anwendung bietet eine vollständige End-to-End Automatisierung:

### 1. WebUntis Integration (Scraping)
- **Automatische Anmeldung**: Loggt sich sicher in deinen WebUntis-Account ein.
- **Intelligente Extraktion**: Liest die Lehrstoffe der vergangenen Woche aus.
- **Fach-Filter**: Erkennt spezifische Fächer (z.B. Deutsch, Englisch, EVP, STDM) anhand von Namen oder Regex-Mustern.
- **High Performance**: Blockiert unnötige Ressourcen (Bilder, Tracker) für maximalen Speed.

### 2. IHK Portal Automatisierung (Upload)
- **Auto-Login**: Meldet sich im IHK TIBROS Portal an.
- **Formular-Ausfüllung**: Trägt die gescrapten Inhalte an den richtigen Tagen (Montag/Freitag Blockunterricht) ein.
- **Betriebliche Tätigkeiten**: Kann auch betriebliche Tätigkeiten ausfüllen (konfigurierbar).
- **Krankheits-Handling**: Markiert Tage automatisch als "Krank", wenn gewünscht.

### 3. Smart Formatting & Status
- **Intelligente Formatierung**: Bereitet die Texte leserlich für das Textfeld auf.
- **Firebase Sync**: Sendet Live-Updates über den Status (Running, Success, Failed) an eine Firebase Realtime Database (für optionale Frontends/Apps).
- **Fehler-Erkennung**: Macht Screenshots bei Fehlern (`error_debug.png`) zur einfachen Analyse.

### 4. Web-Dashboard (`/web`)
- **Natives iOS-Design**: Bedienbares Dashboard im Look von iOS (große Titel, Tab-Bar, Grouped Lists), installierbar über "Zum Home-Bildschirm hinzufügen".
- **Gedacht für Vercel-Hosting**: Alle Zugangsdaten (GitHub, Gemini, Firebase, E-Mail) liegen ausschließlich serverseitig als Environment Variables – nichts landet im Browser.
- **Passwortgeschützt**, damit die App öffentlich gehostet werden kann.
- **Wochen-Digest-Mail**: optionale wöchentliche Zusammenfassung, ergänzt den bestehenden Alarm bei fehlenden Berichten.
- Details & Deployment-Anleitung: [`web/README.md`](web/README.md). Das alte GitHub-Pages-Frontend unter `docs/` ist abgelöst.

---

## 🛠️ Einrichtung & Installation

### Voraussetzungen
- [Node.js](https://nodejs.org/) (Version 16 oder höher)
- Ein WebUntis-Account
- Ein IHK-Azubi-Account

### 1. Repository klonen & installieren
Lade das Projekt herunter und installiere die Abhängigkeiten:

```bash
git clone <repo-url>
cd AutoBerichtsheft
npm install
npx playwright install
```

### 2. Umgebungsvariablen konfigurieren (.env)
Erstelle eine Datei namens `.env` im Hauptverzeichnis. Diese Datei beinhaltet deine sensiblen Zugangsdaten und darf **nicht** geteilt werden.

**Kopiere diesen Inhalt in deine `.env`:**

```env
# --- WebUntis Zugangsdaten ---
UNITSUSER="Dein_Untis_Nutzername"
UNITSPASS="Dein_Untis_Passwort"
# Optional: Zieldatum festlegen (YYYY-MM-DD). Wenn leer, wird automatisch die letzte Woche genommen.
# TARGET_DATE="2023-10-20"

# --- IHK Portal Zugangsdaten ---
IHKUSER="Deine_Azubi_Nummer"
IHKPASS="Dein_IHK_Passwort"

# --- Berichtsheft Details ---
ABTEILUNG="IT-Abteilung"
AUSBILDERMAIL="ausbilder@beispiel.de"

# --- Optional: Firebase Integration (für Status-Updates) ---
# FIREBASE_URL="https://dein-projekt.firebaseio.com"
# FIREBASE_SECRET="dein-secret-token"
# REPORT_ID="report_123"

# --- Optional: Input Steuerung ---
# JSON Format für manuelle Eingriffe oder Krankmeldungen
# INPUT_TEXT='{"sickDays": {"montag": true, "freitag": false}}'
```

---

## ▶️ Nutzung

### Testlauf starten
Um den gesamten Prozess (Scrape + Upload) zu starten:

```bash
npx playwright test
```

### Debugging-Modus
Wenn du sehen möchtest, was der Browser macht (mit sichtbarem Fenster):

```bash
npx playwright test --debug
```

### Nur bestimmte Tests ausführen
Das Projekt ist in zwei Teile gegliedert (`scrape.spec.ts` und `upload.spec.ts`). Du kannst sie auch einzeln ansprechen, wenn du z.B. nur das Scraping testen willst.

---

## 📁 Projektstruktur

- `tests/scrape.spec.ts`: Logik für WebUntis Login und Datenextraktion.
- `tests/upload.spec.ts`: Logik für IHK Login und Eintragung.
- `tests/check_missing_reports.spec.ts`: Prüft auf fehlende Berichte und verschickt bei Bedarf eine Alarm-Mail.
- `playwright.config.ts`: Konfiguration für Browser, Timeouts und Retries.
- `web/`: Next.js Web-Dashboard im iOS-Design (Deployment via Vercel), siehe [`web/README.md`](web/README.md).
- `docs/`: Alte GitHub-Pages-Seite, mittlerweile nur noch ein Hinweis-Redirect zum neuen Dashboard.

---

> **Hinweis**: Die Nutzung erfolgt auf eigene Gefahr. Überprüfe die eingetragenen Daten immer im IHK Portal, bevor du den Bericht endgültig absendest!
