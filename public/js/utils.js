window.NOTE_COLORS = {
    default: { label: 'Default', bg: 'bg-white dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', circle: 'bg-white border-gray-300', thumb: '#d1d5db', thumbDark: '#4b5563' },
    red:     { label: 'Red',     bg: 'bg-red-100 dark:bg-red-900', border: 'border-red-300 dark:border-red-800', circle: 'bg-red-200', thumb: '#fca5a5', thumbDark: '#b91c1c' },
    orange:  { label: 'Orange',  bg: 'bg-orange-100 dark:bg-orange-900', border: 'border-orange-300 dark:border-orange-800', circle: 'bg-orange-200', thumb: '#fdba74', thumbDark: '#c2410c' },
    yellow:  { label: 'Yellow',  bg: 'bg-yellow-100 dark:bg-yellow-900', border: 'border-yellow-300 dark:border-yellow-800', circle: 'bg-yellow-200', thumb: '#fde047', thumbDark: '#a16207' },
    green:   { label: 'Green',   bg: 'bg-green-100 dark:bg-green-900', border: 'border-green-300 dark:border-green-800', circle: 'bg-green-200', thumb: '#86efac', thumbDark: '#15803d' },
    teal:    { label: 'Teal',    bg: 'bg-teal-100 dark:bg-teal-900', border: 'border-teal-300 dark:border-teal-800', circle: 'bg-teal-200', thumb: '#5eead4', thumbDark: '#0f766e' },
    blue:    { label: 'Blue',    bg: 'bg-slate-100 dark:bg-slate-900', border: 'border-slate-300 dark:border-slate-800', circle: 'bg-slate-200', thumb: '#94a3b8', thumbDark: '#475569' },
    purple:  { label: 'Purple',  bg: 'bg-purple-100 dark:bg-purple-900', border: 'border-purple-300 dark:border-purple-800', circle: 'bg-purple-200', thumb: '#d8b4fe', thumbDark: '#7e22ce' },
    pink:    { label: 'Pink',    bg: 'bg-pink-100 dark:bg-pink-900', border: 'border-pink-300 dark:border-pink-800', circle: 'bg-pink-200', thumb: '#f9a8d4', thumbDark: '#be185d' },
    brown:   { label: 'Brown',   bg: 'bg-stone-100 dark:bg-stone-900', border: 'border-stone-300 dark:border-stone-800', circle: 'bg-stone-200', thumb: '#d6d3d1', thumbDark: '#44403c' },
    gray:    { label: 'Gray',    bg: 'bg-gray-200 dark:bg-gray-700', border: 'border-gray-400 dark:border-gray-600', circle: 'bg-gray-400', thumb: '#9ca3af', thumbDark: '#374151' },
};

window.formatUrlsInText = (text) => {
    if (!text) return '';
    // Match Markdown links or raw URLs
    const combinedRegex = /(\[.*?\]\(.*?\))|(https?:\/\/[^\s]+)/g;
    return text.replace(combinedRegex, (match, markdownLink, rawUrl) => {
        if (markdownLink) return markdownLink; // Return existing link as-is
        try {
            const urlObj = new URL(rawUrl);
            return `[${urlObj.hostname.replace('www.', '')}](${rawUrl})`;
        } catch (e) {
            return `[Link](${rawUrl})`;
        }
    });
};

window.generateShortId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

window.hashPin = async (pin) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

window.cleanData = (obj) => {
    // If it's not a plain object or array, return it as is (e.g. Date, Firestore types)
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj.constructor !== Object && !Array.isArray(obj)) return obj;

    const newObj = Array.isArray(obj) ? [] : {};
    Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value === undefined) return;
        newObj[key] = window.cleanData(value);
    });
    return newObj;
};

