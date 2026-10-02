let mouseStopThrottle = Number(localStorage.getItem('mousestop-throttle'));
let mouseHoverThrottle = Number(localStorage.getItem('mousehover-throttle'));
let longPressDuration = Number(localStorage.getItem('longpress-duration'));
let cachedMask = new Set(getSessionStorage('masked') || []);

let mouseStopTimeout;
let mouseHoverTimeout;
let leftMouseHoldTimeout;
let middleClickLongpressTimeout;
let contextmenuOpenedByHold;

let isMouseout;
let openHelp;
const timeout = {};
const modalInfo = {};
const pointer = {x: 0, y: 0};
let contextMenu;
let targetCopyNode;
let lastMiddleClickTime = 0;

if (!mouseStopThrottle) localStorage.setItem('mousestop-throttle', mouseStopThrottle = 500);
if (!mouseHoverThrottle) localStorage.setItem('mousehover-throttle', mouseHoverThrottle = 100);
if (!longPressDuration) localStorage.setItem('longpress-duration', longPressDuration = 500);

if (navigation) {
    handleNavigationChange(location.href);
    navigation.addEventListener(
        'navigatesuccess',
        (event) => handleNavigationChange(navigation.currentEntry.url),
    ); 

    function handleNavigationChange(url) {
        if (url.startsWith(`${window.origin}/chat/main-content`)) {
            const urlParams = new URLSearchParams(window.location.search);
            // cacheLastActiveChannel(urlParams);
            checkMaskMessage(urlParams);
        }
    }

    function checkMaskMessage(urlParams) {
            const channelId = urlParams.get("channelId");
            const userId = urlParams.get("userId");

            if (channelId || userId) {
                if (
                    cachedMask.has(channelId) ||
                    cachedMask.has(userId)
                )
                    if (!document.body.className?.toString()?.includes('anti-spy')) document.body.classList.add('anti-spy');
                    else;
                else
                    document.body.classList.remove('anti-spy');
            }
    }

    // function cacheLastActiveChannel(urlParams) {
    //     const channelId = urlParams.get("channelId");
    //     const userId = urlParams.get("userId");
    //     if (channelId) localStorage.setItem('channelId', channelId);
    //     if (userId) localStorage.setItem('userId', userId);
    //
    //     // if (!channelId && !userId) {
    //     //     const url = new URL(location.href);
    //     //     console.log(url);
    //     //     url.searchParams.set('channelId', localStorage.getItem('channelId') || '');
    //     //     url.searchParams.set('userId', localStorage.getItem('userId') || '');
    //     //     window.history.replaceState(null, '', url.toString());
    //     // }
    // }
}

