"use client";

import { forwardRef } from "react";
import { cn } from "../utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-black/20 bg-white/80 px-3 py-2 text-sm",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/40 focus:bg-white",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50",
          "placeholder:text-muted-foreground",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
