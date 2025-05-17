"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Camera } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleStart = () => {
    setLoading(true)
    router.push("/booth")
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-cream p-4 relative overflow-hidden">
      {/* Decorative flowers */}
      <div className="absolute top-0 left-0 w-40 h-40 opacity-30">
        <FlowerDecoration />
      </div>
      <div className="absolute bottom-0 right-0 w-40 h-40 opacity-30 rotate-180">
        <FlowerDecoration />
      </div>
      <div className="absolute top-1/4 right-10 w-24 h-24 opacity-20 rotate-45">
        <FlowerDecoration />
      </div>
      <div className="absolute bottom-1/4 left-10 w-24 h-24 opacity-20 -rotate-45">
        <FlowerDecoration />
      </div>

      <div className="max-w-md w-full text-center space-y-8 bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-brown">RetroSnaps</h1>
          <p className="text-lg text-neutral-600">Create vintage Polaroid-style photo strips with your camera</p>
        </div>

        <div className="relative w-full aspect-[3/4] max-w-xs mx-auto bg-white p-3 shadow-md rotate-1">
          <div className="w-full h-full bg-neutral-200 flex items-center justify-center">
            <Camera className="w-16 h-16 text-brown/50" />
          </div>
          <div className="absolute bottom-6 left-0 right-0 text-center">
            <p className="font-dancing-script text-lg text-brown">May 1, 2025</p>
          </div>
        </div>

        <Button
          onClick={handleStart}
          disabled={loading}
          className="w-full py-6 text-lg bg-brown hover:bg-brown/80 text-white"
        >
          {loading ? "Loading..." : "Start Photo Booth"}
        </Button>
      </div>
    </main>
  )
}

// Decorative flower component
function FlowerDecoration() {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="#8B7355">
        <path d="M50,30 C55,10 70,15 50,0 C30,15 45,10 50,30 Z" />
        <path d="M50,30 C70,35 65,50 85,30 C65,10 70,25 50,30 Z" />
        <path d="M50,30 C55,50 70,45 50,60 C30,45 45,50 50,30 Z" />
        <path d="M50,30 C30,35 35,50 15,30 C35,10 30,25 50,30 Z" />
        <circle cx="50" cy="30" r="8" fill="#A67F5D" />
      </g>
    </svg>
  )
}
