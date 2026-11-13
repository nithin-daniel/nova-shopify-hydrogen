# NOVA mock data specification

This is the business and demo-data specification for the NOVA storefront. It is the
source of truth for *what* the mock store contains; the structured fixtures in
[`app/mocks`](app/mocks) implement it, and the tables at the bottom of this file are
generated from those fixtures (`node scripts/generate-mock-md.ts`), so they never drift.

> Everything here is fictional. Customers use `example.com` addresses, tracking numbers
> are carrier test formats, and no order, payment or shipment is real.

## 1. How the data is used

```
app/mocks/*.ts            business fixtures (cents, handles, relations)
        │
        ▼
app/lib/mock-api/         mock Storefront API + Customer Account API
  storefront/             GraphQL executor over Hydrogen's packaged schema
  customer-account/       (same idea, Customer Account schema)
        │  injected as `fetch` into createStorefrontClient / createCustomerAccountClient
        ▼
Hydrogen handlers, stores, loaders, UI (identical code in DEMO_MODE and live mode)
```

UI components never import fixtures. They receive real Storefront API response shapes,
which is why switching `DEMO_MODE=false` needs no UI changes.

## 2. Store configuration

| Field | Value |
| --- | --- |
| Name | NOVA |
| Positioning | Premium lifestyle and technology accessories: sound, studio, desk, light, power, mobile |
| Tagline | Objects for focus. |
| Base currency | USD (prices stored as integer cents) |
| Primary market | United States (`EN-US`) |
| Other markets | Canada, United Kingdom, France, Germany, Australia, Japan |
| myshopify domain (fictional) | `nova-demo.myshopify.com` |
| Payment methods shown | Visa, Mastercard, Amex, Discover, Shop Pay, Apple Pay, Google Pay |
| Free shipping | Over $150 in the US (per-market thresholds below) |
| Support | hello@nova.example · +1 (415) 555-0100 |

## 3. Catalog design

* **38 sellable products + 1 gift card**, 86 variants, in six category collections and
  five curated collections.
* **Option shapes:** single option (Color, Finish, Length, Size, Capacity, Ports), two
  options (Keyframe 75: Colorway × Switches; Shell case: Color × Size; Line Wall Light:
  Length × Accent), and single-value products where the picker is hidden.
* **Variant-specific imagery:** Halo (4 colours), Arc (3 finishes), Keyframe 75
  (3 colourways), Port hub (3 sizes), Shell case, Ember, Switch Sampler, Volt and others
  set `imageIndex` per variant, so the gallery jumps when the variant changes.
* **Inventory states:** in stock, low stock (≤5), sold out, backorder
  (`continueSellingWhenOutOfStock`), and a combination that does not exist
  (Keyframe 75 Midnight / Tactile).
* **Price scenarios:** compare-at prices (sale), per-variant prices (cables, hubs,
  speakers), high-ticket items ($1,295 amplifier), impulse add-ons ($19 Switch Sampler)
  that help cross the free-shipping threshold.

### Imagery

All photography is served from Shopify's CDN (`cdn.shopify.com`). It comes from the
public mock.shop reference catalogs ("Beam & Byte", "Sonic Haven", "LuminaFlow",
"ClickyCanvas", "GlideGear"), which publish product photography for Storefront API
prototypes. Each image was reviewed by eye and matched to its NOVA product. Because
they are Shopify CDN URLs, `?width=&height=&crop=` transforms work as they do for a
real store. Source images are 768 × 1344 portrait.

## 4. Relationships

| Relationship | Fixture field | Storefront API surface |
| --- | --- | --- |
| Product recommendations | `related` | `productRecommendations(intent: RELATED)` |
| Frequently bought together | `complementary` | `productRecommendations(intent: COMPLEMENTARY)` |
| Related products on article | `relatedProductHandles` | resolved by handle in the article loader |
| Collection membership | `productHandles` (manual) or `rule` (smart) | `collection.products` |
| Reviews | `REVIEWS`, `RATINGS` | `reviews.rating` / `reviews.rating_count` metafields + app-owned reviews provider |
| Personalised recommendations | derived from recently viewed + cart | app-owned (labelled custom) |

## 5. Customers and orders

Ten customer personas cover VIP, international (UK, Canada, Germany, Australia),
creators, gift buyers and a brand-new account with no orders. Thirteen orders cover
every state the account UI must render:

* paid + delivered, paid + in transit, paid + out for delivery
* authorised + unfulfilled, paid + unfulfilled (backorder)
* partially fulfilled (split shipment)
* partially refunded, fully refunded, cancelled
* digital (gift card) order with no fulfillment
* orders in USD, CAD, GBP and EUR

Each fulfillment carries a carrier, tracking number, tracking URL and an event timeline.

