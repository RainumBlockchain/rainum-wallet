import { cn } from "@/lib/utils";

interface MovingGradientProps {
  children: React.ReactNode;
  animated?: boolean;
  className?: string;
  gradientClassName?: string;
}

export default function MovingGradient({
  children,
  animated = true,
  className,
  gradientClassName,
}: MovingGradientProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border bg-background", className)}>
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br",
          animated && "animate-gradient",
          gradientClassName
        )}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
