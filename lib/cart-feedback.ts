// A manual popover keeps feedback visible above native product dialogs.
export function cartFeedback(source: HTMLElement, target: HTMLElement | null, image?: string, added = true) {
  const layer = document.createElement('div');
  layer.className = 'cart-feedback';
  layer.setAttribute('popover', 'manual');
  const toast = document.createElement('div');
  toast.className = 'cart-toast';
  toast.setAttribute('role', 'status');
  toast.textContent = added ? 'Added to cart' : 'All available stock is already in your cart';
  layer.append(toast);
  document.body.append(layer);
  if (layer.showPopover) layer.showPopover();
  if (added && target && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const origin = source.closest('.product, .detail')?.querySelector('img') || source;
    const from = origin.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const icon = image ? document.createElement('img') : document.createElement('span');
    if (icon instanceof HTMLImageElement) { icon.src = image!; icon.alt = ''; }
    else icon.textContent = '◇';
    icon.className = 'cart-flying-item';
    icon.style.left = `${from.left + from.width / 2 - 32}px`;
    icon.style.top = `${from.top + from.height / 2 - 32}px`;
    layer.append(icon);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    icon.animate([
      {transform:'translate(0,0) scale(1)', opacity:1},
      {transform:`translate(${dx * .45}px,${dy * .65 - 35}px) scale(.65)`, opacity:.9, offset:.5},
      {transform:`translate(${dx}px,${dy}px) scale(.12)`, opacity:0},
    ], {duration:750,easing:'ease-in-out',fill:'forwards'});
  }
  setTimeout(() => layer.remove(), 1800);
}
