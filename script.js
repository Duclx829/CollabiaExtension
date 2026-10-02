(() => {
    const CDN_BASE_URL = "https://cdn.jsdelivr.net/gh/Duclx829/CollabiaExtension@HEAD/";
    const SCRIPT_URL = `${CDN_BASE_URL}script.js`;

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = false;
    document.documentElement.appendChild(script);
})();
