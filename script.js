const RANDOM_HEX = new Date().getTime().toString(16);
const CDNSHA = sessionStorage.getItem('cdnsha') || '@HEAD';
const CDN_BASE_URL = "https://cdn.jsdelivr.net/gh/Duclx829/CollabiaExtension";
const CONFIG_URL = `${CDN_BASE_URL}@${CDNSHA}/config.json`;
const MINIFIED = false;

(async () => {
    const contentScript = {};
    const generateRandomHex = () => `${Date.now().toString(16)}${Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')}`;

    const appendStyleSheet = (href) => {
        try {
            const link =
                Object.assign(
                    document.createElement("link"),
                    {href, rel: 'stylesheet'},
                );

            (document.head || document.documentElement).append(link);
        } catch (e) {
            console.log('failed to load stylesheet.', e);
        }
    }

    const appendScript = (src) => {
        try {
            const script =
                Object.assign(
                    document.createElement("script"),
                    {src, type: 'text/javascript'},
                );
            (document.body || document.documentElement).append(script);
        } catch (e) {
            console.log('failed to load script.', e);
        }
    }

    const applyContentScript = (match, cScript) => {
        if (!cScript)
            cScript = contentScript[match];

        if (cScript) {
            if (cScript.type === 'stylesheet') {
                appendStyleSheet(`${CDN_BASE_URL}@${CDNSHA}/${cScript.name}${MINIFIED ? '.min' : ''}.css?v=${RANDOM_HEX}`);
            } else if (cScript.type === 'script') {
                appendScript(`${CDN_BASE_URL}@${CDNSHA}/${cScript.name}${MINIFIED ? '.min' : ''}.js?v=${RANDOM_HEX}`);
            }
        }
    }

    const removeUnusedContentScript = () => {
        const pathName = location.pathname;
        Object.entries(contentScript).forEach(([key, value]) => {
            if (key !== pathName) {
                const element = document.getElementById(value.id);
                if (element)
                    element.remove();
            }
        })
    }

    const onUrlChanges = (href, pathName) => {
        removeUnusedContentScript();
        applyContentScript(pathName);
    }

    const _pushState = history.pushState;
    const _replaceState = history.replaceState;
    history.pushState = function () {
        const ret = _pushState().apply(this, arguments);
        onUrlChanges(location.href, location.pathname);
        return ret;
    };

    history.replaceState = function () {
        const ret = _replaceState.apply(this, arguments);
        onUrlChanges(location.href, location.pathname);
        return ret;
    };

    window.addEventListener("popstate", () => onUrlChanges(location.href, location.pathname));
    window.addEventListener("urlchange", () => onUrlChanges(location.href, location.pathname));

    try {
        const config = await (await fetch(`${CONFIG_URL}?v=${RANDOM_HEX}`)).json();
        const contentScripts = config.content_scripts;
        if (contentScripts) {
            contentScripts.forEach((cs) => {
                if (!cs.matches || cs.matches === 'all') {
                    applyContentScript('', cs);
                } else if (Array.isArray(cs.matches)) {
                    cs.matches.forEach((match) => contentScript[match] = {...cs, id: generateRandomHex()});
                }
            });
        }

        applyContentScript(location.pathname);
    } catch (e) {
        console.log('[ERROR]', e);
    }
})();
