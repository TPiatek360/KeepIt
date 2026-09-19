const AuthContext = React.createContext();
const SettingsContext = React.createContext();
const NoteContext = React.createContext();
const UIContext = React.createContext();

// --- UI Provider ---
const UIProvider = ({ children }) => {
    const [currentView, setCurrentView] = React.useState('notes');
    const [viewLayout, setViewLayout] = React.useState('grid');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('');
    const [tagSearchQuery, setTagSearchQuery] = React.useState('');
    const [selectedTags, setSelectedTags] = React.useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(window.innerWidth >= 768);
    const [toast, setToast] = React.useState(null);
    const [isSessionUnlocked, setIsSessionUnlocked] = React.useState(false);
    const [isSelectMode, setIsSelectMode] = React.useState(false);
    const [selectedNoteIds, setSelectedNoteIds] = React.useState(new Set());
    
    const [isEditorOpen, setIsEditorOpen] = React.useState(false);
    const [currentNote, setCurrentNote] = React.useState(null);
    const [noteHistory, setNoteHistory] = React.useState([]);
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = React.useState(false);
    const [pinModalMode, setPinModalMode] = React.useState('enter');
    const [noteToShare, setNoteToShare] = React.useState(null);
    const [pendingLockTag, setPendingLockTag] = React.useState(null);
    const [sortOrder, setSortOrder] = React.useState('date_desc');
    const [typeFilter, setTypeFilter] = React.useState('all');
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [isLinksModalOpen, setIsLinksModalOpen] = React.useState(false);
    const [linkModalNote, setLinkModalNote] = React.useState(null);
    const [confirmModal, setConfirmModal] = React.useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [promptModal, setPromptModal] = React.useState({ isOpen: false, title: '', message: '', onSubmit: () => {}, placeholder: '', defaultValue: '' });

    const [collapsedSections, setCollapsedSections] = React.useState(() => {
        try {
            const saved = localStorage.getItem('collapsedSections');
            if (saved) {
                const parsed = JSON.parse(saved);
                const restored = {};
                Object.keys(parsed).forEach(id => restored[id] = new Set(parsed[id]));
                return restored;
            }
        } catch (e) { console.error(e); }
        return {};
    });

    const toggleSectionCollapse = (noteId, lineIndex) => {
        setCollapsedSections(prev => {
            const next = { ...prev };
            const set = new Set(next[noteId] || []);
            if (set.has(lineIndex)) set.delete(lineIndex);
            else set.add(lineIndex);
            next[noteId] = set;
            const serializable = {};
            Object.keys(next).forEach(id => serializable[id] = Array.from(next[id]));
            localStorage.setItem('collapsedSections', JSON.stringify(serializable));
            return next;
        });
    };
    
    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleInternalLinkClick = (targetId, notes) => {
        let target = notes.find(n => n.shortId === targetId || n.id === targetId);
        
        // Safety: If not in notes, check if it's the currentNote
        if (!target && currentNote && (currentNote.id === targetId || currentNote.shortId === targetId)) {
            target = currentNote;
        }

        if (target) {
            // Check for even fresher version in localStorage pending buffer
            const pendingKey = `pending_save_${target.id}`;
            const localRaw = localStorage.getItem(pendingKey);
            let freshTarget = target;
            if (localRaw) {
                try {
                    const localData = JSON.parse(localRaw);
                    if (localData && (!target.updatedAt || localData.localSavedAt / 1000 > (target.updatedAt.seconds || 0))) {
                        console.log(`[DEBUG] Found fresher local version for ${target.id} in buffer.`);
                        freshTarget = { ...target, ...localData, updatedAt: { seconds: Math.floor(localData.localSavedAt / 1000) } };
                    }
                } catch (e) {}
            }

            const latestNote = (currentNote?.id === freshTarget.id && (!freshTarget.updatedAt || (currentNote.updatedAt?.seconds || 0) >= (freshTarget.updatedAt?.seconds || 0)))
                ? currentNote 
                : freshTarget;

            if (currentNote && currentNote.id !== latestNote.id) {
                setNoteHistory(prev => [...prev, currentNote.id]);
            }
            
            setCurrentNote(latestNote);
            setIsEditorOpen(true);
        } else {
            setToast({ message: "Linked note not found.", type: 'error' });
        }
    };
    const handleBack = (notes) => {
        if (noteHistory.length === 0) return;
        const prevId = noteHistory[noteHistory.length - 1];
        let prevNote = notes.find(n => n.id === prevId);

        if (prevNote) {
            // Check for even fresher version in localStorage pending buffer
            const pendingKey = `pending_save_${prevNote.id}`;
            const localRaw = localStorage.getItem(pendingKey);
            let freshPrev = prevNote;
            if (localRaw) {
                try {
                    const localData = JSON.parse(localRaw);
                    if (localData && (!prevNote.updatedAt || localData.localSavedAt / 1000 > (prevNote.updatedAt.seconds || 0))) {
                        freshPrev = { ...prevNote, ...localData, updatedAt: { seconds: Math.floor(localData.localSavedAt / 1000) } };
                    }
                } catch (e) {}
            }

            const latestNote = (currentNote?.id === freshPrev.id && (!freshPrev.updatedAt || (currentNote.updatedAt?.seconds || 0) >= (freshPrev.updatedAt?.seconds || 0)))
                ? currentNote 
                : freshPrev;

            setNoteHistory(prev => prev.slice(0, -1)); 
            setCurrentNote(latestNote); 
        } else {
            setNoteHistory(prev => prev.slice(0, -1));
        }
    };

    const unlockSession = () => { setPinModalMode('enter'); setIsPinModalOpen(true); };

    return (
        <UIContext.Provider value={{
            currentView, setCurrentView, viewLayout, setViewLayout,
            searchQuery, setSearchQuery, debouncedSearchQuery, setDebouncedSearchQuery,
            tagSearchQuery, setTagSearchQuery,
            selectedTags, setSelectedTags, isSidebarOpen, setIsSidebarOpen, toast, setToast,
            isSessionUnlocked, setIsSessionUnlocked, isSelectMode, setIsSelectMode, selectedNoteIds, setSelectedNoteIds,
            collapsedSections, toggleSectionCollapse,
            isEditorOpen, setIsEditorOpen, currentNote, setCurrentNote, noteHistory, setNoteHistory,
            isSettingsOpen, setIsSettingsOpen, isShareModalOpen, setIsShareModalOpen,
            isPinModalOpen, setIsPinModalOpen, pinModalMode, setPinModalMode,
            noteToShare, setNoteToShare, pendingLockTag, setPendingLockTag,
            sortOrder, setSortOrder, typeFilter, setTypeFilter,
            isCollapsed, setIsCollapsed,
            isLinksModalOpen, setIsLinksModalOpen, linkModalNote, setLinkModalNote,
            confirmModal, setConfirmModal, promptModal, setPromptModal,
            handleInternalLinkClick, handleBack, unlockSession
        }}>
            {children}
        </UIContext.Provider>
    );
};

// --- Auth Provider ---
const AuthProvider = ({ children }) => {
    const { setToast } = React.useContext(UIContext);
    const [user, setUser] = React.useState(null);
    const [isAuthLoading, setIsAuthLoading] = React.useState(true);

    React.useEffect(() => {
        const initAuth = async () => { 
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token); 
            }
        };
        initAuth();
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async () => { 
        try { 
            await signInWithPopup(auth, googleProvider); 
        } catch (error) { 
            console.error("Login Error:", error); 
            let msg = "Login failed";
            if (error.code === 'auth/popup-closed-by-user') msg = "Login cancelled";
            else if (error.code === 'auth/cancelled-popup-request') msg = "Popup cancelled";
            else if (error.code === 'auth/popup-blocked') msg = "Popup blocked by browser";
            else if (error.message) msg = `Login error: ${error.message}`;
            setToast({ message: msg, type: 'error' }); 
        } 
    };
    const handleLogout = async () => { try { await signOut(auth); } catch (error) { console.error(error); } };

    return (
        <AuthContext.Provider value={{ user, setUser, isAuthLoading, handleLogin, handleLogout }}>
            {children}
        </AuthContext.Provider>
    );
};

