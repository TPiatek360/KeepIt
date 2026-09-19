// --- Helper: Markdown <-> HTML Parser for Single-ContentEditable Editor ---

const parseHtmlToMarkdown = (rootElement) => {
    if (!rootElement) return '';
    const processedGroups = new Set();

    const processNode = (node) => {
        if (node.nodeType === 3) return node.textContent; // Text node
        if (node.nodeType !== 1) return '';

        const tagName = node.tagName.toUpperCase();

        if (tagName === 'DIV' || tagName === 'P') {
            if (node.classList.contains('completed-separator')) return '';
            const content = Array.from(node.childNodes).map(processNode).join('');
            // If it's a standard empty line (just a <br> or empty), return a single newline
            if (content === '\n' || content === '') return '\n';
            return '\n' + content;
        }
        
        if (tagName === 'UL') {
            const firstLi = node.querySelector('li.task-line');
            if (firstLi && firstLi.hasAttribute('data-group-id')) {
                const groupId = firstLi.getAttribute('data-group-id');
                if (processedGroups.has(groupId)) return ''; 
                processedGroups.add(groupId);
                const allItems = Array.from(rootElement.querySelectorAll(`li[data-group-id="${groupId}"]`));
                return allItems
                    .filter(li => !li.classList.contains('task-line-phantom'))
                    .map(li => {
                        const checked = li.getAttribute('data-checked') === 'true';
                        const indent = parseInt(li.getAttribute('data-indent') || '0');
                        const prefix = '  '.repeat(indent) + `- [${checked ? 'x' : ' '}] `;
                        const contentSpan = li.querySelector('.task-content');
                        const content = contentSpan ? Array.from(contentSpan.childNodes).map(processNode).join('') : '';
                        return '\n' + prefix + content;
                    }).join('');
            }
            if (node.classList.contains('task-list') || node.classList.contains('bullet-list')) {
                return Array.from(node.children).map(li => processNode(li)).join('');
            }
        }

        if (tagName === 'LI') {
            if (node.classList.contains('task-line')) {
                if (node.classList.contains('task-line-phantom')) return '';
                if (!node.hasAttribute('data-group-id')) {
                    const checked = node.getAttribute('data-checked') === 'true';
                    const indent = parseInt(node.getAttribute('data-indent') || '0');
                    const prefix = '  '.repeat(indent) + `- [${checked ? 'x' : ' '}] `;
                    const contentSpan = node.querySelector('.task-content');
                    const content = contentSpan ? Array.from(contentSpan.childNodes).map(processNode).join('') : '';
                    return '\n' + prefix + content;
                }
                return ''; 
            }
            if (node.classList.contains('bullet-line')) {
                const indent = parseInt(node.getAttribute('data-indent') || '0');
                const prefix = '  '.repeat(indent) + '- ';
                const contentSpan = node.querySelector('.bullet-content');
                const content = contentSpan ? Array.from(contentSpan.childNodes).map(processNode).join('') : Array.from(node.childNodes).map(processNode).join('');
                return '\n' + prefix + content;
            }
        }

        if (tagName === 'BR') return '\n';

        // Inline formatting
        let content = Array.from(node.childNodes).map(processNode).join('');
        switch (tagName) {
            case 'A': 
                const href = node.getAttribute('href');
                if (href && href.startsWith('internal://') && content.match(/^::[a-z0-9]{4,}$/i)) return content;
                return `[${content}](${href})`;
            case 'IMG': return `![${node.getAttribute('alt') || ''}](${node.getAttribute('src')})`;
            case 'B': case 'STRONG': return `**${content}**`;
            case 'I': case 'EM': return `_${content}_`;
            case 'SPAN': 
                if (node.classList.contains('task-handle') || node.classList.contains('task-checkbox') || node.classList.contains('task-delete')) return '';
                if (node.id && node.id.startsWith('pending-link-')) {
                    const selAttr = node.getAttribute('data-selected-text');
                    const attrStr = selAttr ? ` data-selected-text="${selAttr.replace(/"/g, '&quot;')}"` : '';
                    return `<span id="${node.id}"${attrStr}>${content}</span>`;
                }
                return content;
            default: return content;
        }
    };

    const result = Array.from(rootElement.childNodes).map(processNode).join('').replace(/\u200B/g, '').trim();
    // Safety check: If result is empty but root has content, we likely had a parsing failure or detached node
    if (!result && rootElement.childNodes.length > 0 && rootElement.textContent.trim().length > 0) {
        console.warn("Parse failure safety triggered: Returning original textContent as fallback.");
        return rootElement.textContent.trim();
    }
    return result;
};