if (document.body) {
    
    document.body.style.setProperty('--app-bg-image', `url("${chrome.runtime.getURL("image/bg.png")}")`);
    document.body.style.setProperty('--app-chat-frame-bg-image', `url("${chrome.runtime.getURL("image/chat-frame-bg.png")}")`);
    document.body.style.setProperty('--dotted-img', `url("${chrome.runtime.getURL("image/dotted.png")}")`);
    const onKeydown = (event) => {
        // if (!event.ctrlKey && !event.shiftKey && event.key === "/") {
        //     if (isEditableTarget(event.target)) return;
        //
        //     event.preventDefault();
        //     event.stopPropagation();
        //     openSearch();
        //     return;
        // }

        if (event.ctrlKey && event.key === "?") {
            if (isEditableTarget(event.target) || openHelp) return;

            event.preventDefault();
            openHelp = true;
            toggleHelpOverlay();
        }

        if (event.key === "Escape") {
            // closeSearch();
            if (openHelp) {
                openHelp = false;
                removeHelpOverlay();
            }
        }
    }

    document.body.addEventListener('click', async (e) => await onClick(e.target, e));
    document.body.addEventListener('contextmenu', (e) => onContextMenu(e.target, e), { capture: true });
    document.body.addEventListener('mousemove', (e) => onMouseMove(e));
    document.body.addEventListener('mousedown', (e) => onMouseDown(e));
    document.body.addEventListener('mouseup', (e) => onMouseUp(e));
    document.body.addEventListener('wheel', (e) => onScroll(e));
    document.body.addEventListener('keydown', (e) => onKeydown(e), true);

    const onScroll = (event) => {
        if (contextMenu) closeContextMenu();
        clearTimeout(mouseStopTimeout);
        resetMiddleClickLongPress();
    }

    const onMouseMove = (evt) => {
        pointer.x = evt.clientX;
        pointer.y = evt.clientY;
        resetMiddleClickLongPress();
        clearTimeout(mouseStopTimeout);
        clearTimeout(mouseHoverTimeout);
        // if (leftMouseHoldTimeout) {
        //     clearTimeout(leftMouseHoldTimeout);
        //     leftMouseHoldTimeout = null;
        //     contextmenuOpenedByHold =  false;
        // }
        mouseStopTimeout = setTimeout(() => onMouseStop(evt), mouseStopThrottle);
        mouseHoverTimeout = setTimeout(() => onMouseHover(evt), mouseHoverThrottle);
    }

    const onMouseHover = (evt) => {
        const className = evt.target.className?.toString() ?? '';
        if (
            className === 'redmine-issue-link' &&
            !evt.target.href &&
            evt.target.getAttribute('data-href')
        ) {
            evt.target.href = evt.target.getAttribute('data-href');
            evt.target.classList.remove('redmine-issue-link')
            evt.target.setAttribute('target', '_blank');
            evt.target.replaceWith(evt.target.cloneNode(true));
        }
    }

    const onMouseStop = (evt) => {
        // console.log('[MOUSESTOP]', evt.target);
        if (isMouseout) return;

        const className = evt.target.className?.toString() ?? '';
        if (
            className.includes('replied-text') &&
            !evt.target.querySelector('.cqThemeDeleteMessage')
        ) showTooltip(`reply-preview_${Date.now()}`, evt.target);
        else if (
            className === 'chat-image-resource-contain'
            // className === 'chat-image-resource-cover' 
        ) imgPreviewEvent(evt.target);
        else if (
            className.includes('item-last-message') ||
            className.includes('last-message-author') ||
            className.includes('last-message-separator') ||
            className.includes('last-message-content')
        ) sideBarItemPreview(evt.target.closest('.item-last-message') ?? evt.target);
        else if (className === 'item-comment-image-chat') previewCommentImage(evt.target);
        else if (className.startsWith('img-mention-input-in-write-message')) {
            const node = document.createElement('img');
            const name = evt.target.nextSibling.textContent ?? '';
            node.src = `${chrome.runtime.getURL(`image/qr/${name}.png`)}`;
            imgPreviewEvent(node);
        } else if (
            className === 'pointer' &&
            evt?.target?.nextSibling?.className?.toString().startsWith('message-time')
        ) {
            const node = document.createElement('img');
            const name = evt.target.textContent;
            node.src = `${chrome.runtime.getURL(`image/qr/${name}.png`)}`;
            imgPreviewEvent(node);
        }
    }

    const onContextMenu = (target, event) => {
        // console.log('[CONTEXTMENU]', target);
        clearTimeout(mouseStopTimeout);
        resetMiddleClickLongPress();

        const className = target.className?.toString() ?? '';
        console.log(target)
        if (className.startsWith('cqThemeDMItemLeft') && className.includes('DMItemLeft_contentMessageMaxWidth__')) {
            event.preventDefault();
            showContextMenu({x: event.clientX, y: event.clientY}, msgContentCopyOptions(target.childNodes?.item(0)?.childNodes?.item(0)));
        } else if (
            target.parentNode?.className?.toString().startsWith('cqThemeDMItemLeft') &&
            target.parentNode?.className?.toString().includes('DMItemLeft_contentMessageMaxWidth__')
        ) {
            event.preventDefault();
            showContextMenu({x: event.clientX, y: event.clientY}, msgContentCopyOptions(target.childNodes?.item(0)));
        } else if (
            target.parentNode?.parentNode?.className?.toString().startsWith('cqThemeDMItemLeft') &&
            target.parentNode?.parentNode?.className?.toString().includes('DMItemLeft_contentMessageMaxWidth__')
        ) {
            event.preventDefault();
            showContextMenu({x: event.clientX, y: event.clientY}, msgContentCopyOptions(target));
        } else if (
            target.parentNode?.parentNode?.parentNode?.parentNode?.className?.toString().startsWith('cqThemeDMItemLeft') &&
            target.parentNode?.parentNode?.parentNode?.parentNode?.className?.toString().includes('DMItemLeft_contentMessageMaxWidth__')
        ) {
            event.preventDefault();
            showContextMenu({x: event.clientX, y: event.clientY}, msgContentCopyOptions(target.parentNode.parentNode));
        } else if (className === 'code-block') {
            event.preventDefault();
            showContextMenu({x: event.clientX, y: event.clientY}, codeCopyOptions(target.childNodes?.item(0)));
        } else if (target.tagName === 'CODE') {
            event.preventDefault();
            showContextMenu({x: event.clientX, y: event.clientY}, codeCopyOptions(target));
        } else if (
            target.tagName === 'A' &&
            (
                className === 'redmine-issue-link' ||
                // target.href === target.innerText
                target.href
            )
        ) {
            showContextMenu({x: event.clientX, y: event.clientY}, linkContextOptions(target.href || target.getAttribute('data-href')));
            event.preventDefault();
        }
    }

    const onClick = async (target, event) => {
        const className = target.className?.toString() ?? '';
        const rect = target.getBoundingClientRect();
        // console.log('[ONCLICK]', target);
        // LeftMessageItemNoFile
        if (className.startsWith('cqThemeDMItemLeft')) {
            if (event.clientX > rect.right && event.clientX < rect.right + 144) scrollToHoverActionTags(target.childNodes.item(2), event);
            return;
        }

        // RightMessageItemNoFile
        if (className.startsWith('DMItemRight_contentMessages__')) {
            if (event.clientX > rect.left - 144 && event.clientX < rect.left) scrollToHoverActionTags(target.childNodes.item(2), event);
            return;
        }

        // MessageItemContainFile
        if (target.childNodes.item(0)?.className?.toString().startsWith('dm-grid-container')) {
            if(target.previousSibling?.className?.toString().startsWith('cqThemeDMItemLeft')) {
                // LeftMessageItemContainFile
                if (event.clientX > rect.right && event.clientX < rect.right + 144)
                    scrollToHoverActionTags(target.parentNode?.childNodes.item(3), event);
            } else if (target.parentNode.parentNode.className?.toString().startsWith('DMItemLeft_messagesContainer__')) {
                // LeftMessageItemOnlyFile
                if (event.clientX > rect.right && event.clientX < rect.right + 144)
                    scrollToHoverActionTags(target.parentNode?.childNodes.item(2), event);
            } else {
                // RightMessageItemContainFile
                if (event.clientX > rect.left - 144 && event.clientX < rect.left)
                    scrollToHoverActionTags(
                        target.previousSibling?.childNodes.item(1)
                        ?? target.parentNode?.childNodes.item(2)
                        ,
                        event
                    );
            }

            return;
        }

        if (
            // !leftMouseHoldTimeout &&
            contextMenu &&
            (
                !contextMenu.isSameNode(target) ||
                !contextMenu?.contains(target)
            )
        ) closeContextMenu();

        // if (className === 'redmine-issue-link'
        // ) {
        //     const openNewTab = target.parentNode?.parentNode?.querySelector('.redmine-popover > .redmine-popover-btn:nth-child(2)');
        //     if (openNewTab)
        //         openNewTab.click();
        // }
        // if (
        //     className === 'dm-grid-item border' &&
        //     target.childNodes?.item(0)?.childNodes?.item(0).tagName === 'IMG'
        // ) await copyImage(target.querySelector('img'));
    }

    const onMouseDown = (event) => {
        console.log('[MOUSEDOWN]', event);
        // if  (event.button === 0) {
        //     if (event.shiftKey) return;
        //
        //     resetMiddleClickLongPress();
        //     clearTimeout(leftMouseHoldTimeout);
        //     leftMouseHoldTimeout = setTimeout(() => onLeftMouseHold(event.target, event), 350);
        //     return;
        // }

        if (event.button === 1) {
            event.preventDefault();
            return onMiddleClick(event.target, event);
        }
    }

    const onMouseUp = (event) => {
        if (event.button === 0) {
            // if (
            //     !contextmenuOpenedByHold &&
            //     contextMenu &&
            //     (
            //         !contextMenu.isSameNode(event.target) ||
            //         !contextMenu?.contains(event.target)
            //     )
            // ) closeContextMenu();

            // setTimeout(() => {
                // clearTimeout(leftMouseHoldTimeout);
                // leftMouseHoldTimeout = null;
                // contextmenuOpenedByHold = false;
            // }, 0);
            return;
        }

        if (event?.button === 1) {
            if (middleClickLongpressTimeout) {
                resetMiddleClickLongPress();
                if (Date.now() - lastMiddleClickTime < longPressDuration) {
                    if (isValidImgElement(event.target)) copyImage(event.target);
                }
            }

            lastMiddleClickTime = 0;
        }
    }

    const onMiddleClick = (target, event) => {
        lastMiddleClickTime = Date.now();

        console.log(target);
        if (!target) return;
        const className = target.className?.toString() ?? '';
        clearTimeout(mouseStopTimeout);
        const sidebarItem = target.closest('.dm-side-bar-item');
        if (!!sidebarItem) {
            const id = sidebarItem.parentNode.getAttribute('data-user-id') || sidebarItem.parentNode.getAttribute('data-channel-id')
            if (cachedMask.has(id)) {
                sidebarItem.removeAttribute('data-mask');
                cachedMask.delete(id);
            } else {
                sidebarItem.setAttribute('data-mask', 'true');
                cachedMask.add(id);
            }

            checkMaskMessage(new URLSearchParams(window.location.search));
            setSessionStorage('masked', Array.from(cachedMask.values()));
            return;
        }

        // if (className === 'redmine-issue-link' && !target.href) {
        //     const href = target.getAttribute('data-href');
        //     if (href) window.open(href, '_blank');
        //     return;
        // }

        if(isValidImgElement(target))
            middleClickLongpressTimeout = setTimeout(() => downloadImage(target?.src), longPressDuration);
    }

    function onLeftMouseHold(target, event) {
        contextmenuOpenedByHold = true;
        onContextMenu(target, event);
    }

    function loadClock(parentNode) {
        (async () => {
            try {
                const resp = await fetch(chrome.runtime.getURL('clock/index.html'));
                const html = await resp.text();
                const div = Object.assign(document.createElement('div'), { id: 'clock-container', innerHTML: html });
                parentNode.appendChild(div);

                function initClock() {
                    const markersContainer = parentNode.querySelector('#markers');
                    for (let i = 0; i < 12; i++) {
                        const marker = Object.assign(
                            document.createElement('div'),
                            {
                                className: !!(i % 3) ? 'marker' : 'marker major',
                                style: `--i: ${i};`,
                            }
                        );
                        markersContainer.appendChild(marker);
                    }

                    function updateTime() {
                        const now = new Date();
                        const s = now.getSeconds();
                        const m = now.getMinutes();
                        const h = now.getHours();
                        if (s == 0) {
                            parentNode.querySelector('#seconds-hand').style = `transform: rotate(360deg)`;
                            setTimeout(() => {
                                Object.assign(
                                    parentNode.querySelector('#seconds-hand').style,
                                    {
                                        transition: 'transform 0s',
                                        transform: 'rotate(0deg)',
                                    }
                                );
                            }, 990);
                        } else
                            parentNode.querySelector('#seconds-hand').style = `transform: rotate(${s * 6}deg)`;

                        parentNode.querySelector('#minute-hand').style.transform = `rotate(${m * 6 + s * 0.1}deg)`;
                        parentNode.querySelector('#hour-hand').style.transform = `rotate(${(h % 12) * 30 + m * 0.5}deg)`;
                    }

                    setInterval(updateTime, 1000);
                    updateTime();
                }

                initClock();
            } catch (err) {
                console.log('[ERROR] - Failed to fetch the clock. Detail: ', err);
            }
        })();
    }

    if (document.body) {
        let root;
        const trackRootInterval = setInterval(() => {
            root = document.body.querySelector('#root');
            if (root) {
                // const navbarSearch = document.body.querySelector('.navbar-search');
                // loadClock(navbarSearch);

                let addedNode, removedNode, className, msgItemId = {}, chatHeader = null;
                const observer = new MutationObserver((entries) => {
                    for (let entry of entries)  {
                        removedNode = entry?.removedNodes.item(0);
                        addedNode = entry?.addedNodes.item(0);
                        className = addedNode?.className?.toString() ?? removedNode?.className?.toString();
                        let sidebar;
                        try { sidebar = addedNode?.querySelector('#side-bar-message'); }
                        catch { }

                        if (sidebar) {
                            const sidebarItems = sidebar.querySelectorAll('[data-channel-id]');
                            sidebarItems.forEach((el) => {
                                const id = el.getAttribute('data-user-id') || el.getAttribute('data-channel-id');
                                if (cachedMask.has(id))
                                    el.childNodes.item(0).setAttribute('data-mask', true);
                            })
                        }

                        if(
                            !className?.startsWith('message-item') &&
                            className !== 'chat-image-resource-cover'
                        ) continue;

                        if (addedNode?.childNodes.length) {
                            let id, msgResourceItemEle, dmGridItem;
                            if (className === 'chat-image-resource-cover') {
                                if (addedNode.src) {
                                    msgResourceItemEle =  addedNode.parentNode?.parentNode?.parentNode;
                                    dmGridItem = addedNode.parentNode?.parentNode;
                                    id = addedNode.parentNode?.parentNode?.parentNode?.parentNode?.parentNode
                                        ?.parentNode
                                        ?.parentNode
                                        ?.parentNode
                                        ?.parentNode
                                        ?.parentNode
                                        ?.parentNode
                                        ?.parentNode
                                        ?.parentNode
                                        ?.id;
                                } else {
                                    msgResourceItemEle =  addedNode.parentNode?.parentNode?.parentNode;
                                    dmGridItem = addedNode.parentNode?.parentNode;
                                    id = addedNode.parentNode?.parentNode?.parentNode?.parentNode?.parentNode
                                        ?.parentNode
                                        ?.parentNode
                                        ?.parentNode
                                        ?.parentNode
                                        ?.parentNode
                                        ?.parentNode
                                        ?.parentNode
                                        ?.parentNode
                                        ?.id;
                                }
                            } else {
                                id = addedNode.id;
                                dmGridItem = addedNode?.parentNode;
                                msgResourceItemEle = addedNode.querySelector('[class^="DMResources_listVideoOrImageMoreThan2Item__"]')
                                                       ?? addedNode.querySelector('[class^="DMResources_listVideoOrImage2Item__"]');
                            }

                            if (dmGridItem?.id) continue;

                            msgItemId[id] = { totalImages: 0 };
                            if (msgResourceItemEle) {
                                for(let item of msgResourceItemEle.childNodes) {
                                    if (
                                        item.childNodes.item(0)?.className?.toString().startsWith('chat-image-resource-cover') ||
                                        item.childNodes.item(0)?.childNodes?.item(0)?.className?.toString().startsWith('chat-image-resource-cover')
                                    ) {
                                        msgItemId[id].totalImages += 1;
                                        if (msgItemId[id].totalImages > 4) {
                                             item.classList.add('dm-grid-item-image', `dm-grid-item-image-${msgItemId[id].totalImages}`, 'hidden');
                                             item.id = `${id}__${msgItemId[id].totalImages}`
                                        } else {
                                            item.classList.add('dm-grid-item-image', `dm-grid-item-image-${msgItemId[id].totalImages}`);
                                            item.id = `${id}__${msgItemId[id].totalImages}`
                                        }
                                    }
                                }

                                msgResourceItemEle.setAttribute('data-image-count', msgItemId[id].totalImages);
                                if (msgItemId[id].totalImages >= 4)
                                    msgResourceItemEle.classList.add('msg-item-image-stack', `total-${msgItemId[id].totalImages}-images`, 'more-than-4-images');
                                else if (msgItemId[id].totalImages > 1) msgResourceItemEle.classList.add('msg-item-image-stack', `total-${msgItemId[id].totalImages}-images`);
                            }
                        } else if (removedNode && msgItemId[removedNode?.id]) {
                            // msgItemId[removedNode.id].observer?.disconnect();
                            // msgItemId[id] = null;
                        }
                    }
                });
                observer.observe(root, { childList: true, subtree: true });
                clearInterval(trackRootInterval);
            }
        }, 500);
    }
}

