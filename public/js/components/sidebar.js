const SidebarItem = ({ tag, parentTag, relationshipType, isPinned, isSelected, isLocked, isExcluded, onClick, onTogglePin, onToggleLock, onToggleExclude, onNoteDrop, depth = 0, onMoveTag, onCreateChild, onAddParent, hasChildren, isCollapsed, onToggleCollapse }) => {
    const [isDragOver, setIsDragOver] = React.useState(false);

    const handleDragStart = (e) => {
        e.stopPropagation();
        // Allow dragging for both reparenting and dropping onto notes
        e.dataTransfer.setData("application/json", JSON.stringify({ type: 'TAG_REPARENT', label: tag, fromParent: parentTag }));
        e.dataTransfer.effectAllowed = "copyMove";
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation(); // Critical: Stop bubbling to parent tags
        setIsDragOver(false);
        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json"));
            if (data.type === 'NOTE') {
                onNoteDrop(data.id, data.tags, tag);
            } else if (data.type === 'TAG_REPARENT') {
                // Prevent dropping on self
                if (data.label !== tag && onMoveTag) {
                    // Always ADD parent (Graph behavior) per user request
                    const isAdding = true; 
                    // TODO: Prompt for relationship type here if desired
                    onMoveTag(data.label, tag, isAdding, null, 'parent'); 
                }
            }
        } catch (err) { console.error(err); }
    };

    return (
        <>
            <div
                onClick={(e) => { if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SVG' && e.target.tagName !== 'PATH') onClick(tag); }} // Only trigger tag selection if not clicking a button/icon
                draggable="true"
                onDragStart={handleDragStart}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`group relative flex items-center px-3 py-2 rounded-lg text-sm transition-all cursor-pointer mb-1 ${
                    isSelected 
                    ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 font-medium' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                } ${isDragOver ? 'sidebar-drag-over ring-2 ring-slate-300' : ''}`}
                style={{ marginLeft: `${depth * 12}px` }}
            >
                <div className="flex items-center gap-1 overflow-hidden flex-1 min-w-0">
                    {hasChildren ? (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleCollapse(tag); }}
                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-sm"
                        >
                            {isCollapsed ? <Icons.ChevronUp size={14} /> : <Icons.ChevronDown size={14} />}
                        </button>
                    ) : (
                        <div className="w-5"></div> /* Spacer for alignment */
                    )}
                    {relationshipType && relationshipType !== 'parent' && (
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-tighter border border-gray-200 dark:border-gray-700 px-1 rounded mr-1">
                            {relationshipType}
                        </span>
                    )}
                    {isLocked ? <Icons.Lock size={14} className="text-red-400 shrink-0" /> : <Icons.Tag size={14} className={`shrink-0 ${isSelected ? "text-slate-500" : (isExcluded ? "text-red-400 opacity-50" : "text-gray-400")}`} />}
                    <span className={`truncate ${isExcluded ? 'line-through opacity-50' : ''}`}>#{tag}</span>
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-white via-white to-transparent dark:from-gray-850 dark:via-gray-850 pl-4 py-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggleExclude(tag); }}
                        className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 ${isExcluded ? 'text-red-500' : 'text-gray-300 dark:text-gray-500'}`}
                        title={isExcluded ? "Show Tag" : "Hide Tag"}
                    >
                        {isExcluded ? <Icons.EyeOff size={12} /> : <Icons.Eye size={12} />}
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onCreateChild(tag); }}
                        className="p-1 rounded-full text-gray-300 dark:text-gray-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30"
                        title="Add Child Tag"
                    >
                        <Icons.Plus size={12} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onAddParent(tag); }}
                        className="p-1 rounded-full text-gray-300 dark:text-gray-500 hover:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        title="Add Parent Tag"
                    >
                        <Icons.Link size={12} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggleLock(tag); }}
                        className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 ${isLocked ? 'text-red-500' : 'text-gray-300 dark:text-gray-500'}`}
                        title={isLocked ? "Unlock Tag" : "Lock Tag"}
                    >
                        {isLocked ? <Icons.Lock size={12} /> : <Icons.Unlock size={12} />}
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onTogglePin(tag); }}
                        className={`p-1 rounded-full ${isPinned ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-500 hover:text-yellow-500'}`}
                    >
                        {isPinned ? <Icons.StarFilled size={12} /> : <Icons.Star size={12} />}
                    </button>
                </div>
            </div>
        </>
    );
};

window.SidebarItem = SidebarItem;