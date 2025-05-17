"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Camera, Download, RefreshCw } from "lucide-react"
import Link from "next/link"

type PhotoBoothState =
  | "requesting-permission"
  | "permission-denied"
  | "ready"
  | "countdown"
  | "taking-photos"
  | "processing"
  | "complete"

export default function PhotoBooth() {
  const router = useRouter()
  const [state, setState] = useState<PhotoBoothState>("requesting-permission")
  const [countdown, setCountdown] = useState(3)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [photos, setPhotos] = useState<string[]>([])
  const [photoStrip, setPhotoStrip] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stripCanvasRef = useRef<HTMLCanvasElement>(null)

  // Request camera permission and set up video stream
  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream

          // Add event listeners to ensure video plays and to handle errors
          videoRef.current.onloadedmetadata = () => {
            videoRef.current
              ?.play()
              .then(() => {
                console.log("Video is playing")
                setState("ready")
              })
              .catch((err) => {
                console.error("Error playing video:", err)
                setCameraError("Error playing video feed. Please try again.")
              })
          }

          videoRef.current.onerror = () => {
            console.error("Video element error")
            setCameraError("Video element error. Please try again.")
          }
        }
      } catch (err) {
        console.error("Error accessing camera:", err)
        setCameraError(`Camera access error: ${err instanceof Error ? err.message : String(err)}`)
        setState("permission-denied")
      }
    }

    if (state === "requesting-permission") {
      setupCamera()
    }

    return () => {
      // Clean up video stream when component unmounts
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [state])

  // Handle countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (state === "countdown" && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    } else if (state === "countdown" && countdown === 0) {
      capturePhoto()
    }

    return () => clearTimeout(timer)
  }, [state, countdown])

  // Start the photo capture sequence
  const startCapture = () => {
    setState("countdown")
    setCountdown(3)
    setPhotoIndex(0)
    setPhotos([])
  }

  // Capture a single photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    setState("taking-photos")

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    // Set canvas dimensions to match video aspect ratio
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw the current video frame to the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get the image data as a base64 string
    const photoData = canvas.toDataURL("image/jpeg")

    // Add the photo to our collection
    const newPhotos = [...photos, photoData]
    setPhotos(newPhotos)

    if (newPhotos.length < 3) {
      // If we need more photos, start another countdown
      setTimeout(() => {
        setPhotoIndex(photoIndex + 1)
        setState("countdown")
        setCountdown(3)
      }, 1000)
    } else {
      // If we have all 3 photos, process them into a strip
      setState("processing")
      setTimeout(() => createPhotoStrip(newPhotos), 1000)
    }
  }

  // Create the final photo strip from the captured photos
  const createPhotoStrip = async (photoList: string[]) => {
    if (!stripCanvasRef.current) return

    const canvas = stripCanvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    // Set dimensions for the photo strip
    const stripWidth = 800
    const photoHeight = 800
    const borderWidth = 40
    const bottomBorderExtra = 60

    // Calculate total height for 3 photos with borders
    const stripHeight = (photoHeight + borderWidth * 2) * 3 + bottomBorderExtra

    canvas.width = stripWidth
    canvas.height = stripHeight

    // Fill with white background (Polaroid color)
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, stripWidth, stripHeight)

    // Load each photo and add to the strip
    for (let i = 0; i < photoList.length; i++) {
      const img = new Image()
      img.crossOrigin = "anonymous"

      // Wait for the image to load before drawing
      await new Promise<void>((resolve) => {
        img.onload = () => {
          // Calculate position for this photo
          const yPos = i * (photoHeight + borderWidth * 2)

          // Draw white border (already filled above)

          // Apply vintage filter
          ctx.filter = "saturate(0.8) brightness(1.1) contrast(0.85) sepia(0.15)"

          // Draw the photo with borders
          ctx.drawImage(img, borderWidth, yPos + borderWidth, stripWidth - borderWidth * 2, photoHeight)

          // Reset filter
          ctx.filter = "none"

          // Add subtle shadow inside the photo
          ctx.shadowColor = "rgba(0,0,0,0.1)"
          ctx.shadowBlur = 8
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0
          ctx.strokeStyle = "rgba(0,0,0,0.05)"
          ctx.strokeRect(borderWidth + 2, yPos + borderWidth + 2, stripWidth - borderWidth * 2 - 4, photoHeight - 4)

          // Reset shadow
          ctx.shadowColor = "transparent"

          resolve()
        }
        img.src = photoList[i]
      })
    }

    // Add date at the bottom in cursive font
    const date = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })

    ctx.font = "36px var(--font-dancing-script), cursive"
    ctx.fillStyle = "#333"
    ctx.textAlign = "center"
    ctx.fillText(date, stripWidth / 2, stripHeight - 30)

    // Get the final image data
    const stripData = canvas.toDataURL("image/png")
    setPhotoStrip(stripData)
    setState("complete")
  }

  // Handle download of the photo strip
  const downloadStrip = () => {
    if (!photoStrip) return

    const link = document.createElement("a")
    link.href = photoStrip
    link.download = `retrosnaps-${new Date().getTime()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Reset the photo booth
  const resetBooth = () => {
    setState("ready")
    setPhotos([])
    setPhotoStrip(null)
  }

  // Force retry camera access
  const retryCamera = () => {
    setCameraError(null)
    setState("requesting-permission")
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

      {/* Hidden canvases for processing */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={stripCanvasRef} className="hidden" />

      <div className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg">
        {state === "permission-denied" && (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-red-500">Camera Access Denied</h2>
            <p className="text-neutral-600">{cameraError || "Please allow camera access to use the photo booth."}</p>
            <Button onClick={retryCamera}>Try Again</Button>
            <div className="pt-4">
              <Link href="/" className="text-neutral-500 hover:text-neutral-800">
                Return to Home
              </Link>
            </div>
          </div>
        )}

        {(state === "requesting-permission" || state === "ready") && (
          <div className="space-y-6">
            <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
              {state === "requesting-permission" ? (
                <div className="aspect-[3/4] flex flex-col items-center justify-center bg-neutral-800 p-4">
                  <p className="text-white text-lg animate-pulse mb-4">Requesting camera access...</p>
                  {cameraError && (
                    <div className="text-red-400 text-sm text-center">
                      <p>{cameraError}</p>
                      <Button
                        variant="outline"
                        className="mt-4 text-white border-white hover:bg-white/20"
                        onClick={retryCamera}
                      >
                        Retry
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[3/4] object-cover" />
                  <div className="absolute inset-0 pointer-events-none border-[20px] border-white" />
                </>
              )}
            </div>

            <div className="flex justify-center">
              <Button
                onClick={startCapture}
                disabled={state !== "ready"}
                className="rounded-full w-16 h-16 bg-brown hover:bg-brown/80 p-0"
              >
                <Camera className="w-8 h-8" />
                <span className="sr-only">Take Photos</span>
              </Button>
            </div>

            <p className="text-center text-neutral-600">Press the button to take 3 photos for your strip</p>
          </div>
        )}

        {state === "countdown" && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-white text-center">
              <p className="text-xl mb-4">Get Ready...</p>
              <p className="text-8xl font-bold animate-pulse">{countdown}</p>
              <p className="mt-4 text-lg">Photo {photoIndex + 1} of 3</p>
            </div>
          </div>
        )}

        {state === "taking-photos" && (
          <div className="fixed inset-0 flex items-center justify-center bg-white z-10">
            <div className="animate-ping rounded-full h-24 w-24 bg-brown opacity-75" />
          </div>
        )}

        {state === "processing" && (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Processing your photos...</h2>
            <div className="flex justify-center">
              <RefreshCw className="w-12 h-12 animate-spin text-brown" />
            </div>
            <p className="text-neutral-600">Creating your vintage photo strip</p>
          </div>
        )}

        {state === "complete" && photoStrip && (
          <div className="space-y-6 text-center">
            <h2 className="text-2xl font-bold">Your Photo Strip</h2>

            <div className="relative mx-auto w-full max-w-xs animate-slideUp">
              <img src={photoStrip || "/placeholder.svg"} alt="Your photo strip" className="w-full shadow-lg" />
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={downloadStrip}
                className="flex items-center justify-center gap-2 bg-brown hover:bg-brown/80 text-white"
              >
                <Download className="w-4 h-4" />
                Download Photo Strip
              </Button>

              <Button
                onClick={resetBooth}
                variant="outline"
                className="flex items-center justify-center gap-2 border-brown text-brown hover:bg-brown/10"
              >
                <Camera className="w-4 h-4" />
                Take New Photos
              </Button>
            </div>

            <p className="text-sm text-neutral-500 mt-4">On mobile, press and hold the image to save</p>
          </div>
        )}
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