function resetMiddleClickLongPress() {
    clearTimeout(middleClickLongpressTimeout);
    middleClickLongpressTimeout = null;
}

function showContextMenu(position, children) {
    if (!children) return;

    if (!contextMenu) {
        contextMenu = document.createElement('div');
        contextMenu.id = 'context-menu';
        const div = document.createElement('div');
        Object.assign(div.style, {
            height: 'fit-content',
            width: 'fit-content',
            maxHeight: '100px',
            border: '1px solid rgb(212 212 212)',
            background: '#fff',
            borderRadius: '.5rem',
            overflow: 'auto',
            boxShadow: 'rgba(0, 0, 0, 30%) 1px 2px 3.5px',
            marginBottom: '5px',
            transformOrigin: 'bottom left',
            animation: 'contextMenuOpen 200ms ease-in-out forwards',
        });
        Object.assign(contextMenu.style, {
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            height: 'fit-content',
            width: 'fit-content',
            zIndex: 99,
            opacity: 0,
            transform: 'translate(-1rem, calc(-100% + 1rem))',
            animation: 'fadeIn 100ms ease-in-out forwards',
        });
        div.appendChild(children);
        contextMenu.appendChild(div);
    } else {
        contextMenu.childNodes.item(0).innerHTML = '';
        contextMenu.childNodes.item(0).appendChild(children);
        contextMenu.childNodes.item(0).style.animation = 'none';
        Object.assign(contextMenu.style, {
            left: `${position.x}px`,
            top: `${position.y}px`,
            animation: 'none',
            opacity: 1,
        });
    }

    document.body.append(contextMenu);
    const rect = contextMenu.getBoundingClientRect();
    const offsetTop = position.y - rect.height + 32;
    const offsetRight = window.innerWidth - (position.x + rect.width) + 16;
    if (offsetTop < 0 || offsetRight < 0) {
        const translateX = offsetRight < 0 ? 'calc(-100% + 1rem)' : '-1rem';
        const translateY = offsetTop < 0 ? '-1rem' : 'calc(-100% + 1rem)';
        contextMenu.style.transform = `translate(${translateX}, ${translateY})`;
        contextMenu.childNodes.item(0).style.transformOrigin = `${offsetTop < 0 ? 'top' : 'bottom'} ${offsetRight < 0 ? 'right' : 'left'}`;
    } else {
        contextMenu.style.transform = 'translate(-1rem, calc(-100% + 1rem))';
        contextMenu.childNodes.item(0).style.transformOrigin = 'bottom left';
    }
}

