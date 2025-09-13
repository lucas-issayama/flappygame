'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Bird {
  x: number
  y: number
  velocity: number
  radius: number
}

interface Pipe {
  x: number
  width: number
  gapY: number
  gapHeight: number
  passed: boolean
}

interface Dolphin {
  x: number
  y: number
  jumpPhase: number
  direction: number
  visible: boolean
  startX: number
}

interface GameState {
  bird: Bird
  pipes: Pipe[]
  dolphins: Dolphin[]
  score: number
  gameStarted: boolean
  gameOver: boolean
  explosion: {
    active: boolean
    x: number
    y: number
    frame: number
  }
  frameCount: number
}

const BASE_WIDTH = 400
const BASE_HEIGHT = 600
const BIRD_SIZE = 20
const PIPE_WIDTH = 60
const PIPE_GAP = 250
const GRAVITY = 0.25
const JUMP_FORCE = -6
const PIPE_SPEED = 1.5

export default function FlappyBirdGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const volleyballImageRef = useRef<HTMLImageElement | null>(null)

  const [canvasSize, setCanvasSize] = useState({ width: BASE_WIDTH, height: BASE_HEIGHT })
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const updateCanvasSize = () => {
      if (typeof window !== 'undefined') {
        const screenWidth = window.innerWidth
        const screenHeight = window.innerHeight

        // Calculate scale to fit screen while maintaining aspect ratio
        const scaleX = (screenWidth - 40) / BASE_WIDTH  // 40px padding
        const scaleY = (screenHeight - 100) / BASE_HEIGHT  // 100px for UI elements
        const newScale = Math.min(scaleX, scaleY, 1.2) // Max scale of 1.2

        const width = BASE_WIDTH * newScale
        const height = BASE_HEIGHT * newScale

        setCanvasSize({ width, height })
        setScale(newScale)
      }
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    window.addEventListener('orientationchange', updateCanvasSize)

    return () => {
      window.removeEventListener('resize', updateCanvasSize)
      window.removeEventListener('orientationchange', updateCanvasSize)
    }
  }, [])

  // Load volleyball image
  useEffect(() => {
    const img = new Image()
    img.src = '/volleyball.png'
    img.onload = () => {
      volleyballImageRef.current = img
    }
  }, [])

  const [gameState, setGameState] = useState<GameState>({
    bird: {
      x: BASE_WIDTH / 4,
      y: BASE_HEIGHT / 2,
      velocity: 0,
      radius: BIRD_SIZE / 2
    },
    pipes: [],
    dolphins: [],
    score: 0,
    gameStarted: false,
    gameOver: false,
    explosion: {
      active: false,
      x: 0,
      y: 0,
      frame: 0
    },
    frameCount: 0
  })

  const resetGame = useCallback(() => {
    setGameState({
      bird: {
        x: BASE_WIDTH / 4,
        y: BASE_HEIGHT / 2,
        velocity: 0,
        radius: BIRD_SIZE / 2
      },
      pipes: [],
      dolphins: [],
      score: 0,
      gameStarted: false,
      gameOver: false,
      explosion: {
        active: false,
        x: 0,
        y: 0,
        frame: 0
      },
      frameCount: 0
    })
  }, [])

  const jump = useCallback(() => {
    if (!gameState.gameStarted && !gameState.gameOver) {
      setGameState(prev => ({
        ...prev,
        gameStarted: true,
        bird: { ...prev.bird, velocity: JUMP_FORCE }
      }))
    } else if (gameState.gameStarted && !gameState.gameOver) {
      setGameState(prev => ({
        ...prev,
        bird: { ...prev.bird, velocity: JUMP_FORCE }
      }))
    } else if (gameState.gameOver) {
      resetGame()
    }
  }, [gameState.gameStarted, gameState.gameOver, resetGame])

  const createPipe = useCallback((x: number): Pipe => {
    const gapY = Math.random() * (BASE_HEIGHT - PIPE_GAP - 150) + 75
    return {
      x,
      width: PIPE_WIDTH,
      gapY,
      gapHeight: PIPE_GAP,
      passed: false
    }
  }, [])

  const checkCollision = useCallback((bird: Bird, pipes: Pipe[]): boolean => {
    if (bird.y - bird.radius <= 0 || bird.y + bird.radius >= BASE_HEIGHT) {
      return true
    }

    for (const pipe of pipes) {
      if (
        bird.x + bird.radius > pipe.x &&
        bird.x - bird.radius < pipe.x + pipe.width &&
        (bird.y - bird.radius < pipe.gapY || bird.y + bird.radius > pipe.gapY + pipe.gapHeight)
      ) {
        return true
      }
    }

    return false
  }, [])

  const gameLoop = () => {
    setGameState(prev => {
      if (prev.gameOver) return prev

      const newBird = { ...prev.bird }
      let newPipes = [...prev.pipes]
      let newDolphins = [...prev.dolphins]
      let newScore = prev.score
      let newFrameCount = prev.frameCount + 1

      // Only apply physics when game is started
      if (prev.gameStarted) {
        newBird.velocity += GRAVITY
        newBird.y += newBird.velocity

        // Only move pipes when game is started
        newPipes = newPipes.map(pipe => ({ ...pipe, x: pipe.x - PIPE_SPEED }))

        newPipes.forEach(pipe => {
          if (!pipe.passed && newBird.x > pipe.x + pipe.width) {
            pipe.passed = true
            newScore += 1
          }
        })

        newPipes = newPipes.filter(pipe => pipe.x + pipe.width > 0)

        if (newPipes.length === 0) {
          const gapY = Math.random() * (BASE_HEIGHT - PIPE_GAP - 150) + 75
          newPipes.push({
            x: BASE_WIDTH + 150,
            width: PIPE_WIDTH,
            gapY,
            gapHeight: PIPE_GAP,
            passed: false
          })
        } else if (newPipes[newPipes.length - 1].x < BASE_WIDTH - 250) {
          const gapY = Math.random() * (BASE_HEIGHT - PIPE_GAP - 150) + 75
          newPipes.push({
            x: BASE_WIDTH,
            width: PIPE_WIDTH,
            gapY,
            gapHeight: PIPE_GAP,
            passed: false
          })
        }
      }

      // Update dolphins
      newDolphins = newDolphins.map(dolphin => {
        if (!dolphin.visible) return dolphin

        dolphin.jumpPhase += 0.05
        dolphin.x += dolphin.direction * 1.5

        // Calculate arc trajectory
        const progress = dolphin.jumpPhase
        if (progress <= 1) {
          dolphin.y = BASE_HEIGHT * 0.7 - Math.sin(progress * Math.PI) * 60
        } else {
          dolphin.visible = false
        }

        return dolphin
      }).filter(dolphin => dolphin.visible && dolphin.x > -50 && dolphin.x < BASE_WIDTH + 50)

      // Spawn new dolphins more frequently (every 180 frames = 3 seconds at 60fps)
      if (newFrameCount % 180 === 0 && Math.random() < 0.7 && newDolphins.length < 2) {
        const direction = Math.random() < 0.5 ? 1 : -1
        const startX = direction === 1 ? -30 : BASE_WIDTH + 30
        newDolphins.push({
          x: startX,
          y: BASE_HEIGHT * 0.7,
          jumpPhase: 0,
          direction,
          visible: true,
          startX
        })
      }

      // Check collision
      let collision = false
      let newExplosion = { ...prev.explosion }

      if (prev.gameStarted) {
        if (newBird.y - newBird.radius <= 0 || newBird.y + newBird.radius >= BASE_HEIGHT) {
          collision = true
          newExplosion = {
            active: true,
            x: newBird.x,
            y: newBird.y,
            frame: 0
          }
        }

        for (const pipe of newPipes) {
          if (
            newBird.x + newBird.radius > pipe.x &&
            newBird.x - newBird.radius < pipe.x + pipe.width &&
            (newBird.y - newBird.radius < pipe.gapY || newBird.y + newBird.radius > pipe.gapY + pipe.gapHeight)
          ) {
            collision = true
            newExplosion = {
              active: true,
              x: newBird.x,
              y: newBird.y,
              frame: 0
            }
            break
          }
        }
      }

      // Update explosion animation
      if (newExplosion.active) {
        newExplosion.frame += 1
        if (newExplosion.frame > 30) { // Animation lasts 30 frames
          newExplosion.active = false
        }
      }

      return {
        ...prev,
        bird: newBird,
        pipes: newPipes,
        dolphins: newDolphins,
        score: newScore,
        gameOver: collision,
        explosion: newExplosion,
        frameCount: newFrameCount
      }
    })
  }

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setGameState(currentState => {
      ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT)

      // Beach sky gradient (50%)
      const skyGradient = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT * 0.5)
      skyGradient.addColorStop(0, '#87CEEB')
      skyGradient.addColorStop(0.5, '#ADD8E6')
      skyGradient.addColorStop(1, '#F0E68C')
      ctx.fillStyle = skyGradient
      ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT * 0.5)

      // Sea background (20% - reduced size)
      const seaGradient = ctx.createLinearGradient(0, BASE_HEIGHT * 0.5, 0, BASE_HEIGHT * 0.7)
      seaGradient.addColorStop(0, '#20B2AA')
      seaGradient.addColorStop(0.5, '#008B8B')
      seaGradient.addColorStop(1, '#006666')
      ctx.fillStyle = seaGradient
      ctx.fillRect(0, BASE_HEIGHT * 0.5, BASE_WIDTH, BASE_HEIGHT * 0.2)

      // Animated sea waves
      const waveHeight = 6
      const waveLength = BASE_WIDTH / 3
      const waveSpeed = currentState.frameCount * 0.05

      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 3
      ctx.beginPath()

      for (let x = 0; x <= BASE_WIDTH; x += 2) {
        const y = BASE_HEIGHT * 0.7 + Math.sin((x / waveLength + waveSpeed) * Math.PI * 2) * waveHeight
        if (x === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()

      // Secondary smaller waves
      ctx.strokeStyle = '#E0FFFF'
      ctx.lineWidth = 2
      ctx.beginPath()

      for (let x = 0; x <= BASE_WIDTH; x += 2) {
        const y = BASE_HEIGHT * 0.7 + Math.sin((x / waveLength + waveSpeed * 1.3) * Math.PI * 2) * waveHeight * 0.4 + 3
        if (x === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()

      // Beach sand (30%)
      ctx.fillStyle = '#F4A460'
      ctx.fillRect(0, BASE_HEIGHT * 0.7, BASE_WIDTH, BASE_HEIGHT * 0.3)

      // Add some texture to sand with dots
      ctx.fillStyle = '#DEB887'
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * BASE_WIDTH
        const y = BASE_HEIGHT * 0.7 + Math.random() * BASE_HEIGHT * 0.3
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw dolphins
      currentState.dolphins.forEach(dolphin => {
        if (!dolphin.visible) return

        const centerX = dolphin.x
        const centerY = dolphin.y
        const size = 16

        // Dolphin body (main ellipse)
        ctx.fillStyle = '#C0C0C0'
        ctx.beginPath()
        ctx.ellipse(centerX, centerY, size, size * 0.6, 0, 0, Math.PI * 2)
        ctx.fill()

        // Add body outline for visibility
        ctx.strokeStyle = '#808080'
        ctx.lineWidth = 2
        ctx.stroke()

        // Dolphin snout
        const snoutDirection = dolphin.direction
        ctx.fillStyle = '#C0C0C0'
        ctx.beginPath()
        ctx.ellipse(centerX + snoutDirection * size * 0.7, centerY - size * 0.1, size * 0.4, size * 0.3, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#808080'
        ctx.lineWidth = 2
        ctx.stroke()

        // Dolphin tail
        ctx.fillStyle = '#C0C0C0'
        ctx.beginPath()
        ctx.ellipse(centerX - snoutDirection * size * 0.8, centerY + size * 0.2, size * 0.5, size * 0.8, Math.PI * 0.3 * snoutDirection, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#808080'
        ctx.lineWidth = 2
        ctx.stroke()

        // Dolphin dorsal fin
        ctx.fillStyle = '#A9A9A9'
        ctx.beginPath()
        ctx.ellipse(centerX, centerY - size * 0.6, size * 0.3, size * 0.4, 0, 0, Math.PI)
        ctx.fill()
        ctx.strokeStyle = '#808080'
        ctx.lineWidth = 2
        ctx.stroke()

        // Simple eye
        ctx.fillStyle = '#000000'
        ctx.beginPath()
        ctx.arc(centerX + snoutDirection * size * 0.2, centerY - size * 0.2, 3, 0, Math.PI * 2)
        ctx.fill()
      })

      currentState.pipes.forEach(pipe => {
        // Draw cactus top part
        ctx.fillStyle = '#228B22'
        ctx.fillRect(pipe.x + pipe.width * 0.2, 0, pipe.width * 0.6, pipe.gapY)

        // Cactus arms (top)
        if (pipe.gapY > 100) {
          ctx.fillRect(pipe.x, pipe.gapY * 0.3, pipe.width * 0.3, pipe.width * 0.2)
          ctx.fillRect(pipe.x + pipe.width * 0.7, pipe.gapY * 0.6, pipe.width * 0.3, pipe.width * 0.2)
        }

        // Draw cactus bottom part
        ctx.fillRect(pipe.x + pipe.width * 0.2, pipe.gapY + pipe.gapHeight, pipe.width * 0.6, BASE_HEIGHT - pipe.gapY - pipe.gapHeight)

        // Cactus arms (bottom)
        if (BASE_HEIGHT - pipe.gapY - pipe.gapHeight > 100) {
          const bottomHeight = BASE_HEIGHT - pipe.gapY - pipe.gapHeight
          ctx.fillRect(pipe.x, pipe.gapY + pipe.gapHeight + bottomHeight * 0.2, pipe.width * 0.3, pipe.width * 0.2)
          ctx.fillRect(pipe.x + pipe.width * 0.7, pipe.gapY + pipe.gapHeight + bottomHeight * 0.5, pipe.width * 0.3, pipe.width * 0.2)
        }

        // Add cactus spines
        ctx.strokeStyle = '#006400'
        ctx.lineWidth = 1

        // Vertical spines on main body
        for (let i = 0; i < 3; i++) {
          const spineX = pipe.x + pipe.width * 0.3 + i * pipe.width * 0.15
          // Top cactus spines
          ctx.beginPath()
          ctx.moveTo(spineX, 10)
          ctx.lineTo(spineX, pipe.gapY - 10)
          ctx.stroke()

          // Bottom cactus spines
          ctx.beginPath()
          ctx.moveTo(spineX, pipe.gapY + pipe.gapHeight + 10)
          ctx.lineTo(spineX, BASE_HEIGHT - 10)
          ctx.stroke()
        }

        // Cactus outline
        ctx.strokeStyle = '#006400'
        ctx.lineWidth = 2
        ctx.strokeRect(pipe.x + pipe.width * 0.2, 0, pipe.width * 0.6, pipe.gapY)
        ctx.strokeRect(pipe.x + pipe.width * 0.2, pipe.gapY + pipe.gapHeight, pipe.width * 0.6, BASE_HEIGHT - pipe.gapY - pipe.gapHeight)
      })

      // Draw volleyball - only if not exploded
      if (!currentState.explosion.active || !currentState.gameOver) {
        const centerX = currentState.bird.x
        const centerY = currentState.bird.y
        const radius = currentState.bird.radius
        const diameter = radius * 2

        // Use volleyball image if loaded, otherwise fallback to simple circle
        if (volleyballImageRef.current) {
          ctx.drawImage(
            volleyballImageRef.current,
            centerX - radius,
            centerY - radius,
            diameter,
            diameter
          )
        } else {
          // Fallback: simple volleyball circle
          ctx.fillStyle = '#FFFFFF'
          ctx.beginPath()
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
          ctx.fill()

          // Add simple volleyball lines
          ctx.strokeStyle = '#FF6B6B'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(centerX - radius, centerY)
          ctx.lineTo(centerX + radius, centerY)
          ctx.moveTo(centerX, centerY - radius)
          ctx.lineTo(centerX, centerY + radius)
          ctx.stroke()
        }
      }

      // Draw explosion effect
      if (currentState.explosion.active) {
        const explosionSize = currentState.explosion.frame * 3
        const centerX = currentState.explosion.x
        const centerY = currentState.explosion.y

        // Draw explosion particles
        ctx.fillStyle = '#FF4500' // Orange-red
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI * 2) / 8
          const distance = explosionSize
          const x = centerX + Math.cos(angle) * distance
          const y = centerY + Math.sin(angle) * distance

          ctx.beginPath()
          ctx.arc(x, y, Math.max(1, 8 - currentState.explosion.frame * 0.3), 0, Math.PI * 2)
          ctx.fill()
        }

        // Draw central explosion
        ctx.fillStyle = '#FFD700' // Yellow
        ctx.beginPath()
        ctx.arc(centerX, centerY, Math.max(1, explosionSize * 0.5), 0, Math.PI * 2)
        ctx.fill()

        // Draw explosion sparks
        ctx.fillStyle = '#FFFFFF' // White sparks
        for (let i = 0; i < 12; i++) {
          const angle = (i * Math.PI * 2) / 12
          const distance = explosionSize * 1.5
          const x = centerX + Math.cos(angle) * distance
          const y = centerY + Math.sin(angle) * distance

          ctx.beginPath()
          ctx.arc(x, y, 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.fillStyle = '#000'
      ctx.font = `bold ${Math.max(16, 24 * scale)}px Arial`
      ctx.textAlign = 'center'
      ctx.fillText(`Score: ${currentState.score}`, BASE_WIDTH / 2, 40)

      if (!currentState.gameStarted && !currentState.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT)

        ctx.fillStyle = '#FFF'
        ctx.font = `bold ${Math.max(20, 32 * scale)}px Arial`
        ctx.fillText('Beach Volleyball', BASE_WIDTH / 2, BASE_HEIGHT / 2 - 50)

        ctx.font = `${Math.max(14, 18 * scale)}px Arial`
        ctx.fillText('Tap to Bounce!', BASE_WIDTH / 2, BASE_HEIGHT / 2 + 20)

        ctx.font = `${Math.max(10, 14 * scale)}px Arial`
        ctx.fillText('Desktop: Space or ↑ Arrow | Mobile: Tap', BASE_WIDTH / 2, BASE_HEIGHT / 2 + 60)
      }

      if (currentState.gameOver) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)'
        ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT)

        ctx.fillStyle = '#FFF'
        ctx.font = `bold ${Math.max(20, 32 * scale)}px Arial`
        ctx.fillText('Game Over', BASE_WIDTH / 2, BASE_HEIGHT / 2 - 50)

        ctx.font = `${Math.max(14, 18 * scale)}px Arial`
        ctx.fillText(`Final Score: ${currentState.score}`, BASE_WIDTH / 2, BASE_HEIGHT / 2)
        ctx.fillText('Tap to Play Again', BASE_WIDTH / 2, BASE_HEIGHT / 2 + 30)
      }

      return currentState
    })
  }

  useEffect(() => {
    const animate = () => {
      gameLoop()
      draw()
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        jump()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [jump])

  const handleTouch = (e: React.TouchEvent) => {
    e.preventDefault()
    jump()
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    jump()
  }

  return (
    <div className="flex items-center justify-center min-h-screen w-full p-1 sm:p-2">
      <canvas
        ref={canvasRef}
        width={BASE_WIDTH}
        height={BASE_HEIGHT}
        className="border border-white sm:border-2 rounded-md sm:rounded-lg shadow-xl sm:shadow-2xl cursor-pointer select-none"
        onTouchStart={handleTouch}
        onClick={handleClick}
        style={{
          touchAction: 'none',
          width: `${canvasSize.width}px`,
          height: `${canvasSize.height}px`,
          maxWidth: '100vw',
          maxHeight: 'calc(100vh - 20px)'
        }}
      />
    </div>
  )
}