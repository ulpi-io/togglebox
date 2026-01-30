import type {
  Experiment,
  ExperimentResults,
  VariationResult,
} from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@togglebox/ui";

interface ExperimentResultsDisplayProps {
  experiment: Experiment;
  results: ExperimentResults;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
}

export function ExperimentResultsDisplay({
  experiment,
  results,
}: ExperimentResultsDisplayProps) {
  const controlVariation = experiment.variations.find((v) => v.isControl);

  // Use results variations if available, otherwise create placeholder data from experiment variations
  const variations: VariationResult[] =
    results.variations && results.variations.length > 0
      ? results.variations
      : experiment.variations.map((v) => ({
          variationKey: v.key,
          views: 0,
          users: 0,
          conversions: 0,
          conversionRate: 0,
        }));

  const controlResult = variations.find(
    (v) => v.variationKey === controlVariation?.key,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Results & Analysis</CardTitle>
          <div className="text-sm text-muted-foreground">
            Last updated: {formatDate(results.lastUpdatedAt)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted border border-black/10 rounded-lg">
          <div>
            <div className="text-sm text-muted-foreground">Total Views</div>
            <div className="text-2xl font-black">
              {(results.totalViews || 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total Users</div>
            <div className="text-2xl font-black">
              {(results.totalUsers || 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">
              Total Conversions
            </div>
            <div className="text-2xl font-black">
              {(results.totalConversions || 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Status</div>
            <div
              className={`text-lg font-black ${
                results.isSignificant ? "text-success" : "text-warning"
              }`}
            >
              {results.isSignificant ? "Significant ✓" : "Collecting..."}
            </div>
          </div>
          {results.pValue !== undefined && (
            <div>
              <div className="text-sm text-muted-foreground">P-Value</div>
              <div className="text-2xl font-black">
                {results.pValue.toFixed(4)}
              </div>
            </div>
          )}
        </div>

        {/* Warnings */}
        {results.warnings && results.warnings.length > 0 && (
          <div className="border border-warning/50 bg-warning/10 rounded-lg p-4">
            <div className="font-bold text-sm mb-2">⚠️ Warnings</div>
            <ul className="list-disc list-inside space-y-1">
              {results.warnings.map((warning, idx) => (
                <li key={idx} className="text-sm">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sample Ratio Mismatch */}
        {results.sampleRatioMismatch && (
          <div className="border border-destructive/50 bg-destructive/10 rounded-lg p-4">
            <div className="font-bold text-sm mb-2">
              🚨 Sample Ratio Mismatch Detected
            </div>
            <p className="text-sm">
              The observed traffic distribution does not match the expected
              allocation. This may indicate a bug in the randomization logic or
              tracking issues.
            </p>
          </div>
        )}

        {/* Variation Results */}
        <div>
          <div className="font-bold text-sm mb-3">Variation Performance</div>
          <div className="space-y-3">
            {variations.map((varResult) => {
              const variation = experiment.variations.find(
                (v) => v.key === varResult.variationKey,
              );
              const isControl = variation?.isControl;
              const allocation = experiment.trafficAllocation.find(
                (t) => t.variationKey === varResult.variationKey,
              );

              return (
                <div
                  key={varResult.variationKey}
                  className={`p-4 rounded-lg border ${
                    isControl
                      ? "border-info/50 bg-info/10"
                      : "border-black/10 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-black">
                        {variation?.name}
                      </span>
                      {isControl && (
                        <Badge variant="default" size="sm">
                          CONTROL
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {allocation?.percentage}% allocation
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Views</div>
                      <div className="text-xl font-black">
                        {(varResult.views || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Users</div>
                      <div className="text-xl font-black">
                        {(varResult.users || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Conversions
                      </div>
                      <div className="text-xl font-black">
                        {(varResult.conversions || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Conversion Rate
                      </div>
                      <div className="text-xl font-black">
                        {((varResult.conversionRate || 0) * 100).toFixed(2)}%
                      </div>
                    </div>
                    {!isControl && varResult.relativeLift !== undefined && (
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Relative Lift
                        </div>
                        <div
                          className={`text-xl font-black ${
                            varResult.relativeLift > 0
                              ? "text-success"
                              : varResult.relativeLift < 0
                                ? "text-destructive"
                                : ""
                          }`}
                        >
                          {varResult.relativeLift > 0 ? "+" : ""}
                          {(varResult.relativeLift * 100).toFixed(2)}%
                        </div>
                      </div>
                    )}
                  </div>

                  {varResult.confidenceInterval && (
                    <div className="mt-3 pt-3 border-t border-black/10">
                      <div className="text-xs text-muted-foreground mb-1">
                        {(experiment.confidenceLevel * 100).toFixed(0)}%
                        Confidence Interval
                      </div>
                      <div className="text-sm font-mono">
                        [{(varResult.confidenceInterval[0] * 100).toFixed(2)}%,{" "}
                        {(varResult.confidenceInterval[1] * 100).toFixed(2)}%]
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* How it's calculated */}
        <details className="border border-black/10 rounded-lg">
          <summary className="p-4 cursor-pointer text-sm font-bold select-none">
            How metrics are calculated
          </summary>
          <div className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded p-3">
                <div className="font-semibold text-foreground mb-1">
                  Conversion Rate
                </div>
                <code className="text-xs bg-black/5 px-1.5 py-0.5 rounded">
                  conversions / views
                </code>
                <p className="mt-1 text-xs">
                  Ratio of conversion events to total exposure views for each
                  variation.
                </p>
              </div>
              <div className="bg-muted/50 rounded p-3">
                <div className="font-semibold text-foreground mb-1">
                  Relative Lift
                </div>
                <code className="text-xs bg-black/5 px-1.5 py-0.5 rounded">
                  (treatment_rate - control_rate) / control_rate
                </code>
                <p className="mt-1 text-xs">
                  Percentage improvement of each treatment variation over the
                  control. Positive = better, negative = worse.
                </p>
              </div>
              <div className="bg-muted/50 rounded p-3">
                <div className="font-semibold text-foreground mb-1">
                  P-Value
                </div>
                <code className="text-xs bg-black/5 px-1.5 py-0.5 rounded">
                  Two-proportion z-test (two-tailed)
                </code>
                <p className="mt-1 text-xs">
                  Probability of observing this difference by chance. Lower is
                  better. Significance threshold: p &lt;{" "}
                  {(1 - experiment.confidenceLevel).toFixed(2)}.
                </p>
              </div>
              <div className="bg-muted/50 rounded p-3">
                <div className="font-semibold text-foreground mb-1">
                  Confidence Interval
                </div>
                <code className="text-xs bg-black/5 px-1.5 py-0.5 rounded">
                  treatment_rate ± z × SE
                </code>
                <p className="mt-1 text-xs">
                  Range where the true conversion rate likely falls at the{" "}
                  {(experiment.confidenceLevel * 100).toFixed(0)}% confidence
                  level. SE = √(p(1-p)/n).
                </p>
              </div>
            </div>
            <div className="text-xs border-t border-black/10 pt-2">
              <strong className="text-foreground">Views</strong> = total
              exposure count (every page view).{" "}
              <strong className="text-foreground">Users</strong> = unique user
              IDs (deduplicated). Conversion rate and statistical tests use{" "}
              <strong className="text-foreground">views</strong> as the sample
              size.
            </div>
          </div>
        </details>

        {/* Winner */}
        {experiment.winner && (
          <div className="border border-success/50 bg-success/10 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">🏆</span>
              <span className="font-bold text-lg">Winner Declared</span>
            </div>
            <p className="text-sm">
              Variation{" "}
              <strong>
                {
                  experiment.variations.find((v) => v.key === experiment.winner)
                    ?.name
                }
              </strong>{" "}
              has been declared the winner.
            </p>
          </div>
        )}

        {/* Statistical Interpretation */}
        {results.isSignificant && !experiment.winner && (
          <div className="border border-info/50 bg-info/10 rounded-lg p-4">
            <div className="font-bold text-sm mb-2">
              📊 Statistical Interpretation
            </div>
            <p className="text-sm">
              The results show statistical significance at the{" "}
              {(experiment.confidenceLevel * 100).toFixed(0)}% confidence level.
              {results.pValue !== undefined &&
                ` (p-value: ${results.pValue.toFixed(4)})`}{" "}
              Consider completing the experiment and declaring a winner.
            </p>
          </div>
        )}

        {!results.isSignificant && (results.totalUsers || 0) < 100 && (
          <div className="border border-warning/50 bg-warning/10 rounded-lg p-4">
            <div className="font-bold text-sm mb-2">⏳ Early Stage</div>
            <p className="text-sm">
              The experiment is in early stages. Continue collecting data before
              making conclusions. Current sample size:{" "}
              {(results.totalUsers || 0).toLocaleString()} users.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
