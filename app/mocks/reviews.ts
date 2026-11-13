/**
 * Product reviews.
 *
 * The Storefront API has no reviews object. Real stores get reviews from a
 * review app: the aggregate lives in Shopify's standard `reviews.rating` and
 * `reviews.rating_count` product metafields, and the review text comes from
 * the app's own API. The mock adapter exposes the aggregates as those
 * metafields and the text through the app-owned `ReviewsProvider`.
 */
import type { MockReview } from "./types";

/** Aggregate rating per product handle: [average, count]. */
export const RATINGS: Record<string, [number, number]> = {
  "halo-anc-headphones": [4.8, 1284],
  "aria-studio-headphones": [4.7, 312],
  "monolith-speaker": [4.6, 98],
  "pebble-room-speaker": [4.5, 641],
  "column-one-speaker": [4.9, 27],
  "integrated-amplifier-a1": [5.0, 14],
  "vinyl-deck-t2": [4.7, 76],
  "vinyl-deck-t1": [4.4, 402],
  "hifi-headphone-amp": [4.6, 133],
  "braided-interconnect-cable": [4.5, 219],
  "studio-condenser-mic": [4.8, 507],
  "field-shotgun-mic": [4.3, 188],
  "duo-audio-interface": [4.6, 455],
  "mic-mount-kit": [4.4, 260],
  "arc-laptop-stand": [4.9, 2210],
  "plinth-tablet-stand": [4.6, 340],
  "keyframe-75-keyboard": [4.8, 892],
  "walnut-wrist-rest": [4.9, 731],
  "walnut-desk-organizer": [4.7, 268],
  "contour-wireless-mouse": [4.2, 64],
  "switch-sampler": [4.6, 311],
  "keycap-tool-kit": [4.5, 120],
  "pebble-ceramic-mug": [4.8, 980],
  "halo-desk-lamp": [4.6, 290],
  "dome-lamp": [4.7, 158],
  "ember-portable-lamp": [4.5, 47],
  "line-wall-light": [4.4, 61],
  "flex-light-strip": [4.1, 203],
  "crane-task-lamp": [4.6, 85],
  "port-usb-c-hub": [4.5, 1102],
  "volt-power-bank": [4.4, 377],
  "aviator-usb-c-cable": [4.7, 524],
  "orbit-charging-dock": [4.3, 142],
  "coil-desk-power": [4.2, 96],
  "shell-magsafe-case": [4.4, 860],
  "lift-phone-stand": [4.6, 1540],
  "sleeve-14-laptop-sleeve": [4.5, 133],
  "glass-screen-guard": [4.3, 2040],
};

let n = 0;
const r = (
  productHandle: string,
  rating: MockReview["rating"],
  author: string,
  location: string,
  createdAt: string,
  title: string,
  body: string,
  verifiedBuyer = true,
): MockReview => ({ id: `rev_${++n}`, productHandle, rating, author, location, createdAt, title, body, verifiedBuyer });