window.vibrate = (pattern = 50) => {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

window.fetchTitle = async (url) => {
    // 1. YouTube specialized handler (oEmbed)
    if (url.includes('youtube.com/') || url.includes('youtu.be/')) {
        try {
            const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
            if (res.ok) {
                const data = await res.json();
                if (data.title) return data.title;
            }
        } catch (e) {
            console.warn("YouTube oEmbed failed, falling back to proxy", e);
        }
    }

    // 2. Multi-proxy strategy and generic parsing
    const proxies = [
        { name: 'AllOrigins', url: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`, json: true },
        { name: 'CorsProxy', url: (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`, json: false }
    ];

    const parseTitleFromHtml = (html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        // Priority: OpenGraph -> Twitter -> Title Tag
        let title = doc.querySelector('meta[property="og:title"]')?.content || 
                    doc.querySelector('meta[name="twitter:title"]')?.content ||
                    doc.title;
        
        if (title) {
            // Clean up common suffixes and whitespace
            return title.replace(/\s*-\s*(YouTube|Google Search|Wikipedia|Facebook|Twitter|Amazon\.com)$/i, '').trim();
        }
        return null;
    };

    for (const proxy of proxies) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(proxy.url(url), { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
                let html;
                if (proxy.json) {
                    const data = await response.json();
                    html = data.contents;
                } else {
                    html = await response.text();
                }

                if (html) {
                    const title = parseTitleFromHtml(html);
                    if (title) return title;
                }
            }
        } catch (e) {
            console.error(`${proxy.name} failed for ${url}:`, e);
        }
    }

    // Final Fallback: Return URL hostname
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch (e) {
        return url;
    }
};

window.processInlineFormatting = (text) => {
    if (!text) return '';

    // Links & Images
    text = text.replace(/(!?)\[([^\]]+)\]\(([^)]+)\)/g, (match, p1, p2, p3) => {
        if (p1 === '!') return `<img src="${p3}" alt="${p2}" />`;
        const isInternal = p3.startsWith('internal://');
        return `\u200B<a href="${p3}" class="${isInternal ? 'internal-link' : ''}">${p2}</a>\u200B`;
    });
    
    // Internal Links (must be preceded by start of line, whitespace, or open punctuation)
    text = text.replace(/(^|[\s"'(\[])(?:::)([a-z0-9]{4,})\b/gi, (match, prefix, id) => {
        return `${prefix}\u200B<a href="internal://${id}" class="internal-link">::${id}</a>\u200B`; 
    });

    // Protect all HTML tags from bold/italic parsing so underscores in URLs or attributes are not mangled
    const tags = [];
    text = text.replace(/<[^>]+>/g, (tag) => {
        tags.push(tag);
        return `\x00TAG${tags.length - 1}\x00`;
    });

    // Bold, Italic (safe on text content only)
    text = text.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    text = text.replace(/_([^_]+)_/g, '<i>$1</i>');

    // Restore protected HTML tags
    text = text.replace(/\x00TAG(\d+)\x00/g, (_, i) => tags[Number(i)]);

    return text;
};

