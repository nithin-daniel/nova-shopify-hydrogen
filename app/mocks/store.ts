import { img } from "./images";
import type {
  MockBlog,
  MockMarket,
  MockMenuItem,
  MockPage,
  MockPolicy,
  MockShippingRate,
  MockTaxExample,
} from "./types";

export const SHOP = {
  id: "gid://shopify/Shop/68000000001",
  /** Numeric id used for ShopifyScripts in demo mode (no data is sent to Shopify). */
  numericId: "68000000001",
  name: "NOVA",
  description:
    "NOVA designs considered objects for sound, light and the modern desk: precise, quiet, and built to last.",
  tagline: "Objects for focus.",
  myshopifyDomain: "nova-demo.myshopify.com",
  primaryDomain: "https://nova.example",
  currencyCode: "USD",
  countryCode: "US",
  email: "hello@nova.example",
  phone: "+1 (415) 555-0100",
  address: "NOVA Studio, 2101 Third Street, San Francisco, CA 94107",
  acceptedCardBrands: ["VISA", "MASTERCARD", "AMERICAN_EXPRESS", "DISCOVER"],
  supportedDigitalWallets: ["SHOPIFY_PAY", "APPLE_PAY", "GOOGLE_PAY"],
  brand: {
    slogan: "Objects for focus.",
    shortDescription: "Premium audio, lighting and desk objects.",
    colors: { primary: "#141414", secondary: "#F3EFE8", accent: "#C8553D" },
  },
  social: {
    instagram: "https://instagram.com/",
    youtube: "https://youtube.com/",
  },
};

/** Shopify Markets: one market per country, priced from USD with rounding rules. */
export const MARKETS: MockMarket[] = [
  { countryCode: "US", name: "United States", currencyCode: "USD", currencySymbol: "$", rate: 1, rounding: "none", languages: ["EN"], taxIncluded: false, freeShippingThreshold: 15000 },
  { countryCode: "CA", name: "Canada", currencyCode: "CAD", currencySymbol: "$", rate: 1.38, rounding: "whole", languages: ["EN", "FR"], taxIncluded: false, freeShippingThreshold: 20000 },
  { countryCode: "GB", name: "United Kingdom", currencyCode: "GBP", currencySymbol: "£", rate: 0.79, rounding: "whole", languages: ["EN"], taxIncluded: true, freeShippingThreshold: 12000 },
  { countryCode: "FR", name: "France", currencyCode: "EUR", currencySymbol: "€", rate: 0.93, rounding: "ninety_five", languages: ["FR", "EN"], taxIncluded: true, freeShippingThreshold: 14000 },
  { countryCode: "DE", name: "Germany", currencyCode: "EUR", currencySymbol: "€", rate: 0.93, rounding: "ninety_five", languages: ["DE", "EN"], taxIncluded: true, freeShippingThreshold: 14000 },
  { countryCode: "AU", name: "Australia", currencyCode: "AUD", currencySymbol: "$", rate: 1.53, rounding: "whole", languages: ["EN"], taxIncluded: true, freeShippingThreshold: 22000 },
  { countryCode: "JP", name: "Japan", currencyCode: "JPY", currencySymbol: "¥", rate: 151, rounding: "whole", languages: ["JA", "EN"], taxIncluded: true, freeShippingThreshold: 2200000 },
];

export const SHIPPING_RATES: MockShippingRate[] = [
  { handle: "standard", title: "Standard", countries: ["US"], price: 800, freeOverThreshold: true, minDays: 3, maxDays: 5 },
  { handle: "express", title: "Express", countries: ["US"], price: 1800, freeOverThreshold: false, minDays: 1, maxDays: 2 },
  { handle: "overnight", title: "Overnight", countries: ["US"], price: 3500, freeOverThreshold: false, minDays: 1, maxDays: 1 },
  { handle: "white-glove", title: "White-glove delivery", countries: ["US"], price: 4900, freeOverThreshold: false, minDays: 5, maxDays: 10 },
  { handle: "canada-standard", title: "Canada Standard", countries: ["CA"], price: 1200, freeOverThreshold: true, minDays: 4, maxDays: 8 },
  { handle: "intl-standard", title: "International Standard", countries: ["GB", "FR", "DE", "AU", "JP"], price: 1500, freeOverThreshold: true, minDays: 5, maxDays: 10 },
  { handle: "intl-express", title: "International Express", countries: ["GB", "FR", "DE", "AU", "JP"], price: 3500, freeOverThreshold: false, minDays: 2, maxDays: 4 },
];

