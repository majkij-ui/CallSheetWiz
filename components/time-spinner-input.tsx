"use client"

import * as React from "react"
import { GripVertical, Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  clampMinutesToDay,
  hhmmToMinutes,
  minutesToHHMM,
  snapTo5Minutes,
} from "@/lib/time"

const STEP_MINUTES = 5
const BUTTON_STEP_MINUTES = 60
const PIXELS_PER_STEP = 8
const DRAG_THRESHOLD_PX = 4
const MAX_MOMENTUM_STEPS = 24

interface TimeSpinnerInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  fallbackMinutes?: number
  invalid?: boolean
  disabled?: boolean
  className?: string
}

interface DragState {
  pointerId: number
  startY: number
  baseMinutes: number
  lastY: number
  lastTime: number
  velocityY: number
  didDrag: boolean
}

function clampToSpinnerGrid(minutes: number): number {
  return Math.max(0, Math.min(1435, snapTo5Minutes(minutes)))
}

export function TimeSpinnerInput({
  id,
  label,
  value,
  onChange,
  fallbackMinutes = 0,
  invalid = false,
  disabled = false,
  className,
}: TimeSpinnerInputProps) {
  const [isSpinning, setIsSpinning] = React.useState(false)
  const dragRef = React.useRef<DragState | null>(null)
  const animationRef = React.useRef<number | null>(null)
  const valueRef = React.useRef(value)

  React.useEffect(() => {
    valueRef.current = value
  }, [value])

  const stopMomentum = React.useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    setIsSpinning(false)
  }, [])

  React.useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const publishMinutes = React.useCallback(
    (minutes: number) => {
      const nextValue = minutesToHHMM(clampMinutesToDay(minutes))
      valueRef.current = nextValue
      onChange(nextValue)
    },
    [onChange],
  )

  const getCurrentMinutes = React.useCallback(() => {
    return hhmmToMinutes(valueRef.current) ?? clampMinutesToDay(fallbackMinutes)
  }, [fallbackMinutes])

  const adjustBy = React.useCallback(
    (deltaMinutes: number) => {
      stopMomentum()
      publishMinutes(getCurrentMinutes() + deltaMinutes)
    },
    [getCurrentMinutes, publishMinutes, stopMomentum],
  )

  const startMomentum = React.useCallback(
    (velocityY: number) => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
      if (prefersReducedMotion || Math.abs(velocityY) < 0.2) {
        setIsSpinning(false)
        return
      }

      const extraSteps = Math.max(
        -MAX_MOMENTUM_STEPS,
        Math.min(MAX_MOMENTUM_STEPS, Math.round(-velocityY * 12)),
      )
      if (extraSteps === 0) {
        setIsSpinning(false)
        return
      }

      const startMinutes = clampToSpinnerGrid(getCurrentMinutes())
      const duration = Math.min(420, 180 + Math.abs(extraSteps) * 10)
      const startedAt = performance.now()
      let lastAppliedStep = 0

      const animate = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration)
        const easedProgress = 1 - Math.pow(1 - progress, 3)
        const appliedStep = Math.round(extraSteps * easedProgress)

        if (appliedStep !== lastAppliedStep) {
          lastAppliedStep = appliedStep
          publishMinutes(
            clampToSpinnerGrid(startMinutes + appliedStep * STEP_MINUTES),
          )
        }

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          animationRef.current = null
          setIsSpinning(false)
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    },
    [getCurrentMinutes, publishMinutes],
  )

  const handlePointerDown = (event: React.PointerEvent<HTMLInputElement>) => {
    if (disabled || !event.isPrimary || event.button !== 0) return

    stopMomentum()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      baseMinutes: clampToSpinnerGrid(getCurrentMinutes()),
      lastY: event.clientY,
      lastTime: performance.now(),
      velocityY: 0,
      didDrag: false,
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLInputElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const deltaY = event.clientY - drag.startY
    if (!drag.didDrag && Math.abs(deltaY) < DRAG_THRESHOLD_PX) return

    if (!drag.didDrag) {
      drag.didDrag = true
      setIsSpinning(true)
      event.currentTarget.blur()
    }

    event.preventDefault()
    const now = performance.now()
    const elapsed = Math.max(1, now - drag.lastTime)
    const instantVelocity = (event.clientY - drag.lastY) / elapsed
    drag.velocityY = drag.velocityY * 0.65 + instantVelocity * 0.35
    drag.lastY = event.clientY
    drag.lastTime = now

    const steps = Math.trunc(-deltaY / PIXELS_PER_STEP)
    publishMinutes(
      clampToSpinnerGrid(drag.baseMinutes + steps * STEP_MINUTES),
    )
  }

  const finishPointerInteraction = (
    event: React.PointerEvent<HTMLInputElement>,
  ) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null

    if (drag.didDrag) {
      startMomentum(drag.velocityY)
    }
  }

  const currentMinutes = hhmmToMinutes(value)
  const reelMinutes =
    currentMinutes === null
      ? clampToSpinnerGrid(fallbackMinutes)
      : clampToSpinnerGrid(currentMinutes)

  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-stretch rounded-md",
        invalid && "ring-destructive/20 dark:ring-destructive/40 ring-[3px]",
        className,
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="h-9 w-7 rounded-r-none px-0"
        onClick={() => adjustBy(-BUTTON_STEP_MINUTES)}
        disabled={disabled}
        aria-label={`Decrease ${label} by 1 hour`}
      >
        <Minus className="size-3.5" />
      </Button>

      <div className="relative min-w-0 flex-1">
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(event) => {
            valueRef.current = event.target.value
            onChange(event.target.value)
          }}
          onBlur={(event) => {
            const parsed = hhmmToMinutes(event.target.value)
            if (parsed !== null) publishMinutes(parsed)
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault()
              const direction = event.key === "ArrowUp" ? 1 : -1
              adjustBy(direction * (event.shiftKey ? 60 : STEP_MINUTES))
            }
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerInteraction}
          onPointerCancel={finishPointerInteraction}
          placeholder="HH:MM"
          autoComplete="off"
          disabled={disabled}
          aria-invalid={invalid}
          aria-label={`${label}. Type a time or drag vertically to adjust`}
          title="Type a time or drag vertically to adjust"
          className={cn(
            "h-9 rounded-none border-x-0 px-1 pr-5 text-center font-mono tabular-nums",
            "cursor-ns-resize touch-none",
            isSpinning && "text-transparent caret-transparent",
          )}
        />
        <GripVertical
          aria-hidden="true"
          className="pointer-events-none absolute right-0.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60"
        />

        {isSpinning && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden bg-background/95 font-mono text-sm tabular-nums"
          >
            <span className="absolute -translate-y-7 text-muted-foreground/35">
              {minutesToHHMM(clampToSpinnerGrid(reelMinutes - STEP_MINUTES))}
            </span>
            <span className="font-semibold text-foreground">
              {minutesToHHMM(reelMinutes)}
            </span>
            <span className="absolute translate-y-7 text-muted-foreground/35">
              {minutesToHHMM(clampToSpinnerGrid(reelMinutes + STEP_MINUTES))}
            </span>
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="h-9 w-7 rounded-l-none px-0"
        onClick={() => adjustBy(BUTTON_STEP_MINUTES)}
        disabled={disabled}
        aria-label={`Increase ${label} by 1 hour`}
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  )
}
