"use client";

import { Input, Label, Select } from "@togglebox/ui";
import type { Platform, Environment } from "@/lib/api/types";
import { validateFlagKey } from "@/lib/validation/targeting";

export type FlagType = "boolean" | "string" | "number";

export interface BasicInfoStepProps {
  // Platform/Environment
  platforms: Platform[];
  environments: Environment[];
  selectedPlatform: string;
  selectedEnvironment: string;
  onPlatformChange: (platform: string) => void;
  onEnvironmentChange: (environment: string) => void;
  loadingPlatforms: boolean;
  loadingEnvironments: boolean;
  // Flag fields
  flagKey: string;
  name: string;
  description: string;
  flagType: FlagType;
  onFlagKeyChange: (key: string) => void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onFlagTypeChange: (type: FlagType) => void;
}

export function BasicInfoStep({
  platforms,
  environments,
  selectedPlatform,
  selectedEnvironment,
  onPlatformChange,
  onEnvironmentChange,
  loadingPlatforms,
  loadingEnvironments,
  flagKey,
  name,
  description,
  flagType,
  onFlagKeyChange,
  onNameChange,
  onDescriptionChange,
  onFlagTypeChange,
}: BasicInfoStepProps) {
  const flagKeyValidation = validateFlagKey(flagKey);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="platform">Platform *</Label>
          <Select
            id="platform"
            value={selectedPlatform}
            onChange={(e) => onPlatformChange(e.target.value)}
            disabled={loadingPlatforms}
          >
            <option value="">
              {loadingPlatforms ? "Loading..." : "Select platform"}
            </option>
            {platforms.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="environment">Environment *</Label>
          <Select
            id="environment"
            value={selectedEnvironment}
            onChange={(e) => onEnvironmentChange(e.target.value)}
            disabled={!selectedPlatform || loadingEnvironments}
          >
            <option value="">
              {loadingEnvironments ? "Loading..." : "Select environment"}
            </option>
            {environments.map((e) => (
              <option key={e.environment} value={e.environment}>
                {e.environment}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="flagKey">Flag Key *</Label>
        <Input
          id="flagKey"
          value={flagKey}
          onChange={(e) =>
            onFlagKeyChange(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))
          }
          placeholder="e.g., new-checkout-flow"
          className="font-mono"
        />
        {flagKey && !flagKeyValidation.valid && (
          <p className="text-xs text-destructive mt-1">
            {flagKeyValidation.error}
          </p>
        )}
        {(!flagKey || flagKeyValidation.valid) && (
          <p className="text-xs text-muted-foreground mt-1">
            Unique identifier. Only lowercase letters, numbers, hyphens,
            underscores. Must start with a letter.
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="name">Display Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g., New Checkout Flow"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="What does this flag control?"
        />
      </div>

      <div>
        <Label htmlFor="flagType">Value Type</Label>
        <Select
          id="flagType"
          value={flagType}
          onChange={(e) => onFlagTypeChange(e.target.value as FlagType)}
        >
          <option value="boolean">Boolean (true/false)</option>
          <option value="string">String</option>
          <option value="number">Number</option>
        </Select>
      </div>
    </div>
  );
}
