import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { TabBar } from '@/components/tab-bar';

export const metadata: Metadata = {
  title: 'Berichtsheft',
  description: 'Dein IHK-Berichtsheft – automatisiert, überall dabei.',
  applicationName: 'Berichtsheft',
  appleWebApp: {
    // 'default' respektiert die Systemfarbe (statt erzwungenem Schwarz),
    // damit die Statusleiste im hellen Modus nicht falsch wirkt.
    capable: true,
    statusBarStyle: 'default',
    title: 'Berichtsheft',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2F2F7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <Providers>
          {children}
          <TabBar />
        </Providers>
      </body>
    </html>
  );
}
