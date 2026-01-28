"use client";

import { useState, useRef, useEffect } from "react";
import { Code, Copy, Check } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogBody,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@togglebox/ui";

type SdkType = "javascript" | "nextjs" | "expo" | "php" | "laravel";
type EntityType = "config" | "flag" | "experiment";

interface SdkCodeDialogProps {
  type: EntityType;
  platform: string;
  environment: string;
  itemKey: string;
  metricEventName?: string;
}

const SDK_LABELS: Record<SdkType, string> = {
  javascript: "JavaScript",
  nextjs: "Next.js",
  expo: "Expo",
  php: "PHP",
  laravel: "Laravel",
};

function generateCodeSnippet(
  type: EntityType,
  sdk: SdkType,
  params: {
    platform: string;
    environment: string;
    itemKey: string;
    metricEventName?: string;
  },
): string {
  const { itemKey, metricEventName } = params;

  switch (type) {
    case "config":
      return generateConfigSnippet(sdk, itemKey);
    case "flag":
      return generateFlagSnippet(sdk, itemKey);
    case "experiment":
      return generateExperimentSnippet(sdk, itemKey, metricEventName);
  }
}

function generateConfigSnippet(sdk: SdkType, key: string): string {
  switch (sdk) {
    case "javascript":
      return `import { ToggleBoxClient } from "@togglebox/sdk";

const client = new ToggleBoxClient({
  platform: "your-platform",
  environment: "production",
  apiUrl: "https://api.example.com",
});

// Get config value with default fallback
const value = await client.getConfigValue("${key}", "default-value");
console.log(value);`;

    case "nextjs":
      return `import { useConfig } from "@togglebox/sdk-nextjs";

function MyComponent() {
  const { getConfigValue, isLoading } = useConfig();

  if (isLoading) return <div>Loading...</div>;

  // Get config value with default fallback
  const value = getConfigValue("${key}", "default-value");

  return <div>Config value: {value}</div>;
}`;

    case "expo":
      return `import { useToggleBox } from "@togglebox/sdk-expo";

function MyComponent() {
  const { getConfigValue, isLoading } = useToggleBox();

  if (isLoading) return <Text>Loading...</Text>;

  // Get config value with default fallback
  const value = getConfigValue("${key}", "default-value");

  return <Text>Config value: {value}</Text>;
}`;

    case "php":
      return `<?php

use ToggleBox\\Client;

$client = new Client([
    'platform' => 'your-platform',
    'environment' => 'production',
    'apiUrl' => 'https://api.example.com',
]);

// Get config value with default fallback
$value = $client->getConfigValue('${key}', 'default-value');
echo $value;`;

    case "laravel":
      return `<?php

use ToggleBox\\Facades\\ToggleBox;

// Get config value with default fallback
$value = ToggleBox::getConfigValue('${key}', 'default-value');

// Or use the helper function
$value = togglebox_config('${key}', 'default-value');`;
  }
}

function generateFlagSnippet(sdk: SdkType, key: string): string {
  switch (sdk) {
    case "javascript":
      return `import { ToggleBoxClient } from "@togglebox/sdk";

const client = new ToggleBoxClient({
  platform: "your-platform",
  environment: "production",
  apiUrl: "https://api.example.com",
});

// Check if flag is enabled with user context
const enabled = await client.isFlagEnabled("${key}", {
  userId: "user-123",
  email: "user@example.com",
});

if (enabled) {
  // Feature is enabled for this user
}`;

    case "nextjs":
      return `import { useFlag } from "@togglebox/sdk-nextjs";

function MyComponent() {
  const { checkEnabled, isLoading } = useFlag("${key}");

  if (isLoading) return <div>Loading...</div>;

  // Check if flag is enabled with user context
  const enabled = checkEnabled({
    userId: "user-123",
    email: "user@example.com",
  });

  if (enabled) {
    return <NewFeature />;
  }

  return <OldFeature />;
}`;

    case "expo":
      return `import { useToggleBox } from "@togglebox/sdk-expo";

function MyComponent() {
  const { isFlagEnabled, isLoading } = useToggleBox();

  if (isLoading) return <Text>Loading...</Text>;

  // Check if flag is enabled with user context
  const enabled = isFlagEnabled("${key}", {
    userId: "user-123",
    email: "user@example.com",
  });

  if (enabled) {
    return <NewFeature />;
  }

  return <OldFeature />;
}`;

    case "php":
      return `<?php

use ToggleBox\\Client;

$client = new Client([
    'platform' => 'your-platform',
    'environment' => 'production',
    'apiUrl' => 'https://api.example.com',
]);

// Check if flag is enabled with user context
$enabled = $client->isFlagEnabled('${key}', [
    'userId' => 'user-123',
    'email' => 'user@example.com',
]);

if ($enabled) {
    // Feature is enabled for this user
}`;

    case "laravel":
      return `<?php

use ToggleBox\\Facades\\ToggleBox;

// Check if flag is enabled with user context
$enabled = ToggleBox::isFlagEnabled('${key}', [
    'userId' => auth()->id(),
    'email' => auth()->user()->email,
]);

if ($enabled) {
    // Feature is enabled for this user
}

// Or use the helper function
if (togglebox_flag('${key}')) {
    // Feature is enabled
}`;
  }
}