export const REVIEWS: MockReview[] = [
  r("halo-anc-headphones", 5, "Priya S.", "London, UK", "2026-10-30", "The quietest flight of my life", "Wore them London to Singapore. Engines gone, battery still at 60% when we landed. The fit is light enough that I forgot they were on."),
  r("halo-anc-headphones", 5, "Marcus T.", "Austin, TX", "2026-10-12", "Comfort is the real feature", "I take calls all day. The mics are clear and the clamp is gentle. Transparency mode sounds natural, not tinny."),
  r("halo-anc-headphones", 4, "Elena R.", "Madrid, ES", "2026-09-28", "Great sound, wish the case were smaller", "Tuning is balanced and the ANC is excellent. The case is solid but takes up space in my bag."),
  r("halo-anc-headphones", 5, "Jonah K.", "Toronto, CA", "2026-09-21", "Cognac is gorgeous", "Picked the Cognac colour and it looks even better in person. Multipoint switching between laptop and phone just works."),
  r("arc-laptop-stand", 5, "Hannah L.", "Portland, OR", "2026-10-02", "Fixed my neck", "Two weeks in and the afternoon neck ache is gone. Folds flat into my backpack sleeve."),
  r("arc-laptop-stand", 5, "Dev P.", "Bangalore, IN", "2026-08-19", "Solid as a rock", "No wobble even when typing hard on the laptop keyboard. The hinge clicks are satisfying."),
  r("arc-laptop-stand", 4, "Sam W.", "Leeds, UK", "2026-07-30", "Excellent, one niggle", "Love it. The highest setting is a touch too high for me with an external keyboard, but the next one down is perfect."),
  r("keyframe-75-keyboard", 5, "Chris M.", "Seattle, WA", "2026-11-02", "Endgame board", "The gasket mount makes it soft and thocky without being mushy. Sand colourway is stunning."),
  r("keyframe-75-keyboard", 5, "Aiko N.", "Osaka, JP", "2026-10-21", "Beautifully made", "The machining is flawless and the weight keeps it planted. Battery life is as advertised."),
  r("keyframe-75-keyboard", 4, "Luis G.", "Mexico City, MX", "2026-10-09", "Wish Midnight came in tactile", "Great keyboard, but I wanted Midnight with tactile switches. Swapped them myself thanks to hot-swap."),
  r("pebble-room-speaker", 5, "Grace O.", "Dublin, IE", "2026-09-15", "Fills my kitchen", "Surprisingly big sound from such a calm-looking object. Paired two for stereo and never looked back."),
  r("pebble-room-speaker", 4, "Tom B.", "Brighton, UK", "2026-08-02", "Lovely, app could be better", "Sounds warm and full. Setup app took two tries to find my Wi-Fi."),
  r("studio-condenser-mic", 5, "Nadia F.", "Berlin, DE", "2026-10-25", "Podcast upgrade", "Noise floor is so low I can finally record at night. Voice sounds open but not harsh."),
  r("studio-condenser-mic", 5, "Owen J.", "Nashville, TN", "2026-09-04", "Acoustic guitar heaven", "Captures every detail on my acoustic. Pair it with the Duo interface and you're done."),
  r("pebble-ceramic-mug", 5, "Imogen H.", "Bristol, UK", "2026-10-18", "My favourite mug", "Heavy in the best way, keeps coffee warm, and the texture is lovely to hold."),
  r("pebble-ceramic-mug", 4, "Ravi K.", "Chicago, IL", "2026-09-10", "Beautiful glaze", "A little smaller than I expected, but beautiful. Bought two more as gifts."),
  r("walnut-wrist-rest", 5, "Felix A.", "Vienna, AT", "2026-10-03", "Grain is incredible", "Mine has a gorgeous figure in the grain. Matches my desk organizer perfectly."),
  r("duo-audio-interface", 5, "Maya C.", "Los Angeles, CA", "2026-08-27", "Clean and simple", "Two inputs, great preamps, no drivers on Mac. Sold out often, so grab one when you can."),
  r("duo-audio-interface", 3, "Ben D.", "Denver, CO", "2026-07-12", "Good, but headphone out is quiet", "Preamps are clean. The headphone output struggles with my 300 Ω headphones."),
  r("aria-studio-headphones", 5, "Kenji T.", "Tokyo, JP", "2026-07-08", "Honest and comfortable", "My mixes translate to car and phone speakers far better than before."),
  r("lift-phone-stand", 5, "Zoe P.", "Melbourne, AU", "2026-06-30", "Simple and perfect", "Holds my phone for video calls at exactly the right height. Looks great next to my laptop."),
  r("contour-wireless-mouse", 3, "Andre L.", "Paris, FR", "2026-11-05", "Takes getting used to", "Very comfortable after a week, but my hand is small and the shape is quite large.", false),
  r("halo-desk-lamp", 5, "Sofia V.", "Lisbon, PT", "2026-09-17", "No more glare", "The diffuser is excellent: even light, no reflections on my monitor, and the charging base is a nice touch."),
  r("vinyl-deck-t1", 4, "Patrick E.", "Glasgow, UK", "2026-05-22", "Great first turntable", "Set up in ten minutes. Built-in preamp means I could use my existing speakers."),
];
