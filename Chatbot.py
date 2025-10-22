# Installiere die Bibliotheken, falls noch nicht geschehen:
# pip install google-genai python-dotenv

import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

# 1. Umgebungsvariablen aus der .env-Datei laden
load_dotenv()

# 2. Den API-Schlüssel mit dem korrekten Namen abrufen
API_KEY = os.getenv("GEMINI_API")

if not API_KEY:
    # Füge eine klare Fehlermeldung hinzu, falls der Schlüssel fehlt
    print("❌ FEHLER: Der API-Schlüssel 'GEMINI_API' konnte nicht aus den Umgebungsvariablen geladen werden.")
    print("Stelle sicher, dass er in deiner .env-Datei als GEMINI_API=DEIN_SCHLÜSSEL eingetragen ist.")
    exit()

# 3. Initialisiere den Gemini Client mit dem geladenen Schlüssel
try:
    # Übergib den API-Schlüssel explizit an den Client
    client = genai.Client(api_key=API_KEY)
except Exception as e:
    print("Fehler beim Initialisieren des Gemini Clients.")
    print(f"Details: {e}")
    exit()

# 📝 Systemanweisung: Definiert die Rolle und das gewünschte Ausgabeformat des Chatbots
# Dies ist der SCHLÜSSEL zur Steuerung der Ausgabe für dein Berichtsheft.
system_prompt_berichtsheft = (
    "Du bist ein assistierender Textexperte, der alle empfangenen Notizen "
    "in ein professionelles IHK-Berichtsheft-Format umwandelt. "
    "Das Format muss immer eine Überschrift, eine Kategorie/Thema, eine genaue Zeitangabe "
    "und eine detaillierte, strukturierte Beschreibung der Tätigkeit enthalten. "
    "Verwende das folgende Markdown-Format: \n\n"
    "**Tätigkeit:** [Kurze, prägnante Überschrift, z.B. 'Einrichtung einer Testumgebung']\n"
    "**Kategorie:** [z.B. IT-Systeme, Programmierung, Verwaltung, Projektmanagement]\n"
    "**Zeit (Stunden):** 8\n"
    "**Beschreibung:**\n"
    "* [Detaillierte Aufzählung des Vorgehens, z.B. 'Analyse der Anforderungen']\n"
    "* [Detaillierte Aufzählung des Vorgehens, z.B. 'Implementierung der Lösung']\n"
    "* [Detaillierte Aufzählung des Vorgehens, z.B. 'Durchführung von Tests']\n"
    "\nDeine Antwort MUSS nur die formatierte Ausgabe enthalten."
)

# 🚀 Initialisierung der Chat-Sitzung
# Wir nutzen ein fortgeschrittenes Modell für besseres Formatierungs- und Folgeverständnis
chat = client.chats.create(
    model="gemini-2.5-flash", 
    # Verwende 'config' und setze die Systemanweisung darin:
    config=types.GenerateContentConfig(
        system_instruction=system_prompt_berichtsheft
    )
)

print("✅ Chatbot für IHK-Berichtsheft ist bereit. Gib deine Tagesnotiz ein oder 'exit' zum Beenden.")
print("------------------------------------------------------------------------------------")

while True:
    # 1. Nutzereingabe
    user_input = input("Deine Tagesnotiz (oder 'exit'):\n> ")
    
    if user_input.lower() == 'exit':
        print("Programm beendet.")
        break

    # 2. Nachricht an Gemini senden
    print("\n⏳ Sende Notiz an Gemini...")
    try:
        response = chat.send_message(user_input)
        
        # 3. Strukturierte Antwort ausgeben
        print("\n**=== Strukturierter Berichtsheft-Eintrag ===**")
        print(response.text)
        print("**========================================**\n")
        
    except Exception as e:
        print(f"Ein Fehler ist aufgetreten: {e}")
        break