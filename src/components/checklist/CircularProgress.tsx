import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  completedCount?: number;
  notDoneCount?: number;
  totalCount?: number;
}

export default function CircularProgress({
  value,
  size = 40,
  strokeWidth = 3,
  className,
  completedCount,
  notDoneCount,
  totalCount,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // Multi-segment mode
  if (totalCount != null && totalCount > 0 && completedCount != null && notDoneCount != null) {
    const completedFrac = completedCount / totalCount;
    const notDoneFrac = notDoneCount / totalCount;

    const completedLen = completedFrac * circumference;
    const notDoneLen = notDoneFrac * circumference;
    const completedOffset = 0;
    const notDoneOffset = completedLen;

    const percent = Math.round((completedFrac) * 100);
    return (
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className={cn("transform -rotate-90", className)}
        >
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
          {completedLen > 0 && (
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth={strokeWidth} strokeDasharray={`${completedLen} ${circumference - completedLen}`} strokeDashoffset={0} strokeLinecap="round" className="transition-all duration-500 ease-out" />
          )}
          {notDoneLen > 0 && (
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--destructive))" strokeWidth={strokeWidth} strokeDasharray={`${notDoneLen} ${circumference - notDoneLen}`} strokeDashoffset={-notDoneOffset} strokeLinecap="round" className="transition-all duration-500 ease-out" />
          )}
        </svg>
        {size >= 36 && (
          <span className="absolute inset-0 flex items-center justify-center text-foreground font-semibold" style={{ fontSize: size * 0.22 }}>
            {percent}%
          </span>
        )}
      </div>
    );
  }

  // Fallback: single color mode
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg
      width={size}
      height={size}
      className={cn("transform -rotate-90", className)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
}
