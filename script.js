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

(async () => {
    sessionStorage.setItem('ext_rt_id', EXTENSION_RUNTIME_ID ?? '');
    const contentScript = {};
    const generateRandomHex = () => `${Date.now().toString(16)}${Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')}`;

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

(() => {
    const channelMsgCache = {};
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    let cachedMask, activeChannelId, channelIdSet = new Set([]);
    const apiVersion = 'v1';
    let myId = localStorage.getItem('cid');

    window.addEventListener("urlchange", () => {
        requestAnimationFrame(() => {
            const channelId = new URL(location.href).searchParams.get('channelId');
            if (channelId === activeChannelId) return;

            activeChannelId = channelId;
            trackMessages(channelMsgCache[channelId]);
        })
    });

    function trackMaskedChannels(channels) {
        if (!channels || !channels.length || !Array.isArray(channels))
            return;

        try { cachedMask = new Set(JSON.parse(sessionStorage.getItem('masked')) || []); } catch(e) {}
        const channelIds = channels.map((c) => c.id);
        const newIds = channelIds.filter((id) => {
            if (!channelIdSet.has(id)) {
                channelIdSet.add(id);
                return true;
            }

            return false;
        });

        requestAnimationFrame(() => {
            const ids = newIds.filter((id) => cachedMask.has(id));
            setTimeout(() => {
                ids.forEach((id) => {
                    document
                        .querySelector(`#side-bar-message [data-channel-id="${id}"] > .dm-side-bar-item`)
                        ?.setAttribute('data-mask', 'true');
                });
            }, 300);
        });
    }

    function trackMessages(messages, channelId, msgEvent) {
        if (!messages || !messages.length || !Array.isArray(messages))
            return;

        console.log('msg_evt', {channelId, msgEvent, messages});
        if (channelId) {
            if (!channelMsgCache[channelId])
                channelMsgCache[channelId] = [];

            if (msgEvent)
                channelMsgCache[channelId].unshift(
                    ...messages.map((msg) =>
                        ({
                            id: msg.id,
                            user_id: msg.user_id,
                            metadata: {
                                files: msg.metadata.files.map((file) => ({ mime_type: file.mime_type })),
                            },
                        })
                    )
                );
            else
                channelMsgCache[channelId].push(
                    ...messages.map((msg) => ({
                        id: msg.id,
                        user_id: msg.user_id,
                        metadata: {
                            files: msg.metadata.files.map((file) => ({ mime_type: file.mime_type })),
                        },
                    }))
                );

            if (channelId !== activeChannelId) return;
        }

        const listMsgs = document.querySelector('#container-listMessage');
        requestAnimationFrame(() => {
            setTimeout(() => {
                const msgElements = messages.map((msg, idx, arr) => {
                    const msgElement = listMsgs.querySelector(`#${CSS.escape(String(msg.id))}.message-item`);
                    if (!msgElement) return;

                    const usrId = msg.user_id;
                    msgElement.setAttribute('data-sender-id', msg.user_id);
                    const prevSibling = msgElement.previousSibling;
                    const prevSiblingId = prevSibling?.getAttribute('data-sender-id');

                    if (msgEvent) {
                        const nextSibling = msgElement.nextElementSibling;
                        const nextSiblingId = nextSibling?.getAttribute('data-sender-id');
                        if (usrId === nextSiblingId) {
                            const nextSiblingGroupType = nextSibling.getAttribute('data-msg-group');
                            // console.log('msg_evt', 'same user', nextSiblingGroupType);
                            if (nextSiblingGroupType === 'start')
                                nextSibling.setAttribute('data-msg-group', 'child');
                            else if (!nextSiblingGroupType)
                                nextSibling.setAttribute('data-msg-group', 'end');

                            msgElement.setAttribute('data-msg-group', 'start');
                        }

                        return msgElement;
                    }

                    const nextMsgUserId = arr[idx+1]?.user_id;
                    if (usrId === nextMsgUserId) {
                        if (prevSiblingId && prevSiblingId === usrId) {
                            if (prevSibling && !prevSibling.getAttribute('data-msg-group'))
                                prevSibling.setAttribute('data-msg-group', 'start');

                            if (usrId === nextMsgUserId)
                                msgElement.setAttribute('data-msg-group', 'child');
                            else
                                msgElement.setAttribute('data-msg-group', 'start');
                        } else if (usrId === nextMsgUserId) {
                            if (!prevSiblingId || prevSiblingId !== usrId)
                                msgElement.setAttribute('data-msg-group', 'start');
                        }
                    } else if (prevSiblingId && prevSiblingId === usrId) {
                        if (prevSibling?.getAttribute('data-msg-group') === 'end') {
                            msgElement.previousSibling.setAttribute('data-msg-group', 'child');
                            msgElement.setAttribute('data-msg-group', 'end');
                        } else {
                            if (!prevSibling?.getAttribute('data-msg-group'))
                                msgElement.previousSibling?.setAttribute('data-msg-group', 'start');

                            msgElement.setAttribute('data-msg-group', 'end');
                        }
                    }

                    const mediaFiles = msg?.metadata?.files ?? [];
                    if (mediaFiles.length) {
                        const images = mediaFiles.filter((file) => file.mime_type === 'image');
                        const files = mediaFiles.filter((file) => file.mime_type !== 'image');
                        const mediaContainer = msgElement.querySelector('.dm-grid-container');
                        // console.log('here_[media_container]', mediaContainer);

                        if (mediaContainer) {
                            if (images.length) {
                                mediaContainer.classList.add('img-grid-container')
                                const imageContainer = mediaContainer.childNodes.item(0);
                                imageContainer.classList.add('image-stack');
                                const totalImgs = images.length;
                                if (totalImgs > 1)
                                    imageContainer.classList.add('img-stack-multiple');

                                if (totalImgs === 2) imageContainer.classList.add('img-split');
                                else if (totalImgs === 3) imageContainer.classList.add('img-column');
                                else if (totalImgs >= 4) imageContainer.classList.add('media-stack');
                                else imageContainer.classList.add('img-single');
                            }

                            if (files.length) {
                                mediaContainer.classList.add('file-grid-container')
                                const fileContainer = mediaContainer.childNodes.item(!!images.length ? 1 : 0);
                                fileContainer.classList.add('file-container');
                                if (files.length > 1)
                                    fileContainer.classList.add('multiple-files-container');
                            }
                        }
                    }

                    if (myId !== undefined) {
                        if (usrId === myId)
                            msgElement.setAttribute('data-sender', 'me');
                        else
                            msgElement.setAttribute('data-sender', 'others');
                    }

                    return msgElement;
                });
                // console.log('here_ msgItems', msgElements);
            }, 10);
        });
    }

    XMLHttpRequest.prototype.open = function (method, url, ...args) {
        this._interceptInfo = { method, url };
        return originalOpen.call(this, method, url, ...args);
    };

    XMLHttpRequest.prototype.send = function (...args) {
        this.addEventListener("load", function () {
            const { method, url: urlStr } = this._interceptInfo || {};
            const url = new URL(urlStr);
            console.group(`here_[API] ${method}: ${urlStr}`, this.status);
            const contentType = this.getResponseHeader("content-type") || "";
            let response;
            if (contentType.includes("application/json")) {
                try {
                    response = JSON.parse(this.responseText);
                    // window.response[`[${method}]|${urlStr}`] = response;
                    console.log("Response JSON:", response);
                } catch {
                    response = this.responseText;
                    console.log("Response text:", response);
                }
            } else {
                response = this.responseText;
                console.log("Response:", response);
            }

            const pathName = url.pathname;
            if (
                pathName === `/${apiVersion}/users/user-profile` &&
                url.searchParams.get('user_id')
            ) {
                const chatId = response.data?.chat_id;
                if (chatId) localStorage.setItem('cid', myId = chatId);
            } else if (pathName === `/${apiVersion}/chat/users/me/channels`)
                trackMaskedChannels(response.data.responses);
            else if (pathName.startsWith(`/${apiVersion}/chat/channels/`)) {
                activeChannelId = new URL(location.href).searchParams.get('channelId');
                // todo: handle the case last posts cached.
                if (pathName === `/${apiVersion}/chat/channels/${activeChannelId}/posts`)
                    trackMessages(
                        response?.data?.posts,
                        !response.data.next_post_id ? activeChannelId : null,
                    );
            }

            console.groupEnd();
        });

        return originalSend.apply(this, args);
    };

    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = new Proxy(OriginalWebSocket, {
        construct(target, args) {
            const ws = Reflect.construct(target, args, target);
            ws.addEventListener("message", (event) => {
                let data;
                try {
                    data = JSON.parse(event.data);
                } catch (e) {
                    data = event.data;
                }

                if (data?.event === "posted" || data?.event === "post_edited") {
                    try {
                        const post = JSON.parse(data?.data?.post);
                        if (post?.id) {
                            if (data?.broadcast?.channel_id === activeChannelId) {
                                requestAnimationFrame(() =>
                                    requestAnimationFrame(() => {
                                        if (post?.user_id === myId) {
                                            document.querySelector(`#${CSS.escape(String(post.id))}.message-item`)?.setAttribute('data-sender', 'me');
                                            console.log('here_[message from me]',
                                                document.querySelector(`#${CSS.escape(String(post.id))}.message-item`),
                                            );
                                        } else {
                                            document.querySelector(`#${CSS.escape(String(post.id))}.message-item`)?.setAttribute('data-sender', 'others');
                                            console.log('here_[message from others]',
                                                document.querySelector(`#${CSS.escape(String(post.id))}.message-item`),
                                            );
                                        }

                                        // console.log('msg_evt: received socket event')
                                        trackMessages(
                                            [{
                                                id: post.id,
                                                user_id: post.user_id,
                                                metadata: {
                                                    files: post?.props?.message_detail?.files ?? [],
                                                },
                                            }],
                                            activeChannelId,
                                            true,
                                        );
                                    })
                                );
                            } else {
                                trackMessages(
                                    [{
                                        id: post.id,
                                        user_id: post.user_id,
                                        metadata: {
                                            files: post?.props?.message_detail?.files ?? [],
                                        },
                                    }],
                                    data?.broadcast?.channel_id,
                                    true,
                                );
                            }
                        }

                        // console.log("here_[WS][RECEIVED_NEW_MESSAGE]", {
                        //     url: ws.url,
                        //     data: data?.data,
                        // });
                    } catch (e) {
                        console.log('here_[ERROR]: ', e)
                    }

                }
            });

            return ws;
        },
    });
    console.log("here_WebSocket listener installed!");
})();

// (() => {
//     const GIT_OWNER_NAME = 'Duclx829';
//     const GIT_REPO_NAME = 'CollabiaExtension';
//     const GIT_BRANCH_NAME = 'master';
//     const CDN_BASE_URL = "https://cdn.jsdelivr.net/gh/";
//     const RANDOM_HEX = new Date().getTime().toString(16);
//     const commitSHA = sessionStorage.getItem('cdnsha');
//     async function getLatestCommitHash(owner, repo, branch = "main") {
//         const gitUrl = `https://api.github.com/repos/${owner}/${repo}`;
//         const response = await fetch(`${gitUrl}/commits?sha=${encodeURIComponent(branch)}&per_page=1`);
//         if (!response.ok)
//             throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
//
//         const commits = await response.json();
//         if (!commits.length)
//             throw new Error("No commits found");
//
//         return commits[0].sha;
//     }
//
//     async function checkNewUpdates() {
//         try {
//             const commitHash = await getLatestCommitHash(GIT_OWNER_NAME, GIT_REPO_NAME, GIT_BRANCH_NAME);
//             if (commitSHA && commitHash !== commitSHA) {
//                 console.log('UPDATE_STATUS: NEW_UPDATE_AVAILABLE');
//             } else {
//                 console.log('UPDATE_STATUS: STAYED_UP_TO_DATE');
//             }
//         } catch (e) {
//
//         }
//     }
//
//     const interval = setInterval(() => checkNewUpdates(), 60000);
// })();
