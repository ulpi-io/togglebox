import { Router } from "express";
import { togglebox } from "../config/togglebox";

const router = Router();

/**
 * GET /health - Basic health check
 */
router.get("/", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * GET /health/live - Liveness probe (k8s)
 */
router.get("/live", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * GET /ready - Readiness check (includes ToggleBox connection)
 */
router.get("/ready", async (req, res) => {
  try {
    const health = await togglebox.checkConnection();
    res.json({
      status: "ready",
      togglebox: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "not ready",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
