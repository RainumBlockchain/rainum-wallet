import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
}

export function Skeleton({ className, variant = "rectangular" }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]",
        variant === "circular" && "rounded-full",
        variant === "text" && "rounded h-4",
        variant === "rectangular" && "rounded",
        className
      )}
      style={{
        animation: "shimmer 2s infinite linear",
      }}
    />
  );
}

// Transaction card skeleton
export function TransactionCardSkeleton() {
  return (
    <div className="w-full flex items-center justify-between p-4 rounded border border-gray-200">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" className="w-10 h-10" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-4 w-20 ml-auto" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
    </div>
  );
}

// Balance skeleton
export function BalanceSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

// Address skeleton
export function AddressSkeleton() {
  return <Skeleton className="h-10 w-full" />;
}
