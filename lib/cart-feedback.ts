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
    const thumbnail = origin instanceof HTMLImageElement ? origin.currentSrc || origin.src : image;
    const icon = thumbnail ? document.createElement('img') : document.createElement('span');
    if (icon instanceof HTMLImageElement) { icon.src = thumbnail!; icon.alt = ''; }
    else icon.textContent = '◇';
    icon.className = 'cart-flying-item';
    icon.style.left = `${from.left + from.width / 2 - 32}px`;
    icon.style.top = `${from.top + from.height / 2 - 32}px`;
    layer.append(icon);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    // Sample a quadratic curve so there is no sharp turn at the midpoint.
    const controlX = dx * .35;
    const controlY = Math.min(0, dy) - Math.min(100, Math.hypot(dx, dy) * .2);
    const frames = Array.from({length: 31}, (_, i) => {
      const t = i / 30;
      const x = 2 * (1 - t) * t * controlX + t * t * dx;
      const y = 2 * (1 - t) * t * controlY + t * t * dy;
      return {
        offset: t,
        transform: `translate(${x}px,${y}px) scale(${1 - .88 * t})`,
        opacity: t < .75 ? 1 : (1 - t) / .25,
      };
    });
    const flight = icon.animate(frames, {duration:800,easing:'cubic-bezier(.25,.1,.25,1)',fill:'forwards'});
    flight.onfinish = () => {
      icon.remove();
      if (target.isConnected) target.animate([
        {transform:'scale(1)'},
        {transform:'scale(1.16)', offset:.4},
        {transform:'scale(1)'},
      ], {duration:280,easing:'ease-out'});
    };
  }
  setTimeout(() => layer.remove(), 1800);
}
