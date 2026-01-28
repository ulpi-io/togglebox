import { Router, Request, Response, NextFunction } from "express";
import { togglebox } from "../config/togglebox";
import { products } from "../data/products";
import { userContextMiddleware } from "../middleware/user-context";
import { logger } from "../config/logger";

const router = Router();

// Require user context for personalized features
router.use(userContextMiddleware);

/**
 * GET /api/products
 *
 * Tier 2: Feature Flags - 2 values with user targeting
 * Use for: Feature rollouts, A/B boolean toggles, kill switches
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = req.userContext!;

    // Check flags in parallel for better performance
    const [showReviews, expressShipping] = await Promise.all([
      togglebox.isFlagEnabled("reviews-enabled", context),
      togglebox.isFlagEnabled("express-shipping", context),
    ]);

    // Track product list view
    togglebox.trackEvent("products_viewed", context, {
      properties: { count: products.length },
    });

    logger.info(
      { userId: context.userId, showReviews, expressShipping },
      "Products fetched",
    );

    res.json({
      products: products.map((p) => ({
        ...p,
        reviews: showReviews ? p.reviews : undefined,
      })),
      features: {
        showReviews,
        expressShipping,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/:id
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = req.userContext!;
    const product = products.find((p) => p.id === req.params.id);

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    // Track product view event
    togglebox.trackEvent("product_viewed", context, {
      properties: { productId: product.id, productName: product.name },
    });

    const showReviews = await togglebox.isFlagEnabled(
      "reviews-enabled",
      context,
    );

    res.json({
      ...product,
      reviews: showReviews ? product.reviews : undefined,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
