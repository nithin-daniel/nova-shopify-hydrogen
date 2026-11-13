/** Human labels for Customer Account API order / fulfillment statuses (client-safe). */
export const STATUS_LABEL: Record<string, string> = {
  PAID: "Paid",
  PENDING: "Pending",
  AUTHORIZED: "Authorised",
  PARTIALLY_PAID: "Partially paid",
  PARTIALLY_REFUNDED: "Partially refunded",
  REFUNDED: "Refunded",
  VOIDED: "Voided",
  EXPIRED: "Expired",
  FULFILLED: "Fulfilled",
  UNFULFILLED: "Unfulfilled",
  PARTIALLY_FULFILLED: "Partially fulfilled",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  OPEN: "Open",
  PENDING_FULFILLMENT: "Preparing",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  LABEL_PRINTED: "Label created",
  LABEL_PURCHASED: "Label created",
  CONFIRMED: "Confirmed",
  ATTEMPTED_DELIVERY: "Delivery attempted",
  CARRIER_PICKED_UP: "Picked up by carrier",
  FAILURE: "Delivery problem",
};

export const statusLabel = (status: string | null | undefined, fallback = "Processing") => (status ? (STATUS_LABEL[status] ?? status) : fallback);
