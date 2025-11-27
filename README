# 🤖 Auto-Berichtsheft-Eintrag (Playwright-Automatisierung)

Dieses Projekt nutzt **Playwright** und **GitHub Actions**, um den wöchentlichen Prozess der Übernahme von Stoffinhalten aus **WebUntis** in das **digitale Berichtsheft der IHK** zu automatisieren.

Das Skript ist darauf ausgelegt, die Inhalte der abgelaufenen Woche (Montag bis Freitag) abzurufen und als gesammelten Text in das IHK-Portal einzutragen.

---

## ⚙️ Funktionsweise des Codes (`run.spec.js`)

Der Kern des Automatisierungsskripts führt eine Abfolge von Schritten durch, um die Daten zuverlässig zu erfassen und zu übermitteln:

1.  **Umgebungsvariablen laden:** Zugangsdaten und Metadaten werden aus den GitHub Secrets geladen.
2.  **Login bei WebUntis:** Das Skript meldet sich an und navigiert zum Stundenplan.
3.  **Stundenplan abrufen:** Es springt **zwei Wochen zurück**, um die Inhalte der abgeschlossenen Woche zu erfassen.
4.  **Inhalte auslesen (Stabilität & Timeout):**
    * Jede einzelne Lektion wird angeklickt.
    * **Timeout-Regel:** Wenn das Auslesen des Inhalts **länger als 10 Sekunden** dauert, wird der Vorgang abgebrochen und das Fach mit **`KEIN INHALT BEI FACH X (Timeout)`** markiert.
    * **Leere Inhalte:** Wenn das Feld erfolgreich ausgelesen wird, aber leer ist, wird **`KEIN INHALT BEI FACH X`** als Platzhalter gesetzt.
5.  **IHK-Login und Eintrag:**
    * Das Skript meldet sich beim IHK-Berichtsheft-Portal an.
    * Es erstellt einen neuen Eintrag und füllt die Felder für **Abteilung** und **Ausbilder-E-Mail**.
    * Die gesammelten Stundenplaninhalte werden in das Inhaltsfeld des Berichtshefts eingetragen und der Eintrag wird gespeichert.

---

## 🔒 GitHub Secrets Konfiguration

Das Skript benötigt **6 Secrets** (Umgebungsvariablen), die in Ihrem GitHub-Repository hinterlegt werden müssen.

### Erforderliche Secrets

| Secret Name | Beschreibung | Code-Variable |
| :--- | :--- | :--- |
| **`UNITSUSER`** | Ihr Benutzername für WebUntis. | `process.env.UNITSUSER` |
| **`UNITSPASS`** | Ihr Passwort für WebUntis. | `process.env.UNITSPASS` |
| **`IHKUSER`** | Ihre Azubinummer für das IHK-Portal. | `process.env.IHKUSER` |
| **`IHKPASS`** | Ihr Passwort für das IHK-Portal. | `process.env.IHKPASS` |
| **`AUSBILDERMAIL`** | Die E-Mail-Adresse Ihres Ausbilders. | `process.env.AUSBILDERMAIL` |
| **`ABTEILUNG`** | Der Arbeitsbereich, der im Berichtsheft eingetragen wird. | `process.env.ABTEILUNG` |

**Pfad zum Hinzufügen der Secrets:**
Gehen Sie in Ihrem GitHub-Repository zu **`Settings`** ➡️ **`Secrets and variables`** ➡️ **`Actions`**.

---

## ⏰ Zeitplan der Automatisierung

Das Programm wird automatisch einmal pro Woche über GitHub Actions ausgeführt.

* **Standard-Laufzeit:** Das Programm läuft standardmäßig **jeden Dienstag**.
* **Anpassung des Zeitpunkts:** Der Zeitpunkt der Ausführung wird in der Konfigurationsdatei der GitHub Action festgelegt. Sie können diese in der `.yml`-Datei im Verzeichnis `.github/workflows/` anpassen (z.B. **`playwright.schedule.yml`**).

**Beispiel für den Cron-Eintrag zur Änderung der Uhrzeit:**

```yaml
on:
  schedule:
    # Die Zahl am Ende (hier 2) steht für den Tag (Sonntag=0, Dienstag=2)
    # Passen Sie die ersten beiden Ziffern für die Uhrzeit (Minuten Stunde) an.
    - cron: '0 6 * * 2' # Läuft jeden Dienstag um 06:00 Uhr UTC