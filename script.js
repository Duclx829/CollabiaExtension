const RANDOM_HEX = new Date().getTime().toString(16);
const CDNSHA = sessionStorage.getItem('cdnsha') || '@HEAD';
const CDN_BASE_URL = "https://cdn.jsdelivr.net/gh/Duclx829/CollabiaExtension";
const CONFIG_URL = `${CDN_BASE_URL}@${CDNSHA}/config.json`;
const MINIFIED = false;

(async () => {
    const contentScript = {};
    const generateRandomHex = () => `${Date.now().toString(16)}${Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')}`;

    const appendStyleSheet = (id, href) => {
        try {
            const link =
                Object.assign(
                    document.createElement("link"),
                    {href, rel: 'stylesheet', id},
                );

            (document.head || document.documentElement).append(link);
        } catch (e) {
            console.log('failed to load stylesheet.', e);
        }
    }

    const appendScript = (id, src) => {
        try {
            if (id && !!document.getElementById(id))
                return;

            const script =
                Object.assign(
                    document.createElement("script"),
                    {src, type: 'text/javascript', id},
                );
            (document.body || document.documentElement).append(script);
        } catch (e) {
            console.log('failed to load script.', e);
        }
    }

    const applyContentScript = (match, cScript) => {
        console.log(contentScript);
        if (!cScript)
            cScript = contentScript[match];

        if (cScript) {
            if (cScript.type === 'stylesheet') {
                appendStyleSheet(`${cScript.name}_${cScript.id || generateRandomHex()}`, `${CDN_BASE_URL}@${CDNSHA}/${cScript.name}${MINIFIED ? '.min' : ''}.css?v=${RANDOM_HEX}`);
            } else if (cScript.type === 'script') {
                appendScript(`${cScript.name}_${cScript.id || generateRandomHex()}`, `${CDN_BASE_URL}@${CDNSHA}/${cScript.name}${MINIFIED ? '.min' : ''}.js?v=${RANDOM_HEX}`);
            }
        }
    }

    const removeUnusedContentScript = () => {
        const pathName = location.pathname;
        Object.entries(contentScript).forEach(([key, value]) => {
            console.log({key, comparison: `${value.type}|${pathName}`});
            if (key !== `${value.type}|${pathName}`) {
                const element = document.getElementById(`${value.name}_${value.id}`);
                if (element)
                    element.remove();
            }
        })
    }

    const onUrlChanges = (href, pathName) => {
        removeUnusedContentScript();
        applyContentScript(pathName);
    }

    const notify = () => window.dispatchEvent(new Event("urlchange"));
    const pushState = history.pushState;
    const replaceState = history.replaceState;
    history.pushState = function (...args) {
        pushState.apply(this, args);
        notify();
    };

    history.replaceState = function (...args) {
        replaceState.apply(this, args);
        notify();
    };
    window.addEventListener("popstate", notify);
    window.addEventListener("urlchange", () => onUrlChanges(window.location.href, window.location.pathname));

    try {
        const config = await (await fetch(`${CONFIG_URL}?v=${RANDOM_HEX}`)).json();
        const contentScripts = config.content_scripts;
        if (contentScripts) {
            contentScripts.forEach((cs) => {
                if (!cs.matches || cs.matches === 'all') {
                    applyContentScript('', cs);
                } else if (Array.isArray(cs.matches)) {
                    cs.matches.forEach((match) =>
                        contentScript[`${cs.type}|${match}`] = {...cs, id: generateRandomHex()}
                    );
                }
            });
        }

        applyContentScript(location.pathname);
    } catch (e) {
        console.log('[ERROR]', e);
    }
})();
