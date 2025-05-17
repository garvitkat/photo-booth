"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Camera, Download, RefreshCw, Edit, Check } from "lucide-react"
import Link from "next/link"
import Webcam from "react-webcam"

type PhotoBoothState =
  | "requesting-permission"
  | "permission-denied"
  | "ready"
  | "countdown"
  | "taking-photo"
  | "processing"
  | "complete"
  | "adding-caption"

export default function PhotoBooth() {
  const router = useRouter()
  const [state, setState] = useState<PhotoBoothState>("requesting-permission")
  const [countdown, setCountdown] = useState(3)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [photos, setPhotos] = useState<string[]>([])
  const [caption, setCaption] = useState("")
  const [photoStrip, setPhotoStrip] = useState<string | null>(null)
  const [previewStrip, setPreviewStrip] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [flashActive, setFlashActive] = useState(false)

  // Refs for elements
  const webcamRef = useRef<Webcam>(null)
  const stripCanvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const webcamContainerRef = useRef<HTMLDivElement>(null)
  const captionInputRef = useRef<HTMLInputElement>(null)

  // Calculate aspect ratio for proper photo capture
  const [aspectRatio, setAspectRatio] = useState({ width: 1, height: 1 })
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 })

  // Maximum caption length - reduced for larger text
  const MAX_CAPTION_LENGTH = 20

  // Sound utility function - authentic Polaroid camera sound
  const playPolaroidSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Motor whirring sound
      const motorOscillator = audioContext.createOscillator()
      const motorGain = audioContext.createGain()

      motorOscillator.type = "sawtooth"
      motorOscillator.frequency.setValueAtTime(100, audioContext.currentTime)
      motorOscillator.frequency.setValueAtTime(120, audioContext.currentTime + 0.1)
      motorOscillator.frequency.setValueAtTime(80, audioContext.currentTime + 0.2)

      motorGain.gain.setValueAtTime(0.03, audioContext.currentTime)
      motorGain.gain.setValueAtTime(0.05, audioContext.currentTime + 0.1)
      motorGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8)

      motorOscillator.connect(motorGain)
      motorGain.connect(audioContext.destination)

      motorOscillator.start()
      motorOscillator.stop(audioContext.currentTime + 0.8)

      // Ejection click sound
      setTimeout(() => {
        const clickOscillator = audioContext.createOscillator()
        const clickGain = audioContext.createGain()

        clickOscillator.type = "triangle"
        clickOscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        clickOscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.15)

        clickGain.gain.setValueAtTime(0.1, audioContext.currentTime)
        clickGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15)

        clickOscillator.connect(clickGain)
        clickGain.connect(audioContext.destination)

        clickOscillator.start()
        clickOscillator.stop(audioContext.currentTime + 0.15)
      }, 300)
    } catch (err) {
      console.error("Error playing Polaroid sound:", err)
    }
  }, [])

  // Update container dimensions when component mounts or window resizes
  useEffect(() => {
    const updateDimensions = () => {
      if (webcamContainerRef.current) {
        const { width, height } = webcamContainerRef.current.getBoundingClientRect()
        setContainerDimensions({ width, height })
        setAspectRatio({ width: width, height: height })
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)

    return () => {
      window.removeEventListener("resize", updateDimensions)
    }
  }, [])

  // Focus caption input when entering caption state
  useEffect(() => {
    if (state === "adding-caption" && captionInputRef.current) {
      captionInputRef.current.focus()
    }
  }, [state])

  // Update preview when caption changes
  useEffect(() => {
    if (state === "adding-caption" && photos.length === 3) {
      updatePreviewWithCaption(caption)
    }
  }, [caption, state, photos])

  // Handle webcam ready state
  const handleUserMedia = useCallback(() => {
    console.log("Webcam ready - user media received")
    setState("ready")

    // Update dimensions once webcam is ready
    if (webcamContainerRef.current) {
      const { width, height } = webcamContainerRef.current.getBoundingClientRect()
      setContainerDimensions({ width, height })
      setAspectRatio({ width: width, height: height })
    }
  }, [])

  // Handle webcam errors
  const handleUserMediaError = useCallback((error: string | DOMException) => {
    console.error("Webcam error:", error)
    setCameraError(`Camera error: ${error instanceof DOMException ? error.message : error}`)
    setState("permission-denied")
  }, [])

  // Handle countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (state === "countdown" && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    } else if (state === "countdown" && countdown === 0) {
      setState("taking-photo")
      setTimeout(() => {
        capturePhoto()
      }, 300) // Short delay to show the "0" before taking photo
    }

    return () => clearTimeout(timer)
  }, [state, countdown])

  // Start the photo capture sequence
  const startCapture = () => {
    setState("countdown")
    setCountdown(3)
    setPhotoIndex(0)
    setPhotos([])
    setCaption("")
    setPhotoStrip(null)
    setPreviewStrip(null)
  }

  // Capture a single photo
  const capturePhoto = useCallback(() => {
    if (!webcamRef.current) return

    // Activate flash effect
    setFlashActive(true)
    setTimeout(() => setFlashActive(false), 300)

    // Play authentic Polaroid sound
    playPolaroidSound()

    // Get the webcam container dimensions for proper cropping
    const containerWidth = containerDimensions.width
    const containerHeight = containerDimensions.height

    // Capture photo from webcam
    const fullPhotoData = webcamRef.current.getScreenshot()

    if (!fullPhotoData) {
      console.error("Failed to capture photo")
      setCameraError("Failed to capture photo. Please try again.")
      setState("ready")
      return
    }

    // Create a temporary image to get the full dimensions
    const img = new Image()
    img.onload = () => {
      // Create a canvas to crop the image to match what's shown in the UI
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (!ctx) return

      // Set canvas to the container dimensions (what's visible in the UI)
      canvas.width = containerWidth
      canvas.height = containerHeight

      // Calculate scaling and positioning to center the image in the visible area
      const scale = Math.max(containerWidth / img.width, containerHeight / img.height)
      const scaledWidth = img.width * scale
      const scaledHeight = img.height * scale
      const offsetX = (containerWidth - scaledWidth) / 2
      const offsetY = (containerHeight - scaledHeight) / 2

      // Draw only the visible portion of the webcam feed
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

      // Get the cropped image data
      const croppedPhotoData = canvas.toDataURL("image/jpeg")

      // Add the photo to our collection
      setPhotos((prevPhotos) => {
        const newPhotos = [...prevPhotos, croppedPhotoData]

        // Check if we need more photos
        if (newPhotos.length < 3) {
          // Move to next photo - start countdown for next photo
          setTimeout(() => {
            setPhotoIndex((prevIndex) => prevIndex + 1)
            setState("countdown")
            setCountdown(3)
          }, 500) // Short delay before starting next countdown
        } else {
          // All photos taken, create strip
          setState("processing")
          setTimeout(() => createPhotoStrip(newPhotos, ""), 1000)
        }

        return newPhotos
      })
    }

    img.src = fullPhotoData
  }, [containerDimensions, photoIndex, playPolaroidSound])

  // Handle caption changes
  const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Limit caption to maximum length
    if (e.target.value.length <= MAX_CAPTION_LENGTH) {
      setCaption(e.target.value)
    }
  }

  // Save caption and update photo strip
  const saveCaption = () => {
    setState("processing")
    setTimeout(() => createPhotoStrip(photos, caption), 500)
  }

  // Toggle caption editing mode
  const toggleCaptionEdit = () => {
    setState("adding-caption")
    // Create initial preview with empty caption
    updatePreviewWithCaption("")
  }

  // Update preview with current caption
  const updatePreviewWithCaption = async (captionText: string) => {
    if (!previewCanvasRef.current || photos.length !== 3) return

    const canvas = previewCanvasRef.current
    await renderPhotoStrip(canvas, photos, captionText)

    const previewData = canvas.toDataURL("image/png")
    setPreviewStrip(previewData)
  }

  // Render photo strip on a canvas
  const renderPhotoStrip = async (canvas: HTMLCanvasElement, photoList: string[], captionText: string) => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    // Load the Virgil font first to ensure it's available
    const virgil = new FontFace('Virgil', 'url(/fonts/Virgil.woff2)')
    try {
      await virgil.load()
      document.fonts.add(virgil)
      console.log("Virgil font loaded successfully for canvas")
    } catch (err) {
      console.warn("Failed to load Virgil font for canvas:", err)
    }

    // Set dimensions for the photo strip
    const stripWidth = 800
    const photoHeight = 700
    const captionHeight = 300 // Increased height for caption area
    const borderWidth = 40
    const spaceBetweenPhotos = 20
    const cornerRadius = 20 // Rounded corners

    // Calculate total height for 3 photos with borders, spaces, and caption area
    const stripHeight =
      photoHeight * 3 + // Height of all photos
      spaceBetweenPhotos * 2 + // Space between photos
      borderWidth * 2 + // Top and bottom borders
      captionHeight // Caption area at bottom

    canvas.width = stripWidth
    canvas.height = stripHeight

    // Helper function to draw rounded rectangle
    const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + width - radius, y)
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
      ctx.lineTo(x + width, y + height - radius)
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
      ctx.lineTo(x + radius, y + height)
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.closePath()
    }
    
    // Helper: Add noise texture for vintage feel
    const addNoiseTexture = (width: number, height: number, opacity = 0.03) => {
      ctx.save()
      ctx.globalAlpha = opacity
      
      for (let i = 0; i < width; i += 4) {
        for (let j = 0; j < height; j += 4) {
          if (Math.random() > 0.75) {
            ctx.fillStyle = '#000'
            ctx.fillRect(i, j, 2, 2)
          }
        }
      }
      
      ctx.restore()
    }
    
    // Helper: Add vignette effect
    const addVignette = (width: number, height: number, intensity = 0.05) => {
      const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) / 1.5
      )
      
      gradient.addColorStop(0, 'rgba(0,0,0,0)')
      gradient.addColorStop(1, `rgba(0,0,0,${intensity})`)
      
      ctx.save()
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
      ctx.restore()
    }

    // Step 1: Fill with authentic polaroid off-white background
    ctx.fillStyle = '#FFF8F0' // Slightly warm white for authentic polaroid look
    ctx.fillRect(0, 0, stripWidth, stripHeight)
    
    // Add subtle noise texture
    addNoiseTexture(stripWidth, stripHeight, 0.03)
    
    // Step 2: Create white polaroid border with rounded corners
    ctx.fillStyle = '#FFFCF7' // Very subtle off-white for authentic polaroid
    drawRoundedRect(0, 0, stripWidth, stripHeight, cornerRadius)
    ctx.fill()

    // Load each photo and add to the strip
    for (let i = 0; i < photoList.length; i++) {
      const img = new Image()
      img.crossOrigin = "anonymous"

      // Wait for the image to load before drawing
      await new Promise<void>((resolve) => {
        img.onload = () => {
          // Calculate position for this photo
          const yPos = borderWidth + i * (photoHeight + spaceBetweenPhotos)

          // Apply authentic polaroid filter
          ctx.filter = "saturate(0.8) brightness(1.05) contrast(1.1) sepia(0.12)"

          // Save context for clipping
          ctx.save()

          // Create clipping path for rounded corners on the photo
          const innerRadius = 10 // Slightly rounded corners for photos
          drawRoundedRect(borderWidth, yPos, stripWidth - borderWidth * 2, photoHeight, innerRadius)
          ctx.clip()

          // Calculate dimensions to maintain aspect ratio
          const photoWidth = stripWidth - borderWidth * 2
          const photoAspectRatio = img.width / img.height
          let drawWidth = photoWidth
          let drawHeight = photoWidth / photoAspectRatio
          let offsetX = 0
          let offsetY = 0

          // If the calculated height is greater than the available space, adjust
          if (drawHeight > photoHeight) {
            drawHeight = photoHeight
            drawWidth = photoHeight * photoAspectRatio
            offsetX = (photoWidth - drawWidth) / 2
          } else {
            // Center vertically if there's extra space
            offsetY = (photoHeight - drawHeight) / 2
          }

          // Draw the photo with proper aspect ratio
          ctx.drawImage(img, borderWidth + offsetX, yPos + offsetY, drawWidth, drawHeight)

          // Restore context
          ctx.restore()
          ctx.filter = "none"

          // Add subtle inner shadow around photo for depth
          ctx.shadowColor = "rgba(0,0,0,0.08)"
          ctx.shadowBlur = 2
          ctx.strokeStyle = "rgba(0,0,0,0.05)"
          ctx.lineWidth = 1

          // Draw stroke with rounded corners
          ctx.beginPath()
          drawRoundedRect(borderWidth + 2, yPos + 2, stripWidth - borderWidth * 2 - 4, photoHeight - 4, innerRadius - 2)
          ctx.stroke()

          // Reset shadow
          ctx.shadowColor = "transparent"
          ctx.shadowBlur = 0

          resolve()
        }
        img.src = photoList[i]
      })
    }

    // Add caption area at the bottom of the strip
    if (captionText) {
      // Position for caption (below the last photo)
      const captionY = borderWidth + 3 * photoHeight + 2 * spaceBetweenPhotos + 20
      
      // Add caption background for better contrast - white for authentic polaroid look
      ctx.fillStyle = "#FFFFFF"
      ctx.beginPath()
      drawRoundedRect(
        borderWidth, 
        captionY - 20, 
        stripWidth - borderWidth * 2, 
        captionHeight, 
        10
      )
      ctx.fill()
      
      // Add a very subtle separator line
      ctx.strokeStyle = "rgba(0, 0, 0, 0.1)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(borderWidth + 5, captionY - 17)
      ctx.lineTo(stripWidth - borderWidth - 5, captionY - 17)
      ctx.stroke()

      // Simple clean caption with Excalidraw-like font
      ctx.save()
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      
      // Use Virgil font with much larger size - multiple methods to ensure it works
      const fontSizePx = 150
      try {
        // Try multiple approaches to ensure the font works
        ctx.font = `bold ${fontSizePx}px 'Virgil', cursive`
        
        // Draw the text
        const textY = captionY + (captionHeight / 2) - 20
        const textX = stripWidth / 2
        
        // Draw with slight offset for emphasis
        ctx.fillStyle = "#111111"
        ctx.fillText(captionText, textX, textY, stripWidth - borderWidth * 3)
        
        console.log(`Caption rendered with font: ${ctx.font}, text: ${captionText}`)
      } catch (err) {
        console.error("Error rendering caption:", err)
        // Fallback to system font if Virgil fails
        ctx.font = `bold ${fontSizePx}px sans-serif`
        ctx.fillText(captionText, stripWidth / 2, captionY + captionHeight / 2 - 20, stripWidth - borderWidth * 3)
      }
      
      ctx.restore()
    }
    
    // Add finishing touches for authentic polaroid look
    
    // Add very subtle vignette effect
    addVignette(stripWidth, stripHeight, 0.04)
    
    // Add very subtle film grain
    addNoiseTexture(stripWidth, stripHeight, 0.01)
  }

  // Create the final photo strip from the captured photos
  const createPhotoStrip = async (photoList: string[], captionText: string) => {
    if (!stripCanvasRef.current) return

    const canvas = stripCanvasRef.current
    await renderPhotoStrip(canvas, photoList, captionText)

    // Get the final image data
    const stripData = canvas.toDataURL("image/png")
    setPhotoStrip(stripData)
    setState("complete")
  }

  // Handle download of the photo strip
  const downloadStrip = () => {
    if (!photoStrip) return

    // Check if we're on a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    
    if (isMobile) {
      // For mobile devices, especially iOS, using a different approach
      try {
        // Create a visible link for better mobile compatibility
        const downloadArea = document.createElement('div')
        downloadArea.style.position = 'fixed'
        downloadArea.style.top = '0'
        downloadArea.style.left = '0'
        downloadArea.style.width = '100%'
        downloadArea.style.height = '100%'
        downloadArea.style.backgroundColor = 'rgba(0,0,0,0.8)'
        downloadArea.style.zIndex = '9999'
        downloadArea.style.display = 'flex'
        downloadArea.style.flexDirection = 'column'
        downloadArea.style.alignItems = 'center'
        downloadArea.style.justifyContent = 'center'
        
        // Create image element
        const img = document.createElement('img')
        img.src = photoStrip
        img.style.maxWidth = '90%'
        img.style.maxHeight = '80%'
        img.style.objectFit = 'contain'
        
        // Create instructions text
        const instructions = document.createElement('p')
        instructions.innerText = isIOS 
          ? 'Press and hold the image, then tap "Save Image"' 
          : 'Tap the download button below to save'
        instructions.style.color = 'white'
        instructions.style.margin = '20px'
        instructions.style.textAlign = 'center'
        
        // Add download button for non-iOS devices
        const downloadButton = document.createElement('button')
        downloadButton.innerText = 'Download Image'
        downloadButton.style.padding = '12px 24px'
        downloadButton.style.backgroundColor = '#8B7355'
        downloadButton.style.color = 'white'
        downloadButton.style.border = 'none'
        downloadButton.style.borderRadius = '4px'
        downloadButton.style.fontSize = '16px'
        downloadButton.style.margin = '10px'
        downloadButton.onclick = () => {
          const link = document.createElement("a")
          link.href = photoStrip
          link.download = `retrosnaps-${new Date().getTime()}.png`
          link.click()
        }
        
        // Close button
        const closeButton = document.createElement('button')
        closeButton.innerText = 'Close'
        closeButton.style.padding = '12px 24px'
        closeButton.style.backgroundColor = 'transparent'
        closeButton.style.color = 'white'
        closeButton.style.border = '1px solid white'
        closeButton.style.borderRadius = '4px'
        closeButton.style.fontSize = '16px'
        closeButton.style.margin = '10px'
        closeButton.onclick = () => {
          document.body.removeChild(downloadArea)
        }
        
        // Append elements
        downloadArea.appendChild(img)
        downloadArea.appendChild(instructions)
        if (!isIOS) {
          downloadArea.appendChild(downloadButton)
        }
        downloadArea.appendChild(closeButton)
        document.body.appendChild(downloadArea)
        
      } catch (error) {
        console.error('Error with mobile download:', error)
        // Fallback to traditional method
        const link = document.createElement("a")
        link.href = photoStrip
        link.download = `retrosnaps-${new Date().getTime()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } else {
      // Desktop download approach
      const link = document.createElement("a")
      link.href = photoStrip
      link.download = `retrosnaps-${new Date().getTime()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Reset the photo booth
  const resetBooth = () => {
    setState("ready")
    setPhotos([])
    setPhotoStrip(null)
    setPreviewStrip(null)
    setCaption("")
  }

  // Force retry camera access
  const retryCamera = () => {
    setCameraError(null)
    setState("requesting-permission")
  }

  // Webcam configuration
  const videoConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: "user",
    aspectRatio: 3 / 4,
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
      <canvas ref={stripCanvasRef} className="hidden" />
      <canvas ref={previewCanvasRef} className="hidden" />

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

        {(state === "requesting-permission" ||
          state === "ready" ||
          state === "countdown" ||
          state === "taking-photo") && (
          <div className="space-y-6">
            <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
              <div ref={webcamContainerRef} className="aspect-[3/4] w-full">
                {/* Show loading message when requesting permission */}
                {state === "requesting-permission" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-800 p-4 z-20">
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
                )}

                {/* React Webcam component - always visible during countdown and capture */}
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  onUserMedia={handleUserMedia}
                  onUserMediaError={handleUserMediaError}
                  mirrored={true}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    display: "block",
                    minHeight: "300px",
                    opacity: state === "requesting-permission" ? 0 : 1,
                    transition: "opacity 0.5s ease",
                  }}
                />

                {/* Flash effect overlay */}
                {flashActive && <div className="absolute inset-0 bg-white z-30 animate-flash"></div>}

                {/* Prominent centered countdown overlay with darkened background */}
                {state === "countdown" && (
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    {/* Semi-transparent dark overlay */}
                    <div className="absolute inset-0 bg-black/40"></div>

                    {/* Large centered countdown */}
                    <div className="relative z-10 bg-black/70 rounded-full w-32 h-32 flex flex-col items-center justify-center">
                      <span className="text-white text-6xl font-bold">{countdown}</span>
                      <span className="text-white text-sm mt-1">Photo {photoIndex + 1} of 3</span>
                    </div>
                  </div>
                )}

                {/* Polaroid border with rounded corners */}
                <div className="absolute inset-0 pointer-events-none border-[20px] border-white z-10 rounded-lg" />
              </div>
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

            <p className="text-center text-neutral-600">
              {state === "ready"
                ? "Press the button to take 3 photos for your strip"
                : state === "countdown"
                  ? `Get ready for photo ${photoIndex + 1} of 3...`
                  : state === "taking-photo"
                    ? "Capturing..."
                    : ""}
            </p>
          </div>
        )}

        {/* Caption input step with live preview */}
        {state === "adding-caption" && previewStrip && (
          <div className="space-y-6 text-center">
            <h2 className="text-2xl font-bold text-center">Add a Caption</h2>

            <div className="flex justify-center items-center w-full">
              <img
                src={previewStrip || "/placeholder.svg"}
                alt="Your photo strip preview"
                className="max-h-[60vh] object-contain mx-auto"
                style={{ filter: "drop-shadow(0 10px 15px rgba(0, 0, 0, 0.15))" }}
              />
            </div>

            <div className="space-y-3 max-w-sm mx-auto">
              <div className="space-y-2">
                <label htmlFor="caption" className="block text-sm font-medium text-neutral-700">
                  Write a caption for your photo strip:
                </label>
                <Input
                  ref={captionInputRef}
                  id="caption"
                  type="text"
                  placeholder="Your caption here..."
                  value={caption}
                  onChange={handleCaptionChange}
                  maxLength={MAX_CAPTION_LENGTH}
                  className="border-brown focus:ring-brown font-virgil text-2xl"
                />
                <p className="text-xs text-neutral-500">
                  {caption.length}/{MAX_CAPTION_LENGTH} characters
                </p>
              </div>

              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setState("complete")}
                  className="border-brown text-brown hover:bg-brown/10"
                >
                  Cancel
                </Button>
                <Button onClick={saveCaption} className="bg-brown hover:bg-brown/80 text-white">
                  <Check className="w-4 h-4 mr-2" />
                  Save Caption
                </Button>
              </div>
            </div>
          </div>
        )}

        {state === "processing" && (
          <div className="text-center space-y-4 py-8">
            <h2 className="text-2xl font-bold">Creating your photo strip...</h2>
            <div className="flex justify-center">
              <RefreshCw className="w-12 h-12 animate-spin text-brown" />
            </div>
            <p className="text-neutral-600">Almost there!</p>
          </div>
        )}

        {state === "complete" && photoStrip && (
          <div className="space-y-6 text-center">
            <h2 className="text-2xl font-bold">Your Photo Strip</h2>

            <div className="flex justify-center items-center w-full">
              <img
                src={photoStrip || "/placeholder.svg"}
                alt="Your photo strip"
                className="max-h-[75vh] object-contain mx-auto"
                style={{ filter: "drop-shadow(0 10px 15px rgba(0, 0, 0, 0.15))" }}
              />
            </div>

            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              {!caption && (
                <Button
                  onClick={toggleCaptionEdit}
                  variant="outline"
                  className="flex items-center justify-center gap-2 border-brown text-brown hover:bg-brown/10"
                >
                  <Edit className="w-4 h-4" />
                  Add Caption
                </Button>
              )}

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

            <p className="text-sm text-neutral-500 mt-4">
              {/iPhone|iPad|iPod/i.test(typeof window !== 'undefined' ? window.navigator.userAgent : '') 
                ? 'Tap "Download Photo Strip" for easier saving on iOS devices' 
                : 'On mobile, press and hold the image to save'}
            </p>
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
