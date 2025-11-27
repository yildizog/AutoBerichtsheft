# 🤖 Auto-Berichtsheft-Automatisierung

Dieses Projekt automatisiert den wöchentlichen Prozess der Übernahme von Stoffinhalten aus **WebUntis** in das **digitale Berichtsheft der IHK** mithilfe von **Playwright**.

---

## 🚀 Lokale Installation und Ausführung

### 1. Abhängigkeiten herunterladen

Installieren Sie alle notwendigen Pakete (Dependencies) im Projektverzeichnis:

```bash
npm install
```

---

### 2.Konfiguration der Zugangsdaten
Erstellen Sie im Stammverzeichnis des Projekts eine Datei mit dem Namen .env und tragen Sie dort die folgenden Zugangsdaten ein:
```bash
# WebUntis Zugangsdaten
UNITSUSER="Ihr_WebUntis_Benutzername"
UNITSPASS="Ihr_WebUntis_Passwort"

# IHK Portal Zugangsdaten
IHKUSER="Ihre_Azubinummer"
IHKPASS="Ihr_IHK_Passwort"

# Metadaten für den Berichtshefteintrag
AUSBILDERMAIL="ausbilder@firma.de"
ABTEILUNG="Name der aktuellen Abteilung"
```
---

### 3. Test starten
Nachdem die .env-Datei erstellt und die Abhängigkeiten installiert wurden, können Sie den Testlauf starten:

| Aktion | Befehl 
| :--- | :--- |
| Normaler Testlauf | npx playwright test |
| Debug-Modus | npx playwright test --debug |