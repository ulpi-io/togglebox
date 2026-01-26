'use client';

import Link from 'next/link';
import { Button } from '@togglebox/ui';

interface CreateEntityButtonProps {
  entityType: 'configs' | 'flags' | 'experiments';
  label?: string;
}

export function CreateEntityButton({ entityType, label }: CreateEntityButtonProps) {
  const entityLabels = {
    configs: 'Config',
    flags: 'Flag',
    experiments: 'Experiment',
  };

  const routes = {
    configs: '/configs/create',
    flags: '/flags/create',
    experiments: '/experiments/create',
  };

  const buttonLabel = label || `Create ${entityLabels[entityType]}`;

  return (
    <Link href={routes[entityType]}>
      <Button>{buttonLabel}</Button>
    </Link>
  );
}
