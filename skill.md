# Oggilo Premium Design System & Komponenten-Bibliothek

Dieses Dokument dient als wiederverwendbare Design-Spezifikation (Skill) für die Oggilo-Webseite. Es definiert alle Design-Tokens, Layout-Prinzipien, globalen CSS-Klassen und HTML-Strukturen, um Konsistenz bei zukünftigen Änderungen oder Erweiterungen der Webseite sicherzustellen.

---

## 1. Design-Tokens & CSS-Variablen

Die Webseite nutzt ein minimalistisches, kontrastreiches Farbsystem mit sanften, fließenden Hintergrund-Gradients (Blobs) für Tiefe und Dynamik.

```css
:root {
  /* Graustufen & Kontraste */
  --white: #FFFFFF;
  --off-white: #FFFFFF;
  --grey-100: #F3F4F8;
  --grey-200: #E4E6EE;
  --grey-300: #C8CBDB;
  --grey-400: #9398B0;
  --grey-500: #5C6280;
  --charcoal: #2A2D3E;
  --black: #0A0A0A;
  --pitch: #000000;

  /* Akzentfarbe */
  --accent: #0A0A0A;
  --accent-soft: rgba(10, 10, 10, 0.06);

  /* Hintergrund-Blobs (Gradients) */
  --blob-1: #DDEEFF; /* Cool Blue */
  --blob-2: #E8E0FF; /* Soft Violet */
  --blob-3: #FFEEDD; /* Warm Apricot */
  --blob-4: #D6F0E8; /* Sage Green */

  /* Typografie */
  --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  
  /* Animation-Easing */
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);

  /* Layout-Maße */
  --nav-h: 72px;
  --container: 1200px;
  --gap: clamp(1rem, 3vw, 2rem);
  --radius: 16px;
  --radius-sm: 10px;
}
```

---

## 2. Globale Layout-Elemente

### Container und Sektionen
Inhaltliche Bereiche werden in `.section` unterteilt und zentriert.

```html
<section class="section">
  <div class="container">
    <!-- Inhalt hier -->
  </div>
</section>
```

### Typografie-Hierarchie
Schriftgrößen nutzen `clamp()` für automatisches responsive Skalieren.

```html
<!-- Eyebrow (Über-Überschrift) -->
<p class="section-eyebrow">Web · Automatisierung · KI</p>

<!-- Hauptüberschrift (Sektion) -->
<h2 class="section-title">Unsere Leistungen</h2>

<!-- Subpage-Hero-Überschriften -->
<h1 class="page-hero-title">Projekte</h1>
<p class="page-hero-sub">Ein Auszug unserer Arbeiten — von Web-Apps bis KI.</p>
```

---

## 3. Interaktive Elemente (Buttons)

Buttons haben eine stark gerundete Kapsel-Form (Ausnahme: Navigation) und weiche Übergänge.

### HTML-Strukturen

```html
<!-- Primärer Button (Schwarz) -->
<a href="#/termin" class="btn btn-primary">Projekt starten</a>

<!-- Ghost Button (Transparent mit Rahmen) -->
<a href="#/leistungen" class="btn btn-ghost">Mehr erfahren</a>

<!-- Navigations-Button (Eckig, kompakter) -->
<a href="#/termin" class="btn btn-nav">Kontakt</a>

<!-- Volle Breite (w-100) -->
<button class="btn btn-primary btn-full">Absenden</button>
```

---

## 4. Header & Navigation

Die Navigationsleiste teilt sich auf Desktop in 3 Säulen auf (Links linksbündig, Logo absolut zentriert, Aktionen rechtsbündig).

### HTML-Struktur
```html
<nav id="navbar" class="navbar">
  <div class="nav-inner">
    <!-- 1. Links (Links) -->
    <ul class="nav-links" id="navLinks">
      <li><a href="#/leistungen" class="active">Leistungen</a></li>
      <li><a href="#/projekte">Projekte</a></li>
      <li><a href="#/#referenzen">Referenzen</a></li>
      <li><a href="#/termin">Termin buchen</a></li>
    </ul>
    
    <!-- 2. Logo (Mitte, absolut zentriert) -->
    <a href="#/" class="logo" aria-label="Oggilo Home">
      <img src="/global/oggilo-schriftlogo.png" alt="Oggilo Logo" class="logo-img" />
    </a>
    
    <!-- 3. Aktionen (Rechts) -->
    <div class="nav-actions">
      <button id="langToggle" class="lang-toggle" aria-label="Sprache wechseln">
        <span class="lang-label" id="langLabel">DE</span>
      </button>
      <a href="#/termin" class="btn btn-nav">Kontakt</a>
      <!-- Hamburger für Mobile -->
      <button class="hamburger" id="hamburger" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</nav>

<!-- Mobile Menu Overlay -->
<div class="mobile-menu" id="mobileMenu">
  <ul>
    <li><a href="#/">Startseite</a></li>
    <li><a href="#/leistungen">Leistungen</a></li>
    <li><a href="#/projekte">Projekte</a></li>
    <li><a href="#/#referenzen">Referenzen</a></li>
    <li><a href="#/termin">Termin buchen</a></li>
  </ul>
</div>
```