## 6. Discount scenarios

| Scenario | Code | Expected cart behaviour |
| --- | --- | --- |
| Order percentage | `WELCOME10` | 10% allocated across all lines |
| Fixed with minimum | `SAVE20` | `applicable: false` below $100, $20 off above |
| Threshold percentage | `NOVA25` | 25% off at $250+ |
| Collection-scoped | `SOUND15` | Line-level allocation on Sound items only |
| Product-scoped | `DESKSET` | Line-level allocation on three desk products |
| Shipping | `FREESHIP` | Accepted; merchandise totals unchanged (applies at checkout) |
| Expired | `SUMMER25` | Kept on the cart with `applicable: false` |
| Unknown | anything else | Kept on the cart with `applicable: false` |
| Automatic bundle | *(none)* | Studio bundle / Listening set apply 10% automatically when all items are present |
| Gift cards | `NOVAGIFT50`, `NOVAGIFT250` | Reduce the amount due; `NOVAGIFT0` and `NOVAGIFTOLD` are rejected with a user error |

## 7. Search

* Product search matches title, type, tags, vendor and option values, weighted toward the title.
* Popular searches: headphones, walnut, keyboard, desk lamp, usb-c, speaker, gift.
* Predictive search returns query suggestions, products, collections, pages and articles.
* A query with no results ("zzz") renders the no-results recommendations.

## 8. Shopping cart

The cart lives server-side in the mock API (an in-memory map keyed by cart id); the
browser only holds Hydrogen's `cart` cookie with the cart token. Lines carry
`discountAllocations`, `cost.compareAtAmountPerQuantity` and the variant's
`quantityAvailable`. A sample cart (`SAMPLE_CART_LINES`) contains Halo (Graphite),
Arc (Graphite) and 2× Pebble mug (Bone).

## 9. Content

* Pages: About, Contact, FAQ, Materials & responsibility.
* Blog **Journal** with five articles, each linked to products.
* Policies: shipping, refunds, privacy, terms.
* Menus: main (six categories) and footer.

## 10. Data tables

<!-- GENERATED:START -->

### Products

