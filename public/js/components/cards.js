const AudioPlayer = ({ src }) => {
    const audioRef = React.useRef(null);
    const [isPlaying, setIsPlaying] = React.useState(false);

    const togglePlay = (e) => {
        e.stopPropagation();
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1.5 max-w-fit">
            <button onClick={togglePlay} className="text-gray-600 dark:text-gray-300 hover:text-slate-500">
                {isPlaying ? <span className="text-xs font-bold">||</span> : <Icons.Play size={14} />}
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">Audio Note</span>
            <audio ref={audioRef} src={src} onEnded={() => setIsPlaying(false)} className="hidden" />
        </div>
    );
};

const NoteCard = React.memo(({ note, onEdit, onDelete, onCopy, onPin, onOpenShare, onEmail, onSMS, onDoc, onDriveSave, onAddTag, onColorChange, onToggleCheck, onToggleMarkdownCheck, onDeleteCheckItem, isLocked, onUnlockRequest, onArchive, isArchived, onRestore, onReorder, isCollapsed, onShowLinks, onInternalLinkClick, allNotes, isAlarming, onDismissAlarm, saturation = 1, cardBrightness = 1, borderBrightness = 1, matchHeight = true, checklistPadding = 0, bulletPadding = 0, collapsedLines = new Set(), onToggleSection, previewLineLimit = 2, globalPreviewLineLimit = 0, setToast }) => {
    const [isDragOver, setIsDragOver] = React.useState(false);
    const [showColorPicker, setShowColorPicker] = React.useState(false);
    const [showShareMenu, setShowShareMenu] = React.useState(false);
    const colorTheme = NOTE_COLORS[note.color] || NOTE_COLORS.default;

    const [swipeOffset, setSwipeOffset] = React.useState(0);
    const [isSwiping, setIsSwiping] = React.useState(false);
    const touchStartRef = React.useRef(0);

    const handleTouchStart = (e) => { touchStartRef.current = e.touches[0].clientX; setIsSwiping(true); };
    const handleTouchMove = (e) => {
        if (!isSwiping) return;
        const diff = e.touches[0].clientX - touchStartRef.current;
        if (Math.abs(diff) < 150) setSwipeOffset(diff);
    };
    const handleTouchEnd = () => {
        if (swipeOffset > 100) { onDelete(note.id); window.vibrate && window.vibrate(50); }
        else if (swipeOffset < -100) { onArchive(note); window.vibrate && window.vibrate(50); }
        setSwipeOffset(0); setIsSwiping(false);
    };

    const handleDragStart = (e) => {
        e.dataTransfer.setData("application/json", JSON.stringify({ type: 'NOTE', id: note.id, tags: note.tags }));
        window.vibrate && window.vibrate(20);
    };

    const handleDrop = (e) => {
        e.preventDefault(); setIsDragOver(false);
        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json"));
            if (data.type === 'TAG' || data.type === 'TAG_REPARENT') { onAddTag(note.id, data.label); window.vibrate && window.vibrate(20); }
            else if (data.type === 'NOTE' && data.id !== note.id) { onReorder(data.id, note.id); window.vibrate && window.vibrate(20); }
        } catch (err) { console.error(err); }
    };

    const handleContentClick = (e) => {
        const toggleEl = e.target.closest('.list-toggle');
        if (toggleEl) {
            e.stopPropagation(); e.preventDefault();
            const li = toggleEl.closest('li');
            if (li && onToggleSection) onToggleSection(note.id, li.getAttribute('data-line-index'));
            return;
        }
        if (e.target.classList.contains('task-checkbox')) {
            e.stopPropagation(); e.preventDefault();
            const li = e.target.closest('.task-line');
            if (li && onToggleMarkdownCheck) onToggleMarkdownCheck(note.id, parseInt(li.getAttribute('data-line-index')));
            return;
        }
        if (e.target.classList.contains('task-delete')) {
            e.stopPropagation(); e.preventDefault();
            const li = e.target.closest('.task-line');
            if (li && onDeleteCheckItem) onDeleteCheckItem(note.id, parseInt(li.getAttribute('data-line-index')));
            return;
        }
        if (e.target.tagName === 'A') {
            const href = e.target.getAttribute('href');
            if (href?.startsWith('internal://')) { e.preventDefault(); e.stopPropagation(); onInternalLinkClick(href.replace('internal://', '')); }
        }
    };
    
    const isTrashed = note.isTrashed;
    let daysRemaining = null;
    if (isTrashed && note.trashedAt) {
        const trashedDate = note.trashedAt.seconds ? new Date(note.trashedAt.seconds * 1000) : new Date();
        const purgeDate = new Date(trashedDate);
        purgeDate.setDate(trashedDate.getDate() + 30);
        const now = new Date();
        const diffTime = purgeDate - now;
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    if (isLocked) return (
        <div onClick={onUnlockRequest} className="group relative rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 shadow-sm cursor-pointer h-48 flex flex-col items-center justify-center text-center p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Icons.Lock size={24} className="text-gray-400 mb-2" />
            <h3 className="font-semibold text-gray-500 dark:text-gray-400">Locked Note</h3>
        </div>
    );

    return (
        <div className="note-card-container relative h-full bg-gray-100 dark:bg-gray-800 rounded-xl">
            {swipeOffset > 0 && <div className="swipe-action-bg swipe-action-right opacity-50"><Icons.Trash size={20} /> Trash</div>}
            {swipeOffset < 0 && <div className="swipe-action-bg swipe-action-left opacity-50 ml-auto"><Icons.Archive size={20} /> Archive</div>}
            <div 
                onClick={() => onEdit(note)} draggable="true" onDragStart={handleDragStart} onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
                className={`group relative rounded-xl border-2 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col ${matchHeight ? 'h-full' : ''} ${isDragOver ? 'border-slate-500 bg-slate-50' : 'border-transparent'} ${isAlarming ? 'animate-jiggle ring-4 ring-red-500 z-50' : ''}`}
                style={{ transform: `translateX(${swipeOffset}px)` }}
            >
                <div className={`absolute inset-0 ${colorTheme.bg}`} style={{ filter: `saturate(${saturation}) brightness(${cardBrightness})` }} />
                <div className={`absolute inset-0 rounded-xl border-2 pointer-events-none z-20 ${colorTheme.border}`} style={{ filter: `brightness(${borderBrightness})` }} />
                
                {/* Top Action Icons */}
                <div className="absolute top-2 right-2 flex gap-1 z-20 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onPin(note); }}
                        className={`p-1.5 rounded-full transition-colors ${note.isPinned ? 'text-slate-600 bg-slate-100/50 dark:bg-slate-900/50' : 'text-gray-400 hover:bg-black/5 dark:hover:bg-white/10'}`}
                        title={note.isPinned ? "Unpin" : "Pin"}
                    >
                        {note.isPinned ? <Icons.PinFilled size={16} /> : <Icons.Pin size={16} />}
                    </button>
                </div>

                <div className="p-6 flex-1 relative z-10 overflow-y-auto custom-scrollbar" onClick={handleContentClick}>
                    {isTrashed && daysRemaining !== null && (
                        <div className={`mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${daysRemaining <= 7 ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>
                            <Icons.AlertTriangle size={12} />
                            Purging in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                        </div>
                    )}
                    {note.title && <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 text-xl pr-8">{note.title}</h3>}
                    {!isCollapsed && (
                        <div 
                            className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 whitespace-pre-wrap text-base leading-snug note-preview-content" 
                            style={{
                                '--checklist-padding': `${checklistPadding}px`, 
                                '--bullet-padding': `${bulletPadding}px`,
                                '--preview-line-limit': previewLineLimit || 2,
                                ...(globalPreviewLineLimit > 0 ? {
                                    display: '-webkit-box',
                                    WebkitLineClamp: globalPreviewLineLimit,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    wordBreak: 'break-word'
                                } : {})
                            }} 
                            dangerouslySetInnerHTML={{ __html: window.parseMarkdown(note.content || '', collapsedLines, true, 20, true, true) }} 
                        />
                    )}
                </div>
                <div className="px-5 pb-3 flex justify-between items-end relative z-10">
                    <div className="flex flex-wrap gap-2 flex-1">{note.tags?.slice(0, 3).map(tag => <span key={tag} className="text-xs bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-600">#{tag}</span>)}</div>
                    {note.shortId && <div onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`::${note.shortId}`); if(setToast) setToast({ message: 'ID copied!', type: 'success' }); }} className="text-[10px] font-mono text-gray-400 hover:text-slate-500 cursor-pointer ml-2">::{note.shortId}</div>}
                </div>

                {/* Bottom Toolbar */}
                <div className="bg-black/5 dark:bg-black/20 px-3 py-2 border-t border-black/5 dark:border-white/5 flex justify-between items-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                    <span className="text-[10px] text-gray-400 w-16 truncate">{note.updatedAt?.seconds ? new Date(note.updatedAt.seconds * 1000).toLocaleDateString() : 'Just now'}</span>
                    <div className="flex gap-1 items-center relative flex-wrap justify-end">
                        {isTrashed ? (
                            <button onClick={(e) => { e.stopPropagation(); onRestore(note); }} className="p-1.5 text-slate-500 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900/30 rounded-full transition-colors flex items-center gap-1" title="Restore Note">
                                <Icons.RotateCcw size={14} />
                                <span className="text-[10px] font-bold">Restore</span>
                            </button>
                        ) : (
                            <button onClick={(e) => { e.stopPropagation(); onArchive(note); }} className="p-1.5 text-gray-400 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors" title={isArchived ? "Unarchive" : "Archive"}>{isArchived ? <Icons.Unarchive size={14} /> : <Icons.Archive size={14} />}</button>
                        )}
                        <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); setShowShareMenu(false); }} className="p-1.5 text-gray-400 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors" title="Change Color"><Icons.Palette size={14} /></button>
                            {showColorPicker && ( <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50" onClick={(e) => e.stopPropagation()}><ColorPicker selectedColor={note.color} onSelect={(c) => { onColorChange(note.id, c); setShowColorPicker(false); }} /></div> )}
                        </div>
                        <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setShowShareMenu(!showShareMenu); setShowColorPicker(false); }} className={`p-1.5 rounded-full transition-colors ${showShareMenu ? 'text-purple-600 bg-black/5 dark:bg-white/10' : 'text-gray-400 hover:text-purple-600 hover:bg-black/5 dark:hover:bg-white/10'}`} title="Share Options"><Icons.Share size={14} /></button>
                            {showShareMenu && (
                                <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => { onOpenShare(note); setShowShareMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"><Icons.UserPlus size={14} /> Share with User</button>
                                    <button onClick={() => { onEmail(note); setShowShareMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"><Icons.Mail size={14} /> Send via Email</button>
                                    <button onClick={() => { onSMS(note); setShowShareMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"><Icons.Message size={14} /> Send via SMS</button>
                                    <button onClick={() => { onDoc(note); setShowShareMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"><Icons.Doc size={14} /> Download for Docs</button>
                                    <button onClick={() => { onDriveSave(note); setShowShareMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"><Icons.Upload size={14} /> Save to Drive</button>
                                </div>
                            )}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} className={`p-1.5 transition-colors rounded-full ${isTrashed ? 'text-red-600 bg-red-50 dark:bg-red-900/30 hover:bg-red-100' : 'text-gray-400 hover:text-red-600 hover:bg-black/5 dark:hover:bg-white/10'}`} title={isTrashed ? "Delete Forever" : "Trash"}>
                            {isTrashed ? <Icons.Trash2 size={14} /> : <Icons.Trash size={14} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}, (prev, next) => {
    // Custom comparison for React.memo
    if (prev.isCollapsed !== next.isCollapsed) return false;
    if (prev.isAlarming !== next.isAlarming) return false;
    if (prev.saturation !== next.saturation) return false;
    if (prev.cardBrightness !== next.cardBrightness) return false;
    if (prev.borderBrightness !== next.borderBrightness) return false;
    if (prev.previewLineLimit !== next.previewLineLimit) return false;
    if (prev.globalPreviewLineLimit !== next.globalPreviewLineLimit) return false;
    if (prev.checklistPadding !== next.checklistPadding) return false;
    if (prev.bulletPadding !== next.bulletPadding) return false;
    if (prev.collapsedLines.size !== next.collapsedLines.size) return false;
    
    // Note content changes
    if (prev.note.id !== next.note.id) return false;
    if (prev.note.updatedAt?.seconds !== next.note.updatedAt?.seconds) return false;
    if (prev.note.title !== next.note.title) return false;
    if (prev.note.content !== next.note.content) return false;
    if (prev.note.isPinned !== next.note.isPinned) return false;
    if (prev.note.isTrashed !== next.note.isTrashed) return false;
    if (prev.note.color !== next.note.color) return false;
    if (JSON.stringify(prev.note.tags) !== JSON.stringify(next.note.tags)) return false;
    
    return true;
});

const StackCard = ({ tag, count, onClick, notes, onDropNote, onReorder, saturation = 1, cardBrightness = 1, borderBrightness = 1 }) => {
    const [isDragOver, setIsDragOver] = React.useState(false);
    const filterStyle = { filter: `saturate(${saturation}) brightness(${cardBrightness})` };
    const handleDragStart = (e) => e.dataTransfer.setData("application/json", JSON.stringify({ type: 'STACK', tag }));
    const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); try { const data = JSON.parse(e.dataTransfer.getData("application/json")); if (data.type === 'NOTE') onDropNote(data.id, tag); else if (data.type === 'STACK' && data.tag !== tag) onReorder(data.tag, tag); } catch (err) {} };
    return (
        <div onClick={onClick} draggable="true" onDragStart={handleDragStart} onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop} className={`relative w-full h-48 cursor-pointer group transition-all duration-300 ${isDragOver ? 'scale-105 z-30' : 'hover:-translate-y-1'}`}>
            <div className={`absolute top-0 left-0 w-full h-full rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm z-0 transform translate-x-2 translate-y-2 bg-white dark:bg-gray-800`} style={filterStyle} />
            <div className={`absolute top-0 left-0 w-full h-full rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm z-10 transform translate-x-1 translate-y-1 bg-white dark:bg-gray-800`} style={filterStyle} />
            <div className={`absolute top-0 left-0 w-full h-full rounded-xl border-2 ${isDragOver ? 'border-slate-500 bg-slate-50' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'} shadow-md z-20 flex flex-col items-center justify-center p-4`} style={filterStyle}>
                <div className="bg-slate-100 dark:bg-slate-900/30 p-3 rounded-full mb-3 text-slate-600"><Icons.Tag size={24} /></div>
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1 truncate max-w-full px-2">#{tag}</h3>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{count} Notes</span>
            </div>
        </div>
    );
};

const VirtualNoteCard = (props) => {
    const isMobile = window.innerWidth < 768;
    
    // 1. Initial Height Estimation
    const estimateHeight = () => {
        if (props.matchHeight) return '100%';
        let contentLines = (props.note.content || '').split('\n').length;
        if (props.globalPreviewLineLimit > 0) {
            contentLines = Math.min(contentLines, props.globalPreviewLineLimit);
        } else {
            contentLines = Math.min(contentLines, props.previewLineLimit || 2);
        }
        const titleHeight = props.note.title ? 40 : 0;
        const baseHeight = 160; // Padding + Toolbar + Tags
        const contentHeight = contentLines * 24;
        return `${baseHeight + titleHeight + contentHeight}px`;
    };

    const [isVisible, setIsVisible] = React.useState(false);
    const [height, setHeight] = React.useState(estimateHeight);
    const containerRef = React.useRef(null);
    const hasBeenSeen = React.useRef(false);

    React.useEffect(() => {
        if (!containerRef.current) return;

        // 2. Intersection Observer with Mobile Tuning
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    hasBeenSeen.current = true;
                } else {
                    if (hasBeenSeen.current) {
                        setIsVisible(false);
                        if (entry.boundingClientRect.height > 0) {
                            setHeight(`${entry.boundingClientRect.height}px`);
                        }
                    }
                }
            },
            { 
                rootMargin: isMobile ? '1200px 0px' : '800px 0px', 
                threshold: 0 
            }
        );

        observer.observe(containerRef.current);
        
        // 3. Resize Observer for dynamic content changes
        let resizeObserver;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver((entries) => {
                const entry = entries[0];
                if (entry && entry.contentRect.height > 0 && isVisible) {
                    setHeight(`${entry.contentRect.height}px`);
                }
            });
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            observer.disconnect();
            if (resizeObserver) resizeObserver.disconnect();
        };
    }, [isVisible, isMobile]);

    const placeholderStyle = {
        minHeight: isVisible ? 'auto' : height,
        height: isVisible ? 'auto' : (props.matchHeight ? '100%' : height)
    };

    return (
        <div 
            ref={containerRef} 
            style={placeholderStyle}
            className={`w-full ${!isVisible ? 'bg-gray-100/30 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700' : ''}`}
        >
            {isVisible ? (
                <NoteCard {...props} />
            ) : (
                <div className="p-6 opacity-20 pointer-events-none">
                    {props.note.title && <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-4"></div>}
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                    </div>
                </div>
            )}
        </div>
    );
};

window.AudioPlayer = AudioPlayer;
window.NoteCard = NoteCard;
window.StackCard = StackCard;
window.VirtualNoteCard = VirtualNoteCard;