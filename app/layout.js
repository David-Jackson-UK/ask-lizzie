import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "Ask Lizzie | Your life admin assistant",
  description: "Lizzie protects your time, your money and your peace of mind.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
  themeColor: "#1A1A1A",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ask Lizzie",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Ask Lizzie" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

        {/*
          ─── PRIVACY-FIRST ANALYTICS ────────────────────────────────────
          GA4 is NOT loaded on page load. Instead we bootstrap Google Consent
          Mode v2 with all signals DENIED. No cookies are set, no network
          call to googletagmanager.com is made, and no pageview is sent
          until the user explicitly grants consent via the in-app banner.

          When consent is granted (see ConsentBanner in page.js), gtag.js
          is loaded on demand and the consent flags are updated to granted.
          When consent is denied or withdrawn, GA never loads at all.

          This is compliant with UK GDPR + PECR for non-essential analytics
          cookies, and consistent with Lizzie's privacy promise.
        */}
        <Script id="consent-default" strategy="beforeInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'analytics_storage': 'denied',
            'functionality_storage': 'granted',
            'security_storage': 'granted',
            'wait_for_update': 500
          });
        `}</Script>

        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(function() {});
          }
        `}</Script>
      </head>
      <body style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {children}
      </body>
    </html>
  );
}
