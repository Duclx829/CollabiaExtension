(async () => {
    const CDN_TAG = sessionStorage.getItem('cdntag') || '@HEAD';
    const CDN_BASE_URL = "https://cdn.jsdelivr.net/gh/Duclx829/CollabiaExtension";
    const VERSION = new Date().getTime().toString(16);
    const CONFIG_URL = `${CDN_BASE_URL}@${CDN_TAG}/config.json`;

    const appendStyleSheet = (href) => {
        try {
            const link =
                Object.assign(
                    document.createElement("link"),
                    {href, rel: 'stylesheet'},
                );

            console.log(link);
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
            console.log(script);
            (document.body || document.documentElement).append(script);
        } catch (e) {
            console.log('failed to load script.', e);
        }
    }

    try {
        const config = await (await fetch(`${CONFIG_URL}?v=${VERSION}`)).json();
        const contentScripts = config.content_scripts;
        if (contentScripts) {
            contentScripts.forEach((cs) => {
                if (cs.type === 'stylesheet') {
                    appendStyleSheet(`${CDN_BASE_URL}@${CDN_TAG}/${cs.name}?v=${VERSION}`);
                } else if (cs.type === 'script') {
                    appendScript(`${CDN_BASE_URL}@${CDN_TAG}/${cs.name}?v=${VERSION}`);
                }
            });
        }
    } catch (e) {
        console.log(e);
    }
})();
