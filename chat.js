(() => {
    let cachedMask = new Set(getSessionStorage('masked') || []);

    if (navigation) {
        handleNavigationChange(location.href);

        function onNavigationSuccess() {
            handleNavigationChange(navigation.currentEntry.url);
        }

        navigation.addEventListener('navigatesuccess', onNavigationSuccess);

        function handleNavigationChange(url) {
            console.log(`
            
            url: ${url}

            `)
            if (url.startsWith(`${window.origin}/chat/main-content`)) {
                const urlParams = new URLSearchParams(window.location.search);
                checkMaskMessage(urlParams);
            } else {
                navigation.removeEventListener('navigatesuccess', onNavigationSuccess);
            }
        }

        function checkMaskMessage(urlParams) {
            if (!cachedMask)
                return;

            const channelId = urlParams.get("channelId");
            const userId = urlParams.get("userId");
            if (
                document.body &&
                (
                    channelId ||
                    userId
                )
            ) {
                if (
                    cachedMask.has(channelId) ||
                    cachedMask.has(userId)
                ) {
                    const className = document.body.className?.toString();
                    if (!className || !className.includes('anti-spy'))
                        document.body.classList.add('anti-spy');
                } else {
                    document.body.classList.remove('anti-spy');
                }
            }
        }
    }
})();
