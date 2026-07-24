import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CatChat — Team Messenger',
  description:
    'A team collaboration messenger with threads, channels and a lightning-fast command search.',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'CatChat',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#0d0e14',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap"
          rel="stylesheet"
        />
        {/* Theme init: apply saved theme before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(()=>{try{const t=localStorage.getItem('cz-theme')||'industrial';const dark=['dark','midnight','forest','coffee','cyber'];document.documentElement.setAttribute('data-theme',t);document.documentElement.classList.add(dark.includes(t)?'dark':'light');document.documentElement.classList.remove(dark.includes(t)?'light':'dark')}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').then(r=>r.update()).catch(()=>{});}`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(()=>{const e=new MutationObserver(()=>{document.querySelectorAll("[bis_skin_checked]").forEach(n=>n.removeAttribute("bis_skin_checked"))});e.observe(document.documentElement,{attributes:!0,childList:!0,subtree:!0});try{document.querySelectorAll("[bis_skin_checked]").forEach(n=>n.removeAttribute("bis_skin_checked"))}catch(e){}})();`,
          }}
        />
      </body>
    </html>
  )
}