const NoteEditor = ({ isOpen, onClose, initialNote, liveNote, onSave, onDelete, onArchive, onOpenShare, onEmail, onSMS, onDoc, onDriveSave, allTags, user, allNotes, onInternalLinkClick, textWrap = true, saturation = 1, cardBrightness = 1, borderBrightness = 1, checklistPadding = 0, bulletPadding = 0, canGoBack = false, onBack, setPromptModal, setToast, collapsedLines = new Set(), onToggleSection, linkOpenBehavior = 'newWindow' }) => {
    const [title, setTitle] = React.useState('');
    const [content, setContent] = React.useState(''); // Store as Markdown
    const [initialHtml, setInitialHtml] = React.useState('');
    const [tags, setTags] = React.useState([]);
    const [tagInput, setTagInput] = React.useState('');
    const [color, setColor] = React.useState('default');
    const [isList, setIsList] = React.useState(false); // Legacy flag
    
    const [attachments, setAttachments] = React.useState([]);
    const [reminder, setReminder] = React.useState('');
    const [shortId, setShortId] = React.useState('');
    const [showColorPicker, setShowColorPicker] = React.useState(false);
    const [showShareMenu, setShowShareMenu] = React.useState(false);
    const [isRecording, setIsRecording] = React.useState(false);
    const [activeLink, setActiveLink] = React.useState(null); 
    const [suggestions, setSuggestions] = React.useState([]);
    const [isSuggesting, setIsSuggesting] = React.useState(false);
    const [isDrawingModalOpen, setIsDrawingModalOpen] = React.useState(false);
    const [showReminderInput, setShowReminderInput] = React.useState(false);
    const [showCompleted, setShowCompleted] = React.useState(true);
    const [hoveredPreview, setHoveredPreview] = React.useState(null);
    
    const [hasConflict, setHasConflict] = React.useState(false);
    const [showComparison, setShowComparison] = React.useState(false);
    const [lastSavedAt, setLastSavedAt] = React.useState(0);

    const editorRef = React.useRef(null);
    const titleInputRef = React.useRef(null);
    const fileInputRef = React.useRef(null);
    const mediaRecorderRef = React.useRef(null);
    const audioChunksRef = React.useRef([]);
    const dragState = React.useRef({ active: false, node: null, startY: 0, initialIndex: 0 });
    const lastFocusedRef = React.useRef(null);
    const selectionRef = React.useRef(null);
    const isDirtyRef = React.useRef(false);
    const lastKeystrokeRef = React.useRef(0);
    const loadedIdRef = React.useRef(null);
    const { suggestTags, isAutoTaggingEnabled, extractTextFromImage, isOcrProcessing } = window.useSmart();
    const [isClosing, setIsClosing] = React.useState(false);
    const [isReady, setIsReady] = React.useState(false);
    const { currentNote } = window.useUI();

    // History for Undo/Redo
    const [history, setHistory] = React.useState([]);
    const [historyIndex, setHistoryIndex] = React.useState(-1);

    const pushToHistory = (newState) => {
        setHistory(prev => {
            const currentSnapshot = { 
                title: newState.title ?? title, 
                content: newState.content ?? content, 
                tags: newState.tags ?? tags, 
                color: newState.color ?? color,
                html: editorRef.current?.innerHTML,
                timestamp: Date.now()
            };
            
            // Don't push if identical to current top
            const top = prev[historyIndex];
            if (top && top.title === currentSnapshot.title && top.content === currentSnapshot.content && top.color === currentSnapshot.color) return prev;

            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(currentSnapshot);
            if (newHistory.length > 50) newHistory.shift(); // Max 50 states
            
            // ✅ PERSIST HISTORY: Save to localStorage for cross-session undo
            if (activeIdRef.current && activeIdRef.current !== 'new-note') {
                try {
                    localStorage.setItem(`note_history_${activeIdRef.current}`, JSON.stringify(newHistory));
                } catch (e) { console.warn("Failed to persist history to localStorage:", e); }
            }

            setHistoryIndex(newHistory.length - 1);
            return newHistory;
        });
    };

    const handleUndo = (e) => {
        if (historyIndex > 0) {
            e.preventDefault();
            const newIndex = historyIndex - 1;
            const state = history[newIndex];
            setHistoryIndex(newIndex);
            applyHistoryState(state);
        }
    };

    const handleRedo = (e) => {
        if (historyIndex < history.length - 1) {
            e.preventDefault();
            const newIndex = historyIndex + 1;
            const state = history[newIndex];
            setHistoryIndex(newIndex);
            applyHistoryState(state);
        }
    };

    const applyHistoryState = (state) => {
        if (!state) return;
        
        // Save current selection offset if possible
        const sel = window.getSelection();
        let offset = 0;
        if (sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const preRange = range.cloneRange();
            preRange.selectNodeContents(editorRef.current);
            preRange.setEnd(range.startContainer, range.startOffset);
            offset = preRange.toString().length;
        }

        setTitle(state.title);
        setContent(state.content);
        setTags(state.tags);
        setColor(state.color);
        
        if (editorRef.current && state.html !== undefined) {
            editorRef.current.innerHTML = state.html;
            
            // Attempt to restore cursor
            setTimeout(() => {
                const newRange = document.createRange();
                let charCount = 0;
                let found = false;

                const traverseNodes = (node) => {
                    if (found) return;
                    if (node.nodeType === 3) {
                        const nextCount = charCount + node.length;
                        if (offset <= nextCount) {
                            newRange.setStart(node, offset - charCount);
                            newRange.collapse(true);
                            found = true;
                        }
                        charCount = nextCount;
                    } else {
                        for (let i = 0; i < node.childNodes.length; i++) traverseNodes(node.childNodes[i]);
                    }
                };

                traverseNodes(editorRef.current);
                if (found) {
                    sel.removeAllRanges();
                    sel.addRange(newRange);
                }
            }, 0);
        }
        isDirtyRef.current = true;
    };

    const activeIdRef = React.useRef(null);

    // Initialization & Cleanup
    React.useEffect(() => {
        if (!isOpen) {
            activeIdRef.current = null;
            setIsReady(false);
            return;
        }

        const incomingId = initialNote?.id || 'new-note';
        
        // ✅ CRITICAL: If the ID has changed, we MUST perform a full state reset.
        // This prevents Note A's content from bleeding into Note B.
        if (incomingId !== activeIdRef.current) {
            console.log(`[EDITOR] Identity mismatch. Switching from ${activeIdRef.current} to ${incomingId}. Performing full reset.`);
            
            activeIdRef.current = incomingId;
            isDirtyRef.current = false;
            lastKeystrokeRef.current = 0; // Prevent false-positive "recently typed" conflict on mount

            const initTitle = initialNote?.title || '';
            let initContent = initialNote?.content || '';
            const initTags = initialNote?.tags || [];
            const initColor = initialNote?.color || 'default';
            const initShortId = initialNote?.shortId || '';

            setTitle(initTitle);
            setContent(initContent);
            setTags([...initTags]);
            setColor(initColor);
            setShortId(initShortId);
            setAttachments(initialNote?.attachments ? [...initialNote.attachments] : []);
            setReminder(initialNote?.reminder || '');
            
            const parsedHtml = window.parseMarkdown(initContent, collapsedLines, !showCompleted);
            setInitialHtml(parsedHtml);
            if (editorRef.current) editorRef.current.innerHTML = parsedHtml;

            // ✅ RESTORE HISTORY: Load from localStorage if available and fresh (< 24h)
            let restoredHistory = null;
            if (incomingId !== 'new-note') {
                const storedRaw = localStorage.getItem(`note_history_${incomingId}`);
                if (storedRaw) {
                    try {
                        const parsed = JSON.parse(storedRaw);
                        const twentyFourHoursAgo = Date.now() - 86400000;
                        restoredHistory = parsed.filter(state => state.timestamp > twentyFourHoursAgo);
                    } catch (e) { console.warn("Failed to parse stored history:", e); }
                }
            }

            const currentSnapshot = { title: initTitle, content: initContent, tags: [...initTags], color: initColor, html: parsedHtml, timestamp: Date.now() };

            if (restoredHistory && restoredHistory.length > 0) {
                // Check if latest history state is same as current to avoid duplication
                const last = restoredHistory[restoredHistory.length - 1];
                if (last.title === initTitle && last.content === initContent && last.color === initColor) {
                    setHistory(restoredHistory);
                    setHistoryIndex(restoredHistory.length - 1);
                } else {
                    const mergedHistory = [...restoredHistory, currentSnapshot];
                    if (mergedHistory.length > 50) mergedHistory.shift();
                    setHistory(mergedHistory);
                    setHistoryIndex(mergedHistory.length - 1);
                }
            } else {
                setHistory([currentSnapshot]);
                setHistoryIndex(0);
            }

            setHasConflict(false);
            setShowComparison(false);
            setLastSavedAt(initialNote?.updatedAt?.seconds || Date.now() / 1000);

            if (!initialNote?.id) {
                setTimeout(() => titleInputRef.current?.focus(), 0);
            }
            setTimeout(() => setIsReady(true), 50);
        } else {
            // ✅ BACKGROUND SYNC: The ID is the same, meaning this is a Firestore snapshot.
            // We ignore it to protect the user's active typing (fixes the "revert" bug).
            console.log(`[EDITOR] Ignoring background update for active note ${incomingId}`);
        }
    }, [isOpen, initialNote]);

    // Conflict Detection
    React.useEffect(() => {
        if (!isOpen || !liveNote || !initialNote?.id || hasConflict || !isReady) return;
        
        const liveTime = liveNote.updatedAt?.seconds || 0;
        const liveContent = liveNote.content || '';
        const liveTitle = liveNote.title || '';

        // Aggressive normalization for stable comparison
        const deepNormalize = (s) => {
            if (!s) return '';
            return s.toString()
                .normalize('NFKD') // Decompose characters
                .replace(/\u200B/g, '') // Zero width space
                .replace(/\u00A0/g, ' ') // Non-breaking space
                .replace(/\r\n/g, '\n') // CRLF to LF
                .split('\n')
                .map(line => line.trim()) // Trim every line
                .join('\n')
                .trim();
        };

        // Check for legacy migration match
        const isLegacyMatch = !liveContent && liveNote.checklistItems && liveNote.checklistItems.length > 0;
        let migrationMatches = false;
        if (isLegacyMatch) {
            const migrated = liveNote.checklistItems.map(item => {
                const prefix = '  '.repeat(item.indent || 0) + `- [${item.done ? 'x' : ' '}] `;
                return prefix + item.text;
            }).join('\n');
            migrationMatches = deepNormalize(migrated) === deepNormalize(content);
        }

        const contentChanged = !migrationMatches && (deepNormalize(liveContent) !== deepNormalize(content));
        const titleChanged = deepNormalize(liveTitle) !== deepNormalize(title);

        // SYNC GUARD: Ignore updates that are older than our current session's truth
        if (liveTime > 0 && liveTime <= lastSavedAt) {
            return; 
        }

        // Increase threshold to avoid race conditions with own saves
        if (liveTime > lastSavedAt + 2) { 
            // SAFESUARD: If focused, dirty, or recently typed, NEVER overwrite silently.
            const isFocused = editorRef.current?.contains(document.activeElement) || titleInputRef.current === document.activeElement;
            const isRecentlyTyped = Date.now() - lastKeystrokeRef.current < 10000;

            if (isDirtyRef.current || isFocused || isRecentlyTyped) {
                // If dirty OR focused, only warn if there's a genuine conflict (content changed remotely)
                if (contentChanged || titleChanged) {
                    console.group("Sync Conflict Detected");
                    console.warn("Server version has different content and local is active.");
                    console.log("Local Title:", `"${deepNormalize(title)}"`);
                    console.log("Server Title:", `"${deepNormalize(liveTitle)}"`);
                    console.log("Local Content:", `"${deepNormalize(content)}"`);
                    console.log("Server Content:", `"${deepNormalize(liveContent)}"`);
                    console.groupEnd();
                    setHasConflict(true);
                }
                // If content is same (e.g. just a timestamp update), we update lastSavedAt to acknowledge the remote state
                else {
                    setLastSavedAt(liveTime);
                }
            } else {
                // Not dirty and not focused, safe to update silently
                setLastSavedAt(liveTime);
                if (contentChanged) {
                    setContent(liveNote.content || '');
                    const parsedHtml = window.parseMarkdown(liveNote.content || '', collapsedLines, !showCompleted);
                    if (editorRef.current) editorRef.current.innerHTML = parsedHtml;
                }
                if (titleChanged) {
                    setTitle(liveNote.title || '');
                }
            }
        } else if (liveTime > 0 && !contentChanged && !titleChanged) {
            // Keep timestamps in sync even if within the threshold to prevent cumulative drift
            setLastSavedAt(liveTime);
        }
    }, [liveNote, lastSavedAt, isOpen, initialNote?.id, content, title, hasConflict, isReady, collapsedLines]);

    const handleOverwrite = () => {
        setHasConflict(false);
        setShowComparison(false);
        // Update our 'lastSavedAt' to now so we don't trigger again immediately
        setLastSavedAt(Date.now() / 1000);
        handleInternalSaveAndClose();
    };

    const handleRefresh = () => {
        if (!liveNote) return;
        setTitle(liveNote.title || '');
        setContent(liveNote.content || '');
        const parsedHtml = window.parseMarkdown(liveNote.content || '', collapsedLines, !showCompleted);
        if (editorRef.current) editorRef.current.innerHTML = parsedHtml;
        setTags(liveNote.tags || []);
        setAttachments(liveNote.attachments || []);
        setColor(liveNote.color || 'default');
        setHasConflict(false);
        setShowComparison(false);
        setLastSavedAt(liveNote.updatedAt?.seconds || Date.now() / 1000);
    };

    // Robust Caret Positioning: Ensures caret lands in an actual TextNode inside list item content
    const setCaretInContent = (contentEl, atStart = true) => {
        if (!contentEl) return;
        let textNode = null;
        for (let i = 0; i < contentEl.childNodes.length; i++) {
            const child = contentEl.childNodes[i];
            if (child.nodeType === 3) {
                textNode = child;
                if (atStart) break;
            }
        }
        if (!textNode) {
            textNode = document.createTextNode('');
            if (contentEl.firstChild) {
                contentEl.insertBefore(textNode, contentEl.firstChild);
            } else {
                contentEl.appendChild(textNode);
            }
        }
        const sel = window.getSelection();
        const r = document.createRange();
        const offset = atStart ? 0 : textNode.textContent.length;
        r.setStart(textNode, offset);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
    };

    // Enforce cursor position & track selections:
    // 1. Prevents cursor from landing on LI flex container or uneditable widgets (behind checkbox).
    // 2. Keeps selectionRef updated for link insertion so selection isn't lost on button click.
    React.useEffect(() => {
        if (!isOpen) return;

        const enforceSelection = () => {
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) return;

            // Track active text selections inside editor for link insertion
            if (editorRef.current && editorRef.current.contains(sel.anchorNode)) {
                if (!sel.isCollapsed) {
                    selectionRef.current = sel.getRangeAt(0).cloneRange();
                }
            }

            if (!sel.isCollapsed) return;

            const node = sel.anchorNode;
            const element = node.nodeType === 3 ? node.parentNode : node;

            const li = element.closest('.task-line, .bullet-line');
            if (li && editorRef.current?.contains(li)) {
                const content = li.querySelector('.task-content, .bullet-content');
                // If selection landed on the LI itself, handles, checkboxes, or outside text node
                if (content && (!content.contains(node) || node === content)) {
                    setCaretInContent(content, true);
                }
            }
        };

        document.addEventListener('selectionchange', enforceSelection);
        return () => document.removeEventListener('selectionchange', enforceSelection);
    }, [isOpen]);

    // Handle Content Updates (Debounced or on Blur/Save)
    const handleContentChange = () => {
        if (!editorRef.current) return;
        isDirtyRef.current = true;
        lastKeystrokeRef.current = Date.now();
        const markdown = parseHtmlToMarkdown(editorRef.current);
        setContent(markdown);

        // Push to history with debounce
        clearTimeout(window._historyDebounce);
        window._historyDebounce = setTimeout(() => {
            pushToHistory({ content: markdown });
        }, 500);
    };

    const hasCompletedItems = content.includes('- [x]');

    // --- Interaction Handlers ---

    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        isDirtyRef.current = true;
        lastKeystrokeRef.current = Date.now();
        setTitle(newTitle);
        pushToHistory({ title: newTitle });
    };

    const hoverTimerRef = React.useRef(null);
    const handleMouseMove = (e) => {
        const linkEl = e.target.closest('a');
        if (linkEl) {
            const href = linkEl.getAttribute('href');
            if (href && href.startsWith('internal://')) {
                if (hoverTimerRef.current) return; // Already scheduled or active
                
                hoverTimerRef.current = setTimeout(() => {
                    const targetId = href.replace('internal://', '');
                    const target = allNotes.find(n => n.shortId === targetId || n.id === targetId);
                    if (target) {
                        const rect = linkEl.getBoundingClientRect();
                        setHoveredPreview({
                            title: target.title || 'Untitled',
                            content: (target.content || '').substring(0, 150) + (target.content?.length > 150 ? '...' : ''),
                            x: rect.left,
                            y: rect.bottom + 5
                        });
                    }
                    hoverTimerRef.current = null;
                }, 400); // 400ms delay for stability
                return;
            }
        }
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
        if (hoveredPreview) setHoveredPreview(null);
    };

    React.useEffect(() => {
        if (!isOpen) setHoveredPreview(null);
    }, [isOpen]);

    const handleEditorClick = (e) => {
        // 0. List Toggle (Collapse/Expand)
        const toggleEl = e.target.closest('.list-toggle');
        if (toggleEl) {
            e.preventDefault();
            e.stopPropagation();
            window.toggleListCollapse(toggleEl);
            
            // Persist to context
            if (initialNote?.id && onToggleSection) {
                const li = toggleEl.closest('li');
                if (li) onToggleSection(initialNote.id, li.getAttribute('data-line-index'));
            }
            return;
        }

        // 0.5 Find generic 'li' for following logic
        const li = e.target.closest('li');

        // 1. Checkbox Toggle
        if (e.target.classList.contains('task-checkbox')) {
            e.preventDefault();
            e.stopPropagation();
            if (li && li.classList.contains('task-line')) {
                const currentState = li.getAttribute('data-checked') === 'true';
                const newState = !currentState;
                li.setAttribute('data-checked', newState);
                
                // Inherited completion for children
                const indent = parseInt(li.getAttribute('data-indent') || '0');
                let next = li.nextElementSibling;
                while (next && next.classList.contains('task-line')) {
                    const nextIndent = parseInt(next.getAttribute('data-indent') || '0');
                    if (nextIndent <= indent) break;
                    next.setAttribute('data-checked', newState);
                    next = next.nextElementSibling;
                }
                
                // Force re-render to apply sorting
                const currentMarkdown = parseHtmlToMarkdown(editorRef.current);
                const newHtml = window.parseMarkdown(currentMarkdown, collapsedLines, !showCompleted);

                // Preserve scroll
                const scrollParent = editorRef.current.closest('.overflow-y-auto') || editorRef.current.parentElement;
                const savedScroll = scrollParent ? scrollParent.scrollTop : 0;
                
                editorRef.current.innerHTML = newHtml;
                
                if (scrollParent) scrollParent.scrollTop = savedScroll;

                handleContentChange(); // Update state
            }
            return;
        }

        // 1.5 Delete Task / Bullet
        if (e.target.classList.contains('task-delete')) {
            e.preventDefault();
            e.stopPropagation();
            const li = e.target.closest('li');
            if (li) {
                li.remove();
                handleContentChange();
            }
            return;
        }

        // 2. Redirect focus if clicking list padding/handle
        if (!li) {
            lastFocusedRef.current = editorRef.current;
            return;
        }
        const isTask = li.classList.contains('task-line');
        const isBullet = li.classList.contains('bullet-line');
        const contentClass = isTask ? '.task-content' : '.bullet-content';

        if (li && !e.target.classList.contains(contentClass.substring(1)) && !e.target.closest(contentClass)) {
            const content = li.querySelector(contentClass);
            if (content) {
                setCaretInContent(content, false);
            }
        }

        // 3. Links
        const linkEl = e.target.closest('a');
        if (linkEl) {
            const href = linkEl.getAttribute('href');
            if (href) {
                if (href.startsWith('internal://')) {
                    e.preventDefault();
                    handleLinkClickInternal(href.replace('internal://', ''));
                    return;
                }
                const rect = linkEl.getBoundingClientRect();
                setActiveLink({ href, rect, node: linkEl, text: linkEl.textContent, isEditing: false });
                e.preventDefault();
            }
        } else {
            setActiveLink(null);
        }
        
        lastFocusedRef.current = editorRef.current;
    };

    const handleKeyDown = (e) => {
        // Track keystroke for sync lock
        lastKeystrokeRef.current = Date.now();

        const selection = window.getSelection();

        // Intercept Backspace/Delete to prevent checkbox/handle deletion when entire line is selected
        if ((e.key === 'Backspace' || e.key === 'Delete') && selection.rangeCount > 0 && !selection.isCollapsed) {
            const range = selection.getRangeAt(0);
            const startLi = range.startContainer.nodeType === 1 
                ? range.startContainer.closest('li') 
                : (range.startContainer.parentNode ? range.startContainer.parentNode.closest('li') : null);
            const endLi = range.endContainer.nodeType === 1 
                ? range.endContainer.closest('li') 
                : (range.endContainer.parentNode ? range.endContainer.parentNode.closest('li') : null);
            
            if (startLi && endLi && startLi === endLi) {
                const isTask = startLi.classList.contains('task-line');
                const isBullet = startLi.classList.contains('bullet-line');
                const contentEl = isTask ? startLi.querySelector('.task-content') : (isBullet ? startLi.querySelector('.bullet-content') : null);
                
                if (contentEl) {
                    const rangeStartsBefore = !contentEl.contains(range.startContainer) || (range.startContainer === contentEl && range.startOffset === 0);
                    const rangeEndsAfter = !contentEl.contains(range.endContainer);
                    
                    if (rangeStartsBefore || rangeEndsAfter) {
                        const newRange = document.createRange();
                        if (rangeStartsBefore) {
                            newRange.setStart(contentEl, 0);
                        } else {
                            newRange.setStart(range.startContainer, range.startOffset);
                        }
                        if (rangeEndsAfter) {
                            newRange.setEnd(contentEl, contentEl.childNodes.length);
                        } else {
                            newRange.setEnd(range.endContainer, range.endOffset);
                        }
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                    }
                }
            }
        }

        // Handle Undo/Redo - only if editor is focused
        const isEditorFocused = editorRef.current?.contains(document.activeElement);
        if (isEditorFocused && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            e.stopPropagation();
            handleUndo(e);
            return;
        }
        if (isEditorFocused && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            e.stopPropagation();
            handleRedo(e);
            return;
        }

        // Stop global undo when in editor (already handled by custom logic above)

        // Handle ::id replacement on Enter
        if (e.key === 'Enter') {
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                if (range.collapsed && range.endContainer.nodeType === 3) {
                    const node = range.endContainer;
                    const text = node.textContent.slice(0, range.endOffset);
                    const match = text.match(/::([a-z0-9]{4})$/);
                    if (match) {
                        const shortId = match[1];
                        const targetNote = allNotes.find(n => n.shortId === shortId);
                        if (targetNote) {
                            e.preventDefault();
                            const deleteRange = document.createRange();
                            deleteRange.setStart(node, range.endOffset - 6);
                            deleteRange.setEnd(node, range.endOffset);
                            deleteRange.deleteContents();
                            
                            const a = document.createElement('a');
                            a.href = `internal://${shortId}`;
                            a.textContent = `::${shortId}`;
                            a.className = "internal-link";
                            
                            const before = document.createTextNode('\u200B');
                            const after = document.createTextNode('\u200B');
                            deleteRange.insertNode(after);
                            deleteRange.insertNode(a);
                            deleteRange.insertNode(before);
                            
                            const newRange = document.createRange();
                            newRange.setStartAfter(a);
                            newRange.collapse(true);
                            selection.removeAllRanges();
                            selection.addRange(newRange);
                            
                            handleContentChange();
                            return;
                        }
                    }
                }
            }
        }

        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const li = range.commonAncestorContainer.nodeType === 1 
            ? range.commonAncestorContainer.closest('li') 
            : range.commonAncestorContainer.parentNode.closest('li');

        // Enter Key in List (Task or Bullet)
        if (e.key === 'Enter' && li) {
            e.preventDefault();
            const isTask = li.classList.contains('task-line');
            const isBullet = li.classList.contains('bullet-line');
            const contentEl = isTask ? li.querySelector('.task-content') : (isBullet ? li.querySelector('.bullet-content') : li);
            
            // Check if empty -> unindent or break list
            if (contentEl && contentEl.textContent.trim() === '') {
                const indent = parseInt(li.getAttribute('data-indent') || '0');
                if (indent > 0) {
                    li.setAttribute('data-indent', indent - 1);
                    li.style.marginLeft = `${(indent - 1) * (isTask ? 24 : 20)}px`;
                } else {
                    // Turn into paragraph
                    const p = document.createElement('div');
                    p.innerHTML = '<br>';
                    
                    const ul = li.parentNode;
                    const parent = ul.parentNode;
                    const nextRef = ul.nextSibling;
                    const nextLis = [];
                    let curr = li.nextSibling;
                    while(curr) { nextLis.push(curr); curr = curr.nextSibling; }
                    
                    parent.insertBefore(p, nextRef);
                    li.remove();
                    
                    if (nextLis.length > 0) {
                        const newUl = ul.cloneNode(false);
                        nextLis.forEach(n => newUl.appendChild(n));
                        parent.insertBefore(newUl, nextRef);
                    }
                    if (ul.children.length === 0) ul.remove();
                    
                    const r = document.createRange();
                    r.setStart(p, 0);
                    r.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(r);
                }
            } else {
                // Check if cursor is at the beginning
                const range = selection.getRangeAt(0);
                const preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(contentEl);
                preCaretRange.setEnd(range.endContainer, range.endOffset);
                const isAtStart = preCaretRange.toString().length === 0;

                // New Line
                const indent = li.getAttribute('data-indent');
                const groupId = li.getAttribute('data-group-id');
                const newLine = document.createElement('li');
                newLine.setAttribute('data-indent', indent);
                newLine.style.marginLeft = li.style.marginLeft;
                
                if (isTask) {
                    newLine.className = 'task-line';
                    newLine.setAttribute('data-checked', 'false');
                    if (groupId) newLine.setAttribute('data-group-id', groupId);
                    newLine.style.listStyle = 'none';
                    const gripIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>`;
                    newLine.innerHTML = `<span class="task-handle" contenteditable="false" title="Drag to reorder">${gripIcon}</span><span class="task-checkbox" contenteditable="false"></span><span class="task-content"><br></span>`;
                } else {
                    newLine.className = 'bullet-line';
                    const gripIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>`;
                    newLine.innerHTML = `<span class="task-handle" contenteditable="false" title="Drag to reorder">${gripIcon}</span><span class="bullet-content"><br></span><span class="task-delete" contenteditable="false" title="Delete Item">×</span>`;
                }
                
                if (isAtStart) {
                    li.parentNode.insertBefore(newLine, li);
                } else {
                    // Split content at cursor
                    const range = selection.getRangeAt(0);
                    const afterContent = range.cloneRange();
                    afterContent.selectNodeContents(contentEl);
                    afterContent.setStart(range.endContainer, range.endOffset);
                    const contentFragment = afterContent.extractContents();
                    
                    const target = isTask ? newLine.querySelector('.task-content') : newLine.querySelector('.bullet-content');
                    if (target) {
                        target.innerHTML = '';
                        target.appendChild(contentFragment);
                        // If empty, ensure <br> for focusability
                        if (target.innerHTML.trim() === '') target.innerHTML = '<br>';
                    }

                    if (li.nextSibling) {
                        li.parentNode.insertBefore(newLine, li.nextSibling);
                    } else {
                        li.parentNode.appendChild(newLine);
                    }
                }

                // Move cursor to new line inside the text content (never behind the checkbox)
                const target = isTask ? newLine.querySelector('.task-content') : newLine.querySelector('.bullet-content');
                if (target) {
                    setCaretInContent(target, true);
                }
            }
            handleContentChange();
            return;
        }

        // Backspace Key in List
        if (e.key === 'Backspace' && li) {
            const isTask = li.classList.contains('task-line');
            const isBullet = li.classList.contains('bullet-line');
            const contentEl = isTask ? li.querySelector('.task-content') : (isBullet ? li.querySelector('.bullet-content') : li);
            
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(contentEl);
            preCaretRange.setEnd(range.startContainer, range.startOffset);
            const isAtStart = preCaretRange.toString().length === 0;

            if (isAtStart) {
                e.preventDefault();
                const indent = parseInt(li.getAttribute('data-indent') || '0');
                if (indent > 0) {
                    // Unindent
                    const newIndent = indent - 1;
                    li.setAttribute('data-indent', newIndent);
                    li.style.marginLeft = `${newIndent * (isTask ? 24 : 20)}px`;
                } else {
                    // Turn into paragraph (effectively deleting the checkbox/handle)
                    const p = document.createElement('div');
                    while (contentEl.firstChild) p.appendChild(contentEl.firstChild);
                    if (p.innerHTML.trim() === '') p.innerHTML = '<br>';
                    
                    const ul = li.parentNode;
                    const parent = ul.parentNode;
                    const nextRef = ul.nextSibling;
                    const nextLis = [];
                    let curr = li.nextSibling;
                    while(curr) { nextLis.push(curr); curr = curr.nextSibling; }
                    
                    parent.insertBefore(p, nextRef);
                    li.remove();
                    
                    if (nextLis.length > 0) {
                        const newUl = ul.cloneNode(false);
                        nextLis.forEach(n => newUl.appendChild(n));
                        parent.insertBefore(newUl, nextRef);
                    }
                    if (ul.children.length === 0) ul.remove();

                    const r = document.createRange();
                    r.setStart(p, 0);
                    r.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(r);
                }
                handleContentChange();
                return;
            }
        }

        // Enter Key in Standard Bullet List (Auto-continue)
        if (e.key === 'Enter' && !li) {
            let block = selection.anchorNode;
            if (block.nodeType === 3) block = block.parentNode; // Get parent if TextNode
            if (block.tagName !== 'DIV') block = block.closest('div'); // Find wrapping DIV (lines are usually divs)
            
            if (block && editorRef.current.contains(block) && block !== editorRef.current) {
                const text = block.textContent;
                // Matches "- " or "  - " at start of line
                const match = text.match(/^(\s*)-\s/); 
                
                if (match) {
                    const prefix = match[0];
                    const content = text.slice(prefix.length).trim();
                    
                    if (content.length === 0) {
                        // Empty bullet -> Terminate list
                        e.preventDefault();
                        block.textContent = ''; // Clear line
                        // Optionally ensure it's a valid empty block
                        if (block.innerHTML === '') block.innerHTML = '<br>';
                    } else {
                        // Continue list
                        e.preventDefault();
                        const newLine = document.createElement('div');
                        newLine.textContent = prefix; 
                        
                        if (block.nextSibling) {
                            block.parentNode.insertBefore(newLine, block.nextSibling);
                        } else {
                            block.parentNode.appendChild(newLine);
                        }
                        
                        // Move cursor to end of new line
                        const range = document.createRange();
                        range.selectNodeContents(newLine);
                        range.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                    handleContentChange();
                    return;
                }
            }
        }

        // Tab Key (Indent/Unindent)
        if (e.key === 'Tab') {
            e.preventDefault();
            
            // Find all LIs intersecting the selection
            let selectedLis = [];
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                if (!selection.isCollapsed) {
                    const allLis = Array.from(editorRef.current.querySelectorAll('li:not(.task-line-phantom)'));
                    selectedLis = allLis.filter(node => {
                        try {
                            return range.intersectsNode(node);
                        } catch (err) {
                            return false;
                        }
                    });
                }
            }

            if (selectedLis.length > 0) {
                selectedLis.forEach(itemLi => {
                    const isTask = itemLi.classList.contains('task-line');
                    const currentIndent = parseInt(itemLi.getAttribute('data-indent') || '0');
                    const newIndent = e.shiftKey ? Math.max(0, currentIndent - 1) : Math.min(4, currentIndent + 1);
                    itemLi.setAttribute('data-indent', newIndent);
                    itemLi.style.marginLeft = `${newIndent * (isTask ? 24 : 20)}px`;
                });
                handleContentChange();
            } else if (li) {
                const isTask = li.classList.contains('task-line');
                const currentIndent = parseInt(li.getAttribute('data-indent') || '0');
                const newIndent = e.shiftKey ? Math.max(0, currentIndent - 1) : Math.min(4, currentIndent + 1);
                li.setAttribute('data-indent', newIndent);
                li.style.marginLeft = `${newIndent * (isTask ? 24 : 20)}px`;
                handleContentChange();
            } else {
                // Insert tab char for normal text
                document.execCommand('insertText', false, '\t');
            }
            return;
        }

        // Shortcuts
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); }
            if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); }
            if (e.key === 'k') { e.preventDefault(); onInsertLink(); }
        }
    };

    // --- Drag and Drop (Native DOM Manipulation) ---

    const handlePointerDown = (e) => {
        const handle = e.target.closest('.task-handle');
        if (!handle) return;
        
        e.preventDefault(); // Prevent text selection
        // Capture pointer for consistent tracking (especially on mobile)
        handle.setPointerCapture(e.pointerId);

        const li = handle.closest('li');
        if (!li) return;

        // Create Ghost Element
        const ghost = li.cloneNode(true);
        const rect = li.getBoundingClientRect();
        ghost.classList.add('task-ghost');
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.left = `${rect.left}px`;
        ghost.style.top = `${rect.top}px`;
        ghost.style.position = 'fixed';
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '1000';
        ghost.style.opacity = '0.9';
        ghost.style.transform = 'scale(1.02)';
        ghost.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
        // Reset styles that might cause offset
        ghost.style.margin = '0'; 
        ghost.style.marginLeft = '0px'; 
        ghost.removeAttribute('data-indent');

        document.body.appendChild(ghost);

        dragState.current = {
            active: true,
            node: li,
            ghost: ghost,
            startX: e.clientX,
            startY: e.clientY,
            initialLeft: rect.left,
            initialTop: rect.top,
            initialIndent: parseInt(li.getAttribute('data-indent') || '0'),
            nextSibling: li.nextSibling
        };

        li.classList.add('dragging');
        li.style.opacity = '0.3';
        document.body.style.cursor = 'grabbing';
        
        // Add global listeners
        document.addEventListener('pointermove', handleGlobalPointerMove);
        document.addEventListener('pointerup', handleGlobalPointerUp);
    };

    const handleGlobalPointerMove = (e) => {
        if (!dragState.current.active) return;
        e.preventDefault();

        const { ghost, startX, startY, initialLeft, initialTop, initialIndent } = dragState.current;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // Handle Indentation (Horizontal Drag) with Snap
        const steps = Math.round(dx / 24);
        const newIndent = Math.max(0, Math.min(initialIndent + steps, 5));
        
        // Calculate Snapped X Offset
        const snappedDx = (newIndent - initialIndent) * 24;

        // Move Ghost (Snapped X, Smooth Y)
        ghost.style.transform = `translate(${snappedDx}px, ${dy}px) scale(1.02)`;

        // Apply indent to the real node (placeholder)
        const currentIndent = parseInt(dragState.current.node.getAttribute('data-indent') || '0');
        if (currentIndent !== newIndent) {
            dragState.current.node.setAttribute('data-indent', newIndent);
            dragState.current.node.style.marginLeft = `${newIndent * 24}px`;
            if (navigator.vibrate) navigator.vibrate(10);
        }

        // Handle Reordering (Vertical Drag)
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const targetLi = elements.find(el => (el.classList.contains('task-line') || el.classList.contains('bullet-line')) && el !== dragState.current.node && !el.classList.contains('task-ghost'));
        const container = editorRef.current;
        
        if (targetLi && container.contains(targetLi)) {
            const rect = targetLi.getBoundingClientRect();
            const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
            
            if (next) {
                targetLi.parentNode.insertBefore(dragState.current.node, targetLi.nextSibling);
            } else {
                targetLi.parentNode.insertBefore(dragState.current.node, targetLi);
            }
        }
    };

    const handleGlobalPointerUp = () => {
        if (dragState.current.active) {
            if (dragState.current.ghost) {
                dragState.current.ghost.remove();
            }
            if (dragState.current.node) {
                dragState.current.node.classList.remove('dragging');
                dragState.current.node.style.opacity = '';
                handleContentChange(); // Save new order/indent
            }
            document.body.style.cursor = '';
        }
        dragState.current = { active: false, node: null, ghost: null };
        document.removeEventListener('pointermove', handleGlobalPointerMove);
        document.removeEventListener('pointerup', handleGlobalPointerUp);
    };

    // --- Link Insertion ---
    const saveSelection = () => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
            selectionRef.current = selection.getRangeAt(0).cloneRange();
        }
    };
    const restoreSelection = () => {
        if (selectionRef.current) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(selectionRef.current);
        }
    };
    
    const onInsertLink = () => {
        let range = null;
        const selection = window.getSelection();

        // 1. Check current live selection inside editor
        if (selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
            const curRange = selection.getRangeAt(0);
            if (!curRange.collapsed) {
                range = curRange.cloneRange();
            }
        }

        // 2. If current selection collapsed or blurred to toolbar, check cached selectionRef
        if (!range && selectionRef.current && !selectionRef.current.collapsed) {
            if (editorRef.current?.contains(selectionRef.current.commonAncestorContainer)) {
                range = selectionRef.current.cloneRange();
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }

        // 3. Fallback to collapsed caret position inside editor
        if (!range && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
            range = selection.getRangeAt(0);
        }

        if (!range || !editorRef.current?.contains(range.commonAncestorContainer)) return;

        let node = range.startContainer;
        if (node?.nodeType === 3) node = node.parentNode;
        const linkEl = node?.closest('a');
        let existingUrl = linkEl ? linkEl.getAttribute('href') : "https://";

        const linkId = 'pending-link-' + Date.now();
        const span = document.createElement('span');
        span.id = linkId;

        // Wrap logic
        if (linkEl) {
            const newRange = document.createRange();
            newRange.selectNode(linkEl);
            selection.removeAllRanges();
            selection.addRange(newRange);
            newRange.surroundContents(span);
        } else {
            try {
                range.surroundContents(span);
            } catch (e) {
                const content = range.extractContents();
                span.appendChild(content);
                range.insertNode(span);
            }
        }

        // Capture highlighted text for reliable retrieval when modal returns
        const capturedText = span.textContent || "";
        span.setAttribute('data-selected-text', capturedText);

        handleContentChange(); // Persist the span marker

        setPromptModal({
            isOpen: true,
            title: "Insert Link",
            placeholder: "https://example.com or ::noteId",
            defaultValue: existingUrl,
            onSubmit: (url) => {
                const spanInDom = editorRef.current?.querySelector(`span[id="${linkId}"]`);
                if (!spanInDom) return; 

                if (url) {
                    let finalUrl = url.trim();
                    let isInternal = false;

                    // Handle ::id or raw id for internal links
                    if (finalUrl.match(/^::[a-z0-9]{4,}$/i)) {
                        finalUrl = `internal://${finalUrl.substring(2)}`;
                        isInternal = true;
                    } else if (finalUrl.match(/^[a-z0-9]{4,}$/i) && !finalUrl.includes(':') && !finalUrl.includes('.')) {
                        // Check if it's a known shortId
                        const exists = allNotes.some(n => n.shortId === finalUrl);
                        if (exists) {
                            finalUrl = `internal://${finalUrl}`;
                            isInternal = true;
                        }
                    } else if (finalUrl.startsWith('internal://')) {
                        isInternal = true;
                    }

                    const originalText = spanInDom.getAttribute('data-selected-text') || spanInDom.textContent || "";
                    if (!linkEl && originalText.trim() === '') {
                        const pendingLinkId = `pending-insert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                        spanInDom.outerHTML = `\u200B<a href="${finalUrl}" class="${isInternal ? 'internal-link' : ''}" data-pending-link="${pendingLinkId}">${url}</a>\u200B`;
                        if (finalUrl.startsWith('http')) {
                            window.fetchTitle(finalUrl).then(title => {
                                if (title && editorRef.current) {
                                    const a = editorRef.current.querySelector(`a[data-pending-link="${pendingLinkId}"]`);
                                    if (a) {
                                        a.textContent = title;
                                        a.removeAttribute('data-pending-link');
                                        handleContentChange();
                                    }
                                }
                            }).catch(console.error);
                        }
                    } else {
                        // Text WAS highlighted: Preserve highlighted text as anchor text!
                        const finalText = originalText || url;
                        spanInDom.outerHTML = `\u200B<a href="${finalUrl}" class="${isInternal ? 'internal-link' : ''}">${finalText}</a>\u200B`;
                    }
                } else {
                    spanInDom.outerHTML = spanInDom.innerHTML;
                }
                selectionRef.current = null;
                handleContentChange();
            }
        });
    };

    const onInsertBulletList = () => {
        let selection = window.getSelection();
        if (!selection.rangeCount || !editorRef.current.contains(selection.anchorNode)) {
            editorRef.current.focus();
            const range = document.createRange();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        selection = window.getSelection();
        let block = selection.anchorNode;
        if (block.nodeType === 3) block = block.parentNode;
        
        // If inside editor
        if (!editorRef.current.contains(block)) return;

        // Check if inside list
        const li = block.closest('li');
        if (li) {
            // If already a list item, maybe un-list it?
            // For now, simple toggle off if it's a bullet list
            if (li.classList.contains('bullet-line')) {
                 const p = document.createElement('div');
                 while (li.firstChild) p.appendChild(li.firstChild);
                 if (p.innerHTML.trim() === '') p.innerHTML = '<br>';
                 
                 const ul = li.parentNode;
                 const parent = ul.parentNode;
                 const nextRef = ul.nextSibling;
                 const nextLis = [];
                 let curr = li.nextSibling;
                 while(curr) { nextLis.push(curr); curr = curr.nextSibling; }

                 parent.insertBefore(p, nextRef);
                 li.remove();
                 
                 if (nextLis.length > 0) {
                     const newUl = ul.cloneNode(false);
                     nextLis.forEach(n => newUl.appendChild(n));
                     parent.insertBefore(newUl, nextRef);
                 }
                 if (ul.children.length === 0) ul.remove();
                 
                 const r = document.createRange();
                 r.setStart(p, 0);
                 r.collapse(true);
                 selection.removeAllRanges();
                 selection.addRange(r);
                 handleContentChange();
            }
            return; 
        }

        // Use execCommand for robust list creation (handles text nodes, divs, etc.)
        document.execCommand('insertUnorderedList');
        
        // Apply custom classes/styles to the new list
        const newSelection = window.getSelection();
        if (newSelection.rangeCount && editorRef.current.contains(newSelection.anchorNode)) {
            const anchor = newSelection.anchorNode;
            // anchor might be the text node inside li, or the li itself
            const newLi = anchor.nodeType === 3 ? anchor.parentNode.closest('li') : anchor.closest('li');
            
            if (newLi) {
                newLi.classList.add('bullet-line');
                newLi.style.marginLeft = '0px'; 
                newLi.setAttribute('data-indent', '0');
                
                const gripIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>`;
                
                // Wrap content and add handle
                const content = newLi.innerHTML;
                newLi.innerHTML = `<span class="task-handle" contenteditable="false" title="Drag to reorder">${gripIcon}</span><span class="bullet-content">${content}</span><span class="task-delete" contenteditable="false" title="Delete Item">×</span>`;
                
                // Move cursor to .bullet-content
                const bulletContent = newLi.querySelector('.bullet-content');
                if (bulletContent) {
                    setCaretInContent(bulletContent, false);
                }

                const ul = newLi.closest('ul');
                if (ul) {
                    ul.classList.add('bullet-list');
                    ul.style.listStyleType = 'disc';
                    ul.style.paddingLeft = '20px';
                }
            }
        }
        
        handleContentChange();
    };

    const onInsertChecklist = () => {
        const selection = window.getSelection();
        if (!selection.rangeCount || !editorRef.current.contains(selection.anchorNode)) {
            editorRef.current.focus();
        }

        const range = selection.getRangeAt(0);
        let li = range.commonAncestorContainer.nodeType === 1 
            ? range.commonAncestorContainer.closest('li') 
            : range.commonAncestorContainer.parentNode.closest('li');

        const gripIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>`;

        if (li) {
            // Already in a list. If not a task-line, convert it.
            if (!li.classList.contains('task-line')) {
                const content = li.querySelector('.bullet-content') || li;
                const inner = content.innerHTML;
                li.className = 'task-line';
                li.setAttribute('data-checked', 'false');
                li.style.listStyle = 'none';
                li.innerHTML = `<span class="task-handle" contenteditable="false" title="Drag to reorder">${gripIcon}</span><span class="task-checkbox" contenteditable="false"></span><span class="task-content">${inner}</span>`;
                
                const ul = li.closest('ul');
                if (ul) {
                    ul.className = 'task-list';
                    ul.style.paddingLeft = '0';
                }
                
                const newContent = li.querySelector('.task-content');
                if (newContent) {
                    setCaretInContent(newContent, false);
                }
            }
        } else {
            // Not in a list. Use execCommand to create a standard list, then convert the current item.
            document.execCommand('insertUnorderedList');
            const newLi = selection.anchorNode.nodeType === 3 ? selection.anchorNode.parentNode.closest('li') : selection.anchorNode.closest('li');
            if (newLi) {
                const inner = newLi.innerHTML;
                newLi.className = 'task-line';
                newLi.setAttribute('data-checked', 'false');
                newLi.setAttribute('data-indent', '0');
                newLi.style.listStyle = 'none';
                newLi.innerHTML = `<span class="task-handle" contenteditable="false" title="Drag to reorder">${gripIcon}</span><span class="task-checkbox" contenteditable="false"></span><span class="task-content">${inner}</span>`;
                
                const ul = newLi.closest('ul');
                if (ul) {
                    ul.className = 'task-list';
                    ul.style.paddingLeft = '0';
                }

                const newContent = newLi.querySelector('.task-content');
                if (newContent) {
                    setCaretInContent(newContent, false);
                }
            }
        }
        handleContentChange();
    };

    // --- Standard Actions ---
    const handleExtractText = async (url) => {
        const text = await extractTextFromImage(url);
        if (text) {
            // Append to content
            const latestContent = editorRef.current ? parseHtmlToMarkdown(editorRef.current) : content;
            const newContent = `${latestContent}\n\n--- Extracted from Image ---\n${text}`;
            setContent(newContent);
            setInitialHtml(parseMarkdown(newContent)); // Trigger re-render of HTML
            if (setToast) setToast({ message: 'Text extracted!', type: 'success' });
        } else {
            if (setToast) setToast({ message: 'No text found or OCR failed.', type: 'error' });
        }
    };

    const handleSaveInternal = (shouldClose = true) => {
        // ✅ ATOMIC DATA CAPTURE: Take a snapshot of everything we want to save right now.
        const latestContent = editorRef.current ? parseHtmlToMarkdown(editorRef.current) : content;

        const noteToSave = {
            ...initialNote,
            title: title.trim(),
            content: latestContent,
            tags: [...tags], // Clone array
            color,
            isList,
            shortId,
            attachments: [...attachments], // Clone array
            reminder,
            updatedAt: initialNote.updatedAt // Keep original for context
        };

        setLastSavedAt(Date.now() / 1000);
        onSave(noteToSave);
        if (shouldClose) onClose();
    };

    const handleInternalSaveAndClose = () => { 
        if (hasConflict) {
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
            return; 
        }
        handleSaveInternal(false); // Commit data immediately
        setIsClosing(true); 
        setTimeout(() => { onClose(); setIsClosing(false); }, 200); 
    };

    const handleBackInternal = () => {
        handleSaveInternal(false);
        if (onBack) onBack();
    };

    const handleLinkClickInternal = (tid) => {
        handleSaveInternal(false);
        if (onInternalLinkClick) onInternalLinkClick(tid);
    };
    
    // Toggle between list view and text view (Just cosmetic/helper now)
    const handleTextToList = () => {
        setIsList(!isList);
    };

    const handleSuggestTags = async () => {
        setIsSuggesting(true);
        const text = `${title} ${content}`.toLowerCase();
        
        // 1. Local string matching (Fast)
        const localMatches = allTags.filter(t => !tags.includes(t) && text.includes(t.toLowerCase())).map(t => ({ label: t, source: 'existing' }));
        
        // 2. AI Suggestions (Smart)
        let aiMatches = [];
        if (isAutoTaggingEnabled) {
            try {
                const suggested = await suggestTags(`${title}\n${content}`, allTags);
                aiMatches = suggested
                    .filter(t => !tags.includes(t.toLowerCase()))
                    .map(t => ({ label: t.toLowerCase(), source: 'ai' }));
            } catch (e) { console.error("Auto-tagging error:", e); }
        }

        // Merge and deduplicate
        const merged = [...localMatches];
        aiMatches.forEach(ai => {
            if (!merged.some(m => m.label === ai.label)) merged.push(ai);
        });

        setSuggestions(merged);
        setIsSuggesting(false);
    };

    const uploadFileToStorage = async (file) => {
        if (!user) return null;
        const filename = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `users/${user.uid}/${filename}`);
        try {
            const snapshot = await uploadBytes(storageRef, file);
            return await getDownloadURL(snapshot.ref);
        } catch (error) { console.error("Upload failed", error); return null; }
    };

    const recognitionRef = React.useRef(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            
            // Live Transcription (Phase 4)
            if (window.webkitSpeechRecognition || window.SpeechRecognition) {
                const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';
                
                recognition.onresult = (event) => {
                    let interimTranscript = '';
                    let finalTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }
                    if (finalTranscript) {
                        const latestContent = editorRef.current ? parseHtmlToMarkdown(editorRef.current) : content;
                        const newContent = `${latestContent} ${finalTranscript}`;
                        setContent(newContent);
                        setInitialHtml(parseMarkdown(newContent));
                    }
                };
                recognition.start();
                recognitionRef.current = recognition;
            }

            mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `recording_${Date.now()}.webm`, { type: 'audio/webm' });
                const downloadURL = await uploadFileToStorage(audioFile);
                if (downloadURL) setAttachments(prev => [...prev, { type: 'audio', url: downloadURL }]);
                stream.getTracks().forEach(track => track.stop());
                if (recognitionRef.current) recognitionRef.current.stop();
            };
            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) { console.error("Mic error", err); }
    };
    const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); } };

    const fetchPageTitle = async (url) => {
        return await window.fetchTitle(url);
    };

    const colorTheme = NOTE_COLORS[color] || NOTE_COLORS.default;

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-backdrop" onClick={handleInternalSaveAndClose} />
            <div className={`relative w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-modal-entry transition-all duration-300 ${isClosing ? 'scale-95 opacity-0' : 'scale-100'}`}>
                <style>{`
                    .task-delete {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 20px;
                        height: 20px;
                        margin-left: 8px;
                        color: #ccc;
                        cursor: pointer;
                        font-weight: bold;
                        border-radius: 50%;
                        opacity: 0;
                        transition: all 0.2s;
                    }
                    .task-line:hover .task-delete {
                        opacity: 1;
                    }
                    @media (hover: none) {
                        .task-delete {
                            opacity: 0.5;
                        }
                    }
                    .task-delete:hover {
                        background-color: #fee2e2;
                        color: #ef4444;
                        opacity: 1;
                    }
                `}</style>
                <div className={`absolute inset-0 ${colorTheme.bg}`} style={{ filter: `saturate(${saturation}) brightness(${cardBrightness})` }} />
                <div className={`absolute inset-0 rounded-2xl border-2 pointer-events-none z-20 ${colorTheme.border}`} style={{ filter: `brightness(${borderBrightness})` }} />

                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100/50 dark:border-gray-700/50 bg-white/30 dark:bg-black/10 relative z-10">
                    <div className="flex items-center gap-1">
                        {canGoBack && <button onClick={handleBackInternal} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-gray-600 dark:text-gray-400" title="Go Back"><Icons.ArrowLeft size={20} /></button>}
                        <button onClick={handleInternalSaveAndClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-gray-600 dark:text-gray-400" title="Close Without Saving (If no changes were made)"><Icons.X size={20} /></button>
                    </div>
                    <div className="flex items-center gap-3">
                         {shortId && <div className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded cursor-pointer" onClick={() => { navigator.clipboard.writeText(`::${shortId}`); if(setToast) setToast({ message: 'ID copied!', type: 'success' }); }}>::{shortId}</div>}
                         <button onClick={handleInternalSaveAndClose} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white text-xs font-bold uppercase rounded-lg shadow-md shadow-slate-900/10 transition-all flex items-center gap-2">
                             <Icons.Check size={14} />
                             <span>Done</span>
                         </button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                    {hasConflict && (
                        <div className="sticky top-0 z-[70] bg-red-500 text-white p-3 mx-6 mt-4 rounded-lg flex flex-col sm:flex-row items-center justify-between shadow-2xl animate-pulse-red gap-2 border-2 border-white/20">
                            <div className="flex items-center gap-2">
                                <Icons.AlertTriangle size={20} />
                                <span className="text-sm font-bold uppercase tracking-tight">Sync Conflict!</span>
                            </div>
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                <button onClick={() => setShowComparison(!showComparison)} className="flex-1 sm:flex-none px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-[10px] font-bold uppercase transition-colors whitespace-nowrap">
                                    {showComparison ? 'Hide Comparison' : 'Compare'}
                                </button>
                                <button onClick={handleRefresh} className="flex-1 sm:flex-none px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-[10px] font-bold uppercase transition-colors whitespace-nowrap">Load Remote</button>
                                <button onClick={handleOverwrite} className="flex-1 sm:flex-none px-3 py-1 bg-white text-red-600 hover:bg-gray-100 rounded text-[10px] font-bold uppercase transition-colors whitespace-nowrap">Overwrite</button>
                                <button onClick={() => { setHasConflict(false); onClose(); }} className="flex-1 sm:flex-none px-3 py-1 border border-white/40 hover:bg-white/10 rounded text-[10px] font-bold uppercase transition-colors whitespace-nowrap">Discard & Close</button>
                            </div>
                        </div>
                    )}

                    <div className={`flex-1 flex flex-col md:flex-row overflow-hidden ${showComparison ? 'p-6 gap-6' : ''}`}>
                        {/* LOCAL VERSION (Current Editor) */}
                        <div className={`flex-1 flex flex-col overflow-y-auto custom-scrollbar ${showComparison ? 'bg-white/40 dark:bg-black/10 p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50' : 'p-6 space-y-4'}`}>
                            {showComparison && <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Local Changes (Editable)</div>}
                            
                            {attachments.length > 0 && (
                                <div className="flex flex-col gap-2 mb-2">
                                    {attachments.map((att, idx) => (
                                        <div key={idx} className="relative group w-full">
                                            {att.type === 'image' && (
                                                <div className="relative">
                                                    <img src={att.url} alt="att" className="h-40 w-full object-cover rounded-lg border border-gray-200 dark:border-gray-600" />
                                                    {window.useSmart().isOcrEnabled && (
                                                        <button 
                                                            onClick={() => handleExtractText(att.url)}
                                                            className="absolute bottom-2 right-2 px-2 py-1 bg-white/80 dark:bg-black/80 hover:bg-white dark:hover:bg-black text-[10px] font-bold uppercase rounded border border-gray-200 dark:border-gray-700 transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1 shadow-sm"
                                                            disabled={isOcrProcessing}
                                                        >
                                                            {isOcrProcessing ? <Icons.RefreshCw size={10} className="animate-spin" /> : <Icons.Zap size={10} />}
                                                            {isOcrProcessing ? 'Extracting...' : 'Extract Text'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {att.type === 'audio' && <div className="h-12 px-4 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center gap-3 border border-gray-200 dark:border-gray-600"><Icons.Play size={20} className="text-gray-500" /><span className="text-sm">Audio Clip</span></div>}
                                            {att.type === 'link' && (
                                                <div className="flex bg-white/50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                                                    {att.image && <img src={att.image} className="w-24 h-24 object-cover" />}
                                                    <div className="p-2 flex-1 min-w-0">
                                                        <div className="font-semibold text-sm truncate text-slate-600 dark:text-slate-400">{att.title}</div>
                                                        <div className="text-[10px] text-gray-400 mt-1 truncate">{att.url}</div>
                                                    </div>
                                                </div>
                                            )}
                                            <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm"><Icons.X size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <input type="text" data-lpignore="true" autoComplete="off" placeholder="Title" value={title} onChange={handleTitleChange} ref={titleInputRef} onKeyDown={(e) => { if(e.key==='Enter') editorRef.current?.focus(); }} className="w-full text-xl font-bold placeholder-gray-400 dark:placeholder-gray-500 border-none outline-none bg-transparent dark:text-white relative z-10" />

                            <div 
                                ref={editorRef}
                                contentEditable
                                data-lpignore="true"
                                className={`editor-container ${!showCompleted ? 'hide-completed' : ''}`}
                                style={{
                                    '--checklist-padding': `${checklistPadding}px`,
                                    '--bullet-padding': `${bulletPadding}px`,
                                    whiteSpace: textWrap ? 'pre-wrap' : 'pre'
                                }}
                                onInput={handleContentChange}
                                onKeyDown={handleKeyDown}
                                onMouseMove={handleMouseMove}
                                onClick={handleEditorClick}
                                onPointerDown={handlePointerDown}
                                onPaste={(e) => {
                                    const text = e.clipboardData.getData('text');

                                    // 1. Handle Internal Note IDs (Mixed text support)
                                    // Regex finds ::abcd or internal://abcd anywhere in the string
                                    const internalRegex = /(?:::|internal:\/\/)([a-z0-9]{4,})/gi;
                                    if (internalRegex.test(text)) {
                                        e.preventDefault();
                                        let htmlResult = text
                                            .replace(/&/g, '&amp;')
                                            .replace(/</g, '&lt;')
                                            .replace(/>/g, '&gt;')
                                            .replace(/\n/g, '<br>');

                                         // Replace all occurrences with ::id links
                                         htmlResult = htmlResult.replace(internalRegex, (match, id) => {
                                             const lowerId = id.toLowerCase();
                                             const targetNote = allNotes.find(n => (n.shortId && n.shortId.toLowerCase() === lowerId) || n.id === id);
                                             if (targetNote) {
                                                 const resolvedId = targetNote.shortId || lowerId;
                                                 return `\u200B<a href="internal://${resolvedId}" class="internal-link">::${resolvedId}</a>\u200B`;
                                             }
                                             return match;
                                         });

                                         document.execCommand('insertHTML', false, htmlResult);
                                         handleContentChange();
                                         return;
                                     }

                                     // 2. Handle single HTTP/HTTPS URL for title fetching
                                     if (/^(https?:\/\/[^\s]+)$/.test(text)) {
                                         e.preventDefault();
                                         const pendingLinkId = `pending-paste-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                                         document.execCommand('insertHTML', false, `\u200B<a href="${text}" data-pending-link="${pendingLinkId}">${text}</a>\u200B`);
                                         handleContentChange();
                                         
                                         // Attempt to fetch and update title
                                         window.fetchTitle(text).then(title => {
                                             if (title && editorRef.current) {
                                                 const a = editorRef.current.querySelector(`a[data-pending-link="${pendingLinkId}"]`);
                                                 if (a) {
                                                     a.textContent = title;
                                                     a.removeAttribute('data-pending-link');
                                                     handleContentChange();
                                                 }
                                             }
                                         }).catch(console.error);
                                     }
                                }}
                                dangerouslySetInnerHTML={{ __html: initialHtml }}
                                suppressContentEditableWarning={true}
                            />
                        </div>

                        {/* REMOTE VERSION (Read-only) */}
                        {showComparison && liveNote && (
                            <>
                                <div className="w-px bg-gray-200 dark:bg-gray-700 hidden md:block self-stretch"></div>
                                <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-black/5 dark:bg-black/20 p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Remote Server Version</span>
                                        <span className="text-[10px] text-gray-400">{liveNote.updatedAt?.seconds ? new Date(liveNote.updatedAt.seconds * 1000).toLocaleString() : 'Just now'}</span>
                                    </div>

                                    {liveNote.attachments && liveNote.attachments.length > 0 && (
                                        <div className="flex flex-col gap-2 opacity-70">
                                            {liveNote.attachments.map((att, idx) => (
                                                <div key={idx} className="relative w-full">
                                                    {att.type === 'image' && <img src={att.url} alt="att" className="h-32 w-full object-cover rounded-lg" />}
                                                    {att.type === 'link' && (
                                                        <div className="flex bg-white/30 dark:bg-black/10 rounded-lg border border-gray-200/30 overflow-hidden text-xs">
                                                            {att.image && <img src={att.image} className="w-16 h-16 object-cover" />}
                                                            <div className="p-2 flex-1 min-w-0">
                                                                <div className="font-semibold truncate">{att.title}</div>
                                                                <div className="opacity-50 truncate">{att.url}</div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{liveNote.title?.trim() || 'Untitled'}</h3>
                                    
                                    <div 
                                        className="editor-container prose dark:prose-invert opacity-100"
                                        dangerouslySetInnerHTML={{ __html: window.parseMarkdown(liveNote.content || '') }}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="p-3 border-t border-gray-100/50 dark:border-gray-700/50 bg-white/30 dark:bg-black/10 relative z-10 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => setShowColorPicker(!showColorPicker)} className="p-2 text-gray-500 hover:bg-black/5 dark:hover:bg-white/10 rounded-full" title="Color"><Icons.Palette size={18} /></button>
                        {showColorPicker && <div className="absolute bottom-full left-0 mb-2 z-50"><ColorPicker selectedColor={color} onSelect={(c) => { setColor(c); setShowColorPicker(false); }} /></div>}
                        
                        <div className="relative">
                            <button onClick={() => setShowShareMenu(!showShareMenu)} className={`p-2 rounded-full transition-colors ${showShareMenu ? 'text-purple-600 bg-black/5 dark:bg-white/10' : 'text-gray-500 hover:text-purple-600 hover:bg-black/5 dark:hover:bg-white/10'}`} title="Share Options"><Icons.Share size={18} /></button>
                            {showShareMenu && (
                                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 animate-fade-in">
                                    <button onClick={() => { onOpenShare({ ...initialNote, title, content, tags }); setShowShareMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"><Icons.UserPlus size={14} /> Share with User</button>
                                    <button onClick={() => { onEmail({ ...initialNote, title, content, tags }); setShowShareMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"><Icons.Mail size={14} /> Send via Email</button>
                                    <button onClick={() => { onSMS({ ...initialNote, title, content, tags }); setShowShareMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"><Icons.Message size={14} /> Send via SMS</button>
                                    <button onClick={() => { onDoc({ ...initialNote, title, content, tags }); setShowShareMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"><Icons.Doc size={14} /> Download for Docs</button>
                                    <button onClick={() => { onDriveSave({ ...initialNote, title, content, tags }); setShowShareMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"><Icons.Upload size={14} /> Save to Drive</button>
                                </div>
                            )}
                        </div>

                        <button onClick={() => setShowReminderInput(!showReminderInput)} className={`p-2 rounded-full transition-colors ${reminder ? 'bg-yellow-100 text-yellow-600' : 'text-gray-500 hover:bg-black/5 dark:hover:bg-white/10'}`} title="Set Reminder"><Icons.Bell size={18} /></button>
                        {showReminderInput && (
                            <div className="absolute bottom-full left-0 mb-2 z-50 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col gap-2 min-w-[250px] animate-fade-in">
                                <input type="datetime-local" value={reminder} onChange={(e) => setReminder(e.target.value)} className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:text-white outline-none focus:border-slate-500 transition-colors" />
                            </div>
                        )}
                        
                        <button onMouseDown={(e) => e.preventDefault()} onClick={onInsertChecklist} className="p-2 text-gray-500 hover:bg-black/5 rounded-full" title="Checklist"><Icons.CheckSquare size={18} /></button>

                        {hasCompletedItems && (
                            <button 
                                onClick={() => setShowCompleted(!showCompleted)} 
                                className={`p-2 rounded-full transition-colors ${!showCompleted ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : 'text-gray-500 hover:bg-black/5'}`} 
                                title={showCompleted ? "Hide Completed" : "Show Completed"}
                            >
                                {showCompleted ? <Icons.Eye size={18} /> : <Icons.EyeOff size={18} />}
                            </button>
                        )}
                        
                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
                        <button onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('bold')} className="p-2 text-gray-500 hover:bg-black/5 rounded-full font-bold" title="Bold">B</button>
                        <button onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('italic')} className="p-2 text-gray-500 hover:bg-black/5 rounded-full italic" title="Italic">I</button>
                        <button onMouseDown={(e) => e.preventDefault()} onClick={onInsertLink} className="p-2 text-gray-500 hover:bg-black/5 rounded-full" title="Insert Link"><Icons.Link size={18} /></button>
                        <button onMouseDown={(e) => e.preventDefault()} onClick={onInsertBulletList} className="p-2 text-gray-500 hover:bg-black/5 rounded-full" title="Bullet List"><Icons.List size={18} /></button>
                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                        <button onClick={() => fileInputRef.current.click()} className="p-2 text-gray-500 hover:bg-black/5 rounded-full" title="Upload Image"><Icons.Upload size={18} /></button>
                        <input type="file" ref={fileInputRef} onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                                const downloadURL = await uploadFileToStorage(file);
                                if (downloadURL) setAttachments(prev => [...prev, { type: 'image', url: downloadURL }]);
                            }
                        }} accept="image/*" className="hidden" />
                        
                        <button onClick={() => setIsDrawingModalOpen(true)} className="p-2 text-gray-500 hover:bg-black/5 rounded-full" title="Sketch"><Icons.Pen size={18} /></button>
                        <button onClick={isRecording ? stopRecording : startRecording} className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse-red' : 'text-gray-500 hover:bg-black/5'}`} title={isRecording ? "Stop Recording" : "Record Voice Memo"}>{isRecording ? <Icons.MicOff size={18} /> : <Icons.Mic size={18} />}</button>
                        
                        {initialNote?.id && (
                            <>
                                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
                                <button onClick={() => { if(onArchive) { onArchive(initialNote); onClose(); } }} className="p-2 text-gray-500 hover:bg-black/5 rounded-full" title={initialNote.isArchived ? "Unarchive" : "Archive"}><Icons.Archive size={18} /></button>
                                <button onClick={() => { if(onDelete) { onDelete(initialNote.id); onClose(); } }} className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-full" title="Delete"><Icons.Trash size={18} /></button>
                            </>
                        )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 items-center relative">
                        {tags.map(tag => <TagChip key={tag} label={tag} onRemove={(t) => setTags(tags.filter(x => x !== t))} color="blue" />)}
                        <div className="relative">
                            <input 
                                type="text" 
                                data-lpignore="true" 
                                autoComplete="off" 
                                placeholder="Add tag..." 
                                value={tagInput} 
                                onChange={(e) => setTagInput(e.target.value)} 
                                onKeyDown={(e) => { 
                                    if(e.key==='Enter') { 
                                        if(tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
                                            setTags([...tags, tagInput.trim().toLowerCase()]); 
                                        }
                                        setTagInput(''); 
                                    } 
                                }} 
                                className="pl-3 pr-3 py-1 bg-white/50 dark:bg-black/20 dark:text-white rounded-full text-sm outline-none border border-transparent focus:border-slate-500 transition-all w-32 focus:w-48 placeholder-gray-400" 
                            />
                            {/* Autocomplete Dropdown */}
                            {tagInput.trim() && (
                                <div className="absolute bottom-full left-0 mb-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 max-h-48 overflow-y-auto z-50">
                                    {allTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t)).map(t => (
                                        <button 
                                            key={t}
                                            onClick={() => {
                                                setTags([...tags, t]);
                                                setTagInput('');
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            #{t}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={handleSuggestTags} disabled={isSuggesting} className={`p-1.5 rounded-full transition-all ${isSuggesting ? 'bg-yellow-100 text-yellow-600 animate-pulse' : 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'}`} title="Suggest Tags"><Icons.Zap size={16} /></button>
                    </div>

                    {suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 items-center animate-fade-in p-2 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                            <span className="text-xs font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-wider mr-1">Suggestions:</span>
                            {suggestions.map((s, idx) => (
                                <button key={idx} onClick={() => { setTags([...tags, s.label]); setSuggestions(suggestions.filter(x => x.label !== s.label)); }} className="text-xs px-2 py-1 rounded-md border transition-colors flex items-center gap-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-slate-400">{s.label}</button>
                            ))}
                            <button onClick={() => setSuggestions([])} className="ml-auto text-gray-400 hover:text-gray-600"><Icons.X size={14} /></button>
                        </div>
                    )}
                </div>
            </div>
            <DrawingModal isOpen={isDrawingModalOpen} onClose={() => setIsDrawingModalOpen(false)} onSave={(dataUrl) => setAttachments([...attachments, { type: 'image', url: dataUrl }])} />
            
            {activeLink && (
                <div className="fixed z-[100] bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 flex items-center gap-3 animate-fade-in" style={{ top: activeLink.rect.bottom + 8, left: Math.max(16, Math.min(window.innerWidth - 300, activeLink.rect.left)) }}>
                    {activeLink.isEditing ? (
                         <div className="flex flex-col gap-2 p-1 min-w-[280px]">
                            <div className="flex items-center gap-2">
                                <input 
                                    className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700 dark:text-white outline-none focus:border-slate-500"
                                    value={activeLink.text}
                                    onChange={e => setActiveLink({...activeLink, text: e.target.value})}
                                    placeholder="Text to display"
                                    autoFocus
                                />
                                <button 
                                    onClick={async () => {
                                        const originalText = activeLink.text;
                                        setActiveLink({...activeLink, text: 'Fetching...'});
                                        const title = await window.fetchTitle(activeLink.href);
                                        setActiveLink(prev => ({...prev, text: title || originalText}));
                                    }}
                                    className="p-1.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded"
                                    title="Auto-fetch Title"
                                >
                                    <Icons.Zap size={14} />
                                </button>
                            </div>
                            <input 
                                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700 dark:text-white outline-none focus:border-slate-500"
                                value={activeLink.href}
                                onChange={e => setActiveLink({...activeLink, href: e.target.value})}
                                placeholder="URL"
                            />
                            <div className="flex gap-2 justify-end mt-1">
                                 <button onClick={() => setActiveLink({...activeLink, isEditing: false})} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">Cancel</button>
                                 <button onClick={() => {
                                     if (activeLink.node) {
                                         activeLink.node.setAttribute('href', activeLink.href);
                                         activeLink.node.textContent = activeLink.text;
                                         handleContentChange();
                                     }
                                     setActiveLink(null);
                                 }} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white shadow-sm">Save</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col min-w-0 max-w-[200px]">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Link Destination</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate" title={activeLink.href}>{activeLink.href}</span>
                            </div>
                            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
                            <button onClick={() => setActiveLink({...activeLink, isEditing: true})} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors" title="Edit Link"><Icons.Edit size={16} /></button>
                            <button onClick={() => { window.open(activeLink.href, linkOpenBehavior === 'sameTab' ? '_self' : '_blank'); setActiveLink(null); }} className="p-1.5 text-gray-500 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md transition-colors" title="Open Link"><Icons.ExternalLink size={16} /></button>
                            <button onClick={() => setActiveLink(null)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors" title="Close"><Icons.X size={16} /></button>
                        </>
                    )}
                </div>
            )}
            {hoveredPreview && (
                <div 
                    className="fixed z-[110] bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 rounded-xl p-4 w-72 animate-fade-in pointer-events-none"
                    style={{ top: hoveredPreview.y, left: Math.max(16, Math.min(window.innerWidth - 304, hoveredPreview.x)) }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Icons.FileText size={14} className="text-slate-500" />
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{hoveredPreview.title}</h4>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed whitespace-pre-wrap">{hoveredPreview.content}</p>
                    <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 font-medium">Internal Link Preview</span>
                        <Icons.MousePointer size={12} className="text-gray-300" />
                    </div>
                </div>
            )}
        </div>
    );
};

window.NoteEditor = NoteEditor;