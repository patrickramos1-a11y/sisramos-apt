import { useState, useRef, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableCardProps {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
}

export default function SwipeableCard({
  children,
  onEdit,
  onDelete,
  disabled = false,
}: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const ACTION_WIDTH = 120; // Width of action buttons area
  const THRESHOLD = 50; // Minimum swipe distance to trigger open/close

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || disabled) return;
    
    const diff = e.touches[0].clientX - startXRef.current;
    let newTranslateX = currentXRef.current + diff;
    
    // Limit the swipe range
    newTranslateX = Math.max(-ACTION_WIDTH, Math.min(0, newTranslateX));
    
    setTranslateX(newTranslateX);
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current || disabled) return;
    isDraggingRef.current = false;

    // Determine if we should snap open or closed
    if (translateX < -THRESHOLD) {
      setTranslateX(-ACTION_WIDTH);
      setIsOpen(true);
    } else {
      setTranslateX(0);
      setIsOpen(false);
    }
  };

  const handleClose = () => {
    setTranslateX(0);
    setIsOpen(false);
  };

  const handleEdit = () => {
    handleClose();
    onEdit?.();
  };

  const handleDelete = () => {
    handleClose();
    onDelete?.();
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Action buttons revealed on swipe */}
      <div 
        className={cn(
          "absolute right-0 top-0 bottom-0 flex items-stretch",
          "transition-opacity duration-200",
          isOpen || translateX < 0 ? "opacity-100" : "opacity-0"
        )}
        style={{ width: ACTION_WIDTH }}
      >
        <Button
          variant="ghost"
          className="flex-1 h-full rounded-none bg-muted hover:bg-muted/80 border-r border-border"
          onClick={handleEdit}
        >
          <Pencil className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          className="flex-1 h-full rounded-none bg-destructive/10 hover:bg-destructive/20 text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Main card content */}
      <div
        className={cn(
          "relative bg-card transition-transform",
          isDraggingRef.current ? "duration-0" : "duration-200 ease-out"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={isOpen ? handleClose : undefined}
      >
        {children}
      </div>
    </div>
  );
}
