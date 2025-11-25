'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';

interface JsonEditorProps {
  name: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export function JsonEditor({ name, value, onChange, disabled }: JsonEditorProps) {
  const [jsonString, setJsonString] = useState(value || '{}');
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (value) {
      setJsonString(value);
    }
  }, [value]);

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
        <Label htmlFor={name}>Configuration JSON</Label>
        <button
          type="button"
          onClick={formatJson}
          disabled={disabled || !isValid}
          className="text-sm px-3 py-1 border-2 border-black hover:bg-black hover:text-white transition-colors disabled:opacity-50"
        >
          Format JSON
        </button>
      </div>

      <textarea
        id={name}
        name={name}
        value={jsonString}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        className={`w-full min-h-[400px] p-4 font-mono text-sm border-2 ${
          isValid ? 'border-black' : 'border-destructive'
        } focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50`}
        placeholder='{"key": "value"}'
      />

      {!isValid && (
        <p className="text-sm text-destructive">
          Invalid JSON: {errorMessage}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Enter your configuration as valid JSON. Use the Format button to beautify.
      </p>
    </div>
  );
}
