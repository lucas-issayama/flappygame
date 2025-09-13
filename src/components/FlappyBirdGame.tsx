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
}

const CANVAS_WIDTH = 400
const CANVAS_HEIGHT = 600
const BIRD_SIZE = 20
const PIPE_WIDTH = 60
const PIPE_GAP = 150
const GRAVITY = 0.3
const JUMP_FORCE = -7
const PIPE_SPEED = 2

export default function FlappyBirdGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()


  const [gameState, setGameState] = useState<GameState>({
    bird: {
      x: CANVAS_WIDTH / 4,
      y: CANVAS_HEIGHT / 2,
      velocity: 0,
      radius: BIRD_SIZE / 2
    },
    pipes: [],
    score: 0,
    gameStarted: false,
    gameOver: false
  })

  const resetGame = useCallback(() => {
    setGameState({
      bird: {
        x: CANVAS_WIDTH / 4,
        y: CANVAS_HEIGHT / 2,
        velocity: 0,
        radius: BIRD_SIZE / 2
      },
      pipes: [],
      score: 0,
      gameStarted: false,
      gameOver: false
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
    const gapY = Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 100) + 50
    return {
      x,
      width: PIPE_WIDTH,
      gapY,
      gapHeight: PIPE_GAP,
      passed: false
    }
  }, [])

  const checkCollision = useCallback((bird: Bird, pipes: Pipe[]): boolean => {
    if (bird.y - bird.radius <= 0 || bird.y + bird.radius >= CANVAS_HEIGHT) {
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
          const gapY = Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 100) + 50
          newPipes.push({
            x: CANVAS_WIDTH + 150,
            width: PIPE_WIDTH,
            gapY,
            gapHeight: PIPE_GAP,
            passed: false
          })
        } else if (newPipes[newPipes.length - 1].x < CANVAS_WIDTH - 200) {
          const gapY = Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 100) + 50
          newPipes.push({
            x: CANVAS_WIDTH,
            width: PIPE_WIDTH,
            gapY,
            gapHeight: PIPE_GAP,
            passed: false
          })
        }
      }

      // Check collision
      let collision = false
      if (prev.gameStarted) {
        if (newBird.y - newBird.radius <= 0 || newBird.y + newBird.radius >= CANVAS_HEIGHT) {
          collision = true
        }

        for (const pipe of newPipes) {
          if (
            newBird.x + newBird.radius > pipe.x &&
            newBird.x - newBird.radius < pipe.x + pipe.width &&
            (newBird.y - newBird.radius < pipe.gapY || newBird.y + newBird.radius > pipe.gapY + pipe.gapHeight)
          ) {
            collision = true
            break
          }
        }
      }

      return {
        ...prev,
        bird: newBird,
        pipes: newPipes,
        score: newScore,
        gameOver: collision
      }
    })
  }

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setGameState(currentState => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      ctx.fillStyle = '#87CEEB'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT * 0.8)

      ctx.fillStyle = '#90EE90'
      ctx.fillRect(0, CANVAS_HEIGHT * 0.8, CANVAS_WIDTH, CANVAS_HEIGHT * 0.2)

      currentState.pipes.forEach(pipe => {
        ctx.fillStyle = '#228B22'
        ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapY)
        ctx.fillRect(pipe.x, pipe.gapY + pipe.gapHeight, pipe.width, CANVAS_HEIGHT - pipe.gapY - pipe.gapHeight)

        ctx.strokeStyle = '#006400'
        ctx.lineWidth = 3
        ctx.strokeRect(pipe.x, 0, pipe.width, pipe.gapY)
        ctx.strokeRect(pipe.x, pipe.gapY + pipe.gapHeight, pipe.width, CANVAS_HEIGHT - pipe.gapY - pipe.gapHeight)
      })

      ctx.fillStyle = '#FFD700'
      ctx.beginPath()
      ctx.arc(currentState.bird.x, currentState.bird.y, currentState.bird.radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#FFA500'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = '#000'
      ctx.font = 'bold 24px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`Score: ${currentState.score}`, CANVAS_WIDTH / 2, 40)

      if (!currentState.gameStarted && !currentState.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

        ctx.fillStyle = '#FFF'
        ctx.font = 'bold 32px Arial'
        ctx.fillText('Flappy Bird', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50)

        ctx.font = '18px Arial'
        ctx.fillText('Tap to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20)

        ctx.font = '14px Arial'
        ctx.fillText('Desktop: Space or ↑ Arrow | Mobile: Tap', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60)
      }

      if (currentState.gameOver) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)'
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

        ctx.fillStyle = '#FFF'
        ctx.font = 'bold 32px Arial'
        ctx.fillText('Game Over', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50)

        ctx.font = '18px Arial'
        ctx.fillText(`Final Score: ${currentState.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
        ctx.fillText('Tap to Restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30)
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
    <div className="flex flex-col items-center justify-center min-h-screen w-full p-2">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-white rounded-lg shadow-2xl cursor-pointer select-none"
        onTouchStart={handleTouch}
        onClick={handleClick}
        style={{
          touchAction: 'none',
          maxWidth: '100vw',
          maxHeight: '100vh'
        }}
      />
    </div>
  )
}