// function openModal(id, children, backdropBgUrl) {
//     try {
//         let site = document.body.querySelector('.site');
//         const div = document.createElement('div');
//         div.id = id;
//         div.className = 'image-quickview';
//         const backdrop = document.createElement('div');
//         backdrop.className = 'backdrop';
//         Object.assign(backdrop.style, {
//             position: 'absolute',
//             inset: 0,
//             zIndex: 1,
//             backdropFilter: 'blur(9px)',
//             background: `hsla(0, 0%, 0%, 0.3)`,
//         });
//         div.append(backdrop);

//         if (backdropBgUrl) {
//             const backdropBg = document.createElement('div');
//             Object.assign(backdropBg.style, {
//                 position: 'absolute',
//                 inset: 0,
//                 zIndex: 0,
//                 filter: 'brightness(0.5) opacity(0.9)',
//                 background: `center / cover no-repeat url(${backdropBgUrl})`
//             });
//             div.append(backdropBg);
//         }

//         div.append(children);
//         site.prepend(div);
//         modalInfo[id] = { lastX: pointer.x, lastY: pointer.y };
//         div.addEventListener('mousemove', () => {
//             if (
//                 modalInfo[id] == null ||
//                 Math.abs(pointer.x - modalInfo[id].lastX) > 16 ||
//                 Math.abs(pointer.y - modalInfo[id].lastY) > 16
//             ) {
//                 div.remove();
//                 if (modalInfo[id]) delete modalInfo[id]
//             }
//         });
//     } catch (e) {
//         console.log(e);
//     }
// }

