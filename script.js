const RANDOM_HEX = new Date().getTime().toString(16);
const CDNSHA = sessionStorage.getItem('cdnsha') || '@HEAD';
const CDN_BASE_URL = "https://cdn.jsdelivr.net/gh/Duclx829/CollabiaExtension";
const CONFIG_URL = `${CDN_BASE_URL}@${CDNSHA}/config.json`;
const MINIFIED = true;
const EXTENSION_RUNTIME_ID =
    getComputedStyle(document.documentElement)
        ?.getPropertyValue('--app-bg-image')
        ?.match(/chrome-extension:\/\/+?.[^/]+/)
        ?.at(0)
        ?.replace('chrome-extension://', '');
sessionStorage.removeItem('ext_rt_url');
(async () => {
    sessionStorage.setItem('ext_rt_id', EXTENSION_RUNTIME_ID ?? '');
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
        if (!cScript)
            cScript = contentScript[match];

        if (cScript) {
            cScript.forEach((cs) => {
                if (cs.type === 'stylesheet') {
                    appendStyleSheet(`${cs.name}_${cs.id || generateRandomHex()}`, `${CDN_BASE_URL}@${CDNSHA}/${cs.name}${MINIFIED ? '.min' : ''}.css`);
                } else if (cs.type === 'script') {
                    appendScript(`${cs.name}_${cs.id || generateRandomHex()}`, `${CDN_BASE_URL}@${CDNSHA}/${cs.name}${MINIFIED ? '.min' : ''}.js`);
                }
            });
        }
    }

    const removeUnusedContentScript = () => {
        const pathName = location.pathname;
        Object.entries(contentScript).forEach(([key, value]) => {
            if (key !== pathName) {
                value.forEach((cs) => {
                    const element = document.getElementById(`${cs.name}_${cs.id}`);
                    if (element) element.remove();
                });
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
        appendStyleSheet(`light_theme_variable`, `${CDN_BASE_URL}@${CDNSHA}/light${MINIFIED ? '.min' : ''}.css`);
        const config = await (await fetch(CONFIG_URL)).json();
        const contentScripts = config.content_scripts;
        if (contentScripts) {
            contentScripts.forEach((cs) => {
                if (!cs.matches || cs.matches === 'all') {
                    applyContentScript('', [cs]);
                } else if (Array.isArray(cs.matches)) {
                    cs.matches.forEach((match) => {
                        if (!contentScript[match])
                            contentScript[match] = [{...cs, id: generateRandomHex()}];
                        else
                            contentScript[match].push({...cs, id: generateRandomHex()});
                    });
                }
            });
        }

        applyContentScript(location.pathname);
    } catch (e) {
        console.log('[ERROR]', e);
    }
})();

// (async () => {
//     let indexedDBData;
//     while(true) {
//         try {
//             console.log('getting localforage info...');
//             indexedDBData = await getIndexedDBData();
//             if (indexedDBData)
//                 break;
//         } catch (e) {
//             await new Promise((resolve) => setTimeout(() => resolve(), 300));
//         }
//     }
//     console.log(indexedDBData);
// })();
