let dialog, isDialogOpened, cleanUpCb;

/**
 * @param content
 * @return {void};
 */
async function openDialog(content, onCleanUp) {
    isDialogOpened = true;
    cleanUpCb = onCleanUp;
    if (dialog) {
        document.querySelector('#root').append(dialog);
        return await Promise.resolve();
    }

    try {
        const resp = await fetch(chrome.runtime.getURL('dialog.html'));
        const html = await resp.text();
        dialog = document.createElement('div');
        dialog.id = 'dialog';
        dialog.innerHTML = html;
        dialog.querySelector('.dialog-content')?.append(content);
        const closeBtn  = dialog.querySelector('a#close');
        if (closeBtn) closeBtn.addEventListener('click', () => closeDialog());
        const overlay  = dialog.querySelector('.dialog-overlay');
        if (overlay) overlay.addEventListener('click', () => closeDialog());

        document.body.append(dialog);
    } catch (err) {
        console.log('[ERROR] - Failed to fetch the dialog. Detail: ', err);
    }
}

/**@return {void}*/
function closeDialog() {
    isDialogOpened = false;
    if (cleanUpCb) cleanUpCb();
    dialog?.remove();
}