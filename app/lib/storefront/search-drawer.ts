export const SEARCH_DIALOG_ID = "search-dialog";

export function openSearch() {
  const el = document.getElementById(SEARCH_DIALOG_ID);
  if (el instanceof HTMLDialogElement && !el.open) el.showModal();
}

export function closeSearch() {
  const el = document.getElementById(SEARCH_DIALOG_ID);
  if (el instanceof HTMLDialogElement) el.close();
}