export const TAX_EXAMPLES: MockTaxExample[] = [
  { region: "California", countryCode: "US", provinceCode: "CA", rate: 0.0725, label: "Sales tax", included: false, note: "Base state rate; local district taxes can raise it to ~10%." },
  { region: "New York City", countryCode: "US", provinceCode: "NY", rate: 0.08875, label: "Sales tax", included: false, note: "State + city + MCTD." },
  { region: "Oregon", countryCode: "US", provinceCode: "OR", rate: 0, label: "Sales tax", included: false, note: "No sales tax." },
  { region: "Quebec", countryCode: "CA", provinceCode: "QC", rate: 0.14975, label: "GST + QST", included: false, note: "5% GST + 9.975% QST." },
  { region: "Ontario", countryCode: "CA", provinceCode: "ON", rate: 0.13, label: "HST", included: false, note: "Harmonized sales tax." },
  { region: "United Kingdom", countryCode: "GB", rate: 0.2, label: "VAT", included: true, note: "Prices shown include VAT." },
  { region: "Germany", countryCode: "DE", rate: 0.19, label: "MwSt.", included: true, note: "Prices shown include VAT." },
  { region: "France", countryCode: "FR", rate: 0.2, label: "TVA", included: true, note: "Prices shown include VAT." },
  { region: "Australia", countryCode: "AU", rate: 0.1, label: "GST", included: true, note: "Prices shown include GST." },
  { region: "Japan", countryCode: "JP", rate: 0.1, label: "Consumption tax", included: true, note: "Prices shown include consumption tax." },
];

export const POPULAR_SEARCHES = ["headphones", "walnut", "keyboard", "desk lamp", "usb-c", "speaker", "gift"];

export const MENUS: Record<"main" | "footer", MockMenuItem[]> = {
  main: [
    { title: "Sound", url: "/collections/sound" },
    { title: "Studio", url: "/collections/studio" },
    { title: "Desk", url: "/collections/desk" },
    { title: "Light", url: "/collections/light" },
    { title: "Power", url: "/collections/power" },
    { title: "Mobile", url: "/collections/mobile" },
  ],
  footer: [
    { title: "About", url: "/pages/about" },
    { title: "Journal", url: "/blogs/journal" },
    { title: "Contact", url: "/pages/contact" },
    { title: "FAQ", url: "/pages/faq" },
  ],
};

export const PAGES: MockPage[] = [
  {
    id: "gid://shopify/Page/1001",
    handle: "about",
    title: "About NOVA",
    bodySummary: "We make fewer, better objects for the places you think, listen and work.",
    body: `<p class="lead">NOVA began in 2019 in a converted print shop in San Francisco, with one idea: the objects on your desk should help you concentrate, not compete for your attention.</p>
<h2>Fewer, better things</h2>
<p>We release a handful of products a year. Each one goes through more than a hundred prototypes, and we only ship it when we'd keep it on our own desks for a decade. That means machined aluminium instead of plastic, solid walnut instead of veneer, and parts you can replace instead of products you throw away.</p>
<h2>Designed in San Francisco, made by specialists</h2>
<p>Our audio is tuned in our own listening room and built by a family-run factory in Shenzhen we've worked with since day one. Our walnut comes from sustainably managed forests in Pennsylvania and is milled in small batches in Oregon. Our ceramics are thrown in Portugal.</p>
<h2>Built to be kept</h2>
<p>Every NOVA product carries at least a two-year warranty, and we stock spare parts (pads, cables, feet, bulbs) for at least seven years after a product is discontinued.</p>`,
  },
  {
    id: "gid://shopify/Page/1002",
    handle: "contact",
    title: "Contact",
    bodySummary: "Questions about an order, a product or a partnership? We usually reply within one business day.",
    body: `<p>Our customer care team is available Monday to Friday, 9am–6pm Pacific time.</p>
<ul><li><strong>Email:</strong> hello@nova.example</li><li><strong>Phone:</strong> +1 (415) 555-0100</li><li><strong>Studio:</strong> 2101 Third Street, San Francisco, CA 94107 (by appointment)</li></ul>`,
  },
  {
    id: "gid://shopify/Page/1003",
    handle: "faq",
    title: "Frequently asked questions",
    bodySummary: "Shipping, returns, warranty and everything in between.",
    body: `<h3>How long does shipping take?</h3><p>Standard shipping in the US takes 3–5 business days and is free on orders over $150. Express (1–2 days) and overnight are available at checkout. International orders arrive in 5–10 business days.</p>
<h3>What is your return policy?</h3><p>You can return any unused product within 30 days for a full refund. Audio products can be returned within 30 days even if opened.</p>
<h3>Do your prices include tax?</h3><p>In the US and Canada, tax is calculated at checkout. In the UK, EU, Australia and Japan our prices include VAT/GST.</p>
<h3>Is there a warranty?</h3><p>Every product has at least a two-year limited warranty. The Integrated Amplifier A1 has five years.</p>
<h3>Can I change or cancel my order?</h3><p>Orders can be changed or cancelled until they ship. Sign in to your account or contact us with your order number.</p>
<h3>Do you offer gift wrapping?</h3><p>Yes. Add a gift note in your cart and we'll wrap the order in recycled paper with a handwritten card.</p>`,
  },
  {
    id: "gid://shopify/Page/1004",
    handle: "sustainability",
    title: "Materials & responsibility",
    bodySummary: "Recycled aluminium, FSC walnut, plastic-free packaging.",
    body: `<p>All of our aluminium contains at least 70% recycled content. Our walnut is FSC-certified. Since 2024 every NOVA box has been plastic-free, printed with soy inks and sized to its contents.</p>`,
  },
];

