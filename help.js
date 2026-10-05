(() => {
    let helpModal;
    let openHelp;

    function appendToDom(node) {
        document.body.append(node);
    }

    function removeHelpOverlay() {
        openHelp = false;
        helpModal?.remove();
    }

    const onKeydown = (event) => {
        if (
            event.ctrlKey &&
            event.key === "?" &&
            !isEditableTarget(event.target) &&
            !openHelp
        ) {
            event.preventDefault();
            openHelp = true;
            toggleHelpOverlay();
        }

        if (
            event.key === "Escape" &&
            openHelp
        ) {
            openHelp = false;
            removeHelpOverlay();
        }
    }

    function toggleHelpOverlay() {
        if (helpModal) {
            appendToDom(helpModal);
            return;
        }

        (async () => {
            try {
                // const loading = document.createElement('div');
                // Object.assign(
                //     loading.style,
                //     {
                //         position: 'fixed',
                //         inset: 0,
                //         zIndex: 1000,
                //         background: 'rgba(0,0,0,0.12)'
                //     },
                // );
                // const spinner = document.createElement('span');
                // Object.assign(
                //     spinner.style,
                //     {
                //         position: 'absolute',
                //         left: '50%',
                //         top: '50%',
                //         border: '3px solid',
                //         borderColor: 'red red transparent',
                //         width: '2rem',
                //         aspectRatio: '1 / 1',
                //         borderRadius: '50%',
                //         animation: 'rotate 500ms linear infinite',
                //     },
                // );
                // loading.append(spinner);
                const spinner = createSpinner();
                const htmlTxt = await (await fetch(`${CDN_BASE_URL}@${CDNSHA}/help.html?v=${RANDOM_HEX}`)).text();

                helpModal = document.createElement('div');
                helpModal.id = 'collabia-custom-help';
                helpModal.innerHTML = htmlTxt;
                spinner.remove();
                const closeBtn = helpModal.querySelector('a#close');
                if (closeBtn)
                    closeBtn.addEventListener('click', () => removeHelpOverlay());

                appendToDom(helpModal);
            } catch (err) {
                console.log('[ERROR] - Failed to fetch the help. Detail: ', err);
            }
        })();
    }

    document.body.addEventListener('keydown', onKeydown, true);
    window.addEventListener('beforeunload', (_) =>
        document.body.removeEventListener('keydown', onKeydown, true)
    );
})();