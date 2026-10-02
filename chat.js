(() => {
    let mouseStopThrottle = Number(localStorage.getItem('mousestop-throttle'));
    let mouseHoverThrottle = Number(localStorage.getItem('mousehover-throttle'));
    let longPressDuration = Number(localStorage.getItem('longpress-duration'));
    let mouseStopTimeout;
    let mouseHoverTimeout;
    let leftMouseHoldTimeout;
    let middleClickLongpressTimeout;
    let contextmenuOpenedByHold;
    let isMouseout;
    let trackRootInterval;
    const timeout = {};
    const modalInfo = {};
    const pointer = {x: 0, y: 0};
    let contextMenu;
    let lastMiddleClickTime = 0;
    if (!mouseStopThrottle) localStorage.setItem('mousestop-throttle', mouseStopThrottle = 500);
    if (!mouseHoverThrottle) localStorage.setItem('mousehover-throttle', mouseHoverThrottle = 100);
    if (!longPressDuration) localStorage.setItem('longpress-duration', longPressDuration = 500);

    let cachedMask = new Set(getSessionStorage('masked') || []);

    if (navigation) {
        handleNavigationChange(location.href);

        function onNavigationSuccess() {
            handleNavigationChange(navigation.currentEntry.url);
        }

        navigation.addEventListener('navigatesuccess', onNavigationSuccess);

        function handleNavigationChange(url) {
            if (url.startsWith(`${window.origin}/chat/main-content`)) {
                const urlParams = new URLSearchParams(window.location.search);
                checkMaskMessage(urlParams);
            } else {
                navigation.removeEventListener('navigatesuccess', onNavigationSuccess);
            }
        }

        function checkMaskMessage(urlParams) {
            if (!cachedMask)
                return;

            const channelId = urlParams.get("channelId");
            const userId = urlParams.get("userId");
            if (
                document.body &&
                (
                    channelId ||
                    userId
                )
            ) {
                if (
                    cachedMask.has(channelId) ||
                    cachedMask.has(userId)
                ) {
                    const className = document.body.className?.toString();
                    if (!className || !className.includes('anti-spy'))
                        document.body.classList.add('anti-spy');
                } else {
                    document.body.classList.remove('anti-spy');
                }
            }
        }
    }

    const onKeydown = (event) => {
    }

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
        if (isMouseout)
            return;

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

    const onContextMenu = (event) => {
        const target = event.target;
        clearTimeout(mouseStopTimeout);
        resetMiddleClickLongPress();

        const className = target.className?.toString() ?? '';
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

    const onClick = async (event) => {
        const target = event.target;
        const className = target.className?.toString() ?? '';
        const rect = target.getBoundingClientRect();
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

    function trackDomChanges() {
        let root;
        trackRootInterval = setInterval(() => {
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

    if (document.body) {
        document.body.addEventListener('click', onClick);
        document.body.addEventListener('contextmenu', onContextMenu, { capture: true });
        document.body.addEventListener('mousemove', onMouseMove);
        document.body.addEventListener('mousedown', onMouseDown);
        document.body.addEventListener('mouseup', onMouseUp);
        document.body.addEventListener('wheel', onScroll);
        document.body.addEventListener('keydown', onKeydown, true);
        trackDomChanges();
    }

    const cleanup = () => {
        clearTimeout(mouseStopTimeout);
        clearTimeout(mouseHoverTimeout);
        clearTimeout(leftMouseHoldTimeout);
        clearTimeout(middleClickLongpressTimeout);
        clearInterval(trackRootInterval);

        document.body.removeEventListener('click', onClick);
        document.body.removeEventListener('contextmenu', onContextMenu);
        document.body.removeEventListener('mousemove', onMouseMove);
        document.body.removeEventListener('mousedown', onMouseDown);
        document.body.removeEventListener('mouseup', onMouseUp);
        document.body.removeEventListener('wheel', onScroll);
        document.body.removeEventListener('keydown', onKeydown, true);

    }
})();
