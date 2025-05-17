import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import localFont from "next/font/local"

// Import Fontsource fonts
import "@fontsource/inter/latin.css"; // Default weights and styles for latin subset
import "@fontsource/dancing-script/latin-400.css"; // Weight 400 for latin subset
import "@fontsource/dancing-script/latin-700.css"; // Weight 700 for latin subset

// It's good practice to define font variables for consistency, though Fontsource might apply Inter globally.
const interFontFamily = "'Inter', sans-serif"
const dancingScriptFontFamily = "'Dancing Script', cursive"

// Load Virgil handwriting font (already local)
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
        <style>
          {`
            :root {
              --font-dancing-script: ${dancingScriptFontFamily};
            }
            body {
              font-family: ${interFontFamily};
            }
          `}
        </style>
      </head>
      {/* Apply Virgil variable, Inter is set via style tag, Dancing Script via CSS variable */}
      <body className={`${virgil.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