| # | Handle | Title | Type | From | Rating | Collections | Related | Bought together |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `halo-anc-headphones` | Halo ANC Headphones | Headphones | $299.00 | 4.8 (1284) | sound, new-arrivals, best-sellers, sale | aria-studio-headphones, hifi-headphone-amp, pebble-room-speaker | aviator-usb-c-cable, orbit-charging-dock, braided-interconnect-cable |
| 2 | `aria-studio-headphones` | Aria Studio Headphones | Headphones | $249.00 | 4.7 (312) | sound, studio, best-sellers | halo-anc-headphones, hifi-headphone-amp | hifi-headphone-amp, duo-audio-interface, braided-interconnect-cable |
| 3 | `monolith-speaker` | Monolith Bookshelf Speaker | Speakers | $549.00 | 4.6 (98) | sound | column-one-speaker, pebble-room-speaker, integrated-amplifier-a1 | braided-interconnect-cable, integrated-amplifier-a1 |
| 4 | `pebble-room-speaker` | Pebble Room Speaker | Speakers | $249.00 | 4.5 (641) | sound, best-sellers, sale | monolith-speaker, column-one-speaker, halo-anc-headphones | orbit-charging-dock, ember-portable-lamp |
| 5 | `column-one-speaker` | Column One Speaker | Speakers | $699.00 | 4.9 (27) | sound, new-arrivals | monolith-speaker, integrated-amplifier-a1 | integrated-amplifier-a1, braided-interconnect-cable |
| 6 | `integrated-amplifier-a1` | Integrated Amplifier A1 | Amplifiers | $1295.00 | 5 (14) | sound | vinyl-deck-t2, monolith-speaker, column-one-speaker | vinyl-deck-t2, braided-interconnect-cable, column-one-speaker |
| 7 | `vinyl-deck-t2` | Vinyl Deck T2 | Turntables | $890.00 | 4.7 (76) | sound | vinyl-deck-t1, integrated-amplifier-a1 | integrated-amplifier-a1, braided-interconnect-cable |
| 8 | `vinyl-deck-t1` | Vinyl Deck T1 | Turntables | $495.00 | 4.4 (402) | sound | vinyl-deck-t2, pebble-room-speaker | monolith-speaker, braided-interconnect-cable |
| 9 | `hifi-headphone-amp` | Hi-Fi Headphone Amp | Amplifiers | $299.00 | 4.6 (133) | sound, studio, desk | aria-studio-headphones, duo-audio-interface | aria-studio-headphones, aviator-usb-c-cable |
| 10 | `braided-interconnect-cable` | Braided Interconnect Cable | Cables | $75.00 | 4.5 (219) | sound | aviator-usb-c-cable | integrated-amplifier-a1, vinyl-deck-t2 |
| 11 | `studio-condenser-mic` | Studio Condenser Mic | Microphones | $499.00 | 4.8 (507) | studio, best-sellers | field-shotgun-mic, duo-audio-interface | mic-mount-kit, duo-audio-interface, aria-studio-headphones |
| 12 | `field-shotgun-mic` | Field Shotgun Mic | Microphones | $129.00 | 4.3 (188) | studio, new-arrivals | studio-condenser-mic | lift-phone-stand, volt-power-bank |
| 13 | `duo-audio-interface` | Duo Audio Interface | Audio Interfaces | $189.00 | 4.6 (455) | studio, desk, best-sellers | hifi-headphone-amp, studio-condenser-mic | studio-condenser-mic, aria-studio-headphones, mic-mount-kit |
| 14 | `mic-mount-kit` | Mic Mount Kit | Studio Accessories | $59.00 | 4.4 (260) | studio, gifts-under-100 | studio-condenser-mic | studio-condenser-mic, duo-audio-interface |
| 15 | `arc-laptop-stand` | Arc Laptop Stand | Stands | $89.00 | 4.9 (2210) | desk, best-sellers, gifts-under-100, sale | plinth-tablet-stand, keyframe-75-keyboard, contour-wireless-mouse | keyframe-75-keyboard, port-usb-c-hub, contour-wireless-mouse |
| 16 | `plinth-tablet-stand` | Plinth Tablet Stand | Stands | $69.00 | 4.6 (340) | desk, mobile, gifts-under-100 | arc-laptop-stand, lift-phone-stand | glass-screen-guard, orbit-charging-dock |
| 17 | `keyframe-75-keyboard` | Keyframe 75 Keyboard | Keyboards | $229.00 | 4.8 (892) | desk, new-arrivals, best-sellers, sale | walnut-wrist-rest, switch-sampler, contour-wireless-mouse | walnut-wrist-rest, switch-sampler, aviator-usb-c-cable |
| 18 | `walnut-wrist-rest` | Walnut Wrist Rest | Desk Accessories | $59.00 | 4.9 (731) | desk, walnut-edition, gifts-under-100 | walnut-desk-organizer, keyframe-75-keyboard | keyframe-75-keyboard, walnut-desk-organizer |
| 19 | `walnut-desk-organizer` | Walnut Desk Organizer | Desk Accessories | $129.00 | 4.7 (268) | desk, walnut-edition | walnut-wrist-rest, arc-laptop-stand | walnut-wrist-rest, pebble-ceramic-mug |
| 20 | `contour-wireless-mouse` | Contour Wireless Mouse | Mice | $89.00 | 4.2 (64) | desk, new-arrivals, gifts-under-100 | keyframe-75-keyboard, arc-laptop-stand | keyframe-75-keyboard, walnut-wrist-rest |
| 21 | `switch-sampler` | Switch Sampler | Keyboard Parts | $19.00 | 4.6 (311) | desk, new-arrivals, gifts-under-100 | keycap-tool-kit, keyframe-75-keyboard | keycap-tool-kit, keyframe-75-keyboard |
| 22 | `keycap-tool-kit` | Keycap Tool Kit | Keyboard Parts | $19.00 | 4.5 (120) | desk, gifts-under-100 | switch-sampler | switch-sampler, keyframe-75-keyboard |
| 23 | `pebble-ceramic-mug` | Pebble Ceramic Mug | Lifestyle | $34.00 | 4.8 (980) | desk, new-arrivals, best-sellers, gifts-under-100 | walnut-desk-organizer | walnut-desk-organizer, halo-desk-lamp |
| 24 | `halo-desk-lamp` | Halo Desk Lamp | Lamps | $189.00 | 4.6 (290) | desk, light | crane-task-lamp, dome-lamp | walnut-desk-organizer, arc-laptop-stand |
| 25 | `dome-lamp` | Dome Lamp | Lamps | $95.00 | 4.7 (158) | light | ember-portable-lamp, halo-desk-lamp | ember-portable-lamp, pebble-ceramic-mug |
| 26 | `ember-portable-lamp` | Ember Portable Lamp | Lamps | $119.00 | 4.5 (47) | light, new-arrivals | dome-lamp, pebble-room-speaker | dome-lamp, flex-light-strip |
| 27 | `line-wall-light` | Line Wall Light | Lighting | $169.00 | 4.4 (61) | light | flex-light-strip, halo-desk-lamp | flex-light-strip |
| 28 | `flex-light-strip` | Flex Light Strip | Lighting | $39.00 | 4.1 (203) | light, gifts-under-100 | line-wall-light | line-wall-light, port-usb-c-hub |
| 29 | `crane-task-lamp` | Crane Task Lamp | Lamps | $139.00 | 4.6 (85) | desk, light | halo-desk-lamp, dome-lamp | walnut-desk-organizer |
| 30 | `port-usb-c-hub` | Port USB-C Hub | Hubs | $59.00 | 4.5 (1102) | desk, power, gifts-under-100 | volt-power-bank, aviator-usb-c-cable | arc-laptop-stand, aviator-usb-c-cable |
| 31 | `volt-power-bank` | Volt Power Bank | Power | $69.00 | 4.4 (377) | power, mobile | orbit-charging-dock, port-usb-c-hub | aviator-usb-c-cable, sleeve-14-laptop-sleeve |
| 32 | `aviator-usb-c-cable` | Aviator USB-C Cable | Cables | $35.00 | 4.7 (524) | desk, power, gifts-under-100 | braided-interconnect-cable, port-usb-c-hub | keyframe-75-keyboard, port-usb-c-hub |
| 33 | `orbit-charging-dock` | Orbit Charging Dock | Power | $79.00 | 4.3 (142) | desk, power, gifts-under-100 | volt-power-bank, lift-phone-stand | shell-magsafe-case, volt-power-bank |
| 34 | `coil-desk-power` | Coil Desk Power | Power | $59.00 | 4.2 (96) | desk, power, new-arrivals, gifts-under-100 | port-usb-c-hub | halo-desk-lamp, port-usb-c-hub |
| 35 | `shell-magsafe-case` | Shell MagSafe Case | Phone Cases | $49.00 | 4.4 (860) | mobile, new-arrivals, gifts-under-100, sale | glass-screen-guard, lift-phone-stand | glass-screen-guard, orbit-charging-dock |
| 36 | `lift-phone-stand` | Lift Phone Stand | Stands | $45.00 | 4.6 (1540) | desk, mobile, gifts-under-100 | plinth-tablet-stand, orbit-charging-dock | shell-magsafe-case, aviator-usb-c-cable |
| 37 | `sleeve-14-laptop-sleeve` | Sleeve 14 | Carry | $79.00 | 4.5 (133) | mobile, gifts-under-100, sale | volt-power-bank | volt-power-bank, port-usb-c-hub |
| 38 | `glass-screen-guard` | Glass Screen Guard | Screen Protection | $29.00 | 4.3 (2040) | mobile, gifts-under-100 | shell-magsafe-case | shell-magsafe-case, plinth-tablet-stand |
| 39 | `nova-gift-card` | NOVA Gift Card | Gift Card | $50.00 | – |  |  |  |

