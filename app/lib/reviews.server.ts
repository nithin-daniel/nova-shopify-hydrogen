/**
 * Reviews data access (CUSTOM; the Storefront API has no reviews object).
 *
 * Real stores use a review app: aggregate ratings arrive as the standard
 * `reviews.rating` / `reviews.rating_count` product metafields (queried in the
 * product and card fragments), and review text comes from the app's API.
 * This interface keeps that integration behind one seam:
 *   DEMO_MODE → mock reviews; live → no text provider configured (UI hides
 *   the list and still shows metafield ratings when present).
 */
import { getEnv } from "~/lib/shopify/env.server";

export type Review = {
  id: string;
  productHandle: string;
  author: string;
  location: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  verifiedBuyer: boolean;
};

export interface ReviewsProvider {
  readonly source: "mock" | "none";
  forProduct(handle: string): Promise<Review[]>;
  featured(limit: number): Promise<Review[]>;
}

const noReviews: ReviewsProvider = {
  source: "none",
  forProduct: async () => [],
  featured: async () => [],
};

export async function getReviewsProvider(): Promise<ReviewsProvider> {
  if (!getEnv().demoMode) return noReviews;
  const { REVIEWS } = await import("~/mocks/reviews");
  return {
    source: "mock",
    forProduct: async (handle) => REVIEWS.filter((r) => r.productHandle === handle).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    featured: async (limit) => REVIEWS.filter((r) => r.rating === 5 && r.body.length > 90).slice(0, limit),
  };
}
