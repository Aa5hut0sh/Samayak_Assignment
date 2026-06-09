import type { Metadata } from 'next'
import { Figtree } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext';
import { EventProvider } from '@/context/EventContext';
import {Providers} from "@/components/Providers";
import { ToastProvider } from '@/components/ui/Toast';
const figtree = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-figtree',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Samayak — Admin Panel',
  description: 'Academic Operations Platform by Anugat AI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <body>
        <Providers>
          <AuthProvider>
            <EventProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </EventProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}