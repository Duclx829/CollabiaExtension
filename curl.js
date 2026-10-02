function curlFetch(curl) {
    const tokens = tokenize(curl);

    let url = "";
    let method = "GET";
    const headers = {};
    let body;
    console.log(tokens);

    for (let i = 1; i < tokens.length; i++) {
        const t = tokens[i];

        switch (t) {
            case "-X":
            case "--request":
                method = tokens[++i];
                break;

            case "-H":
            case "--header": {
                const header = tokens[++i];
                const idx = header.indexOf(":");
                if (idx !== -1) {
                    headers[header.slice(0, idx).trim()] = header.slice(idx + 1).trim();
                }
                break;
            }

            case "-d":
            case "--data":
            case "--data-raw":
            case "--data-binary":
            case "--data-urlencode":
                body = tokens[++i];
                if (method === "GET") method = "POST";
                break;

            case "--url":
                url = tokens[++i];
                break;

            case "--compressed":
            case "--location":
            case "-L":
                break;

            default:
                if (/^https?:\/\//.test(t)) {
                    url = t;
                }
        }
    }

    return fetch(url, {
        method,
        headers,
        ...(body !== undefined && { body }),
    });
}

function tokenize(str) {
    const out = [];
    let cur = "";
    let quote = null;
    let escape = false;

    for (const ch of str.trim()) {
        if (escape) {
            cur += ch;
            escape = false;
            continue;
        }

        if (ch === "\\") {
            escape = true;
            continue;
        }

        if (quote) {
            if (ch === quote) quote = null;
            else cur += ch;
            continue;
        }

        if (ch === "'" || ch === '"') {
            quote = ch;
            continue;
        }

        if (/\s/.test(ch)) {
            if (cur) {
                out.push(cur);
                cur = "";
            }
        } else {
            cur += ch;
        }
    }

    if (cur) out.push(cur);
    return out;
}
