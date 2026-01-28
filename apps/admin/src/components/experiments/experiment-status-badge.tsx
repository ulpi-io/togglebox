import { Badge } from "@togglebox/ui";
import type { ExperimentStatus } from "@/lib/api/types";

interface ExperimentStatusBadgeProps {
  status: ExperimentStatus;
}

export function ExperimentStatusBadge({ status }: ExperimentStatusBadgeProps) {
  return (
    <Badge status={status} size="lg" className="font-black uppercase">
      {status}
    </Badge>
  );
}