### Variants, prices and inventory

| Product | Variant id | SKU | Options | Price | Compare at | Inventory | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| halo-anc-headphones | 48800000100 | NV-HALO-GRA | Graphite | $299.00 |  | 42 | In stock |
| halo-anc-headphones | 48800000101 | NV-HALO-SLA | Slate | $299.00 | $349.00 | 7 | In stock |
| halo-anc-headphones | 48800000102 | NV-HALO-ONY | Onyx | $299.00 |  | 0 | **Sold out** |
| halo-anc-headphones | 48800000103 | NV-HALO-COG | Cognac | $329.00 |  | 3 | Low stock |
| aria-studio-headphones | 48800000200 | NV-ARIA-LEA | Leather | $249.00 |  | 18 | In stock |
| aria-studio-headphones | 48800000201 | NV-ARIA-VEL | Velour | $249.00 |  | 11 | In stock |
| monolith-speaker | 48800000300 | NV-MONO-TIT | Titanium | $549.00 |  | 9 | In stock |
| monolith-speaker | 48800000301 | NV-MONO-CHA | Charcoal | $549.00 |  | 0 | Backorder |
| pebble-room-speaker | 48800000400 | NV-PEBB-MIS | Mist | $249.00 | $299.00 | 26 | In stock |
| column-one-speaker | 48800000500 | NV-COL1-6IN | 6-inch | $699.00 |  | 5 | Low stock |
| column-one-speaker | 48800000501 | NV-COL1-8IN | 8-inch | $899.00 |  | 2 | Low stock |
| integrated-amplifier-a1 | 48800000600 | NV-A1-CHA | Charcoal | $1295.00 |  | 4 | Low stock |
| integrated-amplifier-a1 | 48800000601 | NV-A1-TIT | Titanium | $1295.00 |  | 1 | Low stock |
| vinyl-deck-t2 | 48800000700 | NV-T2-GLA | Glass | $890.00 |  | 6 | In stock |
| vinyl-deck-t2 | 48800000701 | NV-T2-ACR | Acrylic | $940.00 |  | 0 | **Sold out** |
| vinyl-deck-t1 | 48800000800 | NV-T1-BRU | Brushed steel | $495.00 |  | 14 | In stock |
| hifi-headphone-amp | 48800000900 | NV-HPA-LOW | Low | $299.00 |  | 21 | In stock |
| hifi-headphone-amp | 48800000901 | NV-HPA-HIG | High | $299.00 |  | 21 | In stock |
| braided-interconnect-cable | 48800001000 | NV-RCA-1M | 1 m | $75.00 |  | 60 | In stock |
| braided-interconnect-cable | 48800001001 | NV-RCA-2M | 2 m | $89.00 |  | 60 | In stock |
| braided-interconnect-cable | 48800001002 | NV-RCA-3M | 3 m | $105.00 |  | 8 | In stock |
| studio-condenser-mic | 48800001100 | NV-SCM-MAT | Matte black | $499.00 |  | 16 | In stock |
| studio-condenser-mic | 48800001101 | NV-SCM-BRU | Brushed silver | $499.00 |  | 16 | In stock |
| field-shotgun-mic | 48800001200 | NV-FSM-BRU | Brushed silver | $129.00 |  | 33 | In stock |
| duo-audio-interface | 48800001300 | NV-DUO-GRA | Graphite | $189.00 |  | 0 | **Sold out** |
| mic-mount-kit | 48800001400 | NV-MMK-MAT | Matte black | $59.00 |  | 48 | In stock |
| arc-laptop-stand | 48800001500 | NV-ARC-GRA | Graphite | $89.00 |  | 54 | In stock |
| arc-laptop-stand | 48800001501 | NV-ARC-SPA | Space gray | $89.00 |  | 6 | In stock |
| arc-laptop-stand | 48800001502 | NV-ARC-SIL | Silver | $89.00 | $109.00 | 54 | In stock |
| plinth-tablet-stand | 48800001600 | NV-PLN-SIL | Silver | $69.00 |  | 37 | In stock |
| keyframe-75-keyboard | 48800001700 | NV-KF75-MID-LIN | Midnight / Linear | $229.00 |  | 12 | In stock |
| keyframe-75-keyboard | 48800001702 | NV-KF75-SAN-LIN | Sand / Linear | $229.00 |  | 8 | In stock |
| keyframe-75-keyboard | 48800001703 | NV-KF75-SAN-TAC | Sand / Tactile | $229.00 |  | 0 | **Sold out** |
| keyframe-75-keyboard | 48800001704 | NV-KF75-SIL-LIN | Silver / Linear | $229.00 | $259.00 | 4 | Low stock |
| keyframe-75-keyboard | 48800001705 | NV-KF75-SIL-TAC | Silver / Tactile | $229.00 |  | 15 | In stock |
| walnut-wrist-rest | 48800001800 | NV-WWR-65 | 65% | $59.00 |  | 30 | In stock |
| walnut-wrist-rest | 48800001801 | NV-WWR-75 | 75% | $59.00 |  | 30 | In stock |
| walnut-wrist-rest | 48800001802 | NV-WWR-FUL | Full size | $75.00 |  | 0 | **Sold out** |
| walnut-desk-organizer | 48800001900 | NV-WDO-COM | Compact | $129.00 |  | 17 | In stock |
| walnut-desk-organizer | 48800001901 | NV-WDO-FUL | Full | $169.00 |  | 5 | Low stock |
| contour-wireless-mouse | 48800002000 | NV-CWM-CLA | Clay | $89.00 |  | 40 | In stock |
| switch-sampler | 48800002100 | NV-SWS-LIN | Linear | $19.00 |  | 120 | In stock |
| switch-sampler | 48800002101 | NV-SWS-TAC | Tactile | $19.00 |  | 120 | In stock |
| switch-sampler | 48800002102 | NV-SWS-CLI | Clicky | $19.00 |  | 4 | Low stock |
| keycap-tool-kit | 48800002200 | NV-KTK-ICE | Ice | $19.00 |  | 85 | In stock |
| pebble-ceramic-mug | 48800002300 | NV-MUG-BON | Bone | $34.00 |  | 70 | In stock |
| pebble-ceramic-mug | 48800002301 | NV-MUG-GRA | Graphite | $34.00 |  | 22 | In stock |
| halo-desk-lamp | 48800002400 | NV-HDL-BRU | Brushed steel | $189.00 |  | 23 | In stock |
| dome-lamp | 48800002500 | NV-DOM-TER | Terracotta | $95.00 |  | 2 | Low stock |
| ember-portable-lamp | 48800002600 | NV-EMB-TER | Terracotta | $119.00 |  | 19 | In stock |
| ember-portable-lamp | 48800002601 | NV-EMB-BRO | Bronze | $139.00 |  | 6 | In stock |
| line-wall-light | 48800002700 | NV-LWL-60C-GRA | 60 cm / Graphite | $169.00 |  | 9 | In stock |
| line-wall-light | 48800002701 | NV-LWL-60C-BUR | 60 cm / Burnt orange | $169.00 |  | 9 | In stock |
| line-wall-light | 48800002702 | NV-LWL-120-GRA | 120 cm / Graphite | $229.00 |  | 9 | In stock |
| line-wall-light | 48800002703 | NV-LWL-120-BUR | 120 cm / Burnt orange | $229.00 |  | 0 | **Sold out** |
| flex-light-strip | 48800002800 | NV-FLX-1M | 1 m | $39.00 |  | 64 | In stock |
| flex-light-strip | 48800002801 | NV-FLX-2M | 2 m | $59.00 |  | 64 | In stock |
| flex-light-strip | 48800002802 | NV-FLX-5M | 5 m | $99.00 |  | 11 | In stock |
| crane-task-lamp | 48800002900 | NV-CRN-BUR | Burnt sienna | $139.00 |  | 13 | In stock |
| port-usb-c-hub | 48800003000 | NV-PRT-4PO | 4-port | $59.00 |  | 44 | In stock |
| port-usb-c-hub | 48800003001 | NV-PRT-8PO | 8-port | $89.00 |  | 44 | In stock |
| port-usb-c-hub | 48800003002 | NV-PRT-12P | 12-port | $129.00 |  | 7 | In stock |
| volt-power-bank | 48800003100 | NV-VLT-100 | 10,000 mAh | $69.00 |  | 52 | In stock |
| volt-power-bank | 48800003101 | NV-VLT-200 | 20,000 mAh | $99.00 |  | 0 | **Sold out** |
| aviator-usb-c-cable | 48800003200 | NV-AVI-1M | 1 m | $35.00 |  | 75 | In stock |
| aviator-usb-c-cable | 48800003201 | NV-AVI-15M | 1.5 m | $39.00 |  | 75 | In stock |
| aviator-usb-c-cable | 48800003202 | NV-AVI-2M | 2 m | $45.00 |  | 0 | **Sold out** |
| orbit-charging-dock | 48800003300 | NV-ORB-GRA | Graphite | $79.00 |  | 28 | In stock |
| coil-desk-power | 48800003400 | NV-COIL-US | US | $59.00 |  | 25 | In stock |
| coil-desk-power | 48800003401 | NV-COIL-UK | UK | $59.00 |  | 3 | Low stock |
| coil-desk-power | 48800003402 | NV-COIL-EU | EU | $59.00 |  | 25 | In stock |
| shell-magsafe-case | 48800003500 | NV-SHL-MIN-61 | Mint / 6.1" | $49.00 |  | 40 | In stock |
| shell-magsafe-case | 48800003501 | NV-SHL-MIN-67 | Mint / 6.7" | $49.00 |  | 0 | **Sold out** |
| shell-magsafe-case | 48800003502 | NV-SHL-TAN-61 | Tangerine / 6.1" | $49.00 |  | 40 | In stock |
| shell-magsafe-case | 48800003503 | NV-SHL-TAN-67 | Tangerine / 6.7" | $49.00 |  | 40 | In stock |
| shell-magsafe-case | 48800003504 | NV-SHL-LAG-61 | Lagoon / 6.1" | $49.00 | $59.00 | 40 | In stock |
| shell-magsafe-case | 48800003505 | NV-SHL-LAG-67 | Lagoon / 6.7" | $49.00 | $59.00 | 5 | Low stock |
| lift-phone-stand | 48800003600 | NV-LFT-SIL | Silver | $45.00 |  | 58 | In stock |
| lift-phone-stand | 48800003601 | NV-LFT-GRA | Graphite | $45.00 |  | 58 | In stock |
| sleeve-14-laptop-sleeve | 48800003700 | NV-SLV-LEM | Lemon | $79.00 | $95.00 | 18 | In stock |
| glass-screen-guard | 48800003800 | NV-GLS-61 | 6.1" | $29.00 |  | 140 | In stock |
| glass-screen-guard | 48800003801 | NV-GLS-67 | 6.7" | $29.00 |  | 140 | In stock |
| glass-screen-guard | 48800003802 | NV-GLS-TAB | Tablet 11" | $39.00 |  | 140 | In stock |
| nova-gift-card | 48800009900 | NV-GIFT-50 | $50 | $50.00 |  | 9999 | In stock |
| nova-gift-card | 48800009901 | NV-GIFT-100 | $100 | $100.00 |  | 9999 | In stock |
| nova-gift-card | 48800009902 | NV-GIFT-250 | $250 | $250.00 |  | 9999 | In stock |

