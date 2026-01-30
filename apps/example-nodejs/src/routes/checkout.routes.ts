import { Router, Request, Response, NextFunction } from "express";
import { togglebox } from "../config/togglebox";
import { userContextMiddleware } from "../middleware/user-context";
import { logger } from "../config/logger";

const router = Router();
router.use(userContextMiddleware);

/**
 * GET /api/checkout
 *
 * Tier 3: Experiments - Multi-variant A/B testing
 * Use for: Testing UX variations, copy changes, pricing displays
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = req.userContext!;

    // Check flag for new checkout flow (Tier 2)
    const useNewCheckout = await togglebox.isFlagEnabled(
      "new-checkout-flow",
      context,
    );

    // Get experiment variant for button text (Tier 3)
    const buttonVariant = await togglebox.getVariant(
      "checkout-button-test",
      context,
    );

    // Get experiment variant for pricing display (Tier 3)
    const pricingVariant = await togglebox.getVariant(
      "pricing-display-test",
      context,
    );

    // Map variant to actual button text
    const buttonTextMap: Record<string, string> = {
      "buy-now": "Buy Now",
      purchase: "Complete Purchase",
      "add-to-cart": "Add to Cart",
    };

    logger.info(
      {
        userId: context.userId,
        checkoutVersion: useNewCheckout ? "v2" : "v1",
        buttonVariant: buttonVariant?.variationKey,
      },
      "Checkout page loaded",
    );

    res.json({
      checkoutVersion: useNewCheckout ? "v2" : "v1",
      buttonText:
        buttonTextMap[buttonVariant?.variationKey || "purchase"] ||
        "Complete Purchase",
      showTaxIncluded: pricingVariant?.variationKey === "tax-included",
      experiments: {
        buttonTest: buttonVariant,
        pricingTest: pricingVariant,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/checkout/complete
 *
 * Track conversion for experiments
 */
router.post(
  "/complete",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.userContext!;
      const { orderId, total } = req.body;

      if (!orderId || typeof orderId !== "string") {
        res
          .status(400)
          .json({ error: "orderId is required and must be a string" });
        return;
      }
      if (
        total === undefined ||
        total === null ||
        typeof total !== "number" ||
        total < 0
      ) {
        res.status(400).json({
          error: "total is required and must be a non-negative number",
        });
        return;
      }

      // Track conversion for checkout button experiment
      await togglebox.trackConversion("checkout-button-test", context, {
        metricId: "purchase",
        value: total,
      });

      // Track conversion for pricing display experiment
      await togglebox.trackConversion("pricing-display-test", context, {
        metricId: "purchase",
        value: total,
      });

      // Flush stats immediately for important conversions
      await togglebox.flushStats();

      logger.info(
        { userId: context.userId, orderId, total },
        "Purchase completed",
      );

      res.json({
        success: true,
        orderId,
        message: "Order completed successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
