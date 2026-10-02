(() => {
    let mouseStopThrottle = Number(localStorage.getItem('mousestop-throttle'));
    let mouseHoverThrottle = Number(localStorage.getItem('mousehover-throttle'));
    let longPressDuration = Number(localStorage.getItem('longpress-duration'));
    let mouseStopTimeout;
    let mouseHoverTimeout;
    let leftMouseHoldTimeout;
    let middleClickLongpressTimeout;
    let contextmenuOpenedByHold;
    let isMouseout;
    const timeout = {};
    const modalInfo = {};
    const pointer = {x: 0, y: 0};
    let contextMenu;
    let lastMiddleClickTime = 0;
    if (!mouseStopThrottle) localStorage.setItem('mousestop-throttle', mouseStopThrottle = 500);
    if (!mouseHoverThrottle) localStorage.setItem('mousehover-throttle', mouseHoverThrottle = 100);
    if (!longPressDuration) localStorage.setItem('longpress-duration', longPressDuration = 500);

    let cachedMask = new Set(getSessionStorage('masked') || []);

    if (navigation) {
        handleNavigationChange(location.href);

        function onNavigationSuccess() {
            handleNavigationChange(navigation.currentEntry.url);
        }

        navigation.addEventListener('navigatesuccess', onNavigationSuccess);

        function handleNavigationChange(url) {
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
    console.log(document.body.cloneNode(true));
})();
