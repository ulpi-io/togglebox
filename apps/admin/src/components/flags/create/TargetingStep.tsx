"use client";

import { Button, Input, Label, Select } from "@togglebox/ui";
import {
  validateCountryCode,
  validateLanguages,
  type ValidationResult,
} from "@/lib/validation/targeting";

export interface CountryLanguagePair {
  id: string;
  country: string;
  languages: string;
  serveValue: "A" | "B";
}

export interface TargetingStepProps {
  countryLanguagePairs: CountryLanguagePair[];
  forceIncludeUsers: string;
  forceExcludeUsers: string;
  includeUsersValidation: ValidationResult;
  excludeUsersValidation: ValidationResult;
  onCountryChange: (id: string, country: string) => void;
  onLanguagesChange: (id: string, languages: string) => void;
  onServeValueChange: (id: string, serveValue: "A" | "B") => void;
  onAddCountryLanguagePair: () => void;
  onRemoveCountryLanguagePair: (id: string) => void;
  onForceIncludeUsersChange: (value: string) => void;
  onForceExcludeUsersChange: (value: string) => void;
}

export function TargetingStep({
  countryLanguagePairs,
  forceIncludeUsers,
  forceExcludeUsers,
  includeUsersValidation,
  excludeUsersValidation,
  onCountryChange,
  onLanguagesChange,
  onServeValueChange,
  onAddCountryLanguagePair,
  onRemoveCountryLanguagePair,
  onForceIncludeUsersChange,
  onForceExcludeUsersChange,
}: TargetingStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Country + Language Targeting</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddCountryLanguagePair}
          >
            Add Country
          </Button>
        </div>
        {countryLanguagePairs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed rounded-lg">
            No country targeting. Flag will apply to all countries.
          </p>
        ) : (
          <div className="space-y-2">
            {countryLanguagePairs.map((pair) => {
              const countryValidation = validateCountryCode(pair.country);
              const langValidation = validateLanguages(pair.languages);
              return (
                <div key={pair.id} className="flex gap-2 items-start">
                  <div className="w-20">
                    <Input
                      value={pair.country}
                      onChange={(e) => onCountryChange(pair.id, e.target.value)}
                      placeholder="US"
                      maxLength={2}
                      className={`font-mono uppercase ${
                        pair.country && !countryValidation.valid
                          ? "border-destructive"
                          : ""
                      }`}
                    />
                    {pair.country && !countryValidation.valid && (
                      <p className="text-xs text-destructive mt-1">Invalid</p>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      value={pair.languages}
                      onChange={(e) =>
                        onLanguagesChange(pair.id, e.target.value)
                      }
                      placeholder="en, es, fr (optional)"
                      className={
                        langValidation.invalid.length > 0
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {langValidation.invalid.length > 0 && (
                      <p className="text-xs text-destructive mt-1">
                        Invalid: {langValidation.invalid.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="w-24">
                    <Select
                      value={pair.serveValue}
                      onChange={(e) =>
                        onServeValueChange(
                          pair.id,
                          e.target.value as "A" | "B",
                        )
                      }
                    >
                      <option value="A">Serve A</option>
                      <option value="B">Serve B</option>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onRemoveCountryLanguagePair(pair.id)}
                  >
                    ×
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="forceIncludeUsers">Force Include Users</Label>
        <textarea
          id="forceIncludeUsers"
          value={forceIncludeUsers}
          onChange={(e) => onForceIncludeUsersChange(e.target.value)}
          placeholder="user-id-1, user-id-2 (comma or newline separated)"
          className="w-full p-3 border-2 border-black/10 rounded-lg font-mono text-sm min-h-[80px] focus:outline-none focus:border-black/30"
        />
        {includeUsersValidation.valid.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {includeUsersValidation.valid.length} valid user(s)
          </p>
        )}
        {includeUsersValidation.duplicates.length > 0 && (
          <p className="text-xs text-warning mt-1">
            Duplicates ignored: {includeUsersValidation.duplicates.join(", ")}
          </p>
        )}
        {includeUsersValidation.invalid.length > 0 && (
          <p className="text-xs text-destructive mt-1">
            Invalid: {includeUsersValidation.invalid.join(", ")}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="forceExcludeUsers">Force Exclude Users</Label>
        <textarea
          id="forceExcludeUsers"
          value={forceExcludeUsers}
          onChange={(e) => onForceExcludeUsersChange(e.target.value)}
          placeholder="user-id-1, user-id-2 (comma or newline separated)"
          className="w-full p-3 border-2 border-black/10 rounded-lg font-mono text-sm min-h-[80px] focus:outline-none focus:border-black/30"
        />
        {excludeUsersValidation.valid.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {excludeUsersValidation.valid.length} valid user(s)
          </p>
        )}
        {excludeUsersValidation.duplicates.length > 0 && (
          <p className="text-xs text-warning mt-1">
            Duplicates ignored: {excludeUsersValidation.duplicates.join(", ")}
          </p>
        )}
        {excludeUsersValidation.invalid.length > 0 && (
          <p className="text-xs text-destructive mt-1">
            Invalid: {excludeUsersValidation.invalid.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
