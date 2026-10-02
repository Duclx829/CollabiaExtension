let helpModal;
function toggleHelpOverlay() {
    if (helpModal) return appendToDom(helpModal);

    (async () => {
        try {
            const resp = await fetch(chrome.runtime.getURL('help.html'));
            const html = await resp.text();
            console.log(html);
            helpModal = document.createElement('div');
            helpModal.id = 'collabia-custom-help';
            helpModal.innerHTML = html;
            const closeBtn  = helpModal.querySelector('a#close');
            if (closeBtn) closeBtn.addEventListener('click', () => removeHelpOverlay());

            appendToDom(helpModal);
        } catch (err) {
            console.log('[ERROR] - Failed to fetch the help. Detail: ', err);
        }
    })();
}

function createSpinner() {
    const spinner = document.createElement('div');
    Object.assign(spinner.style, {
        position: 'fixed',
        zIndex: 1000,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        height: '20px',
        width: '20px',
        borderRadius: '100vw',
        border: '1px solid #575757',
        borderBottomColor: 'transparent',
    });

    return spinner;
}

function appendToDom(node) {
    document.body.append(node);
}

function removeHelpOverlay() {
    openHelp = false;
    helpModal?.remove();
}