'use client';

import { forwardRef, type ComponentType } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../utils/cn';

// Icons for default use
const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export interface Step {
  id: string;
  label: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
}

const stepVariants = cva(
  [
    'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2',
  ],
  {
    variants: {
      state: {
        completed: 'cursor-pointer hover:bg-gray-100',
        current: 'bg-black text-white',
        upcoming: 'cursor-pointer text-gray-500 hover:bg-gray-100',
      },
    },
    defaultVariants: {
      state: 'upcoming',
    },
  }
);

const stepNumberVariants = cva(
  [
    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
    'transition-all duration-200',
  ],
  {
    variants: {
      state: {
        completed: 'bg-green-100 text-green-700',
        current: 'bg-white text-black',
        upcoming: 'bg-gray-200 text-gray-600',
      },
    },
    defaultVariants: {
      state: 'upcoming',
    },
  }
);

const connectorVariants = cva(
  ['flex-1 h-0.5 transition-all duration-200'],
  {
    variants: {
      completed: {
        true: 'bg-green-500',
        false: 'bg-gray-200',
      },
    },
    defaultVariants: {
      completed: false,
    },
  }
);

export interface StepsProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: Step[];
  currentStep: string;
  onStepClick?: (stepId: string) => void;
  completedSteps?: Set<string>;
  orientation?: 'horizontal' | 'vertical';
}

export const Steps = forwardRef<HTMLDivElement, StepsProps>(
  (
    {
      steps,
      currentStep,
      onStepClick,
      completedSteps = new Set(),
      orientation = 'horizontal',
      className,
      ...props
    },
    ref
  ) => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);

    const getStepState = (step: Step): 'completed' | 'current' | 'upcoming' => {
      if (completedSteps.has(step.id)) return 'completed';
      if (step.id === currentStep) return 'current';
      return 'upcoming';
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col',
          className
        )}
        {...props}
      >
        {steps.map((step, index) => {
          const state = getStepState(step);
          const Icon = step.icon;
          const isLast = index === steps.length - 1;
          const isBeforeCurrent = index < currentIndex;

          return (
            <div
              key={step.id}
              className={cn(
                'flex',
                orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col',
                !isLast && (orientation === 'horizontal' ? 'flex-1' : '')
              )}
            >
              <button
                type="button"
                onClick={() => onStepClick?.(step.id)}
                className={cn(stepVariants({ state }))}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                <span className={cn(stepNumberVariants({ state }))}>
                  {state === 'completed' ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : Icon ? (
                    <Icon className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="text-sm font-medium">{step.label}</span>
              </button>

              {!isLast && (
                <div
                  className={cn(
                    connectorVariants({ completed: isBeforeCurrent || completedSteps.has(step.id) }),
                    orientation === 'horizontal' ? 'mx-2' : 'my-2 ml-6 w-0.5 h-8'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

Steps.displayName = 'Steps';

// Simpler inline step indicator for compact layouts
export interface StepIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  total: number;
  current: number;
  completed?: number[];
}

export const StepIndicator = forwardRef<HTMLDivElement, StepIndicatorProps>(
  ({ total, current, completed = [], className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-center gap-2', className)} {...props}>
        {Array.from({ length: total }).map((_, index) => {
          const isCompleted = completed.includes(index);
          const isCurrent = index === current;

          return (
            <div
              key={index}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-200',
                isCompleted ? 'bg-green-500' : isCurrent ? 'bg-black w-6' : 'bg-gray-300'
              )}
            />
          );
        })}
      </div>
    );
  }
);

StepIndicator.displayName = 'StepIndicator';
