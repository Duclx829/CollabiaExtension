(async () => {
    const CDN_BASE_URL = "https://cdn.jsdelivr.net/gh/Duclx829/CollabiaExtension@master/";
    const VERSION = new Date().getTime().toString(16);
    const CONFIG_URL = `${CDN_BASE_URL}config.json`;

    try {
       const config = await (await fetch(`${CONFIG_URL}?v=${VERSION}`)).json();
       const contentScripts = config.content_scripts;
       if (contentScripts) {
           contentScripts.forEach((cs) => {
               if (cs.type === 'stylesheet') {
                   const link = Object.assign(document.createElement("link"), { href: `${CDN_BASE_URL}${cs.name}`, type: 'stylesheet' });
                   document.documentElement.append(link);
               } else if (cs.type === 'script') {
                   const script = Object.assign(document.createElement("script"), { src: `${CDN_BASE_URL}${cs.name}`, type: 'text/javascript' });
                   document.documentElement.append(script)
               }
           });
       }
    } catch (e) {
        console.log(e);
    }
})();