function openModal(id, children, backdropBgUrl) {
    try {
        let site = document.body.querySelector('.site');
        const div = document.createElement('div');
        div.id = id;
        div.className = 'image-quickview';
        div.append(children);
        site.prepend(div);
        modalInfo[id] = { lastX: pointer.x, lastY: pointer.y };
        div.addEventListener('mousemove', () => {
            if (
                modalInfo[id] == null ||
                Math.abs(pointer.x - modalInfo[id].lastX) > 16 ||
                Math.abs(pointer.y - modalInfo[id].lastY) > 16
            ) {
                div.remove();
                if (modalInfo[id]) delete modalInfo[id]
            }
        });
    } catch (e) {
        console.log(e);
    }
}

function overrideEmojiPicker(node) {
    setTimeout(() => {
        const section = node.querySelector('#root') ?? node.shadowRoot.querySelector('#root');
        if (!section) return;
        section.style.background = 'transparent';
        section.style.border = '1px solid #5a5a5a';
        const categories = section.querySelectorAll('.category');
        for (let cat of categories) {
            const catHeader = cat.querySelector('.sticky');
            if (catHeader) {
                catHeader.style.backdropFilter = 'none';
                catHeader.style.background = 'transparent';
                catHeader.style.borderBottom = '1px solid #d3d3d329';
            }
        }
    }, 0);
}

