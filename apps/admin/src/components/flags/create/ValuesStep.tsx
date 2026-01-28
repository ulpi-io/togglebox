"use client";

import { Checkbox, Input, Label, Select } from "@togglebox/ui";
import type { FlagType } from "./BasicInfoStep";

export interface ValuesStepProps {
  flagType: FlagType;
  valueA: string;
  valueB: string;
  enabled: boolean;
  onValueAChange: (value: string) => void;
  onValueBChange: (value: string) => void;
  onEnabledChange: (enabled: boolean) => void;
}

export function ValuesStep({
  flagType,
  valueA,
  valueB,
  enabled,
  onValueAChange,
  onValueBChange,
  onEnabledChange,
}: ValuesStepProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="valueA">Value A</Label>
          {flagType === "boolean" ? (
            <Select
              id="valueA"
              value={valueA}
              onChange={(e) => onValueAChange(e.target.value)}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </Select>
          ) : (
            <Input
              id="valueA"
              type={flagType === "number" ? "number" : "text"}
              value={valueA}
              onChange={(e) => onValueAChange(e.target.value)}
              className="font-mono"
            />
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Served to force-included users, matching targeting rules, or by
            rollout percentage
          </p>
        </div>
        <div>
          <Label htmlFor="valueB">Value B</Label>
          {flagType === "boolean" ? (
            <Select
              id="valueB"
              value={valueB}
              onChange={(e) => onValueBChange(e.target.value)}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </Select>
          ) : (
            <Input
              id="valueB"
              type={flagType === "number" ? "number" : "text"}
              value={valueB}
              onChange={(e) => onValueBChange(e.target.value)}
              className="font-mono"
            />
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Served to force-excluded users, matching targeting rules, or by
            rollout percentage
          </p>
        </div>
      </div>

      <div className="pt-4 border-t">
        <div className="flex items-center gap-2">
          <Checkbox
            id="enabled"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
          />
          <Label htmlFor="enabled" className="font-normal cursor-pointer">
            Enable flag immediately after creation
          </Label>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          When disabled, the flag serves Value B (the default)
        </p>
      </div>
    </div>
  );
}
