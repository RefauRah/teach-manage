/**
 * Loading UI utilities for the TeachManage application.
 * Provides global overlay, button states, and content loading indicators.
 */

// ---------------------------------------------------------------------------
//  1. Global Full-Screen Loading Overlay
// ---------------------------------------------------------------------------

let overlayEl: HTMLElement | null = null;

function getOrCreateOverlay(): HTMLElement {
  if (overlayEl && document.body.contains(overlayEl)) return overlayEl;

  overlayEl = document.createElement('div');
  overlayEl.id = 'global-loading-overlay';
  overlayEl.className = 'loading-overlay';
  overlayEl.innerHTML = `
    <div class="loading-overlay-content">
      <div class="loading-spinner"></div>
      <p class="loading-text">Memuat...</p>
    </div>
  `;
  document.body.appendChild(overlayEl);
  return overlayEl;
}

/**
 * Show a full-screen loading overlay with an optional message.
 * Useful for route transitions and major data fetches.
 */
export function showLoading(message = 'Memuat...'): void {
  const overlay = getOrCreateOverlay();
  const textEl = overlay.querySelector('.loading-text');
  if (textEl) textEl.textContent = message;
  overlay.classList.add('visible');
}

/**
 * Hide the full-screen loading overlay.
 */
export function hideLoading(): void {
  if (overlayEl) {
    overlayEl.classList.remove('visible');
  }
}

// ---------------------------------------------------------------------------
//  2. Button Loading State
// ---------------------------------------------------------------------------

/**
 * Set a button into a loading state — disabling it and showing a spinner.
 * Returns a `restore` function to call when the operation completes.
 *
 * @example
 * const restore = setButtonLoading(submitBtn, 'Menyimpan...');
 * try { await API.post(...); } finally { restore(); }
 */
export function setButtonLoading(
  btn: HTMLButtonElement,
  loadingText?: string
): () => void {
  const originalHTML = btn.innerHTML;
  const originalDisabled = btn.disabled;
  const originalWidth = btn.offsetWidth;

  // Lock width so the button doesn't jump in size
  btn.style.minWidth = `${originalWidth}px`;
  btn.disabled = true;
  btn.classList.add('btn-loading');
  btn.innerHTML = `
    <span class="btn-spinner"></span>
    <span>${loadingText || 'Memproses...'}</span>
  `;

  return () => {
    btn.innerHTML = originalHTML;
    btn.disabled = originalDisabled;
    btn.classList.remove('btn-loading');
    btn.style.minWidth = '';
  };
}

// ---------------------------------------------------------------------------
//  3. Inline / Content Loading Placeholder
// ---------------------------------------------------------------------------

/**
 * Generate HTML for a content loading placeholder (inline spinner with text).
 * Commonly used inside table bodies, card bodies, etc.
 */
export function contentLoader(message = 'Memuat data...'): string {
  return `
    <div class="content-loader">
      <div class="loading-spinner loading-spinner-sm"></div>
      <span>${message}</span>
    </div>
  `;
}

/**
 * Generate skeleton rows for a table while data is loading.
 * @param cols  Number of columns
 * @param rows  Number of skeleton rows to render
 */
export function skeletonTableRows(cols: number, rows = 3): string {
  let html = '';
  for (let r = 0; r < rows; r++) {
    html += '<tr class="skeleton-row">';
    for (let c = 0; c < cols; c++) {
      html += `<td><div class="skeleton-line" style="width: ${60 + Math.random() * 30}%"></div></td>`;
    }
    html += '</tr>';
  }
  return html;
}

// ---------------------------------------------------------------------------
//  4. Wrapper helper: run an async operation with loading state on a button
// ---------------------------------------------------------------------------

/**
 * Wrap an async callback with automatic button loading state management.
 * Shows spinner on the button, runs the callback, then restores the button.
 */
export async function withButtonLoading<T>(
  btn: HTMLButtonElement,
  loadingText: string,
  fn: () => Promise<T>
): Promise<T> {
  const restore = setButtonLoading(btn, loadingText);
  try {
    return await fn();
  } finally {
    restore();
  }
}