---

## 5. Hero-Sektion (Startseite)

Kombiniert einen Canvas-Hintergrund (Three.js Partikel) mit schwebenden Farb-Blobs (`.hero-blob-warm`) und einem subtilen SVG-Noise-Overlay für hochwertige Texturierung.

### HTML-Struktur
```html
<section id="hero" class="hero">
  <!-- Schwebende Blobs im Hintergrund -->
  <div class="hero-bg">
    <span class="hero-blob-warm"></span>
    <span class="hero-blob-warm"></span>
  </div>
  
  <!-- Interaktive Partikel-Ebene -->
  <canvas id="heroCanvas"></canvas>
  
  <div class="hero-content">
    <p class="hero-eyebrow">Web · Automatisierung · KI</p>
    <h1 class="hero-title">Wir gestalten<br/>digitale Zukunft.</h1>
    <p class="hero-sub">Oggilo verbindet Design, Technologie und künstliche Intelligenz zu Lösungen, die Ihr Unternehmen transformieren.</p>
    <div class="hero-ctas">
      <a href="#/termin" class="btn btn-primary">Projekt starten</a>
      <a href="#/leistungen" class="btn btn-ghost">Mehr erfahren</a>
    </div>
  </div>
  
  <!-- Scroll-Indikator unten -->
  <div class="scroll-hint" id="scrollHint">
    <span>Scrollen</span>
    <div class="scroll-line"></div>
  </div>
</section>
```

---

## 6. Services Grid (Volle Breite)

Raster-Layout auf der Startseite mit quadratischen Bildern, die bei Hover einen minimalen Zoom-Effekt ausführen.

### HTML-Struktur
```html
<section class="home-services-full">
  <div class="services-full-wrapper">
    <!-- Einzelne Service Karte -->
    <a href="#/leistungen" class="service-full-item" data-reveal>
      <div class="service-full-img">
        <img src="/home/web_app_entwicklung.png" alt="Web Design & Entwicklung">
      </div>
      <div class="service-full-text">
        <h3>Web Design & Entwicklung</h3>
        <p>Maßgeschneiderte Websites und Web-Apps — schnell, responsiv und visuell beeindruckend.</p>
        <span class="service-more">Mehr erfahren →</span>
      </div>
    </a>
    
    <!-- Weitere Karten analog hinzufügen -->
  </div>
</section>
```

---

## 7. Alternierende Detail-Sektionen (`.service-detail`)

Wird für detaillierte Leistungsbeschreibungen verwendet. Desktop-Ansicht zeigt ein 2-Spalten-Layout (Text links, Bild rechts), das sich bei der Klasse `.reverse` abwechselt.

> [!NOTE]
> Das Wechseln der Spalten wird elegant über `direction: rtl` auf `.service-detail.reverse` gesteuert. Kinder müssen `.service-detail.reverse > * { direction: ltr; }` zurücksetzen.

### HTML-Struktur
```html
<div class="service-detail" data-reveal>
  <div class="service-detail-text">
    <div class="service-detail-num">01</div>
    <h2>Web Design & Entwicklung</h2>
    <p>Maßgeschneiderte Websites und Web-Apps, die Ihre Marke zum Leben erwecken.</p>
    <ul class="service-features">
      <li>Responsive Websites & Landingpages</li>
      <li>Web-Applikationen & Dashboards</li>
      <li>E-Commerce & Online-Shops</li>
    </ul>
    <a href="#/termin" class="btn btn-primary">Projekt besprechen</a>
  </div>
  <div class="service-detail-visual">
    <img src="/home/web_app_entwicklung.png" alt="Web Design" style="width: 100%; height: 100%; object-fit: cover;">
  </div>
</div>

<!-- Alternierende Sektion (Bild links, Text rechts) -->
<div class="service-detail reverse" data-reveal>
  <div class="service-detail-text">
    <div class="service-detail-num">02</div>
    <h2>Automatisierung</h2>
    <p>Wir automatisieren Ihre Geschäftsprozesse für maximale Effizienz.</p>
    <ul class="service-features">
      <li>Workflow-Automatisierung</li>
      <li>API-Integrationen</li>
    </ul>
    <a href="#/termin" class="btn btn-primary">Projekt besprechen</a>
  </div>
  <div class="service-detail-visual">
    <img src="/home/automatisierungen.png" alt="Automatisierung" style="width: 100%; height: 100%; object-fit: cover;">
  </div>
</div>
```

---

## 8. Portfolio-Karten (`.portfolio-card-full`)