export const POLICIES: MockPolicy[] = [
  {
    id: "gid://shopify/ShopPolicy/1",
    handle: "shipping-policy",
    title: "Shipping policy",
    body: `<h2>Processing</h2><p>Orders placed before 1pm Pacific on business days ship the same day. Pre-orders and backordered items ship as soon as they're in stock; we'll email you an estimated date.</p>
<h2>United States</h2><ul><li>Standard (3–5 business days): $8, free over $150</li><li>Express (1–2 business days): $18</li><li>Overnight: $35</li><li>White-glove delivery for amplifiers and speakers: $49</li></ul>
<h2>International</h2><p>We ship to Canada, the United Kingdom, the EU, Australia and Japan. Duties and taxes are calculated at checkout and included in the price you pay, so there are no surprise fees on delivery.</p>
<h2>Tracking</h2><p>You'll receive a tracking link as soon as your order ships. You can also see live tracking under Orders in your account.</p>`,
  },
  {
    id: "gid://shopify/ShopPolicy/2",
    handle: "refund-policy",
    title: "Returns & refunds",
    body: `<h2>30-day returns</h2><p>Return any product within 30 days of delivery for a full refund to your original payment method. Products must be in their original packaging; audio products may be opened and used.</p>
<h2>How to return</h2><ol><li>Sign in to your account and choose the order.</li><li>Select the items to return and print the prepaid label.</li><li>Drop the parcel at any UPS location.</li></ol>
<h2>Refunds</h2><p>Refunds are issued within 3 business days of the return arriving at our warehouse. Original shipping charges are refundable when the return is due to our error.</p>
<h2>Exceptions</h2><p>Gift cards and personalised items cannot be returned.</p>`,
  },
  {
    id: "gid://shopify/ShopPolicy/3",
    handle: "privacy-policy",
    title: "Privacy policy",
    body: `<p>This is a fictional demo store. In a real store this page explains what personal information is collected, how it is used, and how customers can exercise their rights. Shopify generates a template in Settings → Policies.</p>
<p>This demo stores a cart cookie, a demo customer session cookie when you sign in with a demo profile, and your analytics consent choice. Wishlist, comparison and recently viewed products are stored only in your browser's localStorage.</p>`,
  },
  {
    id: "gid://shopify/ShopPolicy/4",
    handle: "terms-of-service",
    title: "Terms of service",
    body: `<p>This is a fictional demo store built to explore Shopify Hydrogen. No orders are placed, no payments are taken and no products are shipped.</p>`,
  },
];

