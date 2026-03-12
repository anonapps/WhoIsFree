"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDateForDisplay, formatTimeForDisplay } from "@/lib/timezone"

interface TimeSlotSelectorProps {
  timezone: string
  duration: number
  selectedSlots: Date[]
  onSlotsChange: (slots: Date[]) => void
}

// Generate time slots for a day (30-minute increments from 8am to 10pm)
function generateDaySlots(date: Date, timezone: string): Date[] {
  const slots: Date[] = []
  const startHour = 8
  const endHour = 22

  for (let hour = startHour; hour < endHour; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const slotDate = new Date(date)
      slotDate.setHours(hour, min, 0, 0)
      slots.push(slotDate)
    }
  }
  return slots
}

// Get the next 7 days starting from today
function getWeekDays(startDate: Date): Date[] {
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate)
    day.setDate(startDate.getDate() + i)
    day.setHours(0, 0, 0, 0)
    days.push(day)
  }
  return days
}

export function TimeSlotSelector({
  timezone,
  selectedSlots,
  onSlotsChange,
}: TimeSlotSelectorProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select')
  const [draggedSlots, setDraggedSlots] = useState<Set<string>>(new Set())
  const gridRef = useRef<HTMLDivElement>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() + (weekOffset * 7))
  
  const days = getWeekDays(weekStart)
  const timeSlots = generateDaySlots(new Date(), timezone)

  const isSlotSelected = useCallback((slot: Date) => {
    return selectedSlots.some(s => s.getTime() === slot.getTime())
  }, [selectedSlots])

  const getSlotKey = (day: Date, timeSlot: Date): string => {
    const slotDate = new Date(day)
    slotDate.setHours(timeSlot.getHours(), timeSlot.getMinutes(), 0, 0)
    return slotDate.toISOString()
  }

  const getSlotFromKey = (key: string): Date => {
    return new Date(key)
  }

  const handleMouseDown = (day: Date, timeSlot: Date, e: React.MouseEvent) => {
    e.preventDefault()
    const slotDate = new Date(day)
    slotDate.setHours(timeSlot.getHours(), timeSlot.getMinutes(), 0, 0)
    const key = getSlotKey(day, timeSlot)
    
    const isSelected = isSlotSelected(slotDate)
    setDragMode(isSelected ? 'deselect' : 'select')
    setIsDragging(true)
    setDraggedSlots(new Set([key]))
  }

  const handleMouseEnter = (day: Date, timeSlot: Date) => {
    if (!isDragging) return
    const key = getSlotKey(day, timeSlot)
    setDraggedSlots(prev => new Set([...prev, key]))
  }

  const applyDraggedSlots = useCallback(() => {
    if (draggedSlots.size === 0) return
    
    const slotsToToggle = Array.from(draggedSlots).map(getSlotFromKey)
    
    if (dragMode === 'select') {
      const newSlots = slotsToToggle.filter(s => !isSlotSelected(s))
      onSlotsChange([...selectedSlots, ...newSlots])
    } else {
      const keysToRemove = new Set(draggedSlots)
      onSlotsChange(selectedSlots.filter(s => !keysToRemove.has(s.toISOString())))
    }
  }, [draggedSlots, dragMode, isSlotSelected, selectedSlots, onSlotsChange])

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return
    
    applyDraggedSlots()
    
    setIsDragging(false)
    setDraggedSlots(new Set())
  }, [isDragging, applyDraggedSlots])

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp()
      }
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [isDragging, handleMouseUp])

  const getSlotStatus = (day: Date, timeSlot: Date): 'selected' | 'dragging' | 'none' => {
    const slotDate = new Date(day)
    slotDate.setHours(timeSlot.getHours(), timeSlot.getMinutes(), 0, 0)
    const key = slotDate.toISOString()
    
    if (isDragging && draggedSlots.has(key)) {
      return 'dragging'
    }
    if (isSlotSelected(slotDate)) {
      return 'selected'
    }
    return 'none'
  }

  // Check if a slot is in the past
  const isSlotInPast = (day: Date, timeSlot: Date): boolean => {
    const slotDate = new Date(day)
    slotDate.setHours(timeSlot.getHours(), timeSlot.getMinutes(), 0, 0)
    return slotDate < new Date()
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekOffset(w => w - 1)}
          disabled={weekOffset <= 0}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm font-medium">
          {formatDateForDisplay(days[0], timezone)} - {formatDateForDisplay(days[6], timezone)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekOffset(w => w + 1)}
          disabled={weekOffset >= 3}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Selection summary */}
      <div className="text-sm text-muted-foreground">
        {selectedSlots.length} time slot{selectedSlots.length !== 1 ? 's' : ''} selected
      </div>

      {/* Time grid */}
      <div 
        ref={gridRef}
        className="border border-border rounded-lg overflow-hidden select-none"
        onMouseLeave={() => isDragging && handleMouseUp()}
      >
        {/* Header row - days */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-muted border-b border-border">
          <div className="p-2" />
          {days.map((day, i) => (
            <div key={i} className="p-2 text-center text-sm font-medium border-l border-border">
              <div>{formatDateForDisplay(day, timezone).split(',')[0]}</div>
              <div className="text-xs text-muted-foreground">
                {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>

        {/* Time rows */}
        <div className="max-h-[400px] overflow-y-auto">
          {timeSlots.map((timeSlot, timeIdx) => (
            <div key={timeIdx} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border last:border-b-0">
              <div className="p-1.5 text-xs text-muted-foreground text-right pr-2 bg-muted/50">
                {formatTimeForDisplay(timeSlot, timezone)}
              </div>
              {days.map((day, dayIdx) => {
                const status = getSlotStatus(day, timeSlot)
                const isPast = isSlotInPast(day, timeSlot)
                
                return (
                  <div
                    key={dayIdx}
                    className={`
                      min-h-[28px] border-l border-border cursor-pointer transition-colors
                      ${isPast ? 'bg-muted/30 cursor-not-allowed' : ''}
                      ${status === 'selected' ? 'bg-primary hover:bg-primary/90' : ''}
                      ${status === 'dragging' && dragMode === 'select' ? 'bg-primary/60' : ''}
                      ${status === 'dragging' && dragMode === 'deselect' ? 'bg-destructive/30' : ''}
                      ${status === 'none' && !isPast ? 'hover:bg-primary/20' : ''}
                    `}
                    onMouseDown={(e) => !isPast && handleMouseDown(day, timeSlot, e)}
                    onMouseEnter={() => !isPast && handleMouseEnter(day, timeSlot)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-primary rounded" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-muted/30 rounded border border-border" />
          <span>Past</span>
        </div>
      </div>
    </div>
  )
}
