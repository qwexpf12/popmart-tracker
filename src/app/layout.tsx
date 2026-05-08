import type { Metadata, Viewport } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';

export const metadata: Metadata = {
  title: '泡泡 · 行情台',
  description: '泡泡玛特个人行情与库存追踪'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <NavBar />
        <main className="max-w-5xl mx-auto px-4 md:px-6 pt-4 md:pt-8 pb-24 md:pb-12">
          {children}
        </main>
      </body>
    </html>
  );
}
