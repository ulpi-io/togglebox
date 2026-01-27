'use client';

import { useState } from 'react';
import { Button, Label } from '@togglebox/ui';

interface JsonEditorProps {
  name: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export function JsonEditor({ name, value, onChange, disabled }: JsonEditorProps) {
  // Initialize with prop value. Parent can use key prop to reset if needed.
  const [jsonString, setJsonString] = useState(value || '{}');
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  function handleChange(newValue: string) {
    setJsonString(newValue);

    // Validate JSON
    try {
      JSON.parse(newValue);
      setIsValid(true);
      setErrorMessage('');
      onChange?.(newValue);
    } catch (error: any) {
      setIsValid(false);
      setErrorMessage(error.message);
    }
  }

  function formatJson() {
    try {
      const parsed = JSON.parse(jsonString);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonString(formatted);
      setIsValid(true);
      setErrorMessage('');
      onChange?.(formatted);
    } catch (error: any) {
      setIsValid(false);
      setErrorMessage(error.message);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={name}>Remote Config JSON</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={formatJson}
          disabled={disabled || !isValid}
        >
          Format JSON
        </Button>
      </div>

      <textarea
        id={name}
        name={name}
        value={jsonString}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        className={`w-full min-h-[400px] p-4 font-mono text-sm border-2 ${
          isValid ? 'border-border' : 'border-destructive'
        } focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50`}
        placeholder='{"key": "value"}'
      />

      {!isValid && (
        <p className="text-sm text-destructive">
          Invalid JSON: {errorMessage}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Enter your remote config as valid JSON. Use the Format button to beautify.
      </p>
    </div>
  );
}
