function appendStyleSheet(href) {
    const link =
        Object.assign(
            document.createElement("link"),
            { href, rel: 'stylesheet' },
        );
    (document.head || document.documentElement).append(link);
}

function appendScript(src) {
    const script =
        Object.assign(
            document.createElement("script"),
            { src, type: 'text/javascript' },
        );
    document.documentElement.append(script)
}

(async () => {
    const CDN_BASE_URL = "https://cdn.jsdelivr.net/gh/Duclx829/CollabiaExtension@HEAD/";
    const VERSION = new Date().getTime().toString(16);
    const CONFIG_URL = `${CDN_BASE_URL}config.json`;

    try {
        const config = await (await fetch(`${CONFIG_URL}?v=${VERSION}`)).json();
        const contentScripts = config.content_scripts;
        if (contentScripts) {
            contentScripts.forEach((cs) => {
                if (cs.type === 'stylesheet') {
                    appendStyleSheet(`${CDN_BASE_URL}${cs.name}?v=${VERSION}`);
                } else if (cs.type === 'script') {
                    appendScript(`${CDN_BASE_URL}${cs.name}?v=${VERSION}`);
                }
            });
        }
    } catch (e) {
        console.log(e);
    }
})();
