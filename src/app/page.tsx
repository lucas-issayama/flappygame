'use client'

import FlappyBirdGame from '@/components/FlappyBirdGame'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-400 to-blue-600 overflow-hidden">
      <FlappyBirdGame />
    </main>
  )
}