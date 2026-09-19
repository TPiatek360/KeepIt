const SORT_OPTIONS = [
    { value: 'tag_grouped', label: 'Grouped by Tag' },
    { value: 'user_defined', label: 'User Defined (Drag & Drop)' },
    { value: 'date_desc', label: 'Date Modified (Newest)' },
    { value: 'date_asc', label: 'Date Modified (Oldest)' },
    { value: 'viewed_desc', label: 'Last Viewed' },
    { value: 'created_desc', label: 'Date Created (Newest)' },
    { value: 'created_asc', label: 'Date Created (Oldest)' },
    { value: 'title_asc', label: 'Title (A-Z)' },
    { value: 'title_desc', label: 'Title (Z-A)' },
];

const PinnedSection = ({ notesList, colCount, cardProps, collapsedSections }) => {
    if (notesList.length === 0) return null;
    
    const columns = React.useMemo(() => {
        const cols = Array.from({ length: colCount }, () => []);
        const colHeights = Array.from({ length: colCount }, () => 0);

        notesList.forEach((n) => {
            // Find shortest column
            let shortestIdx = 0;
            for (let i = 1; i < colCount; i++) {
                if (colHeights[i] < colHeights[shortestIdx]) shortestIdx = i;
            }

            cols[shortestIdx].push(n);
            
            // Estimate height: base + title + content weight + attachments
            let estHeight = 150; 
            if (n.title) estHeight += 30;
            if (n.content) estHeight += Math.min(n.content.length / 3, 300);
            if (n.attachments?.length) estHeight += n.attachments.length * 100;
            
            colHeights[shortestIdx] += estHeight;
        });
        return cols;
    }, [notesList, colCount]);

    return (
        <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 pl-1 flex items-center gap-2"><Icons.PinFilled size={12} /> Pinned</h3>
            <div className="flex gap-4 items-start flex-wrap">
                {columns.map((colNotes, colIdx) => (
                    <div key={colIdx} className="flex-1 flex flex-col gap-4 min-w-[250px]">
                        {colNotes.map(n => (
                            <VirtualNoteCard key={n.id} note={n} {...cardProps} isLocked={cardProps.isLocked(n)} isArchived={n.isArchived} collapsedLines={collapsedSections[n.id] || new Set()} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

const OthersSection = ({ notesList, showHeader, colCount, cardProps, collapsedSections }) => {
    if (notesList.length === 0) return null;

    const columns = React.useMemo(() => {
        const cols = Array.from({ length: colCount }, () => []);
        const colHeights = Array.from({ length: colCount }, () => 0);

        notesList.forEach((n) => {
            // Find shortest column
            let shortestIdx = 0;
            for (let i = 1; i < colCount; i++) {
                if (colHeights[i] < colHeights[shortestIdx]) shortestIdx = i;
            }

            cols[shortestIdx].push(n);
            
            // Estimate height: base + title + content weight + attachments
            let estHeight = 150; 
            if (n.title) estHeight += 30;
            if (n.content) estHeight += Math.min(n.content.length / 3, 300);
            if (n.attachments?.length) estHeight += n.attachments.length * 100;
            
            colHeights[shortestIdx] += estHeight;
        });
        return cols;
    }, [notesList, colCount]);

    return (
        <div>
            {showHeader && <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 pl-1">Others</h3>}
            <div className="flex gap-4 items-start flex-wrap">
                {columns.map((colNotes, colIdx) => (
                    <div key={colIdx} className="flex-1 flex flex-col gap-4 min-w-[250px]">
                        {colNotes.map(n => (
                            <VirtualNoteCard key={n.id} note={n} {...cardProps} isLocked={cardProps.isLocked(n)} isArchived={n.isArchived} collapsedLines={collapsedSections[n.id] || new Set()} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

const TagArchivedSection = ({ archivedNotes, colCount, cardProps, collapsedSections, showArchivedForTag, setShowArchivedForTag }) => {
    if (archivedNotes.length === 0) return null;

    const columns = React.useMemo(() => {
        const cols = Array.from({ length: colCount }, () => []);
        const colHeights = Array.from({ length: colCount }, () => 0);

        archivedNotes.forEach((n) => {
            let shortestIdx = 0;
            for (let i = 1; i < colCount; i++) {
                if (colHeights[i] < colHeights[shortestIdx]) shortestIdx = i;
            }
            cols[shortestIdx].push(n);
            
            let estHeight = 150; 
            if (n.title) estHeight += 30;
            if (n.content) estHeight += Math.min(n.content.length / 3, 300);
            if (n.attachments?.length) estHeight += n.attachments.length * 100;
            
            colHeights[shortestIdx] += estHeight;
        });
        return cols;
    }, [archivedNotes, colCount]);

    return (
        <div className="mt-12 border-t border-gray-200 dark:border-gray-800 pt-6">
            <button 
                onClick={() => setShowArchivedForTag(!showArchivedForTag)} 
                className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-400 transition-colors focus:outline-none mb-4 pl-1"
            >
                <Icons.ChevronUp 
                    size={14} 
                    className={`transition-transform duration-200 ${showArchivedForTag ? 'rotate-180' : 'rotate-90'}`} 
                />
                <span>Archived Notes ({archivedNotes.length})</span>
            </button>
            {showArchivedForTag && (
                <div className="flex gap-4 items-start flex-wrap animate-fade-in">
                    {columns.map((colNotes, colIdx) => (
                        <div key={colIdx} className="flex-1 flex flex-col gap-4 min-w-[250px]">
                            {colNotes.map(n => (
                                <VirtualNoteCard 
                                    key={n.id} 
                                    note={n} 
                                    {...cardProps} 
                                    isLocked={cardProps.isLocked(n)} 
                                    isArchived={n.isArchived} 
                                    collapsedLines={collapsedSections[n.id] || new Set()} 
                                />
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const TagGroupedView = ({ notes, colCount, cardProps, collapsedSections }) => {
    const grouped = React.useMemo(() => {
        const map = new Map();
        notes.forEach(note => {
            const tags = note.tags?.length > 0 ? note.tags : ['untagged'];
            tags.forEach(tag => {
                if (!map.has(tag)) map.set(tag, []);
                map.get(tag).push(note);
            });
        });
        // Sort tags alphabetically, with untagged last
        return Array.from(map.entries()).sort(([a], [b]) => {
            if (a === 'untagged') return 1;
            if (b === 'untagged') return -1;
            return a.localeCompare(b);
        });
    }, [notes]);

    if (grouped.length === 0) return null;

    return (
        <div className="space-y-12 pb-20">
            {grouped.map(([tag, notesList]) => (
                <div key={tag}>
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 pl-1 flex items-center gap-2">
                        <Icons.Tag size={12} /> {tag === 'untagged' ? 'Untagged' : `#${tag}`} 
                        <span className="ml-2 text-[10px] text-gray-400 font-medium">({notesList.length})</span>
                    </h3>
                    <div className="flex gap-4 items-start flex-wrap">
                        {Array.from({ length: colCount }).map((_, colIdx) => (
                            <div key={colIdx} className="flex-1 flex flex-col gap-4 min-w-[250px]">
                                {notesList.filter((_, i) => i % colCount === colIdx).map(n => (
                                    <VirtualNoteCard 
                                        key={`${tag}-${n.id}`} 
                                        note={n} 
                                        {...cardProps} 
                                        isLocked={cardProps.isLocked(n)} 
                                        isArchived={n.isArchived} 
                                        collapsedLines={collapsedSections[n.id] || new Set()} 
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const Header = () => {
    const { 
        isSidebarOpen, setIsSidebarOpen, searchQuery, setSearchQuery,
        typeFilter, setTypeFilter, isCollapsed, setIsCollapsed,
        viewLayout, setViewLayout, isSelectMode, setIsSelectMode,
        sortOrder, setSortOrder, setIsSettingsOpen
    } = useUI();
    const { mobileLayout, setMobileLayout } = useSettings();
    const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(false);
    const [isSortMenuOpen, setIsSortMenuOpen] = React.useState(false);
    const sortMenuRef = React.useRef(null);

    const toggleSelectMode = () => setIsSelectMode(!isSelectMode);
    const toggleCollapse = () => setIsCollapsed(!isCollapsed);
    const handleSortChange = (e) => setSortOrder(e.target.value);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) setIsSortMenuOpen(false);
        };
        if (isSortMenuOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSortMenuOpen]);

    return (
        <header className="bg-white/80 dark:bg-gray-850/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 z-20 gap-4 relative">
            <div className="flex items-center gap-1 flex-1 min-w-0">
                {!isMobileSearchOpen && <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg"><Icons.Menu size={20} /></button>}
                <div className={`flex-1 max-w-xl relative group transition-all duration-300 ${isMobileSearchOpen ? 'absolute inset-x-0 top-0 h-16 bg-white dark:bg-gray-850 z-50 px-4 flex items-center gap-2' : 'hidden lg:block'}`}>
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none lg:left-3 left-7"><Icons.Search className="text-gray-400 group-focus-within:text-slate-500 transition-colors" size={20} /></div>
                    <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="block w-full pl-10 pr-10 py-2 border border-gray-200 dark:border-gray-700 rounded-lg leading-5 bg-gray-50 dark:bg-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all text-sm" autoFocus={isMobileSearchOpen} />
                    {isMobileSearchOpen && <button onClick={() => setIsMobileSearchOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 lg:hidden"><Icons.X size={20} /></button>}
                </div>
                {!isMobileSearchOpen && <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    <button onClick={() => setIsMobileSearchOpen(true)} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg"><Icons.Search size={20} /></button>
                    <div className="relative mr-1"><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium pl-2 pr-6 py-1.5 rounded-lg cursor-pointer focus:outline-none hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><option value="all">All Types</option><option value="reminder">Reminders</option><option value="list">Lists</option><option value="image">Images</option><option value="audio">Audio</option><option value="link">Links</option></select><Icons.ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" /></div>
                    <button onClick={toggleCollapse} className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg" title={isCollapsed ? "Expand Notes" : "Collapse Notes"}>{isCollapsed ? <Icons.ChevronUp size={20} /> : <Icons.ChevronDown size={20} />}</button>
                    <button onClick={() => setViewLayout(viewLayout === 'grid' ? 'stacks' : 'grid')} className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg" title={viewLayout === 'grid' ? "Switch to Stacks View" : "Switch to Grid View"}>{viewLayout === 'grid' ? <Icons.Layers size={20} /> : <Icons.Grid size={20} />}</button>
                    <button onClick={() => setMobileLayout(mobileLayout === 'grid-1' ? 'grid-2' : 'grid-1')} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg" title={mobileLayout === 'grid-1' ? "Switch to 2 Columns" : "Switch to 1 Column"}>{mobileLayout === 'grid-1' ? <Icons.Grid size={20} /> : <Icons.Square size={20} />}</button>
                    <button onClick={toggleSelectMode} className={`p-2 rounded-lg transition-colors ${isSelectMode ? 'bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`} title={isSelectMode ? "Exit Select Mode" : "Select Notes"}><Icons.CheckSquare size={20} /></button>
                    <div className="relative" ref={sortMenuRef}><button onClick={() => setIsSortMenuOpen(!isSortMenuOpen)} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg flex items-center gap-1"><Icons.RotateCcw size={20} className="transform -rotate-90 text-gray-400" /></button>
                        {isSortMenuOpen && <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 animate-fade-in lg:hidden"><div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sort By</p></div>{SORT_OPTIONS.map(opt => (<button key={opt.value} onClick={() => { setSortOrder(opt.value); setIsSortMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${sortOrder === opt.value ? 'bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{opt.label}{sortOrder === opt.value && <Icons.Check size={14} />}</button>))}</div>}
                        <select onChange={handleSortChange} value={sortOrder} className="hidden lg:block p-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 dark:text-white">{SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
                </div>}
            </div>
            <div className="flex items-center gap-2"><button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-full transition-colors"><Icons.Settings size={20} /></button></div>
        </header>
    );
};

const Sidebar = () => {
    const { user, handleLogout } = useAuth();
    const { 
        isSidebarOpen, setIsSidebarOpen, currentView, setCurrentView, 
        selectedTags, setSelectedTags, tagSearchQuery, setTagSearchQuery,
        pendingLockTag, setPendingLockTag, setPinModalMode, setIsPinModalOpen, setIsSessionUnlocked,
        setPromptModal, setToast
    } = useUI();
    const { 
        knownTags, tagParents, tagChildren, tagOrders, pinnedTags, lockedTags, excludedTags, 
        handleRefreshTags, handleMoveTag, toggleTagExclude, toggleTagPin, toggleTagLock, userPin,
        recentTags, tagUsageCounts, maxRecentTags, maxFavoriteTags, trackTagUsage
    } = useSettings();
    const { notes, addTagToNote } = useNotes();
    
    const [showUserMenu, setShowUserMenu] = React.useState(false);
    const [collapsedTags, setCollapsedTags] = React.useState(() => {
        try { return new Set(JSON.parse(localStorage.getItem('collapsedTags'))); } catch { return new Set(); }
    });
    const userMenuRef = React.useRef(null);
    
    const handleLogoutWithMenu = async () => { await handleLogout(); setShowUserMenu(false); };

    const handleNoteDrop = (noteId, currentTags, tag) => {
        if (addTagToNote) addTagToNote(noteId, tag);
        if (setToast) setToast({ message: `Added #${tag} to note`, type: 'success' });
    };

    const handleCreateChild = (parentTag) => {
        if (!setPromptModal) return;
        setPromptModal({
            isOpen: true,
            title: `Add Child Tag to #${parentTag}`,
            message: `Enter the name of the child tag under #${parentTag}:`,
            placeholder: 'e.g. project-a',
            defaultValue: '',
            confirmText: 'Add Child',
            onSubmit: (val) => {
                const childTag = (val || '').trim().replace(/^#/, '').toLowerCase();
                if (childTag && childTag !== parentTag) {
                    handleMoveTag(childTag, parentTag, true, null, 'parent');
                    if (setToast) setToast({ message: `Added #${childTag} under #${parentTag}`, type: 'success' });
                }
            }
        });
    };

    const handleAddParent = (childTag) => {
        if (!setPromptModal) return;
        setPromptModal({
            isOpen: true,
            title: `Add Parent Tag for #${childTag}`,
            message: `Enter the parent tag for #${childTag}:`,
            placeholder: 'e.g. work',
            defaultValue: '',
            confirmText: 'Add Parent',
            onSubmit: (val) => {
                const parentTag = (val || '').trim().replace(/^#/, '').toLowerCase();
                if (parentTag && parentTag !== childTag) {
                    handleMoveTag(childTag, parentTag, true, null, 'parent');
                    if (setToast) setToast({ message: `Linked #${childTag} to parent #${parentTag}`, type: 'success' });
                }
            }
        });
    };
    
    const allTags = React.useMemo(() => {
        const tagSet = new Set(knownTags);
        notes.forEach(note => { note.tags?.forEach(t => tagSet.add(t)); if (note.sharedWith?.length > 0) tagSet.add('shared'); });
        Object.entries(tagParents).forEach(([child, parents]) => { tagSet.add(child); parents?.forEach(p => tagSet.add(p.id || p)); });
        return Array.from(tagSet).sort((a, b) => (tagOrders[a] || 0) - (tagOrders[b] || 0) || a.localeCompare(b));
    }, [notes, tagParents, knownTags, tagOrders]);

    const favoriteTags = React.useMemo(() => {
        return Object.entries(tagUsageCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, maxFavoriteTags)
            .map(([tag]) => tag);
    }, [tagUsageCounts, maxFavoriteTags]);

    const visibleRecentTags = React.useMemo(() => {
        return recentTags.slice(0, maxRecentTags);
    }, [recentTags, maxRecentTags]);

    const visibleTagsSet = React.useMemo(() => {
        if (!tagSearchQuery.trim()) return null;
        const q = tagSearchQuery.toLowerCase(), matches = new Set();
        allTags.forEach(tag => { if (tag.toLowerCase().includes(q)) matches.add(tag); });
        const visible = new Set(matches);
        const addAncestors = (t) => tagParents[t]?.forEach(p => { const pId = p.id || p; if (!visible.has(pId)) { visible.add(pId); addAncestors(pId); } });
        matches.forEach(m => addAncestors(m));
        return visible;
    }, [tagSearchQuery, allTags, tagParents]);

    const handleToggleCollapse = (tag) => { setCollapsedTags(prev => { const newSet = new Set(prev); if (newSet.has(tag)) newSet.delete(tag); else newSet.add(tag); localStorage.setItem('collapsedTags', JSON.stringify(Array.from(newSet))); return newSet; }); };

    const handleTagClick = (tag) => {
        trackTagUsage(tag);
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(x => x !== tag) : [...prev, tag]);
    };

    const renderTagTree = (parentId = null, depth = 0, path = []) => {
        // When parentId is null, we are at the root. Filter out excluded tags if we want them ONLY in the hidden folder
        // For now, let's keep them in the tree but dimmed (existing behavior) and also show them in the folder.
        const children = parentId === null ? allTags.filter(t => !tagParents[t] || tagParents[t].length === 0).map(t => ({ id: t, type: null })) : tagChildren[parentId] || [];
        const validChildren = children.filter(c => !visibleTagsSet || visibleTagsSet.has(c.id));
        if (validChildren.length === 0) return null;
        return validChildren.map(c => {
            const tag = c.id; if (path.includes(tag)) return null;
            const hasChildren = tagChildren[tag]?.length > 0, isCurrentlyCollapsed = visibleTagsSet ? false : collapsedTags.has(tag);
            return (
                <React.Fragment key={`${tag}-${parentId}`}>
                    <window.SidebarItem tag={tag} parentTag={parentId} relationshipType={c.type} isPinned={pinnedTags.includes(tag)} isSelected={selectedTags.includes(tag)} isLocked={lockedTags.includes(tag)} isExcluded={excludedTags.includes(tag)} depth={depth}
                        onClick={handleTagClick}
                        onTogglePin={() => toggleTagPin(tag)} onToggleLock={() => toggleTagLock(tag, userPin, pendingLockTag, setPendingLockTag, setPinModalMode, setIsPinModalOpen, setIsSessionUnlocked)} onToggleExclude={() => toggleTagExclude(tag)} onNoteDrop={handleNoteDrop} onMoveTag={handleMoveTag} onCreateChild={handleCreateChild}
                        onAddParent={handleAddParent}
                        hasChildren={hasChildren} isCollapsed={isCurrentlyCollapsed} onToggleCollapse={handleToggleCollapse}
                    />
                    {!isCurrentlyCollapsed && hasChildren && renderTagTree(tag, depth + 1, [...path, tag])}
                </React.Fragment>
            );
        });
    };

    return (
        <div className={`${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0'} fixed md:static inset-y-0 left-0 z-50 bg-white dark:bg-gray-850 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out flex flex-col overflow-hidden`}>
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between"><div className="flex items-center gap-2 font-bold text-lg tracking-tight dark:text-white"><div className="w-6 h-6 bg-yellow-400 rounded flex items-center justify-center"><span className="text-yellow-900 text-xs">K</span></div>KeepIt</div><button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 text-gray-400"><Icons.X size={20}/></button></div>
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                <div className="space-y-1 mb-6">
                    <button onClick={() => { setCurrentView('notes'); setSelectedTags([]); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${currentView === 'notes' && selectedTags.length === 0 ? 'bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}><Icons.FileText size={18} /><span>All Notes</span></button>
                    <button onClick={() => { setCurrentView('archive'); setSelectedTags([]); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${currentView === 'archive' ? 'bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}><Icons.Archive size={18} /><span>Archive</span></button>
                    <button onClick={() => { setCurrentView('trash'); setSelectedTags([]); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${currentView === 'trash' ? 'bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}><Icons.Trash2 size={18} /><span>Trash</span></button>
                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-4 mx-2"></div>
                    <button onClick={() => { setCurrentView('graph'); setSelectedTags([]); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${currentView === 'graph' ? 'bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}><Icons.Share2 size={18} /><span>Graph View</span></button>
                    <button onClick={() => { setCurrentView('stats'); setSelectedTags([]); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${currentView === 'stats' ? 'bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}><Icons.BarChart2 size={18} /><span>Stats & Metrics</span></button>
                </div>

                {/* PINNED TAGS SECTION */}
                <div className="mb-6">
                    <div className="flex items-center justify-between px-3 mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pinned Tags</span>
                    </div>
                    <div className="space-y-0.5">
                        {/* Permanent: Hidden Tags */}
                        <div>
                            <div 
                                onClick={() => {
                                    if (excludedTags.length > 0) {
                                        // Toggle selection of ALL excluded tags for a bulk "hidden" view
                                        const allExcludedSelected = excludedTags.every(t => selectedTags.includes(t));
                                        if (allExcludedSelected) {
                                            setSelectedTags(prev => prev.filter(t => !excludedTags.includes(t)));
                                        } else {
                                            setSelectedTags(prev => [...new Set([...prev, ...excludedTags])]);
                                        }
                                    }
                                }}
                                className={`group flex items-center px-3 py-2 rounded-lg text-sm transition-all cursor-pointer mb-1 ${
                                    excludedTags.length > 0 && excludedTags.every(t => selectedTags.includes(t))
                                    ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-medium' 
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                            >
                                <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleToggleCollapse('__pinned_hidden'); }}
                                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-sm"
                                    >
                                        {collapsedTags.has('__pinned_hidden') ? <Icons.ChevronUp size={14} /> : <Icons.ChevronDown size={14} />}
                                    </button>
                                    <Icons.EyeOff size={14} className="shrink-0" />
                                    <span className="truncate">Hidden Tags</span>
                                </div>
                                <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full text-gray-500">{excludedTags.length}</span>
                            </div>
                            {collapsedTags.has('__pinned_hidden') && (
                                <div className="mt-1">
                                    {excludedTags.map(tag => (
                                        <window.SidebarItem 
                                            key={`pinned-hidden-${tag}`}
                                            tag={tag}
                                            depth={1}
                                            isPinned={pinnedTags.includes(tag)}
                                            isSelected={selectedTags.includes(tag)}
                                            isLocked={lockedTags.includes(tag)}
                                            isExcluded={true}
                                            onClick={handleTagClick}
                                            onTogglePin={() => toggleTagPin(tag)}
                                            onToggleLock={() => toggleTagLock(tag, userPin, pendingLockTag, setPendingLockTag, setPinModalMode, setIsPinModalOpen, setIsSessionUnlocked)}
                                            onToggleExclude={() => toggleTagExclude(tag)}
                                            onNoteDrop={handleNoteDrop}
                                            onMoveTag={handleMoveTag}
                                            onCreateChild={handleCreateChild}
                                            onAddParent={handleAddParent}
                                            hasChildren={false}
                                            isCollapsed={false}
                                            onToggleCollapse={() => {}}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Permanent: Recent Tags */}
                        {visibleRecentTags.length > 0 && (
                            <div>
                                <div 
                                    onClick={() => handleToggleCollapse('__pinned_recent')}
                                    className="group flex items-center px-3 py-2 rounded-lg text-sm transition-all cursor-pointer mb-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                        <div className="p-1">
                                            {collapsedTags.has('__pinned_recent') ? <Icons.ChevronUp size={14} /> : <Icons.ChevronDown size={14} />}
                                        </div>
                                        <Icons.Clock size={14} className="shrink-0" />
                                        <span className="truncate">Recent</span>
                                    </div>
                                </div>
                                {collapsedTags.has('__pinned_recent') && (
                                    <div className="mt-1">
                                        {visibleRecentTags.map(tag => (
                                            <window.SidebarItem 
                                                key={`pinned-recent-${tag}`}
                                                tag={tag}
                                                depth={1}
                                                isPinned={pinnedTags.includes(tag)}
                                                isSelected={selectedTags.includes(tag)}
                                                isLocked={lockedTags.includes(tag)}
                                                isExcluded={excludedTags.includes(tag)}
                                                onClick={handleTagClick}
                                                onTogglePin={() => toggleTagPin(tag)}
                                                onToggleLock={() => toggleTagLock(tag, userPin, pendingLockTag, setPendingLockTag, setPinModalMode, setIsPinModalOpen, setIsSessionUnlocked)}
                                                onToggleExclude={() => toggleTagExclude(tag)}
                                                onNoteDrop={handleNoteDrop}
                                                onMoveTag={handleMoveTag}
                                                onCreateChild={handleCreateChild}
                                                onAddParent={handleAddParent}
                                                hasChildren={false}
                                                isCollapsed={false}
                                                onToggleCollapse={() => {}}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Permanent: Favorite Tags */}
                        {favoriteTags.length > 0 && (
                            <div>
                                <div 
                                    onClick={() => handleToggleCollapse('__pinned_favorite')}
                                    className="group flex items-center px-3 py-2 rounded-lg text-sm transition-all cursor-pointer mb-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                        <div className="p-1">
                                            {collapsedTags.has('__pinned_favorite') ? <Icons.ChevronUp size={14} /> : <Icons.ChevronDown size={14} />}
                                        </div>
                                        <Icons.Heart size={14} className="shrink-0 text-red-400" />
                                        <span className="truncate">Favorite</span>
                                    </div>
                                </div>
                                {collapsedTags.has('__pinned_favorite') && (
                                    <div className="mt-1">
                                        {favoriteTags.map(tag => (
                                            <window.SidebarItem 
                                                key={`pinned-favorite-${tag}`}
                                                tag={tag}
                                                depth={1}
                                                isPinned={pinnedTags.includes(tag)}
                                                isSelected={selectedTags.includes(tag)}
                                                isLocked={lockedTags.includes(tag)}
                                                isExcluded={excludedTags.includes(tag)}
                                                onClick={handleTagClick}
                                                onTogglePin={() => toggleTagPin(tag)}
                                                onToggleLock={() => toggleTagLock(tag, userPin, pendingLockTag, setPendingLockTag, setPinModalMode, setIsPinModalOpen, setIsSessionUnlocked)}
                                                onToggleExclude={() => toggleTagExclude(tag)}
                                                onNoteDrop={handleNoteDrop}
                                                onMoveTag={handleMoveTag}
                                                onCreateChild={handleCreateChild}
                                                onAddParent={handleAddParent}
                                                hasChildren={false}
                                                isCollapsed={false}
                                                onToggleCollapse={() => {}}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* User-Pinned Tags */}
                        {pinnedTags.map(tag => (
                            <window.SidebarItem 
                                key={`pinned-${tag}`}
                                tag={tag}
                                isPinned={true}
                                isSelected={selectedTags.includes(tag)}
                                isLocked={lockedTags.includes(tag)}
                                isExcluded={excludedTags.includes(tag)}
                                onClick={handleTagClick}
                                onTogglePin={() => toggleTagPin(tag)}
                                onToggleLock={() => toggleTagLock(tag, userPin, pendingLockTag, setPendingLockTag, setPinModalMode, setIsPinModalOpen, setIsSessionUnlocked)}
                                onToggleExclude={() => toggleTagExclude(tag)}
                                onNoteDrop={handleNoteDrop}
                                onMoveTag={handleMoveTag}
                                onCreateChild={handleCreateChild}
                                onAddParent={handleAddParent}
                                hasChildren={false}
                                isCollapsed={false}
                                onToggleCollapse={() => {}}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between px-3 mb-2"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tags</span><button onClick={handleRefreshTags} className="p-1 text-gray-400 hover:text-slate-500 rounded transition-colors" title="Refresh Tag List"><Icons.RefreshCw size={12} /></button></div>
                <div className="relative mb-3 px-2"><input type="text" placeholder="Filter tags..." value={tagSearchQuery} onChange={(e) => setTagSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg outline-none focus:border-slate-500 transition-all" /><Icons.Search size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /></div>
                <div className="space-y-0.5">{renderTagTree()}</div>
            </div>            <div className="p-4 border-t border-gray-100 dark:border-gray-700 relative" ref={userMenuRef}>
                <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"><img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-700 shadow-sm" alt="avatar" /><div className="flex-1 text-left min-w-0"><p className="text-sm font-semibold truncate dark:text-white">{user.displayName || user.email.split('@')[0]}</p><p className="text-[10px] text-gray-400 truncate">{user.email}</p></div><Icons.ChevronUp size={16} className={`text-gray-400 transition-transform ${showUserMenu ? 'rotate-0' : 'rotate-180'}`} /></button>
                {showUserMenu && <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 z-50 animate-fade-in"><button onClick={handleLogoutWithMenu} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 font-medium"><Icons.LogOut size={16} /> Sign Out</button></div>}
            </div>
        </div>
    );
};

const MainContent = () => {
    const { 
        currentView, viewLayout, debouncedSearchQuery, 
        selectedTags, setSelectedTags, 
        isSelectMode, setIsSelectMode, 
        selectedNoteIds, setSelectedNoteIds, 
        collapsedSections, toggleSectionCollapse,
        isEditorOpen, setIsEditorOpen, currentNote, setCurrentNote, noteHistory, setNoteHistory,
        sortOrder, typeFilter, isCollapsed, unlockSession, isSessionUnlocked,
        setConfirmModal, handleInternalLinkClick, setToast
    } = useUI();
    const {
        notes, loading, handleSaveNote, handleViewNote,
        toggleNotePin, toggleArchive, handleDelete, handleRestore,
        toggleMarkdownCheck, handleDeleteCheckItem, addTagToNote, handleColorChange,
        handleEmail, handleSMS, handleDocDownload, handleDriveSave
    } = useNotes();
    const { 
        lockedTags, saturation, cardBrightness, borderBrightness, matchHeight, 
        checklistPadding, bulletPadding, previewLineLimit, globalPreviewLineLimit, getAllDescendants, excludedTags, mobileLayout, linkOpenBehavior, setLinkOpenBehavior,
        maxColumns, setMaxColumns,
        knownTags, tagParents, tagLayout, savedViewport, snapshots, relationshipTypes,
        handleSaveTagLayout, handleBatchSaveLayout, handleSaveSnapshot, handleLoadSnapshot, handleDeleteSnapshot,
        handleMoveTag, handleUpdateRelationship
    } = useSettings();
    const { semanticSearch, isSemanticSearchEnabled } = window.useSmart();

    const { EmptyState } = window;
    const [alarmingNoteIds, setAlarmingNoteIds] = React.useState(new Set());
    const [semanticScores, setSemanticScores] = React.useState(new Map());
    const [winWidth, setWinWidth] = React.useState(window.innerWidth);
    const [showArchivedForTag, setShowArchivedForTag] = React.useState(false);
    
    React.useEffect(() => {
        setShowArchivedForTag(false);
    }, [selectedTags]);

    React.useEffect(() => {
        const handleResize = () => setWinWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    React.useEffect(() => {
        if (!isSemanticSearchEnabled || !debouncedSearchQuery || debouncedSearchQuery.length < 3) {
            setSemanticScores(new Map());
            return;
        }

        const runSemantic = async () => {
            const results = await semanticSearch(debouncedSearchQuery);
            const scoreMap = new Map();
            results.forEach(r => scoreMap.set(r.noteId, r.score));
            setSemanticScores(scoreMap);
        };
        runSemantic();
    }, [debouncedSearchQuery, isSemanticSearchEnabled, semanticSearch]);

    let colCount = 1;
    if (winWidth >= 1920) colCount = Math.min(maxColumns, 6);
    else if (winWidth >= 1536) colCount = Math.min(maxColumns, 5);
    else if (winWidth >= 1280) colCount = Math.min(maxColumns, 4);
    else if (winWidth >= 1024) colCount = Math.min(maxColumns, 3);
    else if (winWidth >= 768) colCount = Math.min(maxColumns, 2);
    else colCount = mobileLayout === 'grid-2' ? 2 : 1;

    // Further cap by user preference if they set it lower than responsive default
    colCount = Math.min(colCount, maxColumns);

    const filteredNotes = React.useMemo(() => {
        const parseSearch = (q) => {
            const terms = []; const regex = /([-+]?"[^"]+")|([-+]?\S+)/g; let m;
            while ((m = regex.exec(q)) !== null) {
                let t = m[0], req = false, exc = false;
                if (t.startsWith('-')) { exc = true; t = t.substring(1); } else if (t.startsWith('+')) { req = true; t = t.substring(1); }
                if (t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1);
                terms.push({ term: t.toLowerCase(), required: req, excluded: exc });
            }
            return terms;
        };
        const parsed = debouncedSearchQuery ? parseSearch(debouncedSearchQuery) : [];
        let res = notes.filter(n => {
            if (debouncedSearchQuery !== '') {
                const text = `${n.title || ''} ${n.content || ''} ${(n.checklistItems || []).map(i => i.text).join(' ')}`.toLowerCase();
                if (parsed.some(t => t.excluded && text.includes(t.term))) return false;
                if (parsed.some(t => t.required && !text.includes(t.term))) return false;
                const opt = parsed.filter(t => !t.required && !t.excluded);
                if (opt.length > 0 && !opt.some(t => text.includes(t.term))) return false;
            }
            if (debouncedSearchQuery === '') {
                if (currentView === 'trash') { if (!n.isTrashed) return false; } 
                else if (currentView === 'archive') { if (n.isTrashed || !n.isArchived) return false; } 
                else if (currentView === 'graph') { if (n.isTrashed) return false; }
                else { if (n.isTrashed || n.isArchived) return false; }
            } else { if (currentView === 'trash') { if (!n.isTrashed) return false; } else { if (n.isTrashed) return false; } }
            
            const isSearching = debouncedSearchQuery !== '';
            const hasSelection = selectedTags.length > 0;

            // NEW Logic: If searching, always respect exclusions strictly.
            // If NOT searching, respect exclusions unless the tag is explicitly selected.
            const effectiveExclusions = excludedTags.filter(et => {
                if (isSearching) return true; // Always exclude in search
                return !selectedTags.includes(et) && !selectedTags.some(st => getAllDescendants(et).includes(st));
            });

            if (effectiveExclusions.some(t => n.tags?.includes(t) || getAllDescendants(t).some(d => n.tags?.includes(d)))) return false;

            if (hasSelection) {
                const selectedExcluded = selectedTags.filter(t => excludedTags.includes(t));
                const selectedRegular = selectedTags.filter(t => !excludedTags.includes(t));

                if (selectedRegular.length > 0) {
                    if (!selectedRegular.every(t => t === 'shared' ? (n.sharedWith?.length > 0) : getAllDescendants(t).some(d => n.tags?.includes(d)))) return false;
                }
                if (selectedExcluded.length > 0) {
                    // Use OR logic for excluded tags to support the bulk "Hidden Tags" view
                    if (!selectedExcluded.some(t => getAllDescendants(t).some(d => n.tags?.includes(d)))) return false;
                }
            }
            if (typeFilter !== 'all') {
                if (typeFilter === 'reminder' && !(n.reminder && !n.reminderDismissed)) return false;
                if (typeFilter === 'list' && !(n.isList || n.content?.includes('- [ ]'))) return false;
                if (typeFilter === 'image' && !n.attachments?.some(a => a.type === 'image')) return false;
                if (typeFilter === 'audio' && !n.attachments?.some(a => a.type === 'audio')) return false;
                if (typeFilter === 'link' && !n.attachments?.some(a => a.type === 'link')) return false;
            }
            return true;
        });
        res.sort((a, b) => {
            const aA = alarmingNoteIds.has(a.id), bA = alarmingNoteIds.has(b.id);
            if (aA && !bA) return -1; if (!aA && bA) return 1;

            if (debouncedSearchQuery && isSemanticSearchEnabled) {
                const sA = semanticScores.get(a.id) || 0;
                const sB = semanticScores.get(b.id) || 0;
                // Boost results above 0.7 threshold
                if (sA > 0.7 || sB > 0.7) {
                    if (sA !== sB) return sB - sA;
                }
            }

            if (a.isPinned && !b.isPinned) return -1; if (!a.isPinned && b.isPinned) return 1;
            const getO = (n) => n.order ?? (n.updatedAt?.seconds * 1000) ?? 0;
            switch (sortOrder) {
                case 'user_defined': return getO(b) - getO(a);
                case 'date_asc': return (a.updatedAt?.seconds || 0) - (b.updatedAt?.seconds || 0);
                case 'viewed_desc': return (b.lastViewed?.seconds || 0) - (a.lastViewed?.seconds || 0);
                case 'created_desc': return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                case 'created_asc': return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
                case 'title_asc': return (a.title || '').localeCompare(b.title || '');
                case 'title_desc': return (b.title || '').localeCompare(a.title || '');
                default: return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
            }
        });
        return res;
    }, [notes, debouncedSearchQuery, selectedTags, currentView, sortOrder, alarmingNoteIds, typeFilter, excludedTags, getAllDescendants, semanticScores, isSemanticSearchEnabled]);

    const cardProps = {
        allNotes: notes, checklistPadding, bulletPadding, saturation, cardBrightness, borderBrightness, matchHeight, isCollapsed,
        onToggleSection: toggleSectionCollapse, previewLineLimit, globalPreviewLineLimit, onDismissAlarm: () => {}, onUnlockRequest: unlockSession,
        onEdit: (note) => { 
            if(note.tags?.some(t => lockedTags.includes(t)) && !isSessionUnlocked) {
                unlockSession();
            } else { 
                // Check for fresher local version in localStorage pending buffer
                const pendingKey = `pending_save_${note.id}`;
                const localRaw = localStorage.getItem(pendingKey);
                let freshNote = note;
                if (localRaw) {
                    try {
                        const localData = JSON.parse(localRaw);
                        // If local data exists and is fresher than the passed note's updatedAt
                        if (localData && (!note.updatedAt || localData.localSavedAt / 1000 > (note.updatedAt.seconds || 0))) {
                            console.log(`[DEBUG] Found fresher local version for ${note.id} in buffer.`);
                            freshNote = { ...note, ...localData, updatedAt: { seconds: Math.floor(localData.localSavedAt / 1000) } };
                        }
                    } catch (e) {}
                }

                // Always check currentNote first for the freshest version if it matches the ID
                const latestNote = (currentNote?.id === freshNote.id && (!freshNote.updatedAt || (currentNote.updatedAt?.seconds || 0) >= (freshNote.updatedAt?.seconds || 0)))
                    ? currentNote 
                    : freshNote;

                console.log(`[DEBUG] Opening note ${note.id}. Title: "${latestNote.title}". Content Preview: "${latestNote.content?.substring(0, 20)}..."`);
                
                handleViewNote(note.id); 
                setNoteHistory([]); 
                setCurrentNote(latestNote); 
                setIsEditorOpen(true); 
            } 
        },
        onDelete: (id) => handleDelete(id, currentView, setConfirmModal), 
        onRestore: handleRestore, onCopy: () => {}, onPin: toggleNotePin, onArchive: toggleArchive,
        onOpenShare: (note) => { setNoteToShare(note); setIsShareModalOpen(true); },
        onAddTag: addTagToNote, onColorChange: handleColorChange, onToggleMarkdownCheck: toggleMarkdownCheck, onDeleteCheckItem: handleDeleteCheckItem,
        onReorder: () => {}, onShowLinks: (note) => { setLinkModalNote(note); setIsLinksModalOpen(true); }, 
        onInternalLinkClick: (tid) => {
            const target = notes.find(n => n.shortId === tid || n.id === tid);
            if (target) handleViewNote(target.id);
            handleInternalLinkClick(tid, notes);
        },
        isLocked: (n) => n.tags?.some(t => lockedTags.includes(t)) && !isSessionUnlocked,
        setToast
    };

    const pinnedNotes = filteredNotes.filter(n => n.isPinned);
    const otherNotes = filteredNotes.filter(n => !n.isPinned);

    const archivedNotesForTag = React.useMemo(() => {
        if (currentView !== 'notes' || selectedTags.length === 0) return [];
        return notes.filter(n => {
            if (n.isTrashed || !n.isArchived) return false;
            
            // Apply tag selection filter
            const selectedRegular = selectedTags.filter(t => !excludedTags.includes(t));
            const selectedExcluded = selectedTags.filter(t => excludedTags.includes(t));

            if (selectedRegular.length > 0) {
                if (!selectedRegular.every(t => t === 'shared' ? (n.sharedWith?.length > 0) : getAllDescendants(t).some(d => n.tags?.includes(d)))) return false;
            }
            if (selectedExcluded.length > 0) {
                if (!selectedExcluded.some(t => getAllDescendants(t).some(d => n.tags?.includes(d)))) return false;
            }
            return true;
        });
    }, [notes, selectedTags, currentView, excludedTags, getAllDescendants]);

    return (
        <main className={`flex-1 overflow-y-auto ${currentView === 'graph' ? '' : 'p-4 sm:p-6'} custom-scrollbar`}>
            {currentView === 'graph' ? (
                <window.GraphView 
                    notes={filteredNotes} 
                    tags={knownTags} 
                    tagParents={tagParents}
                    tagLayout={tagLayout}
                    savedViewport={savedViewport}
                    snapshots={snapshots}
                    selectedTags={selectedTags}
                    onSave={handleSaveNote}
                    onSaveTagLayout={handleSaveTagLayout}
                    onBatchSaveLayout={handleBatchSaveLayout}
                    onSaveSnapshot={handleSaveSnapshot}
                    onLoadSnapshot={handleLoadSnapshot}
                    onDeleteSnapshot={handleDeleteSnapshot}
                    onAddTag={addTagToNote}
                    onTagOperation={handleMoveTag}
                    onUpdateRelationship={handleUpdateRelationship}
                    onEdit={(n) => { 
                        // Check for fresher local version in localStorage pending buffer
                        const pendingKey = `pending_save_${n.id}`;
                        const localRaw = localStorage.getItem(pendingKey);
                        let freshNote = n;
                        if (localRaw) {
                            try {
                                const localData = JSON.parse(localRaw);
                                if (localData && (!n.updatedAt || localData.localSavedAt / 1000 > (n.updatedAt.seconds || 0))) {
                                    freshNote = { ...n, ...localData, updatedAt: { seconds: Math.floor(localData.localSavedAt / 1000) } };
                                }
                            } catch (e) {}
                        }

                        const latestNote = (currentNote?.id === freshNote.id && (!freshNote.updatedAt || (currentNote.updatedAt?.seconds || 0) >= (freshNote.updatedAt?.seconds || 0)))
                            ? currentNote 
                            : freshNote;
                        
                        handleViewNote(n.id); 
                        setNoteHistory([]); 
                        setCurrentNote(latestNote); 
                        setIsEditorOpen(true); 
                    }}
                    relationshipTypes={relationshipTypes}
                />
            ) : currentView === 'stats' ? (
                <window.StatsView notes={notes} allTags={knownTags} />
            ) : (
                <div className="space-y-8">
                    {currentView === 'archive' && <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Archive View</div>}
                    {currentView === 'trash' && <div className="text-sm font-semibold text-red-500 uppercase tracking-wide">Trash Bin</div>}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50"><Icons.RefreshCw className="animate-spin mb-4" size={32} /></div>
                    ) : filteredNotes.length === 0 ? (
                        <div className="space-y-8">
                            <EmptyState type={debouncedSearchQuery ? 'search' : currentView} />
                            <TagArchivedSection archivedNotes={archivedNotesForTag} colCount={colCount} cardProps={cardProps} collapsedSections={collapsedSections} showArchivedForTag={showArchivedForTag} setShowArchivedForTag={setShowArchivedForTag} />
                        </div>
                    ) : sortOrder === 'tag_grouped' ? (
                        <div className="space-y-8">
                            <TagGroupedView 
                                notes={filteredNotes} 
                                colCount={colCount} 
                                cardProps={cardProps} 
                                collapsedSections={collapsedSections} 
                            />
                            <TagArchivedSection archivedNotes={archivedNotesForTag} colCount={colCount} cardProps={cardProps} collapsedSections={collapsedSections} showArchivedForTag={showArchivedForTag} setShowArchivedForTag={setShowArchivedForTag} />
                        </div>
                    ) : (
                        <div className="pb-20">
                            <PinnedSection notesList={pinnedNotes} colCount={colCount} cardProps={cardProps} collapsedSections={collapsedSections} />
                            <OthersSection notesList={otherNotes} showHeader={pinnedNotes.length > 0} colCount={colCount} cardProps={cardProps} collapsedSections={collapsedSections} />
                            <TagArchivedSection archivedNotes={archivedNotesForTag} colCount={colCount} cardProps={cardProps} collapsedSections={collapsedSections} showArchivedForTag={showArchivedForTag} setShowArchivedForTag={setShowArchivedForTag} />
                        </div>
                    )}
                </div>
            )}
            {currentView === 'notes' && !isSelectMode && <button onClick={() => { setCurrentNote({ title: '', content: '', tags: [], shortId: window.generateShortId() }); setNoteHistory([]); setIsEditorOpen(true); }} className="fixed bottom-6 right-6 md:bottom-10 md:right-10 w-14 h-14 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40 group"><Icons.Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" /></button>}
        </main>
    );
};

const ModalsContainer = () => {
    const { user } = useAuth();
    const { 
        theme, setTheme, knownTags, tagParents, tagChildren, relationshipTypes, handleAddRelationshipType,
        fontSize, setFontSize, fontFamily, setFontFamily, previewLineLimit, setPreviewLineLimit,
        globalPreviewLineLimit, setGlobalPreviewLineLimit,
        handleRenameTag, handleDeleteTag, handleRefreshTags, handleBulkExport, handleDriveBackup,
        handleMoveTag, saturation, setSaturation, cardBrightness, setCardBrightness, borderBrightness, setBorderBrightness,
        textWrap, setTextWrap, matchHeight, setMatchHeight, checklistPadding, setChecklistPadding, bulletPadding, setBulletPadding,
        linkOpenBehavior, setLinkOpenBehavior, maxColumns, setMaxColumns,
        maxRecentTags, setMaxRecentTags, maxFavoriteTags, setMaxFavoriteTags,
        handlePinSubmit, userPin
    } = useSettings();
    const {
        toast, setToast, isEditorOpen, setIsEditorOpen, currentNote, setCurrentNote, noteHistory,
        isSettingsOpen, setIsSettingsOpen, isShareModalOpen, setIsShareModalOpen,
        isPinModalOpen, setIsPinModalOpen, pinModalMode, noteToShare, setNoteToShare,
        isLinksModalOpen, setIsLinksModalOpen, linkModalNote, handleBack, handleInternalLinkClick,
        pendingLockTag, setPendingLockTag, setPinModalMode, setIsSessionUnlocked,
        confirmModal, setConfirmModal, promptModal, setPromptModal,
        collapsedSections, toggleSectionCollapse
    } = useUI();
    const {
        notes, handleSaveNote, handleDelete, toggleArchive, handleViewNote,
        handleEmail, handleSMS, handleDocDownload, handleDriveSave,
        handleShare, handleImportNotes
    } = useNotes();

    // ✅ LATEST NOTES REF: Ensures callbacks always have the freshest data without closure staleness
    const notesRef = React.useRef(notes);
    React.useEffect(() => { notesRef.current = notes; }, [notes]);

    const memoizedCollapsedLines = React.useMemo(() => {
        if (!currentNote || !currentNote.id) return new Set();
        return collapsedSections[currentNote.id] || new Set();
    }, [currentNote?.id, collapsedSections]);

    return (
        <>
            <NoteEditor isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} initialNote={currentNote} liveNote={currentNote ? notes.find(n => n.id === currentNote.id) : null} onSave={handleSaveNote} onDelete={(id) => handleDelete(id, 'notes', setConfirmModal)} onArchive={toggleArchive} onOpenShare={(n) => { setNoteToShare(n); setIsShareModalOpen(true); }} onEmail={handleEmail} onSMS={handleSMS} onDoc={handleDocDownload} onDriveSave={handleDriveSave} onInternalLinkClick={(tid) => {
                const target = notesRef.current.find(n => n.shortId === tid || n.id === tid);
                if (target) handleViewNote(target.id);
                handleInternalLinkClick(tid, notesRef.current);
            }} allTags={knownTags} user={user} allNotes={notes} textWrap={textWrap} saturation={saturation} cardBrightness={cardBrightness} borderBrightness={borderBrightness} checklistPadding={checklistPadding} bulletPadding={bulletPadding} linkOpenBehavior={linkOpenBehavior} canGoBack={noteHistory.length > 0} onBack={() => handleBack(notesRef.current)} setPromptModal={setPromptModal} setToast={setToast} collapsedLines={memoizedCollapsedLines} onToggleSection={toggleSectionCollapse} />
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} theme={theme} setTheme={setTheme} saturation={saturation} setSaturation={setSaturation} cardBrightness={cardBrightness} setCardBrightness={setCardBrightness} borderBrightness={borderBrightness} setBorderBrightness={setBorderBrightness} textWrap={textWrap} setTextWrap={setTextWrap} matchHeight={matchHeight} setMatchHeight={setMatchHeight} fontSize={fontSize} setFontSize={setFontSize} fontFamily={fontFamily} setFontFamily={setFontFamily} previewLineLimit={previewLineLimit} setPreviewLineLimit={setPreviewLineLimit} globalPreviewLineLimit={globalPreviewLineLimit} setGlobalPreviewLineLimit={setGlobalPreviewLineLimit} checklistPadding={checklistPadding} setChecklistPadding={setChecklistPadding} bulletPadding={bulletPadding} setBulletPadding={setBulletPadding} linkOpenBehavior={linkOpenBehavior} setLinkOpenBehavior={setLinkOpenBehavior} maxColumns={maxColumns} setMaxColumns={setMaxColumns} maxRecentTags={maxRecentTags} setMaxRecentTags={setMaxRecentTags} maxFavoriteTags={maxFavoriteTags} setMaxFavoriteTags={setMaxFavoriteTags} allTags={knownTags} tagParents={tagParents} tagChildren={tagChildren} onMoveTag={handleMoveTag} onUpdateRelationship={() => {}} onReverseRelationship={() => {}} onRenameTag={handleRenameTag} onDeleteTag={handleDeleteTag} onRefreshTags={handleRefreshTags} setConfirmModal={setConfirmModal} setPromptModal={setPromptModal} relationshipTypes={relationshipTypes} onAddRelationshipType={handleAddRelationshipType} onLocalExport={() => handleBulkExport(notes)} onDriveBackup={() => handleDriveBackup(notes)} onImportNotes={handleImportNotes} />
            <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} note={noteToShare} onShare={handleShare} />
            <PinModal isOpen={isPinModalOpen} onClose={() => setIsPinModalOpen(false)} mode={pinModalMode} onConfirm={(pin) => handlePinSubmit(pin, pinModalMode, pendingLockTag, setIsSessionUnlocked, setIsPinModalOpen, setPendingLockTag)} />
            <LinksModal isOpen={isLinksModalOpen} onClose={() => setIsLinksModalOpen(false)} note={linkModalNote} allNotes={notes} onOpenNote={(n) => { 
                // Check for fresher local version in localStorage pending buffer
                const pendingKey = `pending_save_${n.id}`;
                const localRaw = localStorage.getItem(pendingKey);
                let freshNote = n;
                if (localRaw) {
                    try {
                        const localData = JSON.parse(localRaw);
                        if (localData && (!n.updatedAt || localData.localSavedAt / 1000 > (n.updatedAt.seconds || 0))) {
                            freshNote = { ...n, ...localData, updatedAt: { seconds: Math.floor(localData.localSavedAt / 1000) } };
                        }
                    } catch (e) {}
                }

                const latestNote = (currentNote?.id === freshNote.id && (!freshNote.updatedAt || (currentNote.updatedAt?.seconds || 0) >= (freshNote.updatedAt?.seconds || 0)))
                    ? currentNote 
                    : freshNote;
                
                handleViewNote(n.id); 
                setIsLinksModalOpen(false); 
                setCurrentNote(latestNote); 
                setIsEditorOpen(true); 
            }} />
            <ConfirmationModal {...confirmModal} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />
            <PromptModal {...promptModal} onClose={() => setPromptModal(prev => ({ ...prev, isOpen: false }))} />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
};

const App = () => {
    const { isAuthLoading, user } = useAuth();
    const { notes, loading, handleViewNote } = window.useNotes();
    const { setEmbeddingQueue, isSemanticSearchEnabled } = window.useSmart();
    const { setCurrentNote, setIsEditorOpen, setNoteHistory } = useUI();
    const handledQueryParamRef = React.useRef(false);

    React.useEffect(() => {
        if (!user || handledQueryParamRef.current) return;

        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        const noteParam = params.get('note') || params.get('noteId');

        if (action === 'create') {
            handledQueryParamRef.current = true;
            const title = params.get('title') || '';
            const text = params.get('text') || '';
            const url = params.get('url') || '';
            const image = params.get('image') || '';

            const contentParts = [];
            if (text) contentParts.push(text);
            if (url) contentParts.push(url);

            const attachments = image ? [{ type: 'image', url: image }] : [];

            setCurrentNote({
                title,
                content: contentParts.join('\n\n'),
                tags: [],
                shortId: window.generateShortId(),
                attachments
            });
            setNoteHistory([]);
            setIsEditorOpen(true);
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        if (noteParam) {
            if (notes && notes.length > 0) {
                const target = notes.find(n => n.id === noteParam || (n.shortId && n.shortId.toLowerCase() === noteParam.toLowerCase()));
                if (target) {
                    handledQueryParamRef.current = true;
                    if (handleViewNote) handleViewNote(target.id);
                    setCurrentNote(target);
                    setNoteHistory([]);
                    setIsEditorOpen(true);
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else if (!loading) {
                    handledQueryParamRef.current = true;
                }
            } else if (!loading) {
                handledQueryParamRef.current = true;
            }
        }
    }, [user, notes, loading]);

    React.useEffect(() => {
        if (!user || !isSemanticSearchEnabled || notes.length === 0) return;
        const queue = notes.map(n => ({
            id: n.id,
            title: n.title || '',
            content: n.content || '',
            hash: `${n.title}|${n.content}`.length // Simple hash for now
        }));
        setEmbeddingQueue(queue);
    }, [user, notes, isSemanticSearchEnabled]);

    if (isAuthLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><Icons.RefreshCw className="animate-spin text-gray-400" size={32} /></div>;
    if (!user) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-yellow-400 rounded-xl flex items-center justify-center shadow-md transform rotate-3"><span className="font-bold text-yellow-900 text-3xl">K</span></div>
                <div className="space-y-2"><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to KeepIt Pro</h2><p className="text-gray-500 dark:text-gray-400">Organize your thoughts with tags, drag & drop, and pins.</p></div>
                <button onClick={() => window.signInWithPopup(window.auth, window.googleProvider)} className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 border border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 font-medium py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md"><Icons.Google /><span>Sign in with Google</span></button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900 h-full transition-colors duration-200">
                <Header />
                <MainContent />
            </div>
            <ModalsContainer />
        </div>
    );
};

const Root = () => (
    <UIProvider>
        <AuthProvider>
            <SettingsProvider>
                <SmartProvider>
                    <NoteProvider>
                        <App />
                    </NoteProvider>
                </SmartProvider>
            </SettingsProvider>
        </AuthProvider>
    </UIProvider>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);