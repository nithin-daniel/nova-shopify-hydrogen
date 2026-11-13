/** Cart drawer helpers (skill: hydrogen-cart-drawer). Open/close state lives on the <dialog>. */
export const CART_DRAWER_ID = "cart-drawer";

let configured = false;
let retryQueued = false;

function getDrawer() {
  if (typeof document === "undefined") return null;
  const el = document.getElementById(CART_DRAWER_ID);
  return el instanceof HTMLDialogElement ? el : null;
}

export function openCartDrawer() {
  const drawer = getDrawer();
  if (!drawer || drawer.open) return;
  drawer.showModal();
}

export function closeCartDrawer() {
  getDrawer()?.close();
}

function configureNow() {
  const openCart = typeof window !== "undefined" ? window.Shopify?.actions?.openCart : undefined;
  if (!openCart) return false;
  openCart.configure({ handler: async () => openCartDrawer() });
  configured = true;
  return true;
}

/** Wires `window.Shopify.actions.openCart()` to the drawer once Standard Actions loads. */
export function configureOpenCartAction() {
  if (typeof document === "undefined" || configured) return;
  if (configureNow()) return;
  if (retryQueued || document.readyState !== "loading") {
    // Standard Actions is a module script; poll briefly after load.
    let tries = 0;
    const timer = setInterval(() => {
      if (configureNow() || ++tries > 40) clearInterval(timer);
    }, 250);
    return;
  }
  retryQueued = true;
  document.addEventListener("DOMContentLoaded", () => {
    retryQueued = false;
    configureOpenCartAction();
  }, { once: true });
}

configureOpenCartAction();