Combinations missing from the matrix (exercise `encodedVariantExistence`): `keyframe-75-keyboard` Midnight / Tactile.

### Collections

| Handle | Title | Kind | Rule | Products |
| --- | --- | --- | --- | --- |
| `sound` | Sound | category | smart (rule) | 10 |
| `studio` | Studio | category | smart (rule) | 6 |
| `desk` | Desk | category | smart (rule) | 18 |
| `light` | Light | category | smart (rule) | 6 |
| `power` | Power | category | smart (rule) | 5 |
| `mobile` | Mobile & Carry | category | smart (rule) | 6 |
| `new-arrivals` | New Arrivals | curated | smart (rule) | 10 |
| `best-sellers` | Best Sellers | curated | manual | 8 |
| `walnut-edition` | The Walnut Edition | curated | smart (rule) | 2 |
| `gifts-under-100` | Gifts Under $100 | curated | smart (rule) | 17 |
| `sale` | Sale | curated | smart (rule) | 6 |

### Customers

| Id | Name | Email | Tags | Addresses | Orders | Persona |
| --- | --- | --- | --- | --- | --- | --- |
| 7400000001 | Ava Chen | ava.chen@example.com | VIP, audiophile | 2 | 4 | VIP · 4 orders, one in transit |
| 7400000002 | Liam O'Connor | liam.oconnor@example.com | international | 1 | 1 | UK customer · partially refunded order |
| 7400000003 | Sofia Martínez | sofia.martinez@example.com | creator | 1 | 1 | Podcaster · unfulfilled studio order |
| 7400000004 | Noah Williams | noah.williams@example.com | VIP, wholesale-interest | 1 | 1 | Long-time customer · split shipment |
| 7400000005 | Mia Tremblay | mia.tremblay@example.com | international | 1 | 1 | Canada · paid in CAD |
| 7400000006 | Ethan Brooks | ethan.brooks@example.com | desk-setup | 1 | 1 | Desk enthusiast · delivered order |
| 7400000007 | Hannah Schmidt | hannah.schmidt@example.com | international | 1 | 1 | Germany · cancelled order |
| 7400000008 | Oliver Nguyen | oliver.nguyen@example.com |  | 1 | 1 | New customer · one order out for delivery |
| 7400000009 | Isla Kapoor | isla.kapoor@example.com | gift-buyer | 2 | 2 | Gift buyer · gift card + refund |
| 7400000010 | Jamal Rivers | jamal.rivers@example.com |  | 0 | 0 | Brand-new account · no orders yet |