Alternierende, großformatige Portfolio-Karten mit technologischen Tags und einer transparenten Glassmorphismus-Kategorieplakette.

### HTML-Struktur
```html
<div class="portfolio-card-full" data-reveal>
  <div class="portfolio-img-full" style="background: url('/portfolio/wohingehtsheute_darstellung.png') center/cover no-repeat;">
    <span class="portfolio-label">Web App</span>
  </div>
  <div class="portfolio-card-body">
    <h2>wohingehtsheute.de</h2>
    <p>Eine intelligente Web-App für das Finden eines passenden Restaurants in der Nähe.</p>
    <div class="portfolio-tags">
      <span>Next.js</span>
      <span>React</span>
      <span>TailwindCSS</span>
      <span>Geodaten</span>
    </div>
    <a href="https://wohingehtsheute.de" target="_blank" rel="noopener noreferrer" class="portfolio-link">Zur Webseite →</a>
  </div>
</div>
```

---

## 9. Marquee Testimonials (Kundenstimmen-Laufband)

Endlos scrollendes Band mit echten Kundenbewertungen. Stoppt automatisch bei Mouse-Hover (`mouseenter`).

### HTML-Struktur
```html
<section id="referenzen" class="section home-testimonials">
  <div class="container">
    <p class="section-eyebrow">Was Kunden sagen</p>
    <h2 class="section-title">Referenzen</h2>
  </div>
  <div class="marquee-wrapper">
    <div class="marquee-track" id="marqueeTrack">
      
      <!-- Einzelne Bewertung -->
      <div class="marquee-card">
        <div class="testimonial-stars">★★★★★</div>
        <p>"Oggilo hat unsere Infrastruktur auf ein neues Level gehoben. Sehr professionell."</p>
        <div class="testimonial-author">
          <div class="testimonial-avatar">MK</div>
          <div>
            <strong>Marco Klein</strong>
            <span>CEO, FinVault GmbH</span>
          </div>
        </div>
      </div>
      
      <!-- WICHTIG: Duplikate für nahtloses Loop-Endlos-Scrolling anhängen -->
      
    </div>
  </div>
</section>
```

---

## 10. Split Call-to-Action (Premium Split-Design)

Dieses Sektionsdesign ist an High-End-Automobilmarken (z.B. Ferrari Purosangue) angelehnt. Ein asymmetrisches Split-Layout mit starkem typografischen Kontrast auf der linken und fokussierter Bildsprache auf der rechten Seite.

### HTML-Struktur
```html
<section class="home-split-cta">
  <div class="split-cta-left">
    <div class="split-cta-nav prev">‹</div>
    <div class="split-cta-content">
      <h2>BEREIT FÜR IHR NÄCHSTES PROJEKT?</h2>
      <p>Vereinbaren Sie ein kostenloses Erstgespräch und lassen Sie uns Ihre Vision umsetzen.</p>
      <a href="#/termin" class="split-cta-link">
        <span>MEHR LESEN</span>
        <div class="arrow-circle">›</div>
      </a>
    </div>
  </div>
  <div class="split-cta-right">
    <img src="/home/minimalistic_car.png" alt="Oggilo Vision">
    <div class="split-cta-nav next">›</div>
  </div>
</section>
```

---

## 11. Spontan-Banner

Ein Premium-Zusatzbanner mit pulsierendem Live-Statusindikator für alternative/spontane Kontaktaufnahme.

### HTML-Struktur
```html
<div class="spontan-banner">
  <div class="spontan-pulse"></div>
  <div class="spontan-text">
    <strong>Lieber direkt sprechen?</strong>
    <span>Ich bin gerade erreichbar. Ruf mich an oder schreibe mir auf LinkedIn.</span>
  </div>
  <div class="spontan-actions">
    <a href="tel:+4915784441906" class="btn-spontan btn-spontan--call">
      <svg>...</svg> Anrufen
    </a>
    <a href="https://linkedin.com/in/..." target="_blank" class="btn-spontan btn-spontan--linkedin">
      <svg>...</svg> LinkedIn
    </a>
  </div>
</div>
```

---

## 12. Interaktiver Booking Wizard (`.bk-progress`)

Ein geführter, schrittweiser Buchungs-Prozess.