window.parseMarkdown = (text, collapsedLines = new Set(), hideCompleted = false, maxItems = 999, showMoreDecoration = false, showCompletedCount = false) => {
    if (!text) return '<div><br></div>';
    
    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.replace(/&lt;span id="(pending-link-\d+)"(.*?)&gt;(.*?)&lt;\/span&gt;/g, '<span id="$1"$2>$3</span>');

    const lines = html.split('\n');
    let output = '';
    let listType = null;
    let taskBuffer = [];
    let groupCounter = 0;
    let totalItemsRendered = 0;
    let totalCompletedCount = 0;

    const gripIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>`;

    const flushTaskBuffer = () => {
        if (taskBuffer.length === 0) return;
        
        groupCounter++;
        const groupId = `g${Date.now()}-${groupCounter}`;
        
        const blockCompletedCount = taskBuffer.filter(t => t.isChecked).length;
        totalCompletedCount += blockCompletedCount;

        // Calculate parent-child mapping for items in this contiguous buffer
        const parents = [];
        const activeAncestors = [];
        taskBuffer.forEach((item, i) => {
            activeAncestors[item.level] = i;
            if (item.level > 0) {
                parents[i] = activeAncestors[item.level - 1] !== undefined ? activeAncestors[item.level - 1] : -1;
            } else {
                parents[i] = -1;
            }
        });

        // Determine which items should be rendered in the Completed list
        // and which of those are "phantom" items (unchecked parents of checked sub-items)
        const completedRenderSet = new Set();
        const phantomSet = new Set();

        taskBuffer.forEach((item, i) => {
            if (item.isChecked) {
                completedRenderSet.add(i);
                // Traverse upwards to add unchecked ancestors as phantoms
                let curr = parents[i];
                while (curr !== -1) {
                    if (!taskBuffer[curr].isChecked) {
                        phantomSet.add(curr);
                    }
                    completedRenderSet.add(curr);
                    curr = parents[curr];
                }
            }
        });

        const collapseStack = [];

        const renderItem = (item, idx, arr, isPhantom = false) => {
            if (totalItemsRendered >= maxItems) return '';
            
            const nextItem = arr[idx + 1];
            const hasChildren = nextItem && nextItem.level > item.level;
            const isCollapsed = collapsedLines.has(String(item.originalIndex));
            
            while (collapseStack.length > 0 && collapseStack[collapseStack.length - 1].level >= item.level) {
                collapseStack.pop();
            }
            
            const isHidden = collapseStack.some(c => c.isCollapsed);
            
            if (isCollapsed) {
                collapseStack.push({ level: item.level, isCollapsed: true });
            }

            const toggleClass = isCollapsed ? 'is-collapsed' : '';
            const hiddenClass = isHidden ? 'is-hidden' : '';

            const toggleCarat = (hasChildren && !isPhantom) ? `<span class="list-toggle ${toggleClass}" contenteditable="false" title="Toggle Children"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></span>` : '';
            const finalContent = window.processInlineFormatting(item.content) || '<br>';
            const deleteBtn = (hideCompleted || isPhantom) ? '' : `<span class="task-delete" contenteditable="false" title="Delete Item">×</span>`;
            const handle = (hideCompleted || isPhantom) ? '' : `<span class="task-handle" contenteditable="false" title="Drag to reorder" style="flex-shrink: 0; margin-right: 4px;">${gripIcon}</span>`;
            const indentSize = (hideCompleted || isPhantom) ? 16 : 24;
            
            const isCheckedStr = isPhantom ? "false" : String(item.isChecked);
            const phantomClass = isPhantom ? "task-line-phantom opacity-40 pointer-events-none select-none" : "";

            totalItemsRendered++;
            return `<li class="task-line ${hiddenClass} ${phantomClass}" data-checked="${isCheckedStr}" data-indent="${item.level}" data-group-id="${groupId}" data-line-index="${item.originalIndex}" style="margin-left: ${item.level * indentSize}px; list-style: none; display: flex; align-items: flex-start;">${handle}<span class="task-checkbox" contenteditable="false" style="flex-shrink: 0; ${isPhantom ? 'opacity: 0.6; pointer-events: none;' : ''}"></span><span class="task-content" ${isPhantom ? 'contenteditable="false"' : ''} style="flex: 1; min-width: 0; outline: none; ${isPhantom ? 'text-decoration: none;' : ''}">${finalContent}</span>${toggleCarat}${deleteBtn}</li>`;
        };

        // Active items are those that are NOT checked
        const activeItemsToRender = taskBuffer.filter(t => !t.isChecked);
        
        // Completed items are those in the completed set
        const completedItemsToRender = taskBuffer.filter((item, i) => completedRenderSet.has(i));
        const realCompletedCount = completedItemsToRender.filter(item => {
            const originalIndexInTaskBuffer = taskBuffer.indexOf(item);
            return !phantomSet.has(originalIndexInTaskBuffer);
        }).length;

        // Ensure we don't render an empty active section if there are only completed blocks
        if (activeItemsToRender.length === 0 && realCompletedCount > 0) {
            activeItemsToRender.push({ level: 0, isChecked: false, content: '', originalIndex: taskBuffer.length });
        }
        
        if (activeItemsToRender.length > 0) {
            if (listType !== 'task') {
                if (listType) output += '</ul>';
                output += '<ul class="task-list" style="padding-left: 0;">';
                listType = 'task';
            }
            activeItemsToRender.forEach((item, idx) => {
                output += renderItem(item, idx, activeItemsToRender, false);
            });
        }

        if (realCompletedCount > 0 && !hideCompleted) {
            if (listType) { output += '</ul>'; listType = null; }
            output += `<div class="completed-separator" contenteditable="false" style="color: #888; font-size: 0.8em; margin: 10px 0 10px 0; border-top: 1px solid #eee; padding-top: 5px;">${realCompletedCount} Completed Item${realCompletedCount > 1 ? 's' : ''}</div>`;
            output += '<ul class="task-list completed-list" style="padding-left: 0;">';
            listType = 'task';

            completedItemsToRender.forEach((item, idx) => {
                const originalIndexInTaskBuffer = taskBuffer.indexOf(item);
                const isPhantom = phantomSet.has(originalIndexInTaskBuffer);
                output += renderItem(item, idx, completedItemsToRender, isPhantom);
            });
        }
        taskBuffer = [];
    };;

    const bulletBuffer = [];
    const flushBulletBuffer = () => {
        if (bulletBuffer.length === 0) return;
        if (listType !== 'bullet') {
            if (listType) output += '</ul>';
            output += '<ul class="bullet-list" style="padding-left: 0;">';
            listType = 'bullet';
        }
        
        const collapseStack = [];

        bulletBuffer.forEach((item, idx) => {
            if (totalItemsRendered >= maxItems) return;

            const nextItem = bulletBuffer[idx + 1];
            const hasChildren = nextItem && nextItem.level > item.level;
            const isCollapsed = collapsedLines.has(String(item.originalIndex));

            while (collapseStack.length > 0 && collapseStack[collapseStack.length - 1].level >= item.level) {
                collapseStack.pop();
            }
            
            const isHidden = collapseStack.some(c => c.isCollapsed);
            
            if (isCollapsed) {
                collapseStack.push({ level: item.level, isCollapsed: true });
            }

            const toggleClass = isCollapsed ? 'is-collapsed' : '';
            const hiddenClass = isHidden ? 'is-hidden' : '';

            const toggleCarat = hasChildren ? `<span class="list-toggle ${toggleClass}" contenteditable="false" title="Toggle Children"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></span>` : '';
            const deleteBtn = hideCompleted ? '' : `<span class="task-delete" contenteditable="false" title="Delete Item">×</span>`;
            const handle = hideCompleted ? '' : `<span class="task-handle" contenteditable="false" title="Drag to reorder" style="flex-shrink: 0; margin-right: 4px;">${gripIcon}</span>`;
            const indentSize = hideCompleted ? 16 : 24;
            totalItemsRendered++;
            output += `<li class="bullet-line ${hiddenClass}" data-indent="${item.level}" data-line-index="${item.originalIndex}" style="margin-left: ${item.level * indentSize}px; display: flex; align-items: flex-start;">${handle}<span class="bullet-content" style="flex: 1; min-width: 0;">${window.processInlineFormatting(item.content)}</span>${toggleCarat}${deleteBtn}</li>`;
        });
        bulletBuffer.length = 0;
    };

    const consumedLines = new Set();
    lines.forEach((line, index) => {
        if (consumedLines.has(index)) return;
        if (totalItemsRendered >= maxItems) return;

        const taskMatch = line.match(/^(\s*)-\s\[([xX\s]?)\]\s*(.*)/i);
        if (taskMatch) {
            flushBulletBuffer();
            const indentSpaces = taskMatch[1].length;
            const level = Math.floor(indentSpaces / 2);
            const isChecked = (taskMatch[2] || '').toLowerCase() === 'x';
            const content = taskMatch[3];
            taskBuffer.push({ level, isChecked, content, originalIndex: index });
            return;
        }

        const bulletMatch = line.match(/^(\s*)-\s(.*)/i);
        if (bulletMatch) {
            flushTaskBuffer();
            const indentSpaces = bulletMatch[1].length;
            const level = Math.floor(indentSpaces / 2);
            const content = bulletMatch[2];
            bulletBuffer.push({ level, content, originalIndex: index });
            return;
        }

        const previewMatch = line.match(/^>\s*\*\*\[([^\]]+)\]\(([^)]+)\)\*\*(?:\s*(.*))?$/);
        if (previewMatch) {
            flushTaskBuffer();
            flushBulletBuffer();
            const title = previewMatch[1];
            const url = previewMatch[2];
            let inlineSnippet = previewMatch[3] || '';

            let nextIdx = index + 1;
            let nextSnippet = '';
            if (lines[nextIdx] && lines[nextIdx].startsWith('>')) {
                nextSnippet = lines[nextIdx].replace(/^>\s*/, '');
                consumedLines.add(nextIdx);
            }
            const snippet = (inlineSnippet ? inlineSnippet + ' ' : '') + nextSnippet;

            const isInternal = url.startsWith('internal://') || /^::[a-z0-9]{4,}$/i.test(url);
            let displayDomain = '';
            if (isInternal) {
                displayDomain = '::' + url.replace('internal://', '').replace(/^::/, '');
            } else {
                try { displayDomain = new URL(url).hostname.replace('www.', ''); } catch (e) { displayDomain = url; }
            }

            const iconSvg = isInternal
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-500"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;

            output += `<div class="link-preview-card not-prose my-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/90 flex flex-col gap-1 text-xs select-text shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-600 relative group" data-url="${url}" data-title="${title}" data-snippet="${snippet.replace(/"/g, '&quot;')}"><div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 truncate"><span class="p-1 rounded bg-slate-200/60 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">${iconSvg}</span><a href="${url}" class="${isInternal ? 'internal-link' : ''} text-slate-800 dark:text-slate-200 hover:underline truncate">${title}</a></div><div class="flex items-center gap-1.5"><span class="text-[10px] text-gray-400 font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 flex-shrink-0">${displayDomain}</span><button class="preview-delete-btn p-1 text-gray-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity" contenteditable="false" title="Remove preview">×</button></div></div>${snippet ? `<p class="preview-snippet text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed whitespace-pre-wrap">${window.processInlineFormatting ? window.processInlineFormatting(snippet) : snippet}</p>` : ''}</div>`;
            totalItemsRendered++;
            return;
        }

        const quoteMatch = line.match(/^>\s*(.*)/);
        if (quoteMatch) {
            flushTaskBuffer();
            flushBulletBuffer();
            output += `<blockquote class="border-l-4 border-slate-300 dark:border-slate-600 pl-3 py-1 my-1.5 text-gray-600 dark:text-gray-400 italic"><div>${window.processInlineFormatting(quoteMatch[1]) || '<br>'}</div></blockquote>`;
            totalItemsRendered++;
            return;
        }

        flushTaskBuffer();
        flushBulletBuffer();
        
        const content = line.trim() === '' ? '<br>' : window.processInlineFormatting(line);
        output += `<div>${content}</div>`;
        totalItemsRendered++; // Count plain lines too
    });

    flushTaskBuffer();
    flushBulletBuffer();
    if (listType) output += '</ul>';

    if (showCompletedCount && totalCompletedCount > 0) {
        output += `<div class="text-[10px] text-gray-400 mt-2 font-medium opacity-70">${totalCompletedCount} Completed Item${totalCompletedCount > 1 ? 's' : ''}</div>`;
    }

    if (showMoreDecoration && (totalItemsRendered >= maxItems || lines.length > totalItemsRendered)) {
        output += '<div class="text-gray-400 text-xs mt-1 italic opacity-50" contenteditable="false">... (Click to see more)</div>';
    }

    return output;
};

window.toggleListCollapse = (toggleEl) => {
    const li = toggleEl.closest('li');
    if (!li) return;

    const isCollapsed = toggleEl.classList.toggle('is-collapsed');
    const indent = parseInt(li.getAttribute('data-indent') || '0');
    
    // Find all following LIs that are descendants (deeper indent)
    let next = li.nextElementSibling;
    while (next && next.tagName === 'LI') {
        const nextIndent = parseInt(next.getAttribute('data-indent') || '0');
        if (nextIndent <= indent) break; // Reached sibling or parent-level item

        // Only hide if direct parent is collapsed, or show if all ancestors are expanded
        // For simplicity in DOM manipulation, we toggle a hidden class
        if (isCollapsed) {
            next.classList.add('is-hidden');
        } else {
            // Only reveal if its direct parent is not collapsed
            // This needs to be recursive or handled by CSS hierarchy.
            // Simplified: if we are expanding, we reveal EVERYTHING below until the next sibling,
            // but the CSS 'is-hidden' logic should ideally be robust.
            next.classList.remove('is-hidden');
            // If the sub-item itself was collapsed, we stop revealing its children? 
            // Actually, parseMarkdown handles the initial 'is-hidden' correctly.
            // For a live toggle, it's easier to just re-trigger a re-render if it's React-managed.
        }
        next = next.nextElementSibling;
    }
};