### Orders

| # | Customer | Date | Currency | Financial | Fulfillment | Lines | Discount | Tracking |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1001 | Ava Chen | 2025-02-03 | USD | PAID | FULFILLED | 1× vinyl-deck-t1<br>1× braided-interconnect-cable |  | UPS DELIVERED |
| 1004 | Ava Chen | 2025-11-27 | USD | PAID | FULFILLED | 2× pebble-room-speaker<br>2× pebble-ceramic-mug | WELCOME10 | FedEx DELIVERED |
| 1012 | Ava Chen | 2026-11-09 | USD | PAID | FULFILLED | 1× halo-anc-headphones<br>1× aviator-usb-c-cable |  | USPS IN_TRANSIT |
| 1013 | Ava Chen | 2026-11-12 | USD | AUTHORIZED | UNFULFILLED | 1× integrated-amplifier-a1 | NOVA25 |  |
| 1005 | Liam O'Connor | 2026-01-14 | GBP | PARTIALLY_REFUNDED | FULFILLED | 1× aria-studio-headphones<br>1× hifi-headphone-amp |  | DHL Express DELIVERED |
| 1008 | Sofia Martínez | 2026-11-11 | USD | PAID | UNFULFILLED | 1× studio-condenser-mic<br>1× mic-mount-kit<br>1× duo-audio-interface |  |  |
| 1007 | Noah Williams | 2026-10-30 | USD | PAID | PARTIALLY_FULFILLED | 1× keyframe-75-keyboard<br>1× walnut-wrist-rest<br>1× walnut-desk-organizer | DESKSET | UPS DELIVERED |
| 1009 | Mia Tremblay | 2026-09-18 | CAD | PAID | FULFILLED | 1× arc-laptop-stand<br>2× lift-phone-stand |  | Canada Post DELIVERED |
| 1010 | Ethan Brooks | 2026-10-20 | USD | PAID | FULFILLED | 1× keyframe-75-keyboard<br>1× switch-sampler<br>1× keycap-tool-kit<br>1× aviator-usb-c-cable |  | UPS DELIVERED |
| 1006 | Hannah Schmidt | 2026-05-02 | EUR | REFUNDED | CANCELLED | 1× vinyl-deck-t2 |  |  |
| 1011 | Oliver Nguyen | 2026-11-10 | USD | PAID | FULFILLED | 1× shell-magsafe-case<br>1× glass-screen-guard<br>1× orbit-charging-dock | FREESHIP | FedEx OUT_FOR_DELIVERY |
| 1003 | Isla Kapoor | 2025-12-15 | USD | PAID | FULFILLED | 2× nova-gift-card |  |  |
| 1002 | Isla Kapoor | 2025-04-20 | USD | REFUNDED | FULFILLED | 1× dome-lamp |  | DHL Express DELIVERED |

