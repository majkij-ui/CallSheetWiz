"use client"

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Category } from "@/lib/schedule-types"
import { NEON_TAG_COLORS, getCategoryStyle } from "@/lib/schedule-types"
import { Tag, X } from "lucide-react"

interface TagManagerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  onAddTag: (tag: Category) => void
  onDeleteTag: (tagId: string) => void
}

export function TagManagerModal({
  open,
  onOpenChange,
  categories,
  onAddTag,
  onDeleteTag,
}: TagManagerModalProps) {
  const [label, setLabel] = useState("")
  const [selectedColor, setSelectedColor] = useState<string>(NEON_TAG_COLORS[0])

  const canSave = label.trim().length > 0
  const normalizedExisting = useMemo(
    () => new Set(categories.map((cat) => cat.label.trim().toLowerCase())),
    [categories]
  )

  const handleSave = () => {
    const trimmed = label.trim()
    if (!trimmed) return
    if (normalizedExisting.has(trimmed.toLowerCase())) return

    onAddTag({
      id: crypto.randomUUID(),
      label: trimmed,
      color: selectedColor,
    })
    setLabel("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="size-5" />
            Manage Tags
          </DialogTitle>
          <DialogDescription>
            Create, recolor, and remove custom tags for your timeline and call sheet.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="text-sm font-medium text-foreground">Add new tag</h3>
            <div className="space-y-1.5">
              <Label htmlFor="tag-label">Label</Label>
              <Input
                id="tag-label"
                placeholder="e.g. Wardrobe"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSave())}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-8 gap-2">
                {NEON_TAG_COLORS.map((color) => {
                  const isSelected = selectedColor === color
                  return (
                    <button
                      key={color}
                      type="button"
                      className="relative h-7 w-7 rounded-full border transition-transform hover:scale-105"
                      style={{
                        backgroundColor: color,
                        borderColor: isSelected ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)",
                        boxShadow: isSelected ? `0 0 0 2px ${color}66` : "none",
                      }}
                      onClick={() => setSelectedColor(color)}
                      aria-label={`Choose ${color} color`}
                    />
                  )
                })}
              </div>
            </div>

            <Button
              type="button"
              className="self-start bg-foreground text-background hover:bg-foreground/90"
              onClick={handleSave}
              disabled={!canSave}
            >
              Save Tag
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-foreground">Existing tags</h3>
            <ScrollArea className="h-[220px] rounded-md border border-border">
              <div className="flex flex-wrap gap-2 p-3">
                {categories.length === 0 ? (
                  <p className="w-full py-6 text-center text-sm text-muted-foreground">
                    No tags yet. Add one above.
                  </p>
                ) : (
                  categories.map((cat) => {
                    const style = getCategoryStyle(cat)
                    return (
                      <div
                        key={cat.id}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs"
                        style={{
                          backgroundColor: style.bgColor,
                          borderColor: style.borderColor,
                          color: style.textColor,
                        }}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: style.dotColor }} />
                        <span>{style.label}</span>
                        <button
                          type="button"
                          onClick={() => onDeleteTag(cat.id)}
                          className="ml-1 rounded-full p-0.5 text-current/80 hover:bg-white/10 hover:text-current"
                          aria-label={`Delete ${cat.label} tag`}
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