function generateExperimentSnippet(
  sdk: SdkType,
  key: string,
  metricEventName?: string,
): string {
  const eventName = metricEventName || "conversion";

  switch (sdk) {
    case "javascript":
      return `import { ToggleBoxClient } from "@togglebox/sdk";

const client = new ToggleBoxClient({
  platform: "your-platform",
  environment: "production",
  apiUrl: "https://api.example.com",
});

// Get variant assignment for user
const variant = await client.getVariant("${key}", {
  userId: "user-123",
  email: "user@example.com",
});

// Render based on variant
if (variant === "control") {
  // Show control experience
} else if (variant === "treatment") {
  // Show treatment experience
}

// Track conversion when user completes action
await client.trackConversion("${key}", "${eventName}", {
  userId: "user-123",
});`;

    case "nextjs":
      return `import { useExperiment, useAnalytics } from "@togglebox/sdk-nextjs";

function MyComponent() {
  const { getVariant, isLoading } = useExperiment("${key}", {
    userId: "user-123",
  });
  const { trackConversion } = useAnalytics();

  if (isLoading) return <div>Loading...</div>;

  const variant = getVariant();

  const handleConversion = () => {
    // Track conversion when user completes action
    trackConversion("${key}", "${eventName}", { userId: "user-123" });
  };

  if (variant === "control") {
    return <ControlExperience onConvert={handleConversion} />;
  }

  return <TreatmentExperience onConvert={handleConversion} />;
}`;

    case "expo":
      return `import { useToggleBox } from "@togglebox/sdk-expo";

function MyComponent() {
  const { getVariant, trackConversion, isLoading } = useToggleBox();

  if (isLoading) return <Text>Loading...</Text>;

  const variant = getVariant("${key}", {
    userId: "user-123",
  });

  const handleConversion = () => {
    // Track conversion when user completes action
    trackConversion("${key}", "${eventName}", { userId: "user-123" });
  };

  if (variant === "control") {
    return <ControlExperience onConvert={handleConversion} />;
  }

  return <TreatmentExperience onConvert={handleConversion} />;
}`;

    case "php":
      return `<?php

use ToggleBox\\Client;

$client = new Client([
    'platform' => 'your-platform',
    'environment' => 'production',
    'apiUrl' => 'https://api.example.com',
]);

// Get variant assignment for user
$variant = $client->getVariant('${key}', [
    'userId' => 'user-123',
    'email' => 'user@example.com',
]);

// Render based on variant
if ($variant === 'control') {
    // Show control experience
} else {
    // Show treatment experience
}

// Track conversion when user completes action
$client->trackConversion('${key}', '${eventName}', [
    'userId' => 'user-123',
]);`;

    case "laravel":
      return `<?php

use ToggleBox\\Facades\\ToggleBox;

// Get variant assignment for user
$variant = ToggleBox::getVariant('${key}', [
    'userId' => auth()->id(),
    'email' => auth()->user()->email,
]);

// Render based on variant in Blade template
// @if(togglebox_variant('${key}') === 'treatment')
//     @include('experiment.treatment')
// @else
//     @include('experiment.control')
// @endif

// Track conversion when user completes action
ToggleBox::trackConversion('${key}', '${eventName}', [
    'userId' => auth()->id(),
]);`;
  }
}

export function SdkCodeDialog({
  type,
  platform,
  environment,
  itemKey,
  metricEventName,
}: SdkCodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedSdk, setSelectedSdk] = useState<SdkType>("javascript");
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const codeSnippet = generateCodeSnippet(type, selectedSdk, {
    platform,
    environment,
    itemKey,
    metricEventName,
  });

  async function handleCopy() {
    await navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenChange(newOpen: boolean) {
    setCopied(false);
    setOpen(newOpen);
  }

  const typeLabels: Record<EntityType, string> = {
    config: "config parameter",
    flag: "feature flag",
    experiment: "experiment",
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" title="Show integration code">
          <Code className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent size="2xl">
        <DialogHeader>
          <DialogTitle>Integration Code</DialogTitle>
          <DialogDescription>
            Use this code to integrate the{" "}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
              {itemKey}
            </code>{" "}
            {typeLabels[type]} into your application
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Tabs
            value={selectedSdk}
            onValueChange={(value) => setSelectedSdk(value as SdkType)}
          >
            <TabsList>
              {(Object.keys(SDK_LABELS) as SdkType[]).map((sdk) => (
                <TabsTrigger key={sdk} value={sdk}>
                  {SDK_LABELS[sdk]}
                </TabsTrigger>
              ))}
            </TabsList>

            {(Object.keys(SDK_LABELS) as SdkType[]).map((sdk) => (
              <TabsContent key={sdk} value={sdk}>
                <div className="relative">
                  <pre className="p-4 bg-gray-50 rounded-lg font-mono text-xs overflow-x-auto border border-black/10 max-h-96 overflow-y-auto">
                    <code>{codeSnippet}</code>
                  </pre>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 mr-1.5 text-success" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <p className="text-xs text-muted-foreground">
            Make sure you have the corresponding SDK package installed. See the{" "}
            <a
              href="https://github.com/ulpi-io/togglebox"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline hover:no-underline"
            >
              documentation
            </a>{" "}
            for setup instructions.
          </p>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