### Discount codes

| Code | Rule | Minimum | Scope | Window | Scenario |
| --- | --- | --- | --- | --- | --- |
| `WELCOME10` | 10% off |  | Order | 2024-01-01 → open | Order-level percentage discount, allocated across every line. |
| `SAVE20` | $20.00 off | $100.00 | Order | 2024-01-01 → open | Fixed amount with a minimum subtotal. Shows 'not applicable' below $100. |
| `NOVA25` | 25% off | $250.00 | Order | 2024-01-01 → open | High-value threshold discount. |
| `SOUND15` | 15% off |  | collection:sound | 2026-01-01 → open | Collection-scoped: allocates only to Sound lines (line-item discount). |
| `DESKSET` | 10% off |  | keyframe-75-keyboard, walnut-wrist-rest, walnut-desk-organizer | 2026-01-01 → open | Product-scoped line-item discount. |
| `FREESHIP` | Free shipping |  | Order | 2024-01-01 → open | Shipping discount: applies at checkout, no change to merchandise subtotal. |
| `SUMMER25` | 25% off |  | Order | 2025-06-01 → 2025-08-31 | Expired code. The cart keeps it with applicable: false. |

### Automatic discounts

| Id | Title | Requires | Percent |
| --- | --- | --- | --- |
| auto_studio_bundle | Studio bundle: 10% off | studio-condenser-mic + mic-mount-kit + duo-audio-interface | 10% |
| auto_listening_bundle | Listening set: 10% off | aria-studio-headphones + hifi-headphone-amp | 10% |

