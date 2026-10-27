import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Patterns Chat — Quality. Delivered. | Unified Team Chat & Customer Mail Platform',
  description:
    'Patterns Chat brings your entire customer and team workflow together: real-time team chat, direct messages, and unified multi-account customer email in one workspace.',
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: '48x48', type: 'image/x-icon' },
      { url: '/patterns-icon.png?v=2', sizes: '256x256', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=2',
    apple: '/patterns-icon.png?v=2',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
        <link rel="icon" type="image/png" sizes="256x256" href="/patterns-icon.png?v=2" />
        <link rel="apple-touch-icon" href="/patterns-icon.png?v=2" />
      </head>
      <body className="min-h-full flex flex-col bg-white text-slate-900 selection:bg-indigo-500 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
