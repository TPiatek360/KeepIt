const PinnedSection = () => {
    const { notes, loading } = useNotes();
    const { collapsedSections, winWidth, mobileLayout } = useUI();
    const { 
        saturation, cardBrightness, borderBrightness, matchHeight, 
        checklistPadding, bulletPadding, previewLineLimit, globalPreviewLineLimit, lockedTags 
    } = useSettings();
    const { 
        handleDelete, handleRestore, handleCopyForDocs, toggleNotePin, toggleArchive,
        addTagToNote, handleColorChange, toggleMarkdownCheck, handleDeleteCheckItem,
        handleReorder, handleShowLinks, handleInternalLinkClick, unlockSession,
        setNoteHistory, setCurrentNote, setIsEditorOpen, setNoteToShare, setIsShareModalOpen,
        isSessionUnlocked, handleDismissAlarm
    } = useActions(); // We'll need to define useActions or move these to contexts

    const pinnedNotes = notes.filter(n => n.isPinned);
    if (pinnedNotes.length === 0 || loading) return null;

    let colCount = 1;
    if (winWidth >= 1280) colCount = 4;
    else if (winWidth >= 1024) colCount = 3;
    else if (winWidth >= 768) colCount = 2;
    else colCount = mobileLayout === 'grid-2' ? 2 : 1;

    const cardProps = {
        allNotes: notes, checklistPadding, bulletPadding, saturation, cardBrightness, borderBrightness, matchHeight,
        onToggleSection: (noteId, lineIndex) => { /* logic */ }, // Needs to come from UI context
        previewLineLimit, globalPreviewLineLimit, onDismissAlarm: handleDismissAlarm, onUnlockRequest: unlockSession,
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
                        if (localData && (!note.updatedAt || localData.localSavedAt / 1000 > (note.updatedAt.seconds || 0))) {
                            freshNote = { ...note, ...localData, updatedAt: { seconds: Math.floor(localData.localSavedAt / 1000) } };
                        }
                    } catch (e) {}
                }

                // Try to find the freshest version in currentNote if available
                const latestNote = (setCurrentNote && typeof currentNote !== 'undefined' && currentNote?.id === freshNote.id && (!freshNote.updatedAt || (currentNote.updatedAt?.seconds || 0) >= (freshNote.updatedAt?.seconds || 0)))
                    ? currentNote 
                    : freshNote;

                setNoteHistory([]); 
                setCurrentNote(latestNote); 
                setIsEditorOpen(true); 
            } 
        },
        onDelete: handleDelete, onRestore: handleRestore, onCopy: handleCopyForDocs, onPin: toggleNotePin, onArchive: toggleArchive,
        onOpenShare: (note) => { setNoteToShare(note); setIsShareModalOpen(true); },
        onAddTag: addTagToNote, onColorChange: handleColorChange, onToggleMarkdownCheck: toggleMarkdownCheck, onDeleteCheckItem: handleDeleteCheckItem,
        onReorder: handleReorder, onShowLinks: handleShowLinks, onInternalLinkClick: handleInternalLinkClick,
        isLocked: (n) => n.tags?.some(t => lockedTags.includes(t)) && !isSessionUnlocked
    };

    return (
        <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 pl-1 flex items-center gap-2"><Icons.PinFilled size={12} /> Pinned</h3>
            <div className="flex gap-4 items-start flex-wrap">
                {Array.from({ length: colCount }).map((_, colIdx) => (
                    <div key={colIdx} className="flex-1 flex flex-col gap-4 min-w-[250px]">
                        {pinnedNotes.filter((_, i) => i % colCount === colIdx).map(n => (
                            <NoteCard key={n.id} note={n} {...cardProps} isLocked={cardProps.isLocked(n)} isArchived={n.isArchived} collapsedLines={collapsedSections[n.id] || new Set()} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ... similar for OthersSection