### Gift cards

| Code | Balance | Enabled | Note |
| --- | --- | --- | --- |
| `NOVAGIFT50` | $50.00 | yes | $50 balance |
| `NOVAGIFT250` | $250.00 | yes | $250 balance |
| `NOVAGIFT0` | $0.00 | yes | Fully spent: rejected |
| `NOVAGIFTOLD` | $75.00 | no | Expired: rejected |

### Markets (countries, currencies, languages)

| Country | Currency | Rate from USD | Rounding | Languages | Tax included | Free shipping over |
| --- | --- | --- | --- | --- | --- | --- |
| United States (US) | USD | 1 | none | EN | no | 150 USD |
| Canada (CA) | CAD | 1.38 | whole | EN, FR | no | 200 CAD |
| United Kingdom (GB) | GBP | 0.79 | whole | EN | yes | 120 GBP |
| France (FR) | EUR | 0.93 | ninety_five | FR, EN | yes | 140 EUR |
| Germany (DE) | EUR | 0.93 | ninety_five | DE, EN | yes | 140 EUR |
| Australia (AU) | AUD | 1.53 | whole | EN | yes | 220 AUD |
| Japan (JP) | JPY | 151 | whole | JA, EN | yes | 22000 JPY |

### Shipping options

| Rate | Countries | Price (USD base) | Free over threshold | Transit |
| --- | --- | --- | --- | --- |
| Standard | US | $8.00 | yes | 3–5 days |
| Express | US | $18.00 | no | 1–2 days |
| Overnight | US | $35.00 | no | 1–1 days |
| White-glove delivery | US | $49.00 | no | 5–10 days |
| Canada Standard | CA | $12.00 | yes | 4–8 days |
| International Standard | GB, FR, DE, AU, JP | $15.00 | yes | 5–10 days |
| International Express | GB, FR, DE, AU, JP | $35.00 | no | 2–4 days |

### Tax examples

| Region | Label | Rate | Included in price | Note |
| --- | --- | --- | --- | --- |
| California | Sales tax | 7.25% | no | Base state rate; local district taxes can raise it to ~10%. |
| New York City | Sales tax | 8.875% | no | State + city + MCTD. |
| Oregon | Sales tax | 0% | no | No sales tax. |
| Quebec | GST + QST | 14.975% | no | 5% GST + 9.975% QST. |
| Ontario | HST | 13% | no | Harmonized sales tax. |
| United Kingdom | VAT | 20% | yes | Prices shown include VAT. |
| Germany | MwSt. | 19% | yes | Prices shown include VAT. |
| France | TVA | 20% | yes | Prices shown include VAT. |
| Australia | GST | 10% | yes | Prices shown include GST. |
| Japan | Consumption tax | 10% | yes | Prices shown include consumption tax. |

<!-- GENERATED:END -->
