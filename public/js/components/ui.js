const Toast = ({ message, type = 'success', onClose, action }) => {
    React.useEffect(() => { const timer = setTimeout(onClose, 3500); return () => clearTimeout(timer); }, [onClose]);
    return (
        <div className="fixed bottom-4 left-4 z-[70] animate-fade-in">
            <div className="bg-gray-900 dark:bg-gray-700 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
                {type === 'success' && <Icons.Check size={18} className="text-green-400" />}
                {type === 'error' && <Icons.X size={18} className="text-red-400" />}
                <span className="text-sm font-medium">{message}</span>
                {action && (
                    <button onClick={action.onClick} className="ml-2 px-3 py-1 rounded-md bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white text-xs font-medium">{action.label}</button>
                )}
            </div>
        </div>
    );
};

const TagChip = ({ label, onRemove, onClick, selected = false, color = "blue", className="" }) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer select-none border";
    const colorClasses = {
        blue: selected 
            ? "bg-slate-700 text-white border-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:border-slate-500 dark:hover:bg-slate-500" 
            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-gray-800 dark:text-slate-300 dark:border-gray-700 dark:hover:bg-gray-700",
        gray: selected 
            ? "bg-gray-800 text-white border-gray-800 dark:bg-gray-600 dark:border-gray-500" 
            : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700",
    };
    return (
        <span className={`${baseClasses} ${colorClasses[color]} ${className}`} onClick={(e) => { e.stopPropagation(); onClick && onClick(label); }}>
            <span className="truncate max-w-[150px]">{label}</span>
            {onRemove && (
                <button onClick={(e) => { e.stopPropagation(); onRemove(label); }} className="ml-1.5 hover:text-red-500 focus:outline-none flex items-center">
                    <Icons.X size={14} />
                </button>
            )}
        </span>
    );
};

const ColorPicker = ({ selectedColor, onSelect }) => {
    return (
        <div className="flex gap-2 flex-wrap p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 w-64">
            {Object.entries(NOTE_COLORS).map(([key, value]) => (
                <button
                    key={key}
                    onClick={() => onSelect(key)}
                    title={value.label}
                    className={`w-6 h-6 rounded-full border ${value.circle} hover:scale-110 transition-transform ${selectedColor === key ? 'ring-2 ring-slate-500 ring-offset-2 dark:ring-offset-gray-800' : ''}`}
                />
            ))}
        </div>
    );
};

const UserAvatar = ({ user, onClick }) => {
    const [imgError, setImgError] = React.useState(false);

    return (
        <button onClick={onClick} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 flex items-center justify-center">
            {user.photoURL && !imgError ? (
                <img 
                    src={user.photoURL} 
                    alt="User" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                />
            ) : (
                <span className="flex items-center justify-center w-full h-full text-xs font-bold text-gray-600 dark:text-gray-300 select-none">
                    {user.displayName ? user.displayName[0].toUpperCase() : (user.email?.[0].toUpperCase() || 'U')}
                </span>
            )}
        </button>
    );
};

const EmptyState = ({ type = 'notes', message }) => {
    const illustrations = {
        notes: (
            <svg className="w-48 h-48 text-gray-200 dark:text-gray-700 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
        ),
        search: (
            <svg className="w-48 h-48 text-gray-200 dark:text-gray-700 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <path d="M11 8a3 3 0 0 0-3 3" opacity="0.5"></path>
            </svg>
        ),
        archive: (
            <svg className="w-48 h-48 text-gray-200 dark:text-gray-700 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="21 8 21 21 3 21 3 8"></polyline>
                <rect x="1" y="3" width="22" height="5"></rect>
                <line x1="10" y1="12" x2="14" y2="12"></line>
            </svg>
        ),
        trash: (
            <svg className="w-48 h-48 text-gray-200 dark:text-gray-700 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        ),
        folder: (
            <svg className="w-48 h-48 text-gray-200 dark:text-gray-700 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
        )
    };

    const defaultMessages = {
        notes: "No notes here yet. Create one!",
        search: "No matches found.",
        archive: "Archive is empty.",
        trash: "Trash is empty.",
        folder: "This stack is empty."
    };

    return (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            {illustrations[type] || illustrations.notes}
            <p className="text-gray-400 dark:text-gray-500 font-medium text-lg">{message || defaultMessages[type]}</p>
        </div>
    );
};

window.Toast = Toast;
window.TagChip = TagChip;
window.ColorPicker = ColorPicker;
window.UserAvatar = UserAvatar;
window.EmptyState = EmptyState;