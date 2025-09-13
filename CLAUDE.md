# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js TypeScript web application featuring a beach volleyball game styled as a Flappy Bird clone. The game uses HTML5 Canvas for rendering and is mobile-responsive.

## Development Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS
- **Game Engine**: HTML5 Canvas with React hooks for state management

### Project Structure
- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - React components (main game logic in `FlappyBirdGame.tsx`)
- `src/app/globals.css` - Global styles including Tailwind directives

### Game Architecture
The main game component (`src/components/FlappyBirdGame.tsx`) uses:
- **Canvas scaling system**: Responsive design that adapts to screen size while maintaining aspect ratio
- **Game state management**: Single `GameState` interface managing bird physics, pipes, score, and explosion effects
- **Animation loop**: Uses `requestAnimationFrame` for smooth 60fps gameplay
- **Input handling**: Unified touch/click/keyboard input system

### Key Game Constants
- Base canvas dimensions: 400x600px
- Bird physics: Gravity 0.3, Jump force -7
- Pipe mechanics: 60px width, 200px gap, 2px/frame speed

### Mobile Optimization
- Responsive canvas scaling with `updateCanvasSize()` function
- Touch event handling with `touchAction: 'none'`
- Mobile-friendly meta tags in layout for fullscreen web app experience
- Orientation change handling

### Styling Patterns
- Uses Tailwind utility classes exclusively
- Mobile-first responsive design (`sm:` breakpoints)
- CSS-in-JS for dynamic canvas styling based on calculated dimensions