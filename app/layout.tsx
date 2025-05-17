import type React from "react"
import type { Metadata } from "next"
import { Inter, Dancing_Script } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import localFont from "next/font/local"

const inter = Inter({ subsets: ["latin"] })

// Properly load Dancing Script font using Next.js font system
const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-dancing-script",
})

// Load Virgil handwriting font
const virgil = localFont({
  src: "../public/fonts/Virgil.woff2",
  variable: "--font-virgil",
  display: "swap",
})

export const metadata: Metadata = {
  title: "RetroSnaps",
  description: "Create vintage Polaroid-style photo strips with your camera",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${inter.className} ${dancingScript.variable} ${virgil.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