### HTML-Struktur
```html
<!-- Schritt-Anzeige (Progress Tracker) -->
<div class="bk-progress">
  <div class="bk-prog-step active">
    <div class="bk-prog-dot">1</div>
    <span>Gesprächsart</span>
  </div>
  <div class="bk-prog-line"></div>
  <div class="bk-prog-step">
    <div class="bk-prog-dot">2</div>
    <span>Datum & Zeit</span>
  </div>
  <div class="bk-prog-line"></div>
  <div class="bk-prog-step">
    <div class="bk-prog-dot">3</div>
    <span>Details</span>
  </div>
</div>

<!-- Panels (Ein- und Ausblenden über Klasse '.active') -->
<div class="bk-panel active" id="step1">
  <h2 class="bk-step-title">Wählen Sie eine Gesprächsart</h2>
  <div class="meeting-type-grid">
    <div class="mt-card selected" data-value="video">
      <div class="mt-icon">
        <!-- SVG Video -->
      </div>
      <strong>Video-Call (Google Meet)</strong>
      <span>30 Min · Schnell & flexibel</span>
    </div>
    <div class="mt-card" data-value="phone">
      <div class="mt-icon">
        <!-- SVG Telefon -->
      </div>
      <strong>Telefonat</strong>
      <span>15 Min · Kurze Absprache</span>
    </div>
  </div>
</div>
```

### Formulargruppen & Input-Stile
Eingaben verwenden weiche Ränder, die bei Fokus in ein sattes Schwarz übergehen. Fehlerhafte Eingaben erhalten kurzzeitig die Animationsklasse `.shake` für visuelles Feedback.

```html
<div class="form-group">
  <label for="name">Name *</label>
  <input type="text" id="name" required placeholder="Ihr Name">
</div>
```

---

## 13. Chat-Widget (Susanne Assistentin)

Das im rechten unteren Bildrand fixierte Widget bietet einen ausklappbaren, skalierbaren KI-Assistenten im modernen Oggilo-Design.

### HTML-Struktur
```html
<div id="chat-widget" class="chat-widget">
  
  <!-- Chat Fenster (Einblenden über '.open') -->
  <div id="chat-window" class="chat-window">
    <!-- Resize Handles -->
    <div id="chat-resizer-tl" class="chat-resizer chat-resizer-tl"></div>
    <div id="chat-resizer-t" class="chat-resizer chat-resizer-t"></div>
    <div id="chat-resizer-l" class="chat-resizer chat-resizer-l"></div>
    
    <!-- Header -->
    <div class="chat-header">
      <div class="chat-agent-info">
        <div class="chat-avatar"><img src="/home/roboterkopf.png" alt="Susanne"></div>
        <div class="chat-title">
          <h4>Susanne</h4>
          <span>KI-Assistentin</span>
        </div>
      </div>
      <button id="chat-close" class="chat-close">&times;</button>
    </div>
    
    <!-- Nachrichten -->
    <div id="chat-messages" class="chat-messages">
      <div class="chat-message bot">Hallo! Wie kann ich dir helfen?</div>
      <div class="chat-message user">Ich würde gerne ein Projekt anfragen.</div>
    </div>
    
    <!-- Eingabebereich -->
    <div class="chat-input-area">
      <input type="text" id="chat-input" placeholder="Schreibe eine Nachricht...">
      <button id="chat-send">
        <svg viewBox="0 0 24 24">...</svg>
      </button>
    </div>
  </div>
  
  <!-- Chat Button (Immer sichtbar) -->
  <button id="chat-toggle" class="chat-toggle">
    <img src="/home/roboterkopf.png" alt="Chat öffnen" class="chat-toggle-img">
  </button>
</div>
```

---

## 14. Animationen & Verhaltens-Richtlinien

### 1. Scroll-Animationen
Alle Elemente, die mit dem Attribut `[data-reveal]` versehen sind, werden über einen `IntersectionObserver` in JavaScript mit der CSS-Klasse `.revealed` belegt, wodurch sie weich von unten einblenden.

### 2. Hintergrund-Blobs (`@keyframes`)
Die schwebenden Farbbälle im Hero-Bereich bewegen sich asynchron und verändern ihre Skalierung über vordefinierte Keyframes:
*   `blobFloat1`: Cool Blue (14s)
*   `blobFloat2`: Soft Violet (18s)
*   `blobFloat3`: Warm Apricot (20s)
*   `blobFloat4`: Sage Green (16s)

### 3. Puls-Indikatoren (`@keyframes pulse`)
Verwendet für den Live-Indikator des Spontan-Banners und der AI-Karten:
```css
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}
```

---

## 15. Responsive Richtlinien & Mobil-Verhalten

*   **Grid Layouts**: Services, Portfolio und Testimonials brechen ab `<= 1024px` auf 2 Spalten auf, ab `<= 768px` auf eine Spalte.
*   **Header**: Navigations-Links und Kontakt-Buttons werden ab `<= 768px` versteckt. Das Hamburger-Symbol wird sichtbar.
*   **Split-Design**: Die Sektion `.home-split-cta` bricht ab `<= 900px` auf `flex-direction: column-reverse` um, sodass das fokussierte Bild über dem Text liegt.
*   **Formular-Aktionen**: Aktionsbuttons (`.step-actions`) brechen ab `<= 600px` auf `flex-direction: column-reverse` um (mit 100% Breite für Mobile).
