const DB_NAME = 'localforage';
const STORE_NAME = 'keyvaluepairs';
const STATE_KEY = 'persist:primary';
const DB_WATCH_INTERVAL = 5000;
let watchSession = {};

function getIndexedDBData() {
    return new Promise((resolve, reject) => {
        const openRequest = indexedDB.open(DB_NAME);
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
            const db = openRequest.result;
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const getItem = transaction.objectStore(STORE_NAME).get(STATE_KEY);
            getItem.onsuccess = () => {
                try {
                    resolve(JSON.parse(getItem.result));
                } catch (err) {
                    console.log('[ERROR] - Failed to read the data from IndexedDB. Detail: ', err);
                    resolve(getItem.result);
                }
            };
            getItem.onerror = () => reject(getItem.error);
        };
    });
}

async function getAuth() {
    try {
        const data = await getIndexedDBData();
        return JSON.parse(data.auth);
    } catch (err) {
        console.log('[ERROR] - Failed to get [auth] data. Detail: ', err);
        return {};
    }
}

async function getBearerToken() {
    try {
        const data = await getAuth();
        return data.cq_access_token;
    } catch (err) {
        console.log('[ERROR] - Failed to get [bearer token]. Detail: ', err);
        return null;
    }
}

async function watchDB(id, getdata, onupdate) {
    if (!id) return;

    if (!getdata) {
        if (watchSession[id]) {
            clearInterval(watchSession[id].interval)
            console.log('[WARN] - DB watcher stopped.', id);
            delete watchSession[id];
        }

        return;
    }

    if (!watchSession[id]) watchSession[id] = { requestAt: Date.now(), responseAt: null };
    else watchSession[id].requestAt = Date.now();

    await new Promise(resolve => setTimeout(resolve, Math.max(DB_WATCH_INTERVAL - ((Date.now() - watchSession[id].responseAt) || 0), 0)));
    const data = await getdata();
    if (watchSession[id].lastValue === undefined)
        watchSession[id].lastValue = data;
    else if (data !== watchSession[id].lastValue) {
        if (onupdate) onupdate(data);
        else console.log('[WARN] - The data has been updated, but there is no [onupdate] callback!')
    }

    watchSession[id].lastValue = data;
    watchSession[id].responseAt = Date.now(); 
    return await watchDB(id, getdata, onupdate);
}

function watchBearerToken(onupdate) {
    (() => watchDB('bearer_token', getBearerToken, onupdate))();
}
