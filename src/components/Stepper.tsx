"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type StepDefinition = {
  title: string;
  description: string;
};

type StepperProps = {
  steps: StepDefinition[];
  currentStep: number;
  maxCompletedStep: number;
  onStepClick: (index: number) => void;
};

export function Stepper({ steps, currentStep, maxCompletedStep, onStepClick }: StepperProps) {
  return (
    <nav className="grid gap-2">
      {steps.map((step, index) => {
        const active = index === currentStep;
        const completed = index < maxCompletedStep;
        const accessible = index <= maxCompletedStep;

        return (
          <button
            key={step.title}
            type="button"
            disabled={!accessible}
            onClick={() => onStepClick(index)}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition",
              active && "border-brand-300 bg-brand-50 text-brand-900",
              !active && accessible && "border-transparent bg-white text-ink-700 hover:border-brand-100 hover:bg-brand-50/60",
              !accessible && "cursor-not-allowed border-transparent bg-white/60 text-ink-300",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                active && "bg-brand-700 text-white",
                completed && !active && "bg-brand-100 text-brand-800",
                !active && !completed && accessible && "bg-ink-100 text-ink-600",
                !accessible && "bg-ink-100 text-ink-300",
              )}
            >
              {completed ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span>
              <span className="block text-sm font-semibold">{step.title}</span>
              <span className="mt-1 block text-xs leading-5 text-inherit opacity-75">{step.description}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