function imgPreviewEvent(node) {
    const id = btoa(node.getAttribute('src') ?? '');
    if (modalInfo[id] != null) return;
    const div = document.createElement('div');
    div.append(node.cloneNode(true)); 
    openModal(id, div);
}

function previewCommentImage(node) {
    const parentNode = node.parentNode;
    const div = document.createElement('div');
    div.id = 'comment-image-preview';
    const footer = document.querySelector('.cqThemeDMFooter.chat-input-messages');
    const ratio = node.naturalWidth / node.naturalHeight;
    let naturalWidth = node.naturalWidth;
    let naturalHeight = node.naturalHeight;

    if (ratio > 1) {
        if (naturalWidth > 500) {
            naturalHeight = Math.min(500 / ratio, 300);
            naturalWidth = Math.min(naturalHeight * ratio, 500);
        }
    } else if (ratio < 1) {
        if (naturalHeight > 300) {
            naturalWidth = Math.min(300 * ratio, 500);
            naturalHeight = Math.min(naturalWidth / ratio, 300);
        }
    } else {
        if (naturalHeight > 300) naturalWidth = naturalHeight = 300;
    }

    const rect = node.getBoundingClientRect();
    const centerX = rect.left + (rect.width / 2);
    let left = centerX - (naturalWidth / 2);
    let bottom = window.innerHeight - (rect.top) + 4;
    if (left < footer.getBoundingClientRect().left)
        left = footer.getBoundingClientRect().left;
    else if (left + naturalWidth > window.innerWidth)
        left = window.innerWidth - naturalWidth - 4;

    Object.assign(div.style, {
        height: `${naturalHeight}px`,
        width: `${naturalWidth}px`,
        aspectRatio: ratio,
        maxWidth: 'min(500px, 80svw)',
        maxHeight: 'min(300px, 80svh)',
        border: '1px solid rgb(212 212 212)',
        background: '#fff',
        position: 'fixed',
        left: `${left}px`,
        bottom: `${bottom}px`,
        borderRadius: '1rem',
        overflow: 'hidden',
        boxShadow: 'rgba(0, 0, 0, 30%) 1px 2px 3.5px',
        zIndex: 99,
        opacity: 0,
        animation: 'fadeIn 150ms ease-in-out forwards',
    });
    div.appendChild(node.cloneNode(true));
    parentNode.append(div);
    node.addEventListener('mouseout', () => div.remove());
}

