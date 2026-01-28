"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-black text-white",
        secondary: "bg-gray-100 text-gray-900",
        outline: "border border-black/20 text-gray-900 bg-transparent",
        destructive: "bg-destructive text-white",
        success: "bg-success text-white",
        warning: "bg-warning text-white",
        info: "bg-info text-white",
      },
      userRole: {
        admin: "bg-black text-white",
        developer: "bg-gray-700 text-white",
        editor: "bg-gray-600 text-white",
        viewer: "bg-gray-200 text-gray-900",
      },
      status: {
        active: "bg-success text-white",
        inactive: "bg-gray-200 text-gray-600",
        pending: "bg-warning text-white",
        error: "bg-destructive text-white",
        running: "bg-info text-white",
        completed: "bg-success text-white",
        paused: "bg-gray-400 text-white",
        draft: "bg-gray-200 text-gray-600",
        archived: "bg-gray-300 text-gray-600",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-sm",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({
  className,
  variant,
  userRole,
  status,
  size,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        badgeVariants({ variant, userRole, status, size }),
        className,
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
