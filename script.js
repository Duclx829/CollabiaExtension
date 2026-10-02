(async () => {
    const CDN_BASE_URL = "https://cdn.jsdelivr.net/gh/Duclx829/CollabiaExtension@HEAD/";
    try {
       const config = await fetch('https://cdn.jsdelivr.net/gh/Duclx829/CollabiaExtension@HEAD/config.json');
       console.log(config);
    } catch (e) {
        console.log(e);
    }
})();