// --- Settings Provider ---
const SettingsProvider = ({ children }) => {
    const { user } = React.useContext(AuthContext);
    const [theme, setTheme] = React.useState(() => localStorage.getItem('theme') || 'system');
    const [pinnedTags, setPinnedTags] = React.useState([]);
    const [lockedTags, setLockedTags] = React.useState([]);
    const [excludedTags, setExcludedTags] = React.useState([]);
    const [knownTags, setKnownTags] = React.useState([]);
    const [tagParents, setTagParents] = React.useState({});
    const [tagOrders, setTagOrders] = React.useState({});
    const [tagLayout, setTagLayout] = React.useState({});
    const [userPin, setUserPin] = React.useState(null);
    const [fontSize, setFontSize] = React.useState(() => parseInt(localStorage.getItem('fontSize')) || 15);
    const [fontFamily, setFontFamily] = React.useState(() => localStorage.getItem('fontFamily') || 'sans');
    const [previewLineLimit, setPreviewLineLimit] = React.useState(() => parseInt(localStorage.getItem('previewLineLimit')) || 2);
    const [globalPreviewLineLimit, setGlobalPreviewLineLimit] = React.useState(() => parseInt(localStorage.getItem('globalPreviewLineLimit')) || 0);
    const [recentTags, setRecentTags] = React.useState([]);
    const [tagUsageCounts, setTagUsageCounts] = React.useState({});
    const [maxRecentTags, setMaxRecentTags] = React.useState(() => parseInt(localStorage.getItem('maxRecentTags')) || 5);
    const [maxFavoriteTags, setMaxFavoriteTags] = React.useState(() => parseInt(localStorage.getItem('maxFavoriteTags')) || 5);

    // Apply global font settings
    React.useEffect(() => {
        let styleTag = document.getElementById('global-typography-styles');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'global-typography-styles';
            document.head.appendChild(styleTag);
        }
        const fontStack = fontFamily === 'serif' 
            ? 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'
            : 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        
        styleTag.innerHTML = `
            :root {
                font-size: ${fontSize}px;
            }
            body, .editor-container, .list-item-editor, h1, h2, h3, h4, p, span, input, textarea, button {
                font-family: ${fontStack} !important;
            }
        `;
    }, [fontSize, fontFamily]);

    const [saturation, setSaturation] = React.useState(() => parseFloat(localStorage.getItem('saturation')) || 1);
    const [cardBrightness, setCardBrightness] = React.useState(() => parseFloat(localStorage.getItem('cardBrightness')) || 1);
    const [borderBrightness, setBorderBrightness] = React.useState(() => parseFloat(localStorage.getItem('borderBrightness')) || 1);
    const [textWrap, setTextWrap] = React.useState(() => localStorage.getItem('textWrap') !== 'false');
    const [matchHeight, setMatchHeight] = React.useState(() => localStorage.getItem('matchHeight') !== 'false');
    const [checklistPadding, setChecklistPadding] = React.useState(() => parseInt(localStorage.getItem('checklistPadding')) || 0);
    const [bulletPadding, setBulletPadding] = React.useState(() => parseInt(localStorage.getItem('bulletPadding')) || 0);
    const [mobileLayout, setMobileLayout] = React.useState(() => localStorage.getItem('mobileLayout') || 'grid-1');
    const [linkOpenBehavior, setLinkOpenBehavior] = React.useState(() => localStorage.getItem('linkOpenBehavior') || 'newWindow');
    const [maxColumns, setMaxColumns] = React.useState(() => parseInt(localStorage.getItem('maxColumns')) || 6);

    const [relationshipTypes, setRelationshipTypes] = React.useState([
        { id: 'parent', forward: 'Parent of', reverse: 'Child of' },
        { id: 'expands', forward: 'Expands', reverse: 'Expanded by' },
        { id: 'causes', forward: 'Causes', reverse: 'Caused by' },
        { id: 'prevents', forward: 'Prevents', reverse: 'Prevented by' },
        { id: 'explains', forward: 'Explains', reverse: 'Explained by' },
        { id: 'related', forward: 'Related to', reverse: 'Related to' }
    ]);
    const [savedViewport, setSavedViewport] = React.useState(null);
    const [snapshots, setSnapshots] = React.useState([]);
    
    const isSyncingFromServer = React.useRef(false);

    const handleAddRelationshipType = async (newType) => {
        if (!user) return;
        const updatedTypes = [...relationshipTypes, newType];
        setRelationshipTypes(updatedTypes);
        try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), { relationshipTypes: updatedTypes }, { merge: true }); } catch (err) {}
    };

    // --- Apply Theme Logic ---
    React.useEffect(() => {
        const root = window.document.documentElement;
        const applyTheme = (t) => {
            root.classList.remove('dark');
            root.removeAttribute('data-theme');
            const isDarkSystem = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (t === 'system') { if (isDarkSystem) root.classList.add('dark'); }
            else if (t === 'dark') root.classList.add('dark');
            else if (t === 'midnight' || t === 'nord') { root.classList.add('dark'); root.setAttribute('data-theme', t); }
            else if (t === 'sepia') root.setAttribute('data-theme', t);
            
            const metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (t === 'midnight') metaThemeColor?.setAttribute('content', '#000000');
            else if (t === 'sepia') metaThemeColor?.setAttribute('content', '#f8f1e3');
            else if (t === 'nord') metaThemeColor?.setAttribute('content', '#2e3440');
            else if (root.classList.contains('dark')) metaThemeColor?.setAttribute('content', '#111827');
            else metaThemeColor?.setAttribute('content', '#f9fafb');
        };
        applyTheme(theme);
        localStorage.setItem('theme', theme);
        if (theme === 'system') {
            const m = window.matchMedia('(prefers-color-scheme: dark)');
            const h = () => applyTheme('system');
            m.addEventListener('change', h);
            return () => m.removeEventListener('change', h);
        }
    }, [theme]);

    // 1. Sync FROM server
    React.useEffect(() => {
        if (!user) return;
        const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general');
        const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                isSyncingFromServer.current = true;
                const data = docSnap.data();
                if (data.theme) setTheme(data.theme);
                if (data.pinnedTags) setPinnedTags(data.pinnedTags);
                if (data.lockedTags) setLockedTags(data.lockedTags);
                if (data.excludedTags) setExcludedTags(data.excludedTags);
                if (data.knownTags) setKnownTags(data.knownTags);
                if (data.tagOrders) setTagOrders(data.tagOrders);
                if (data.tagLayout) setTagLayout(data.tagLayout);
                if (data.pin) setUserPin(data.pin);
                if (data.fontSize) setFontSize(data.fontSize);
                if (data.fontFamily) setFontFamily(data.fontFamily);
                if (data.previewLineLimit) setPreviewLineLimit(data.previewLineLimit);
                if (data.globalPreviewLineLimit !== undefined) setGlobalPreviewLineLimit(data.globalPreviewLineLimit);
                if (data.recentTags) setRecentTags(data.recentTags);
                if (data.tagUsageCounts) setTagUsageCounts(data.tagUsageCounts);
                if (data.maxRecentTags) setMaxRecentTags(data.maxRecentTags);
                if (data.maxFavoriteTags) setMaxFavoriteTags(data.maxFavoriteTags);
                if (data.saturation) setSaturation(data.saturation);
                if (data.cardBrightness) setCardBrightness(data.cardBrightness);
                if (data.borderBrightness) setBorderBrightness(data.borderBrightness);
                if (data.textWrap !== undefined) setTextWrap(data.textWrap);
                if (data.matchHeight !== undefined) setMatchHeight(data.matchHeight);
                if (data.checklistPadding) setChecklistPadding(data.checklistPadding);
                if (data.bulletPadding) setBulletPadding(data.bulletPadding);
                if (data.mobileLayout) setMobileLayout(data.mobileLayout);
                if (data.linkOpenBehavior) setLinkOpenBehavior(data.linkOpenBehavior);
                if (data.maxColumns) setMaxColumns(data.maxColumns);
                if (data.relationshipTypes) setRelationshipTypes(data.relationshipTypes);
                if (data.savedViewport) setSavedViewport(data.savedViewport);
                if (data.tagGraph) setTagParents(data.tagGraph);
                setTimeout(() => { isSyncingFromServer.current = false; }, 100);
            }
        });

        const layoutsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'layouts');
        const unsubSnapshots = onSnapshot(query(layoutsRef, orderBy('createdAt', 'desc')), (snap) => {
            setSnapshots(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubSettings(); unsubSnapshots(); };
    }, [user]);

    // 2. Sync TO server (Debounced)
    React.useEffect(() => {
        if (!user || isSyncingFromServer.current) return;
        const timer = setTimeout(() => {
            const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general');
            localStorage.setItem('fontSize', fontSize);
            localStorage.setItem('fontFamily', fontFamily);
            localStorage.setItem('previewLineLimit', previewLineLimit);
            localStorage.setItem('globalPreviewLineLimit', globalPreviewLineLimit);
            localStorage.setItem('saturation', saturation);
            localStorage.setItem('cardBrightness', cardBrightness);
            localStorage.setItem('borderBrightness', borderBrightness);
            localStorage.setItem('textWrap', textWrap);
            localStorage.setItem('matchHeight', matchHeight);
            localStorage.setItem('checklistPadding', checklistPadding);
            localStorage.setItem('bulletPadding', bulletPadding);
            localStorage.setItem('mobileLayout', mobileLayout);
            localStorage.setItem('linkOpenBehavior', linkOpenBehavior);
            localStorage.setItem('maxColumns', maxColumns);
            localStorage.setItem('maxRecentTags', maxRecentTags);
            localStorage.setItem('maxFavoriteTags', maxFavoriteTags);
            setDoc(settingsRef, { 
                theme, fontSize, fontFamily, previewLineLimit, globalPreviewLineLimit, saturation, 
                cardBrightness, borderBrightness, textWrap, matchHeight, 
                checklistPadding, bulletPadding, mobileLayout, linkOpenBehavior, maxColumns,
                recentTags, tagUsageCounts, maxRecentTags, maxFavoriteTags
            }, { merge: true }).catch(console.error);
        }, 500); 
        return () => clearTimeout(timer);
    }, [user, theme, fontSize, fontFamily, previewLineLimit, globalPreviewLineLimit, saturation, cardBrightness, borderBrightness, textWrap, matchHeight, checklistPadding, bulletPadding, mobileLayout, linkOpenBehavior, maxColumns, recentTags, tagUsageCounts, maxRecentTags, maxFavoriteTags]);

    const tagChildren = React.useMemo(() => {
        const children = {};
        Object.entries(tagParents).forEach(([child, parents]) => {
            if (!Array.isArray(parents)) return;
            parents.forEach(pObj => {
                const pId = typeof pObj === 'string' ? pObj : pObj.id;
                const type = typeof pObj === 'string' ? 'parent' : pObj.type;
                if (!children[pId]) children[pId] = [];
                children[pId].push({ id: child, type });
            });
        });
        return children;
    }, [tagParents]);

    const trackTagUsage = (tag) => {
        if (!tag || tag === 'shared') return;
        setRecentTags(prev => {
            const next = [tag, ...prev.filter(t => t !== tag)].slice(0, maxRecentTags * 2); // Keep double for safety
            return next;
        });
        setTagUsageCounts(prev => ({
            ...prev,
            [tag]: (prev[tag] || 0) + 1
        }));
    };

    const toggleTagExclude = async (tag) => {
        if (!user) return;
        const newExcluded = excludedTags.includes(tag) ? excludedTags.filter(t => t !== tag) : [...excludedTags, tag];
        try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), { excludedTags: newExcluded }, { merge: true }); } catch(err) {}
    };

    const toggleTagPin = async (tag) => {
        if (!user) return;
        const newPinned = pinnedTags.includes(tag) ? pinnedTags.filter(t => t !== tag) : [...pinnedTags, tag];
        try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), { pinnedTags: newPinned }, { merge: true }); } catch(err) {}
    };

    const wouldCreateCycle = (child, newParent) => {
        if (child === newParent) return true;
        const visited = new Set();
        const stack = [newParent]; 
        while (stack.length) {
            const current = stack.pop();
            if (current === child) return true;
            if (visited.has(current)) continue;
            visited.add(current);
            (tagParents[current] || []).forEach(pObj => stack.push(pObj.id || pObj));
        }
        return false;
    };

    const handleMoveTag = async (childTag, newParent, isAdding = false, oldParent = null, type = 'parent') => {
        if (!user || childTag === newParent) return;
        if (newParent && wouldCreateCycle(childTag, newParent)) { 
            if (window.setToast) window.setToast({ message: "Cannot move: Cycle detected", type: "error" }); 
            return; 
        }
        const newParentsMap = { ...tagParents };
        if (newParent) {
            const newRel = { id: newParent, type };
            if (isAdding) { const cur = newParentsMap[childTag] ? [...newParentsMap[childTag]] : []; if (!cur.some(p => p.id === newParent)) newParentsMap[childTag] = [...cur, newRel]; }
            else { if (oldParent) { const filtered = (newParentsMap[childTag] || []).filter(p => p.id !== oldParent); if (!filtered.some(p => p.id === newParent)) newParentsMap[childTag] = [...filtered, newRel]; else newParentsMap[childTag] = filtered; } else newParentsMap[childTag] = [newRel]; }
        } else { if (oldParent) newParentsMap[childTag] = (newParentsMap[childTag] || []).filter(p => p.id !== oldParent); else newParentsMap[childTag] = []; }
        setTagParents(newParentsMap);
        try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), { tagGraph: newParentsMap }, { merge: true }); } catch(err) {}
    };

    const toggleTagLock = (tag, userPin, pendingLockTag, setPendingLockTag, setPinModalMode, setIsPinModalOpen, setIsSessionUnlocked) => {
        if (!user) return;
        if (!userPin) { setPendingLockTag(tag); setPinModalMode('create'); setIsPinModalOpen(true); return; }
        const newLocked = lockedTags.includes(tag) ? lockedTags.filter(t => t !== tag) : [...lockedTags, tag];
        try { setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), { lockedTags: newLocked }, { merge: true }); } catch(err) {}
    };

    const getAllDescendants = React.useCallback((rootTag, includeSelf = true) => {
        const descendants = new Set();
        const stack = [rootTag];
        while (stack.length) {
            const current = stack.pop();
            if (descendants.has(current)) continue;
            if (current !== rootTag || includeSelf) descendants.add(current);
            (tagChildren[current] || []).forEach(child => stack.push(child.id));
        }
        return Array.from(descendants);
    }, [tagChildren]);

    const handleRenameTag = async (oldTag, newTag) => { if (!user) return; try { const snapshot = await getDocs(query(collection(db, 'artifacts', appId, 'users', user.uid, 'notes'), where('tags', 'array-contains', oldTag))); const batch = writeBatch(db); snapshot.docs.forEach(docSnap => batch.update(docSnap.ref, { tags: [...new Set((docSnap.data().tags || []).map(t => t === oldTag ? newTag : t))] })); const newParentsMap = { ...tagParents }; if (newParentsMap[oldTag] !== undefined) { newParentsMap[newTag] = newParentsMap[oldTag]; delete newParentsMap[oldTag]; } Object.keys(newParentsMap).forEach(child => { newParentsMap[child] = (newParentsMap[child] || []).map(p => (p.id || p) === oldTag ? { ...p, id: newTag } : p); }); batch.update(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), { tagGraph: newParentsMap, knownTags: [...new Set(knownTags.map(t => t === oldTag ? newTag : t))] }); await batch.commit(); } catch(err) {} };
    const handleDeleteTag = async (tagToDelete) => {
        if (!user) return;
        try {
            const snapshot = await getDocs(query(collection(db, 'artifacts', appId, 'users', user.uid, 'notes'), where('tags', 'array-contains', tagToDelete)));
            const batch = writeBatch(db);
            snapshot.docs.forEach(docSnap => batch.update(docSnap.ref, { tags: (docSnap.data().tags || []).filter(t => t !== tagToDelete) }));
            
            const newParentsMap = { ...tagParents };
            delete newParentsMap[tagToDelete];
            Object.keys(newParentsMap).forEach(child => {
                newParentsMap[child] = (newParentsMap[child] || []).filter(p => (p.id || p) !== tagToDelete);
            });

            // Scrub from arrays in settings
            const updates = {
                tagGraph: newParentsMap,
                knownTags: knownTags.filter(t => t !== tagToDelete),
                pinnedTags: pinnedTags.filter(t => t !== tagToDelete),
                lockedTags: lockedTags.filter(t => t !== tagToDelete),
                excludedTags: excludedTags.filter(t => t !== tagToDelete)
            };

            batch.update(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), updates);
            await batch.commit();
        } catch(err) {
            console.error("Delete tag failed:", err);
        }
    };
    const handleRefreshTags = async () => { try { const snapshot = await getDocs(query(collection(db, 'artifacts', appId, 'users', user.uid, 'notes'))); const allUsedTags = new Set(); snapshot.docs.forEach(doc => doc.data().tags?.forEach(t => allUsedTags.add(t))); await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), { knownTags: Array.from(allUsedTags) }, { merge: true }); } catch (err) {} };
    
    const handleBulkExport = async (notes) => { try { const settingsSnap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general')); const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ settings: settingsSnap.data() || {}, notes }, null, 2)); a.download = `keepit_backup.json`; a.click(); } catch (err) {} };
    const handleDriveBackup = async (notes) => { try { const settingsSnap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general')); const provider = new GoogleAuthProvider(); provider.addScope('https://www.googleapis.com/auth/drive.file'); const result = await signInWithPopup(auth, provider); const body = `--foo\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({name: `keepit_backup.json`, mimeType: 'application/json'})}\r\n--foo\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ settings: settingsSnap.data() || {}, notes })}\r\n--foo--`; await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: { 'Authorization': `Bearer ${GoogleAuthProvider.credentialFromResult(result).accessToken}`, 'Content-Type': 'multipart/related; boundary=foo' }, body }); if (window.setToast) window.setToast({ message: "Backup saved!", type: 'success' }); } catch (err) {} };

    const handlePinSubmit = async (enteredPin, mode, pendingLockTag, setIsSessionUnlocked, setIsPinModalOpen, setPendingLockTag) => {
        if (mode === 'create') {
            try { 
                const hashed = await window.hashPin(enteredPin); 
                await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), { pin: hashed }, { merge: true }); 
                setIsSessionUnlocked(true); 
                setIsPinModalOpen(false); 
                if (pendingLockTag) { 
                    const newLocked = [...lockedTags, pendingLockTag]; 
                    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), { lockedTags: newLocked }, { merge: true }); 
                    setPendingLockTag(null); 
                } 
            } catch (err) { console.error(err); }
        } else {
            let match = false;
            if (userPin?.length === 64) match = (await window.hashPin(enteredPin) === userPin);
            else { 
                match = (enteredPin === userPin); 
                if (match) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), { pin: await window.hashPin(enteredPin) }, { merge: true }); 
            }
            if (match) { setIsSessionUnlocked(true); setIsPinModalOpen(false); } 
            else setToast({ message: "Incorrect PIN", type: "error" });
        }
    };

    const handleSaveTagLayout = async (tag, x, y) => { try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), { tagLayout: { ...tagLayout, [tag]: { x, y } } }, { merge: true }); } catch (err) {} };
    const handleBatchSaveLayout = async (updates, viewport = null) => { if (!user) return; const batch = writeBatch(db); if (updates?.length > 0) { updates.filter(u => u.type === 'note').forEach(u => batch.update(doc(db, 'artifacts', appId, 'users', user.uid, 'notes', u.id), { x: u.x, y: u.y })); const tagUpdates = updates.filter(u => u.type === 'tag'); if (tagUpdates.length > 0) { const newLayout = { ...tagLayout }; tagUpdates.forEach(t => { newLayout[t.id] = { x: t.x, y: t.y }; }); batch.update(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), { tagLayout: newLayout }); } } if (viewport) batch.set(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), { savedViewport: viewport }, { merge: true }); try { await batch.commit(); } catch (err) {} };
    const handleSaveSnapshot = async (name, nodes, viewport) => { try { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'layouts'), { name, createdAt: serverTimestamp(), nodes: nodes.map(n => ({ id: n.originalId || n.id, x: Math.round(n.x), y: Math.round(n.y), type: n.nodeType })), viewport }); } catch (err) {} };
    const handleLoadSnapshot = async (snapshotId) => { try { const snap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'layouts', snapshotId)); if (snap.exists()) { const data = snap.data(); await handleBatchSaveLayout(data.nodes, data.viewport); } } catch (err) {} };
    const handleDeleteSnapshot = async (snapshotId) => { try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'layouts', snapshotId)); } catch (err) {} };

    return (
        <SettingsContext.Provider value={{
            theme, setTheme, pinnedTags, setPinnedTags, lockedTags, setLockedTags, excludedTags, setExcludedTags,
            knownTags, setKnownTags, tagParents, setTagParents, tagChildren, tagOrders, setTagOrders,
            tagLayout, setTagLayout, userPin, setUserPin, fontSize, setFontSize, fontFamily, setFontFamily,
            previewLineLimit, setPreviewLineLimit,
            globalPreviewLineLimit, setGlobalPreviewLineLimit,
            saturation, setSaturation, cardBrightness, setCardBrightness, borderBrightness, setBorderBrightness,
            textWrap, setTextWrap, matchHeight, setMatchHeight, checklistPadding, setChecklistPadding, bulletPadding, setBulletPadding,
            mobileLayout, setMobileLayout, linkOpenBehavior, setLinkOpenBehavior,
            maxColumns, setMaxColumns,
            recentTags, tagUsageCounts, maxRecentTags, maxFavoriteTags, setMaxRecentTags, setMaxFavoriteTags, trackTagUsage,
            relationshipTypes, setRelationshipTypes, handleAddRelationshipType,
            savedViewport, setSavedViewport, snapshots,
            toggleTagExclude, toggleTagPin, handleMoveTag, toggleTagLock,
            getAllDescendants, handleRenameTag, handleDeleteTag, handleRefreshTags, handleBulkExport, handleDriveBackup,
            handlePinSubmit,
            handleSaveTagLayout, handleBatchSaveLayout, handleSaveSnapshot, handleLoadSnapshot, handleDeleteSnapshot
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

// --- Note Provider ---
const NoteProvider = ({ children }) => {
    const { user } = React.useContext(AuthContext);
    const { currentView, setToast, setCurrentNote } = React.useContext(UIContext);
    const [ownedNotes, setOwnedNotes] = React.useState([]);
    const [sharedNotes, setSharedNotes] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [notesLimit, setNotesLimit] = React.useState(20);
    const justSavedNotesRef = React.useRef(new Map()); // id -> { data, time }

    const registerPushReminders = async () => {
        if (!('serviceWorker' in navigator) || !('Notification' in window) || !window.messaging) {
            console.log("Push notifications not supported on this browser.");
            return null;
        }
        if (!window.FCM_VAPID_KEY) {
            console.warn("FCM VAPID key is not configured (window.FCM_VAPID_KEY). Push notification registration skipped.");
            return null;
        }
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log("Notification permission denied.");
                return null;
            }
            
            const registration = await navigator.serviceWorker.ready;
            const token = await window.getToken(window.messaging, {
                serviceWorkerRegistration: registration,
                vapidKey: window.FCM_VAPID_KEY
            });
            console.log("FCM token successfully generated:", token);
            return token;
        } catch (err) {
            console.error("Failed to generate FCM token:", err);
            return null;
        }
    };

    const handleSaveNote = async (noteData, silent = false) => {
        if (!user) return;
        const { id, ...data } = noteData;
        const payload = { ...data, updatedAt: serverTimestamp() };
        
        if (payload.reminder && !silent) {
            registerPushReminders().then(async (token) => {
                if (token && user) {
                    try {
                        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'fcm_tokens', token), {
                            token: token,
                            deviceType: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
                            updatedAt: serverTimestamp()
                        });
                    } catch (e) {
                        console.error("Failed to save FCM token to Firestore:", e);
                    }
                }
            }).catch(e => console.warn("Push token registration skipped or failed:", e));
        }
        
        // Ensure shortId exists
        if (!payload.shortId && !id) {
            payload.shortId = window.generateShortId();
        }

        // --- STEP 1: PRIORITIZE LOCAL SAVING ---
        const pendingKey = `pending_save_${id || 'new_' + Date.now()}`;
        const localNote = {
            ...payload,
            id,
            localSavedAt: Date.now()
        };
        
        try {
            localStorage.setItem(pendingKey, JSON.stringify(localNote));
        } catch (e) { console.warn("LocalStorage full, write-ahead buffer skipped."); }

        // Update memory cache
        if (id) {
            justSavedNotesRef.current.set(id, { data: localNote, time: Date.now() });
        }

        // Update UI state immediately for responsiveness
        if (id) {
            const localPayload = { ...payload, updatedAt: { seconds: Math.floor(Date.now() / 1000) } };
            console.log(`[DEBUG] Optimistically updating note ${id}. Payload:`, payload);
            setCurrentNote(prev => prev?.id === id ? { ...prev, ...localPayload } : prev);
            setOwnedNotes(prev => {
                const exists = prev.some(n => n.id === id);
                if (exists) {
                    return prev.map(n => n.id === id ? { ...n, ...localPayload } : n);
                } else {
                    // Prepend if not found (ensures it's visible in the current list)
                    return [{ id, ...localPayload }, ...prev];
                }
            });
        }

        try {
            if (id) {
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'notes', id), payload);
                console.log(`[DEBUG] Firestore update success for ${id}`);
                setTimeout(() => {
                    localStorage.removeItem(pendingKey);
                    justSavedNotesRef.current.delete(id);
                    console.log(`[DEBUG] Buffer cleared for ${id}`);
                }, 10000);
            } else {
                const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'notes'), { 
                    ...payload, isPinned: false, isArchived: false, isTrashed: false, createdAt: serverTimestamp() 
                });
                const createdId = docRef.id;
                const localPayload = { ...payload, id: createdId, isPinned: false, isArchived: false, isTrashed: false, updatedAt: { seconds: Math.floor(Date.now() / 1000) } };
                setCurrentNote(prev => (!prev?.id || prev?.id === id) ? { ...prev, ...localPayload } : prev);
                setOwnedNotes(prev => [{ id: createdId, ...localPayload }, ...prev.filter(n => n.id !== createdId)]);
                localStorage.removeItem(pendingKey);
                console.log(`[DEBUG] Created new note ${createdId} and cleared buffer`);
            }
            
            if (!silent) setToast({ message: "Note saved & synced", type: 'success' });
        } catch (err) { 
            console.error("Firebase sync failed, note remains in local buffer:", err);
            if (!silent) setToast({ message: "Saved locally (Sync pending...)", type: 'warning' });
        }
    };

    // --- Recovery Logic for Long-Open Tabs or Crashes ---
    React.useEffect(() => {
        if (!user || loading) return;

        const checkRecovery = async () => {
            const pendingKeys = Object.keys(localStorage).filter(k => k.startsWith('pending_save_'));
            if (pendingKeys.length === 0) return;

            for (const key of pendingKeys) {
                try {
                    const localData = JSON.parse(localStorage.getItem(key));
                    if (!localData) continue;

                    // If it's more than 2 minutes old, it's likely an orphaned save from a crash/stale tab
                    if (Date.now() - (localData.localSavedAt || 0) > 120000) {
                        const { id, localSavedAt, ...payload } = localData;
                        // Avoid syncing empty notes
                        if (!payload.title?.trim() && !payload.content?.trim()) {
                            localStorage.removeItem(key);
                            continue;
                        }

                        // Avoid creating duplicates if note already exists in loaded notes
                        if (payload.shortId && notes.some(n => n.shortId === payload.shortId)) {
                            localStorage.removeItem(key);
                            continue;
                        }

                        setToast({ 
                            message: `Found unsaved changes for "${localData.title || 'Untitled'}". Syncing now...`, 
                            type: 'info' 
                        });

                        // Attempt to push it again
                        if (id && !id.startsWith('new_')) {
                            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'notes', id), {
                                ...payload,
                                updatedAt: serverTimestamp()
                            });
                        } else {
                            await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'notes'), {
                                ...payload,
                                isPinned: false, isArchived: false, isTrashed: false,
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp()
                            });
                        }
                        localStorage.removeItem(key);
                    }
                } catch (err) {
                    console.error("Recovery sync failed:", err);
                }
            }
        };

        const timer = setTimeout(checkRecovery, 2000);
        return () => clearTimeout(timer);
    }, [user, loading]);

    const toggleNotePin = (note) => handleSaveNote({ id: note.id, isPinned: !note.isPinned }, true);
    const handleViewNote = (noteId) => handleSaveNote({ id: noteId, lastViewed: serverTimestamp() }, true);
    const toggleArchive = (note) => handleSaveNote({ id: note.id, isArchived: !note.isArchived, isTrashed: false }, true);
    const handleDelete = async (id, currentView, setConfirmModal) => { 
        if (!user) return; 
        if (currentView === 'trash') {
            setConfirmModal({ 
                isOpen: true, title: "Delete Forever?", message: "This note will be permanently removed.", 
                confirmText: "Delete Forever", 
                onConfirm: async () => { try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'notes', id)); } catch (err) {} } 
            }); 
        } else { 
            handleSaveNote({ id, isTrashed: true, trashedAt: serverTimestamp() }, true);
        } 
    };
    const handleRestore = (note) => handleSaveNote({ id: note.id, isTrashed: false, isArchived: false, trashedAt: null }, true);
    
    const runTrashAutoPurge = async () => {
        if (!user) return;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        try {
            const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'notes');
            const q = query(colRef, where('isTrashed', '==', true), where('trashedAt', '<=', thirtyDaysAgo));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) return;
            
            const batch = writeBatch(db);
            snapshot.docs.forEach(docSnap => {
                batch.delete(docSnap.ref);
            });
            await batch.commit();
            console.log(`Auto-purged ${snapshot.size} notes from trash.`);
        } catch (err) {
            console.error("Trash auto-purge failed:", err);
        }
    };

    React.useEffect(() => {
        if (user) {
            // Run purge once on load
            runTrashAutoPurge();

            // ✅ HISTORY CLEANUP: Remove note history snapshots older than 24h
            const cleanupHistory = () => {
                const twentyFourHoursAgo = Date.now() - 86400000;
                let count = 0;
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('note_history_')) {
                        try {
                            const history = JSON.parse(localStorage.getItem(key));
                            if (Array.isArray(history)) {
                                const filtered = history.filter(state => state.timestamp > twentyFourHoursAgo);
                                if (filtered.length === 0) {
                                    localStorage.removeItem(key);
                                    count++;
                                } else if (filtered.length !== history.length) {
                                    localStorage.setItem(key, JSON.stringify(filtered));
                                }
                            }
                        } catch (e) { localStorage.removeItem(key); }
                    }
                });
                if (count > 0) console.log(`[DEBUG] Cleaned up expired history for ${count} notes.`);
            };
            cleanupHistory();
        }
    }, [user]);
    
    const handleShare = async (noteId, email) => { 
        try { 
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'notes', noteId), { 
                sharedWith: arrayUnion(email) 
            }); 
            setToast({ message: "Note shared with " + email, type: 'success' });
        } catch (err) { 
            console.error(err); 
            setToast({ message: "Failed to share note", type: 'error' });
        } 
    };

    React.useEffect(() => {
        if (!user) return;
        if (ownedNotes.length === 0 && sharedNotes.length === 0) setLoading(true);
        const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'notes');
        let q = currentView === 'trash' ? query(colRef, where('isTrashed', '==', true)) : query(colRef, where('isTrashed', '==', false));
        
        const unsubOwned = onSnapshot(query(q, orderBy('updatedAt', 'desc'), limit(notesLimit)), (snap) => {
            const source = snap.metadata.hasPendingWrites ? "local" : "server";
            console.log(`[DEBUG] Received ${snap.size} notes from ${source}`);
            let newNotes = snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
            
            // --- SYNC GUARD: Merge with localStorage buffer ---
            // This prevents "server" snapshots (which might be slightly stale) from overwriting
            // very recent local edits that haven't been processed by the server yet.
            newNotes = newNotes.map(n => {
                const pending = localStorage.getItem(`pending_save_${n.id}`);
                if (pending) {
                    try {
                        const localData = JSON.parse(pending);
                        // If local data exists and is fresher than the snapshot's updatedAt
                        if (localData && (!n.updatedAt || localData.localSavedAt / 1000 > (n.updatedAt.seconds || 0))) {
                            console.log(`[DEBUG] Snapshot was stale for ${n.id}. Re-applying local buffer.`);
                            return { ...n, ...localData, updatedAt: { seconds: Math.floor(localData.localSavedAt / 1000) } };
                        }
                    } catch (e) {}
                }
                return n;
            });

            // Also check for any notes in the buffer that should be in this list but were missed by the snapshot
            // (e.g. they were just created or updated and moved into the limit range)
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('pending_save_')) {
                    const id = key.replace('pending_save_', '');
                    if (!id.startsWith('new_') && !newNotes.some(n => n.id === id)) {
                        try {
                            const localData = JSON.parse(localStorage.getItem(key));
                            // Only inject if it was saved very recently (last 10s)
                            if (Date.now() - localData.localSavedAt < 10000) {
                                console.log(`[DEBUG] Injecting missing buffered note ${id} into snapshot.`);
                                newNotes.unshift({ id, ...localData, updatedAt: { seconds: Math.floor(localData.localSavedAt / 1000) } });
                            }
                        } catch (e) {}
                    }
                }
            });

            setOwnedNotes(newNotes);
            
            // ✅ REMOVED: Syncing currentNote here was causing reverts when stale snapshots arrived.
            // currentNote is now managed strictly by optimistic updates and the Editor.

            setLoading(false);
        });

        const sharedQuery = query(collectionGroup(db, 'notes'), where('sharedWith', 'array-contains', user.email));
        const unsubShared = onSnapshot(sharedQuery, (snap) => {
            setSharedNotes(snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })));
        });

        return () => { unsubOwned(); unsubShared(); };
    }, [user, currentView, notesLimit]);

    const notes = React.useMemo(() => {
        const combined = [...ownedNotes, ...sharedNotes];
        return Array.from(new Map(combined.map(item => [item.id, item])).values());
    }, [ownedNotes, sharedNotes]);

    React.useEffect(() => {
        if (window.AndroidInterface && notes) {
            try {
                const activeReminders = notes
                    .filter(n => n.reminder && !n.isTrashed && !n.isArchived)
                    .map(n => {
                        const triggerTimeMs = new Date(n.reminder).getTime();
                        return {
                            id: n.id,
                            title: n.title || 'Note Reminder',
                            content: n.content || '',
                            triggerTimeMs: triggerTimeMs
                        };
                    })
                    .filter(r => r.triggerTimeMs > Date.now());

                window.AndroidInterface.syncAlarms(JSON.stringify(activeReminders));
            } catch (e) {
                console.error("Failed to sync alarms with Android wrapper:", e);
            }
        }
    }, [notes]);

    const toggleMarkdownCheck = (noteId, lineIndex) => {
        const note = notes.find(n => n.id === noteId);
        if (!note?.content) return;
        const lines = note.content.split('\n');
        if (lineIndex < 0 || lineIndex >= lines.length) return;
        const taskRegex = /^(\s*)-\s\[([xX\s]?)\]/;
        const match = lines[lineIndex].match(taskRegex);
        if (match) {
            const indent = match[1].length;
            const isChecking = (match[2] || '').toLowerCase() !== 'x';
            const newState = isChecking ? 'x' : ' ';
            lines[lineIndex] = lines[lineIndex].replace(taskRegex, `${match[1]}- [${newState}]`);
            
            // Inherited completion for children
            for (let i = lineIndex + 1; i < lines.length; i++) {
                const childMatch = lines[i].match(taskRegex);
                if (!childMatch) {
                    // Stop if we hit a non-task line with same or less indent
                    const lineIndentMatch = lines[i].match(/^(\s*)/);
                    const lineIndent = lineIndentMatch ? lineIndentMatch[1].length : 0;
                    if (lineIndent <= indent && lines[i].trim() !== '') break;
                    continue;
                }
                const childIndent = childMatch[1].length;
                if (childIndent <= indent) break;
                lines[i] = lines[i].replace(taskRegex, `${childMatch[1]}- [${newState}]`);
            }
            
            handleSaveNote({ id: noteId, content: lines.join('\n') }, true);
        }
    };
    const handleDeleteCheckItem = (noteId, lineIndex) => { 
        const note = notes.find(n => n.id === noteId); 
        if (!note?.content) return; 
        const lines = note.content.split('\n'); 
        if (lineIndex < 0 || lineIndex >= lines.length) return; 
        lines.splice(lineIndex, 1); 
        handleSaveNote({ id: noteId, content: lines.join('\n') }, true);
    };
    const addTagToNote = (noteId, tagLabel) => { 
        const note = notes.find(n => n.id === noteId); 
        if (note && !note.tags?.includes(tagLabel.toLowerCase())) { 
            handleSaveNote({ id: noteId, tags: [...(note.tags || []), tagLabel.toLowerCase()] }, true);
        } 
    };
    const handleColorChange = (noteId, colorKey) => handleSaveNote({ id: noteId, color: colorKey }, true);

    const handleEmail = (note) => window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(note.title || 'Note')}&body=${encodeURIComponent(`${note.title}\n\n${note.content}\n\nTags: ${note.tags?.join(', ')}`)}`, '_blank');
    const handleSMS = (note) => window.open(`sms:?body=${encodeURIComponent(`${note.title || ''}: ${note.content || ''}`)}`, '_self');
    const handleDocDownload = (note) => { const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${note.title}</title></head><body><h1>${note.title}</h1><p>${note.content.replace(/\n/g, '<br>')}</p></body></html>`], { type: 'text/html' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${note.title.replace(/[^a-z0-9]/gi, '_')}.html`; a.click(); };
    const handleCopyForDocs = (note) => { try { navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([`<h1>${note.title}</h1><p>${note.content.replace(/\n/g, '<br>')}</p>`], { type: 'text/html' }), 'text/plain': new Blob([`${note.title}\n\n${note.content}`], { type: 'text/plain' }) })]); } catch (err) { navigator.clipboard.writeText(`${note.title}\n\n${note.content}`); } };
    const handleDriveSave = async (note) => { try { const provider = new GoogleAuthProvider(); provider.addScope('https://www.googleapis.com/auth/drive.file'); const result = await signInWithPopup(auth, provider); const body = `--foo\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({name: `${note.title}.html`, mimeType: 'text/html'})}\r\n--foo\r\nContent-Type: text/html\r\n\r\n<h1>${note.title}</h1><p>${note.content.replace(/\n/g, '<br>')}</p>\r\n--foo--`; await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: { 'Authorization': `Bearer ${GoogleAuthProvider.credentialFromResult(result).accessToken}`, 'Content-Type': 'multipart/related; boundary=foo' }, body }); setToast({ message: "Saved to Drive!", type: 'success' }); } catch (err) {} };

    const handleImportNotes = async (importedData, strategy) => {
        if (!user || !importedData.notes) return;
        const importedNotes = importedData.notes;
        let count = 0;
        const CHUNK_SIZE = 450; // Firestore limit is 500
        
        // Helper to check for shortId uniqueness
        const getUniqueShortId = (desiredId, currentNotes, usedInThisImport) => {
            let candidate = desiredId || window.generateShortId();
            while (currentNotes.some(n => n.shortId === candidate) || usedInThisImport.has(candidate)) {
                candidate = window.generateShortId();
            }
            return candidate;
        };

        const usedInThisImport = new Set();

        for (let i = 0; i < importedNotes.length; i += CHUNK_SIZE) {
            const chunk = importedNotes.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);

            for (const note of chunk) {
                const existingNote = notes.find(n => n.id === note.id);
                const { id, ...data } = note;
                const payload = { ...data };
                if (payload.updatedAt) delete payload.updatedAt;
                payload.updatedAt = serverTimestamp();

                if (existingNote) {
                    if (strategy === 'overwrite') {
                        // Keep the imported shortId if it's not clashing with ANOTHER note
                        const otherNoteWithSameShortId = notes.find(n => n.shortId === payload.shortId && n.id !== id);
                        if (otherNoteWithSameShortId) {
                            payload.shortId = getUniqueShortId(payload.shortId, notes, usedInThisImport);
                        }
                        batch.set(doc(db, 'artifacts', appId, 'users', user.uid, 'notes', id), payload, { merge: true });
                        usedInThisImport.add(payload.shortId);
                        count++;
                    } else if (strategy === 'duplicate') {
                        const newRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'notes'));
                        payload.shortId = getUniqueShortId(payload.shortId, notes, usedInThisImport);
                        batch.set(newRef, { ...payload, createdAt: serverTimestamp() });
                        usedInThisImport.add(payload.shortId);
                        count++;
                    }
                } else {
                    const targetId = id || doc(collection(db, 'artifacts', appId, 'users', user.uid, 'notes')).id;
                    payload.shortId = getUniqueShortId(payload.shortId, notes, usedInThisImport);
                    batch.set(doc(db, 'artifacts', appId, 'users', user.uid, 'notes', targetId), { ...payload, createdAt: payload.createdAt || serverTimestamp() });
                    usedInThisImport.add(payload.shortId);
                    count++;
                }
            }

            try {
                await batch.commit();
            } catch (err) {
                console.error("Batch commit failed:", err);
                setToast({ message: "Import partially failed. See console.", type: 'error' });
                return;
            }
        }

        setToast({ message: `Successfully imported ${count} notes.`, type: 'success' });
    };

    return (
        <NoteContext.Provider value={{ 
            notes, loading, handleSaveNote, notesLimit, setNotesLimit,
            toggleNotePin, toggleArchive, handleDelete, handleRestore, handleViewNote,
            toggleMarkdownCheck, handleDeleteCheckItem, addTagToNote, handleColorChange,
            handleEmail, handleSMS, handleDocDownload, handleCopyForDocs, handleDriveSave, handleShare,
            handleImportNotes
        }}>
            {children}
        </NoteContext.Provider>
    );
};

// --- Smart Brain Provider ---
const SmartContext = React.createContext();
const SmartProvider = ({ children }) => {
    const { user } = React.useContext(AuthContext);
    const [aiProvider, setAiProvider] = React.useState(() => localStorage.getItem('aiProvider') || 'ollama'); // 'ollama', 'cloud', 'disabled'
    
    // Ollama Config
    const [ollamaUrl, setOllamaUrl] = React.useState(() => localStorage.getItem('ollamaUrl') || 'http://localhost:11434');
    const [ollamaEmbedModel, setOllamaEmbedModel] = React.useState(() => localStorage.getItem('ollamaEmbedModel') || 'nomic-embed-text');
    const [ollamaChatModel, setOllamaChatModel] = React.useState(() => localStorage.getItem('ollamaChatModel') || 'llama3');
    const [ollamaVisionModel, setOllamaVisionModel] = React.useState(() => localStorage.getItem('ollamaVisionModel') || 'llava');

    // Cloud Config
    const [openAiKey, setOpenAiKey] = React.useState(() => localStorage.getItem('openAiKey') || '');
    const [geminiKey, setGeminiKey] = React.useState(() => localStorage.getItem('geminiKey') || '');

    // Feature Toggles
    const [isSemanticSearchEnabled, setIsSemanticSearchEnabled] = React.useState(() => localStorage.getItem('isSemanticSearchEnabled') !== 'false');
    const [isAutoTaggingEnabled, setIsAutoTaggingEnabled] = React.useState(() => localStorage.getItem('isAutoTaggingEnabled') !== 'false');
    const [isOcrEnabled, setIsOcrEnabled] = React.useState(() => localStorage.getItem('isOcrEnabled') !== 'false');

    const [ollamaStatus, setOllamaStatus] = React.useState('unknown'); // 'unknown', 'online', 'offline'
    const [vectorDb, setVectorDb] = React.useState(null);
    const [embeddingQueue, setEmbeddingQueue] = React.useState([]);
    const [isEmbedding, setIsEmbedding] = React.useState(false);
    const [isOcrProcessing, setIsOcrProcessing] = React.useState(false);

    const extractTextFromImage = React.useCallback(async (imageUrl) => {
        if (!isOcrEnabled) return null;
        setIsOcrProcessing(true);

        // 1. Try Ollama Vision (if vision model configured)
        if (aiProvider === 'ollama' && ollamaStatus === 'online' && ollamaVisionModel) {
            try {
                // Fetch image and convert to base64
                const imgRes = await fetch(imageUrl);
                const blob = await imgRes.blob();
                const base64 = await new Promise(r => {
                    const reader = new FileReader();
                    reader.onloadend = () => r(reader.result.split(',')[1]);
                    reader.readAsDataURL(blob);
                });

                const res = await fetch(`${ollamaUrl}/api/generate`, {
                    method: 'POST',
                    body: JSON.stringify({
                        model: ollamaVisionModel,
                        prompt: "Describe this image and extract any text you see in it. Return just the text content if possible.",
                        images: [base64],
                        stream: false
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    setIsOcrProcessing(false);
                    return data.response;
                }
            } catch (e) { console.warn("Ollama vision failed, falling back to Tesseract:", e); }
        }

        // 2. Fallback to Tesseract.js
        try {
            const { data: { text } } = await Tesseract.recognize(imageUrl, 'eng');
            setIsOcrProcessing(false);
            return text;
        } catch (e) {
            console.error("Tesseract OCR failed:", e);
        }

        setIsOcrProcessing(false);
        return null;
    }, [aiProvider, ollamaUrl, ollamaVisionModel, ollamaStatus, isOcrEnabled]);

    const getEmbedding = React.useCallback(async (text) => {
        const tryOllama = async () => {
            if (ollamaStatus !== 'online') return null;
            try {
                let res = await fetch(`${ollamaUrl}/api/embed`, {
                    method: 'POST',
                    body: JSON.stringify({ model: ollamaEmbedModel, input: text })
                });
                if (res.status === 404) {
                    res = await fetch(`${ollamaUrl}/api/embeddings`, {
                        method: 'POST',
                        body: JSON.stringify({ model: ollamaEmbedModel, prompt: text })
                    });
                }
                if (res.ok) {
                    const data = await res.json();
                    return data.embeddings ? data.embeddings[0] : data.embedding;
                }
            } catch (e) { console.error("Ollama embedding failed:", e); }
            return null;
        };

        const tryCloud = async () => {
            // Try OpenAI
            if (openAiKey) {
                try {
                    const res = await fetch('https://api.openai.com/v1/embeddings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAiKey}` },
                        body: JSON.stringify({ model: 'text-embedding-3-small', input: text })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        return data.data[0].embedding;
                    }
                } catch (e) { console.error("OpenAI embedding failed:", e); }
            }
            // Try Gemini
            if (geminiKey) {
                try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: { parts: [{ text }] } })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        return data.embedding.values;
                    }
                } catch (e) { console.error("Gemini embedding failed:", e); }
            }
            return null;
        };

        if (aiProvider === 'ollama') {
            const vec = await tryOllama();
            if (vec) return vec;
            // Auto-fallback to cloud if Ollama failed/offline
            return await tryCloud();
        } else if (aiProvider === 'cloud') {
            return await tryCloud();
        }
        return null;
    }, [aiProvider, ollamaUrl, ollamaEmbedModel, ollamaStatus, openAiKey, geminiKey]);

    const cosineSimilarity = (vecA, vecB) => {
        if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
        let dotProduct = 0, mA = 0, mB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            mA += vecA[i] * vecA[i];
            mB += vecB[i] * vecB[i];
        }
        mA = Math.sqrt(mA);
        mB = Math.sqrt(mB);
        if (mA === 0 || mB === 0) return 0;
        return dotProduct / (mA * mB);
    };

    const semanticSearch = React.useCallback(async (queryText, limit = 20) => {
        if (!isSemanticSearchEnabled || !vectorDb) return [];
        const queryVec = await getEmbedding(queryText);
        if (!queryVec) return [];

        return new Promise((resolve) => {
            try {
                const transaction = vectorDb.transaction(['vectors'], 'readonly');
                const store = transaction.objectStore('vectors');
                const request = store.getAll();
                request.onsuccess = (e) => {
                    const allVectors = e.target.result;
                    const scores = allVectors.map(v => ({
                        noteId: v.noteId,
                        score: cosineSimilarity(queryVec, v.vector)
                    }));
                    scores.sort((a, b) => b.score - a.score);
                    resolve(scores.slice(0, limit));
                };
                request.onerror = () => resolve([]);
            } catch (e) {
                console.error("Semantic search transaction failed:", e);
                resolve([]);
            }
        });
    }, [isSemanticSearchEnabled, vectorDb, getEmbedding]);

    const suggestTags = React.useCallback(async (noteContent, knownTags) => {
        const prompt = `You are a helpful assistant that suggests tags for a note.
Given the note content and a list of existing tags, suggest between 1-5 tags that fit the note.
Prefer using existing tags if they fit. Return ONLY a JSON array of strings.

Note Content: "${noteContent.substring(0, 2000)}"
Existing Tags: [${knownTags.join(', ')}]
Suggested Tags:`;

        const tryOllama = async () => {
            if (ollamaStatus !== 'online') return null;
            try {
                const res = await fetch(`${ollamaUrl}/api/generate`, {
                    method: 'POST',
                    body: JSON.stringify({ 
                        model: ollamaChatModel, 
                        prompt, 
                        stream: false,
                        format: 'json'
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    const text = data.response;
                    const match = text.match(/\[.*\]/s);
                    return match ? JSON.parse(match[0]) : null;
                }
            } catch (e) { console.error("Ollama auto-tag failed:", e); }
            return null;
        };

        const tryCloud = async () => {
            if (openAiKey) {
                try {
                    const res = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAiKey}` },
                        body: JSON.stringify({ 
                            model: 'gpt-3.5-turbo', 
                            messages: [{ role: 'user', content: prompt }],
                            response_format: { type: 'json_object' }
                        })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const content = JSON.parse(data.choices[0].message.content);
                        const tags = content.tags || content.suggested_tags || Object.values(content)[0];
                        return Array.isArray(tags) ? tags : null;
                    }
                } catch (e) { console.error("OpenAI auto-tag failed:", e); }
            }
            if (geminiKey) {
                try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt + " Output must be valid JSON array." }] }],
                            generationConfig: { response_mime_type: "application/json" }
                        })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const text = data.candidates[0].content.parts[0].text;
                        const parsed = JSON.parse(text);
                        return Array.isArray(parsed) ? parsed : (parsed.tags || null);
                    }
                } catch (e) { console.error("Gemini auto-tag failed:", e); }
            }
            return null;
        };

        if (aiProvider === 'ollama') {
            const tags = await tryOllama();
            if (tags) return tags;
            return (await tryCloud()) || [];
        } else if (aiProvider === 'cloud') {
            return (await tryCloud()) || [];
        }
        return [];
    }, [aiProvider, ollamaUrl, ollamaChatModel, ollamaStatus, openAiKey, geminiKey]);

    // Background processing of notes for embeddings
    React.useEffect(() => {
        if (!isSemanticSearchEnabled || !vectorDb || isEmbedding || aiProvider === 'disabled') return;
        
        const processQueue = async () => {
            if (embeddingQueue.length === 0) return;
            setIsEmbedding(true);
            const task = embeddingQueue[0];
            
            // Check if we already have a fresh embedding
            const existing = await new Promise(r => {
                const req = vectorDb.transaction(['vectors'], 'readonly').objectStore('vectors').get(task.id);
                req.onsuccess = (e) => r(e.target.result);
                req.onerror = () => r(null);
            });

            if (existing && existing.hash === task.hash) {
                setEmbeddingQueue(prev => prev.slice(1));
                setIsEmbedding(false);
                return;
            }

            const vector = await getEmbedding(`${task.title}\n${task.content}`);
            if (vector) {
                const tx = vectorDb.transaction(['vectors'], 'readwrite');
                tx.objectStore('vectors').put({ noteId: task.id, vector, hash: task.hash, updatedAt: Date.now() });
            }
            
            setEmbeddingQueue(prev => prev.slice(1));
            setIsEmbedding(false);
        };

        const timer = setTimeout(processQueue, 1000); // 1s throttle between requests
        return () => clearTimeout(timer);
    }, [isSemanticSearchEnabled, vectorDb, embeddingQueue, isEmbedding, getEmbedding, aiProvider]);

    const initVectorDb = React.useCallback(() => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('KeepItVectors', 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('vectors')) {
                    db.createObjectStore('vectors', { keyPath: 'noteId' });
                }
            };
            request.onsuccess = (e) => {
                setVectorDb(e.target.result);
                resolve(e.target.result);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }, []);

    React.useEffect(() => {
        initVectorDb().catch(console.error);
    }, [initVectorDb]);

    const checkOllama = React.useCallback(async (url = ollamaUrl) => {
        try {
            const res = await fetch(`${url}/api/tags`, { method: 'GET' });
            if (res.ok) {
                setOllamaStatus('online');
                return true;
            }
        } catch (e) {
            console.warn("Ollama connectivity check failed:", e);
        }
        setOllamaStatus('offline');
        return false;
    }, [ollamaUrl]);

    React.useEffect(() => {
        if (aiProvider === 'ollama') checkOllama();
    }, [aiProvider, ollamaUrl, checkOllama]);

    const isSyncingFromServer = React.useRef(false);

    // 1. Sync FROM server
    React.useEffect(() => {
        if (!user) return;
        const smartRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'smart');
        const unsub = onSnapshot(smartRef, (docSnap) => {
            if (docSnap.exists()) {
                isSyncingFromServer.current = true;
                const data = docSnap.data();
                if (data.aiProvider) setAiProvider(data.aiProvider);
                if (data.ollamaUrl) setOllamaUrl(data.ollamaUrl);
                if (data.ollamaEmbedModel) setOllamaEmbedModel(data.ollamaEmbedModel);
                if (data.ollamaChatModel) setOllamaChatModel(data.ollamaChatModel);
                if (data.ollamaVisionModel) setOllamaVisionModel(data.ollamaVisionModel);
                if (data.openAiKey) setOpenAiKey(data.openAiKey);
                if (data.geminiKey) setGeminiKey(data.geminiKey);
                if (data.isSemanticSearchEnabled !== undefined) setIsSemanticSearchEnabled(data.isSemanticSearchEnabled);
                if (data.isAutoTaggingEnabled !== undefined) setIsAutoTaggingEnabled(data.isAutoTaggingEnabled);
                if (data.isOcrEnabled !== undefined) setIsOcrEnabled(data.isOcrEnabled);
                setTimeout(() => { isSyncingFromServer.current = false; }, 100);
            }
        });
        return () => unsub();
    }, [user]);

    // 2. Sync TO server & localStorage
    React.useEffect(() => {
        if (!user || isSyncingFromServer.current) return;
        const timer = setTimeout(() => {
            localStorage.setItem('aiProvider', aiProvider);
            localStorage.setItem('ollamaUrl', ollamaUrl);
            localStorage.setItem('ollamaEmbedModel', ollamaEmbedModel);
            localStorage.setItem('ollamaChatModel', ollamaChatModel);
            localStorage.setItem('ollamaVisionModel', ollamaVisionModel);
            localStorage.setItem('openAiKey', openAiKey);
            localStorage.setItem('geminiKey', geminiKey);
            localStorage.setItem('isSemanticSearchEnabled', isSemanticSearchEnabled);
            localStorage.setItem('isAutoTaggingEnabled', isAutoTaggingEnabled);
            localStorage.setItem('isOcrEnabled', isOcrEnabled);

            const smartRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'smart');
            setDoc(smartRef, {
                aiProvider, ollamaUrl, ollamaEmbedModel, ollamaChatModel, ollamaVisionModel,
                openAiKey, geminiKey, isSemanticSearchEnabled, isAutoTaggingEnabled, isOcrEnabled
            }, { merge: true }).catch(console.error);
        }, 500);
        return () => clearTimeout(timer);
    }, [user, aiProvider, ollamaUrl, ollamaEmbedModel, ollamaChatModel, ollamaVisionModel, openAiKey, geminiKey, isSemanticSearchEnabled, isAutoTaggingEnabled, isOcrEnabled]);

    return (
        <SmartContext.Provider value={{
            aiProvider, setAiProvider,
            ollamaUrl, setOllamaUrl,
            ollamaEmbedModel, setOllamaEmbedModel,
            ollamaChatModel, setOllamaChatModel,
            ollamaVisionModel, setOllamaVisionModel,
            openAiKey, setOpenAiKey,
            geminiKey, setGeminiKey,
            isSemanticSearchEnabled, setIsSemanticSearchEnabled,
            isAutoTaggingEnabled, setIsAutoTaggingEnabled,
            isOcrEnabled, setIsOcrEnabled,
            ollamaStatus, checkOllama,
            setEmbeddingQueue, semanticSearch, isEmbedding, suggestTags,
            extractTextFromImage, isOcrProcessing
        }}>
            {children}
        </SmartContext.Provider>
    );
};

window.AuthProvider = AuthProvider;
window.SettingsProvider = SettingsProvider;
window.NoteProvider = NoteProvider;
window.UIProvider = UIProvider;
window.SmartProvider = SmartProvider;
window.useAuth = () => React.useContext(AuthContext);
window.useSettings = () => React.useContext(SettingsContext);
window.useNotes = () => React.useContext(NoteContext);
window.useUI = () => React.useContext(UIContext);
window.useSmart = () => React.useContext(SmartContext);