export const BLOG: MockBlog = {
  id: "gid://shopify/Blog/2001",
  handle: "journal",
  title: "Journal",
  description: "Notes on sound, light, materials and the craft of working well.",
  articles: [
    {
      id: "gid://shopify/Article/3001",
      handle: "the-quiet-desk",
      title: "The quiet desk: designing for deep work",
      author: "Mara Ellison",
      publishedAt: "2026-10-28T08:00:00Z",
      excerpt: "Five principles we use to design objects that reduce noise: acoustic, visual and digital.",
      image: { ...img("gad/ergonomic-over-ear-headphones", 1), alt: "A woman listening with Halo headphones in a calm room" },
      tags: ["Desk", "Focus"],
      relatedProductHandles: ["halo-anc-headphones", "arc-laptop-stand", "halo-desk-lamp"],
      contentHtml: `<p class="lead">A focused desk is a quiet desk, and not only in decibels.</p>
<h2>1. Remove the visual noise first</h2><p>Every object in your peripheral vision costs a sliver of attention. We design in a narrow palette (graphite, bone, walnut) so nothing shouts.</p>
<h2>2. Light the task, not the room</h2><p>Glare forces your eyes to constantly re-adapt. A wide, diffused source at the right angle does more for an afternoon than another coffee.</p>
<h2>3. Raise the screen</h2><p>Eye-level screens keep your neck neutral, which turns out to matter more than any chair.</p>
<h2>4. Make silence portable</h2><p>Open offices and cafés aren't going away. Good noise cancelling is the closest thing to a door you can carry.</p>
<h2>5. Fewer cables, fewer decisions</h2><p>One cable to the laptop, one hub under the desk. The fewer things you plug in each morning, the faster you start.</p>`,
    },
    {
      id: "gid://shopify/Article/3002",
      handle: "why-walnut",
      title: "Why we keep coming back to walnut",
      author: "Theo Park",
      publishedAt: "2026-09-12T08:00:00Z",
      excerpt: "Warm, stable and endlessly varied, and better looking every year you use it.",
      image: { ...img("mec/handcrafted-keyboard-wrist-rest", 1), alt: "Close-up of walnut grain on the wrist rest" },
      tags: ["Materials"],
      relatedProductHandles: ["walnut-wrist-rest", "walnut-desk-organizer"],
      contentHtml: `<p class="lead">American black walnut is one of the few materials that improves with handling.</p>
<p>It's dense enough to machine crisp edges, stable enough to stay flat on a desk for decades, and its grain is so varied that no two of our wrist rests look alike. We finish it with a hard-wax oil rather than lacquer, so it develops a patina instead of wearing through.</p>
<h2>Sourcing</h2><p>Our walnut is FSC-certified and comes from a mill in Pennsylvania that has supplied furniture makers for four generations.</p>`,
    },
    {
      id: "gid://shopify/Article/3003",
      handle: "a-beginners-guide-to-vinyl",
      title: "A beginner's guide to vinyl, in four components",
      author: "Jonas Reyes",
      publishedAt: "2026-08-03T08:00:00Z",
      excerpt: "Turntable, preamp, amplifier, speakers. What each one does and where to spend first.",
      image: { ...img("aud/platine-en-metal-brosse-plateau-acrylique", 1), alt: "Placing a record on the Vinyl Deck T1" },
      tags: ["Sound", "Guides"],
      relatedProductHandles: ["vinyl-deck-t1", "vinyl-deck-t2", "integrated-amplifier-a1", "monolith-speaker"],
      contentHtml: `<p class="lead">A record player is really four things in a row. Understanding them makes upgrading simple.</p>
<h2>The turntable</h2><p>Spins the record at a precise speed and holds the stylus in the groove. Isolation from vibration matters more than anything else.</p>
<h2>The phono preamp</h2><p>Boosts the tiny signal from the cartridge and applies the RIAA curve. Many turntables (like our T1) include one.</p>
<h2>The amplifier</h2><p>Drives your speakers. If your speakers are active, it's built in.</p>
<h2>The speakers</h2><p>Where to spend first. Good speakers will reveal every later upgrade.</p>`,
    },
    {
      id: "gid://shopify/Article/3004",
      handle: "recording-at-home",
      title: "Recording at home without a studio",
      author: "Nadia Farouk",
      publishedAt: "2026-06-18T08:00:00Z",
      excerpt: "A good microphone matters less than the room you put it in. Here's how to fix the room.",
      image: { ...img("aud/studio-condenser-microphone-matte-black-finish", 2), alt: "Recording guitar at home with a condenser microphone" },
      tags: ["Studio", "Guides"],
      relatedProductHandles: ["studio-condenser-mic", "duo-audio-interface", "mic-mount-kit"],
      contentHtml: `<p class="lead">Most home recordings don't sound amateur because of the microphone. They sound amateur because of the room.</p>
<h2>Kill the reflections</h2><p>Record facing into a bookshelf or a wardrobe full of clothes. Soft, irregular surfaces break up reflections better than foam squares.</p>
<h2>Get closer</h2><p>Halve the distance to the microphone and you halve the room in the recording.</p>
<h2>Isolate the stand</h2><p>A shock mount stops desk thumps and footsteps from reaching the capsule.</p>`,
    },
    {
      id: "gid://shopify/Article/3005",
      handle: "warm-light-after-dark",
      title: "Warm light after dark",
      author: "Mara Ellison",
      publishedAt: "2026-04-22T08:00:00Z",
      excerpt: "Why we tune our lamps to 2200–2700 K for evenings, and what that does for winding down.",
      image: { ...img("lig/retro-desk-lamp", 2), alt: "Reading by the Dome Lamp in the evening" },
      tags: ["Light"],
      relatedProductHandles: ["dome-lamp", "ember-portable-lamp", "crane-task-lamp"],
      contentHtml: `<p class="lead">Light has a temperature, and in the evening, warmer is kinder.</p>
<p>Cool white light (5000 K and up) is great for detail work but signals daytime to your body. In the evening we drop to 2200–2700 K, the colour of candlelight and old incandescent bulbs, and lower the light so it pools where you need it.</p>`,
    },
  ],
};
