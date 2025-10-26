"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange: (date: Date | undefined) => void
  placeholder?: string
  className?: string
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  className,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={cn(
            "inline-flex items-center justify-start gap-2 text-left font-normal transition-all duration-200 hover:shadow-md hover:border-slate-400",
            "h-9 px-3 rounded-md border border-neutral-200 bg-white text-sm",
            "hover:bg-neutral-50",
            !date && "text-neutral-500",
            date && "text-neutral-900",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          {date ? format(date, "MMM dd, yyyy") : <span>{placeholder}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-4 shadow-2xl border border-neutral-200 bg-white" 
        align="start" 
        sideOffset={8}
        style={{ zIndex: 9999 }}
        onInteractOutside={() => setIsOpen(false)}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            onDateChange(selectedDate)
            setIsOpen(false)
          }}
          initialFocus={true}
          className="rounded-md border-0"
        />
      </PopoverContent>
    </Popover>
  )
}

