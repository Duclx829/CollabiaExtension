(async () => {
    let indexedDBData;
    while(true) {
        try {
            console.log('getting localforage info...');
            indexedDBData = await getIndexedDBData();
            if (indexedDBData) break;
        } catch (e) {
            await new Promise((resolve) => setTimeout(() => resolve(), 300));
        }
    }

    try {
        console.log('INDEXED_DB: ', indexedDBData);
        const theme = JSON.parse(indexedDBData?.ThemeColor) ?? {};
        const themeColor = theme.Color || 'cq_theme';
        document.body.setAttribute('data-theme', themeColor);
        if (themeColor === 'cq_theme') {
            const darkThemeStyleSheet = document.querySelector('#dark_theme_variable');
            if (darkThemeStyleSheet)
                darkThemeStyleSheet.remove();

            const alreadyLoaded = document.querySelector('#light_theme_variable');
            if (alreadyLoaded)
                return;

            appendStyleSheet(`light_theme_variable`, `${CDN_BASE_URL}@${CDNSHA}/light${MINIFIED ? '.min' : ''}.css?v=${SHA_SHORTEN}`);
            return;
        }

        if (themeColor === 'dark_theme') {
            const lightThemeStyleSheet = document.querySelector('#light_theme_variable');
            if (lightThemeStyleSheet)
                lightThemeStyleSheet.remove();

            const alreadyLoaded = document.querySelector('#dark_theme_variable');
            if (alreadyLoaded)
                return;

            appendStyleSheet(`dark_theme_variable`, `${CDN_BASE_URL}@${CDNSHA}/dark${MINIFIED ? '.min' : ''}.css`);
            return;
        }
    } catch (e) {
        console.log(e);
    }
})();
