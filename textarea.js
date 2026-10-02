const resizeData = {
    parentElement: null,
    resizeTarget: null,
    tracking: false,
    mouseout: false,
    startCursorScreenY: null,
    minHeight: 38,
    startHeight: 38,
    maxHeight: 490,
};

let toolbar = document.createElement('div');
let btnToggleResize = document.createElement('input');
btnToggleResize.setAttribute('type', 'checkbox');
btnToggleResize.title = 'On/Off resize mode';
Object.assign(btnToggleResize.style, {
    position: 'fixed',
    zIndex: 301,
    top: 'calc(anchor(--chat-input-resizeable top) + 14px)',
    right: 'calc(anchor(--chat-input-resizeable right) - 28px)',
    cursor: 'pointer',
});

let resizeBtn = document.createElement('div');
resizeBtn.id = "textarea-resize-handler";
resizeBtn.title = 'Resize';
Object.assign(resizeBtn.style, {
    position: 'fixed',
    display: 'none',
    width: '20px',
    height: '10px',
    zIndex: 301,
    top: 'anchor(--chat-input-resizeable top)',
    right: 'calc(anchor(--chat-input-resizeable right) + 20px)',
    borderTop: '1px solid',
    borderBottom: '1px solid',
    transform: 'translateY(-50%)',
    cursor: 'row-resize',
});
btnToggleResize.addEventListener('change', (event) =>  {
    const enabled = event.target.checked;
    if (enabled) {
        if (!resizeData.resizeTarget){
            resizeData.resizeTarget = document.body.querySelector('.form-input > .cqThemeInputMessageText.input-group');
            if (resizeData.resizeTarget) resizeData.resizeTarget.addEventListener('click', (event) => event.target.querySelector('#message-textarea')?.focus());
        }

        if (resizeData.resizeTarget)
            resizeData.resizeTarget.setAttribute('data-resizeable', 'true'); 

        resizeBtn.style.display = 'block';
        showToast('Resize mode on');
    } else {
        if (resizeData.resizeTarget) resizeData.resizeTarget.removeAttribute('data-resizeable');
        resizeBtn.style.display = 'none';
        reset();
        showToast('Resize mode off');
    }
})

resizeBtn.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    resizeData.maxHeight = Math.trunc(window.innerHeight * 0.6 - 20);
    // console.log(resizeData.maxHeight);
    // Use the target selector on the handle to get the resize target.
    const targetElement = document.body.querySelector('.form-input > .cqThemeInputMessageText.input-group');
    if (!targetElement) {
        console.error(new Error("Resize target element not found."));
        return;
    }

    console.log('tracking started');
    resizeData.startHeight = targetElement.offsetHeight;
    resizeData.startCursorScreenY = event.screenY;
    if (!resizeData.resizeTarget)
        targetElement.addEventListener('click', (event) => event.target.querySelector('#message-textarea')?.focus());

    resizeData.resizeTarget = targetElement;
    resizeData.tracking = true;
});

resizeBtn.addEventListener('mouseup', (e) => {
    if (resizeData.tracking) {
        resizeData.tracking = false;
        console.log('tracking stopped', {x: e.clientX, y: e.clientY});
    }
});

if (document.body) {
    resizeData.parentElement = document.body;
    document.body.append(resizeBtn, btnToggleResize);
    document.body.addEventListener('mousemove', (event) => {
        if (resizeData.tracking) {
            const cursorScreenYDelta = resizeData.startCursorScreenY - event.screenY;
            resizeData.resizeTarget.style.height = `${Math.max(Math.min(resizeData.startHeight + cursorScreenYDelta, resizeData.maxHeight), resizeData.minHeight)}px`;
            // resizeData.resizeTarget.style.minHeight = `${newHeight}px`;
        }
    });
    document.body.addEventListener('mouseup', (e) => {
        if (resizeData.tracking) {
            resizeData.tracking = false;
            console.log('tracking stopped', {x: e.clientX, y: e.clientY});
        }
    });

    document.body.addEventListener('mouseenter', (e) => {
        if (resizeData.mouseout && resizeData.tracking) {
            resizeData.tracking = false;
            console.log('tracking stopped', {x: e.clientX, y: e.clientY});
        }
    });

    document.body.addEventListener('mouseout', (e) => resizeData.mouseout = true);
}

function reset() {
    resizeData.maxHeight = Math.trunc(window.innerHeight * 0.6 - 20);
    if (!resizeData.resizeTarget) {
        resizeData.resizeTarget = document.body.querySelector('.form-input > .cqThemeInputMessageText.input-group');
        if (resizeData.resizeTarget) resizeData.resizeTarget.addEventListener('click', (event) => event.target.querySelector('#message-textarea')?.focus());
    }

    if (!resizeData.resizeTarget) return;

    resizeData.resizeTarget.style.height = 'auto';
    resizeData.resizeTarget.style.maxHeigtht = resizeData.maxHeight;
}