function sideBarItemPreview(node) {
    showTooltip(`sidebar-item-preview_${Date.now()}`, node);
}

function closeContextMenu() {
    if (!contextMenu) return;

    contextMenu.remove();
    contextMenu = null;
}

function scrollToHoverActionTags(target, event) {
    if (!target) return;

    const container = target.closest('#container-listMessage');
    const containerRect = container.getBoundingClientRect();
    const itemRect = target.getBoundingClientRect();

    const clickY = event.clientY - containerRect.top;
    const offset =
        itemRect.top -
        containerRect.top -
        clickY +
        (itemRect.height / 2)
        ;

    smoothScroll(container, container.scrollTop + offset, 200);
}

// (() => {
//     setTimeout(() => {
//         console.log('trigger');
//         const cURL = `
//             curl 'https://collabia-api.tdt.asia/v1/chat/channels/iyoriohi43rndxkjpg71ap8y6r/members?page_no=1&page_size=100&version=2' \\
//             -H 'Accept: application/json, text/plain, */*' \\
//             -H 'Accept-Language: en-US,en;q=0.9,vi;q=0.8' \\
//             -H 'Authorization: Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ7XCJ1c2VyX2lkXCI6XCIxMDAwODg0NDA3NTk5NDVcIixcImRldmljZV9pZFwiOlwiOGUxZjhkZjUtOGY1ZS00MzZkLTg4MTUtOThiNWM1NjMzMjJhXCIsXCJzdWJfc3lzdGVtXCI6MTEsXCJjaGF0X3Rva2VuXCI6XCJkNWE2Z2l1Y3o3eWUzbm8xYzF4cW5qZHNuaFwifSIsImF1dGhvcml0aWVzIjpbIlJPTEVfVVNFUiJdLCJpYXQiOjE3ODMzMDY4MTksImV4cCI6MTc4MzczODgxOX0.nk87l1ne9NrxO0wDWBB3AF_rU8xUxjCbQRD3tGecgT0Z8wNuuVO0PoWk5w03ChxNhayT4UDhlW2FuHxGaF89Zw' \\
//             -H 'Cache-Control: no-cache' \\
//             -H 'Connection: keep-alive' \\
//             -H 'Origin: https://collabia.tdt.asia' \\
//             -H 'Pragma: no-cache' \\
//             -H 'Referer: https://collabia.tdt.asia/' \\
//             -H 'Sec-Fetch-Dest: empty' \\
//             -H 'Sec-Fetch-Mode: cors' \\
//             -H 'Sec-Fetch-Site: same-site' \\
//             -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36' \\
//             -H 'sec-ch-ua: "Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"' \\
//             -H 'sec-ch-ua-mobile: ?0' \\
//             -H 'sec-ch-ua-platform: "Windows"'
//         `;
//         curlFetch(cURL)
//             .then((res) => res.json())
//             .then(console.log)
//             .catch((e) => console.log('ERROR: ', e))
//         ;
//     }, 3000)
// })();
