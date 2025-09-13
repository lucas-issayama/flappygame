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

interface GameState {
  bird: Bird
  pipes: Pipe[]
  score: number
  gameStarted: boolean
  gameOver: boolean
  explosion: {
    active: boolean
    x: number
    y: number
    frame: number
  }
}

const BASE_WIDTH = 400
const BASE_HEIGHT = 600
const BIRD_SIZE = 20
const PIPE_WIDTH = 60
const PIPE_GAP = 200
const GRAVITY = 0.3
const JUMP_FORCE = -7
const PIPE_SPEED = 2

export default function FlappyBirdGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

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


  const [gameState, setGameState] = useState<GameState>({
    bird: {
      x: BASE_WIDTH / 4,
      y: BASE_HEIGHT / 2,
      velocity: 0,
      radius: BIRD_SIZE / 2
    },
    pipes: [],
    score: 0,
    gameStarted: false,
    gameOver: false,
    explosion: {
      active: false,
      x: 0,
      y: 0,
      frame: 0
    }
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
      score: 0,
      gameStarted: false,
      gameOver: false,
      explosion: {
        active: false,
        x: 0,
        y: 0,
        frame: 0
      }
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
    const gapY = Math.random() * (BASE_HEIGHT - PIPE_GAP - 100) + 50
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
      let newScore = prev.score

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
          const gapY = Math.random() * (BASE_HEIGHT - PIPE_GAP - 100) + 50
          newPipes.push({
            x: BASE_WIDTH + 150,
            width: PIPE_WIDTH,
            gapY,
            gapHeight: PIPE_GAP,
            passed: false
          })
        } else if (newPipes[newPipes.length - 1].x < BASE_WIDTH - 200) {
          const gapY = Math.random() * (BASE_HEIGHT - PIPE_GAP - 100) + 50
          newPipes.push({
            x: BASE_WIDTH,
            width: PIPE_WIDTH,
            gapY,
            gapHeight: PIPE_GAP,
            passed: false
          })
        }
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
        score: newScore,
        gameOver: collision,
        explosion: newExplosion
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

      // Beach sky gradient
      const skyGradient = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT * 0.7)
      skyGradient.addColorStop(0, '#87CEEB')
      skyGradient.addColorStop(0.5, '#ADD8E6')
      skyGradient.addColorStop(1, '#F0E68C')
      ctx.fillStyle = skyGradient
      ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT * 0.7)

      // Beach sand
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

        // Create volleyball segments (6 segments total)
        for (let i = 0; i < 6; i++) {
          const startAngle = (i * Math.PI) / 3
          const endAngle = ((i + 1) * Math.PI) / 3

          ctx.beginPath()
          ctx.moveTo(centerX, centerY)
          ctx.arc(centerX, centerY, radius, startAngle, endAngle)
          ctx.closePath()

          // Alternate between yellow and blue segments
          if (i % 2 === 0) {
            ctx.fillStyle = '#FFD700' // Gold/Yellow
          } else {
            ctx.fillStyle = '#1E90FF' // Dodger Blue
          }
          ctx.fill()

          // Add segment border
          ctx.strokeStyle = '#333333'
          ctx.lineWidth = 1
          ctx.stroke()
        }

        // Add the characteristic volleyball lines
        ctx.strokeStyle = '#333333'
        ctx.lineWidth = 2

        // Three curved lines dividing the segments
        for (let i = 0; i < 3; i++) {
          const angle = (i * Math.PI) / 3
          ctx.beginPath()
          ctx.moveTo(
            centerX + Math.cos(angle) * radius,
            centerY + Math.sin(angle) * radius
          )
          ctx.lineTo(
            centerX - Math.cos(angle) * radius,
            centerY - Math.sin(angle) * radius
          )
          ctx.stroke()
        }

        // Outer border
        ctx.strokeStyle = '#333333'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        ctx.stroke()
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