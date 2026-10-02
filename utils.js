/**
 * @param {string} key: The sessionStorage key.
 * @returns {any|null}
 */
function getSessionStorage(key) {
    try {
        return JSON.parse(sessionStorage.getItem(key?.toString()?.toLowerCase()));
    } catch {
        return null;
    }
}

/**
 * @param {string} key: The sessionStorageKey.
 * @param {any} value: The value stored to sessionStorage.
 */
function setSessionStorage(key, value) {
    if (!key?.toString()) return;

    try {
        sessionStorage.setItem(key?.toString()?.toLowerCase(), JSON.stringify(value));
    } catch {
        sessionStorage.setItem(key?.toString()?.toLowerCase(), '');
    }

}

/**
 * @param {Node | HTMLElement} el
 * @returns {boolean}
 */
function isEditableTarget(el) {
  if (!el) return false;

  const tag = el.tagName?.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    el.isContentEditable
  );
}

/**
 * @param {EventTarget} target
 * @returns 
 */
const isValidImgElement = (target) => (target?.tagName === 'IMG' && target.src);

/**
 * @param {Node | HTMLElement} container 
 * @param {number} top 
 * @param {number} [duration]
 */
function smoothScroll(container, top, duration = 300) {
  const start = container.scrollTop;
  const change = top - start;
  const startTime = performance.now();

  function animate(time) {
    const progress = Math.min((time - startTime) / duration, 1);
    container.scrollTop = start + change * progress;
    if (progress < 1) requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

/**
 * @param {EventTarget | Node | HTMLElement} target 
 * @returns 
 */
async function copyImage(target) {
    if (!target?.src) return;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = target.src;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    showToast('Image copied to clipboard');
    await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
}

/**
 * @param {string} src
 * @returns 
 */
function downloadImage(src) {
    if (!src) return;

    const link = document.createElement("a");
    link.style.display = 'none';
    link.href = src;
    let fileName = src?.split('/')?.at(-1) || 'Unknown';
    link.download = `${fileName}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * @param {string} text 
 * @param {'success' | 'error' | 'warn' | 'info'} [type]
 */
function showToast(text, type = 'success') {
    const toast = document.createElement("div");
    toast.id = "custom-toast"
    toast.textContent = text;
    Object.assign(toast.style, {
        position: "fixed",
        top: "3rem",
        left: "50%",
        transform: "translateX(-50%)",
        background: type === 'success' ? '#e6f4ea' : type === 'error' ? '#fdecea' : type === 'warn' ? '#fff4e5' : '#eef5ff',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        border: '1px solid',
        borderColor: type === 'success' ? '#b7e0c3' : type === 'error' ? '#f5c2c7' : type === 'warn' ? '#ffda9e' : '#b6d4fe',
        fontSize: '16px',
        fontweight: 500,
        color: type === 'success' ? '#0f5132' : type === 'error' ? '#842029' : type === 'warn' ? '#664d03' : '#084298',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        padding: "8px 14px",
        borderRadius: "6px",
        zIndex: 9999,
        opacity: 1,
        animation: '150ms toastSlideDown ease-in-out forwards',
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1800);
}

/**
 * @param {string} id 
 * @param {EventTarget | Node | HTMLElement} children 
 */
function showTooltip(id, children) {
    try {
        const site = document.body.querySelector('.site');
        const div = document.createElement('div');
        div.id = id;
        div.className = 'tooltip-content-preview';
        const clonedChild = children.cloneNode(true);
        clonedChild.className = '';
        div.append(clonedChild);
        div.style.top = `${pointer.y}px`;
        div.style.left = `${pointer.x}px`;
        div.style.transform = `translate(-1rem, calc(-100% + 1rem))`;
        div.style.minWidth = `${children.getBoundingClientRect().width}px`;
        site.prepend(div);
        const rect = div.getBoundingClientRect();
        const offsetTop = pointer.y - rect.height + 32;
        const offsetRight = window.innerWidth - (pointer.x + rect.width) + 16;
        if (offsetTop < 0 || offsetRight < 0) {
            const translateX = offsetRight < 0 ? 'calc(-100% + 1rem)' : '-1rem';
            const translateY = offsetTop < 0 ? '-1rem' : 'calc(-100% + 1rem)';
            div.style.transform = `translate(${translateX}, ${translateY})`;
            div.childNodes.item(0).style.transformOrigin = `${offsetTop < 0 ? 'top' : 'bottom'} ${offsetRight < 0 ? 'right' : 'left'}`;
        }

        clonedChild.addEventListener('mouseout', () => div.remove());
    } catch (e) {
        console.log(e);
    }
}

/**
 * @param {string} href 
 * @returns {HTMLElement}
 */
function linkContextOptions(href) {
    const div = document.createElement('div');
    div.className = 'list-options'
    const open = document.createElement('div');
    open.textContent = 'Open ↗';
    open.addEventListener('click', () => window.open(href, '_blank'));
    const copy = document.createElement('div');
    copy.textContent = 'Copy';
    copy.addEventListener(
        'click',
        async () => {
            await navigator.clipboard.writeText(href);
            showToast('Copied!')
        });
    div.append(copy, open);
    return div;
}

/**
 * @param {EventTarget | Node | HTMLElement} target 
 * @returns {HTMLElement | null}
 */
function codeCopyOptions(target) {
    if (!target) return null;

    const div = document.createElement('div');
    div.className = 'list-options'
    const copy = document.createElement('div');
    copy.textContent = 'Copy';
    copy.addEventListener(
        'click',
        async () => {
            await navigator.clipboard.writeText(target.innerText);
            showToast('Copied!')
        });
    div.append(copy);
    return div;
}

function msgContentCopyOptions(target) {
    if (!target) return null;

    const div = document.createElement('div');
    div.className = 'list-options'
    const copy = document.createElement('div');
    copy.textContent = 'Copy';
    copy.addEventListener(
        'click',
        async () => {
            await navigator.clipboard.writeText(target.innerText);
            showToast('Copied!')
        });
    div.append(copy);
    return div;
}

/**
 * @param fn {((...args: any[]) => void)}: The callback function that will be trigger after "wait" time.
 * @param delay {number}: The throttle time.
 * @returns {(function(...[*]): void)|*}
 */
function throttle(fn, delay) {
    let lastCall = 0;
    let timeout;

    return function (...args) {
        const now = Date.now();
        const remaining = delay - (now - lastCall);

        if (remaining <= 0) {
            clearTimeout(timeout);
            lastCall = now;
            fn.apply(this, args);
        } else {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                lastCall = Date.now();
                fn.apply(this, args);
            }, remaining);
        }
    };
}

function toQueryString(params) {
    try {
        return Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&');
    } catch(e) {
        return "";
    }
}
