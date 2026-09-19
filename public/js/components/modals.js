const DrawingModal = ({ isOpen, onClose, onSave }) => {
    const canvasRef = React.useRef(null);
    const [isDrawing, setIsDrawing] = React.useState(false);
    const [color, setColor] = React.useState('#000000');
    const [lineWidth, setLineWidth] = React.useState(3);
    const contextRef = React.useRef(null);

    React.useEffect(() => {
        if (isOpen && canvasRef.current) {
            const canvas = canvasRef.current;
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
            ctx.lineCap = 'round';
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            contextRef.current = ctx;
        }
    }, [isOpen]);

    React.useEffect(() => {
        if (contextRef.current) {
            contextRef.current.strokeStyle = color;
            contextRef.current.lineWidth = lineWidth;
        }
    }, [color, lineWidth]);

    const startDrawing = ({ nativeEvent }) => {
        if (!contextRef.current) return;
        const { offsetX, offsetY } = getCoordinates(nativeEvent);
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const finishDrawing = () => {
        if (!contextRef.current) return;
        contextRef.current.closePath();
        setIsDrawing(false);
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing || !contextRef.current) return;
        const { offsetX, offsetY } = getCoordinates(nativeEvent);
        contextRef.current.lineTo(offsetX, offsetY);
        contextRef.current.stroke();
    };

    const getCoordinates = (nativeEvent) => {
        if (nativeEvent.touches && nativeEvent.touches.length > 0) {
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            return {
                offsetX: nativeEvent.touches[0].clientX - rect.left,
                offsetY: nativeEvent.touches[0].clientY - rect.top
            };
        }
        return { offsetX: nativeEvent.offsetX, offsetY: nativeEvent.offsetY };
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        
        // JPEG doesn't support transparency, so we must fill with white first
        // to avoid black backgrounds on transparent areas.
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);

        const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.7);
        onSave(dataUrl);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 w-full max-w-lg flex flex-col gap-4 animate-fade-in">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Draw Sketch</h3>
                    <button onClick={onClose}><Icons.X size={24} className="text-gray-500" /></button>
                </div>
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white touch-none">
                    <canvas
                        ref={canvasRef}
                        style={{ width: '100%', height: '300px' }}
                        onMouseDown={startDrawing}
                        onMouseUp={finishDrawing}
                        onMouseMove={draw}
                        onTouchStart={startDrawing}
                        onTouchEnd={finishDrawing}
                        onTouchMove={draw}
                    />
                </div>
                <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex gap-2">
                        {['#000000', '#ef4444', '#64748b', '#22c55e', '#eab308'].map(c => (
                            <button 
                                key={c} 
                                onClick={() => setColor(c)} 
                                className={`w-6 h-6 rounded-full border border-gray-200 ${color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                        <div className="w-px h-6 bg-gray-300 mx-2"></div>
                        <button onClick={() => setLineWidth(3)} className={`p-1 rounded ${lineWidth === 3 ? 'bg-gray-200 dark:bg-gray-600' : ''}`}><div className="w-4 h-1 bg-gray-500 rounded-full"></div></button>
                        <button onClick={() => setLineWidth(6)} className={`p-1 rounded ${lineWidth === 6 ? 'bg-gray-200 dark:bg-gray-600' : ''}`}><div className="w-4 h-2 bg-gray-500 rounded-full"></div></button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={clearCanvas} className="px-3 py-1 text-sm text-red-500 hover:bg-red-50 rounded">Clear</button>
                        <button onClick={handleSave} className="px-4 py-1 text-sm bg-slate-700 text-white rounded hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500">Save</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SettingsModal = ({ isOpen, onClose, theme, setTheme, saturation, setSaturation, cardBrightness, setCardBrightness, borderBrightness, setBorderBrightness, textWrap, setTextWrap, matchHeight, setMatchHeight, fontSize, setFontSize, fontFamily, setFontFamily, previewLineLimit, setPreviewLineLimit, globalPreviewLineLimit, setGlobalPreviewLineLimit, checklistPadding, setChecklistPadding, bulletPadding, setBulletPadding, linkOpenBehavior, setLinkOpenBehavior, maxColumns, setMaxColumns, maxRecentTags, setMaxRecentTags, maxFavoriteTags, setMaxFavoriteTags, allTags, tagParents, tagChildren, onMoveTag, onUpdateRelationship, onReverseRelationship, onRenameTag, onDeleteTag, onRefreshTags, setConfirmModal, setPromptModal, relationshipTypes, onAddRelationshipType, onLocalExport, onDriveBackup, onImportNotes }) => {
    const { 
        aiProvider, setAiProvider, ollamaUrl, setOllamaUrl, 
        ollamaEmbedModel, setOllamaEmbedModel, ollamaChatModel, setOllamaChatModel, ollamaVisionModel, setOllamaVisionModel,
        openAiKey, setOpenAiKey, geminiKey, setGeminiKey,
        isSemanticSearchEnabled, setIsSemanticSearchEnabled, isAutoTaggingEnabled, setIsAutoTaggingEnabled, isOcrEnabled, setIsOcrEnabled,
        ollamaStatus, checkOllama
    } = window.useSmart();
    const [activeTab, setActiveTab] = React.useState('appearance');
    const [editingTag, setEditingTag] = React.useState(null);
    const [editValue, setEditValue] = React.useState('');
    const [tagFilter, setTagFilter] = React.useState('');
    const [newRel, setNewRel] = React.useState({ id: '', forward: '', reverse: '' });
    const [relModal, setRelModal] = React.useState({ isOpen: false, tag: '', initialParent: '', initialType: 'parent', isEditing: false });
    // Smart features initialization
    const [importStrategy, setImportStrategy] = React.useState('skip');
    const importFileRef = React.useRef(null);

    const onFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (onImportNotes) onImportNotes(data, importStrategy);
            } catch (err) {
                console.error("Invalid JSON", err);
                if (window.setToast) window.setToast({ message: "Invalid backup file.", type: "error" });
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleRename = (tag) => {
        if (editValue && editValue !== tag) {
            onRenameTag(tag, editValue);
        }
        setEditingTag(null);
        setEditValue('');
    };

    const handleAddRel = (e) => {
        e.preventDefault();
        if (newRel.id && newRel.forward && newRel.reverse) {
            const id = newRel.id.toLowerCase().replace(/[^a-z0-9]/g, '');
            onAddRelationshipType({ ...newRel, id });
            setNewRel({ id: '', forward: '', reverse: '' });
        }
    };

    const filteredTags = React.useMemo(() => {
        if (!tagFilter.trim()) return allTags;
        const q = tagFilter.toLowerCase();
        return allTags.filter(t => t.toLowerCase().includes(q));
    }, [allTags, tagFilter]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-backdrop" onClick={onClose} />
             <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-modal-entry flex flex-col max-h-[90vh] sm:max-h-[calc(100vh-2rem)]">
                 <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center relative z-10 shrink-0">
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white">Settings</h3>
                     <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"><Icons.X size={20} /></button>
                 </div>
                 <div className="flex border-b border-gray-100 dark:border-gray-700 relative z-10 overflow-x-auto custom-scrollbar shrink-0 bg-gray-50/50 dark:bg-black/10">
                     <button onClick={() => setActiveTab('appearance')} className={`flex-1 py-3 text-sm font-medium whitespace-nowrap px-6 transition-colors ${activeTab === 'appearance' ? 'text-slate-700 dark:text-slate-300 border-b-2 border-slate-700 dark:border-slate-400 bg-white dark:bg-gray-800' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>Appearance</button>
                     <button onClick={() => setActiveTab('smart')} className={`flex-1 py-3 text-sm font-medium whitespace-nowrap px-6 transition-colors ${activeTab === 'smart' ? 'text-slate-700 dark:text-slate-300 border-b-2 border-slate-700 dark:border-slate-400 bg-white dark:bg-gray-800' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>Smart Features</button>
                     <button onClick={() => setActiveTab('tags')} className={`flex-1 py-3 text-sm font-medium whitespace-nowrap px-6 transition-colors ${activeTab === 'tags' ? 'text-slate-700 dark:text-slate-300 border-b-2 border-slate-700 dark:border-slate-400 bg-white dark:bg-gray-800' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>Manage Tags</button>
                     <button onClick={() => setActiveTab('relationships')} className={`flex-1 py-3 text-sm font-medium whitespace-nowrap px-6 transition-colors ${activeTab === 'relationships' ? 'text-slate-700 dark:text-slate-300 border-b-2 border-slate-700 dark:border-slate-400 bg-white dark:bg-gray-800' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>Relationships</button>
                     <button onClick={() => setActiveTab('backup')} className={`flex-1 py-3 text-sm font-medium whitespace-nowrap px-6 transition-colors ${activeTab === 'backup' ? 'text-slate-700 dark:text-slate-300 border-b-2 border-slate-700 dark:border-slate-400 bg-white dark:bg-gray-800' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>Backup & Export</button>                 </div>
                 <div className="p-6 overflow-y-auto flex-1 relative z-10 custom-scrollbar">
                     {activeTab === 'appearance' ? (
                         <div className="space-y-6">
                             <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Theme</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'light', icon: Icons.Sun, label: 'Light' }, 
                                        { id: 'dark', icon: Icons.Moon, label: 'Dark' }, 
                                        { id: 'system', icon: Icons.Monitor, label: 'System' },
                                        { id: 'sepia', icon: Icons.Book, label: 'Sepia' },
                                        { id: 'midnight', icon: Icons.Moon, label: 'Midnight' },
                                        { id: 'nord', icon: Icons.CloudSnow, label: 'Nord' }
                                    ].map(opt => (
                                        <button key={opt.id} onClick={() => setTheme(opt.id)} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${theme === opt.id ? 'border-slate-500 bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-500' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                            <opt.icon size={24} className="mb-2" />
                                            <span className="text-xs font-medium">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                             </div>
                             
                             <div>
                                 <div className="flex justify-between items-center mb-2">
                                     <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Max Columns</h4>
                                     <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{maxColumns}</span>
                                 </div>
                                 <input 
                                     type="range" 
                                     min="1" 
                                     max="10" 
                                     step="1" 
                                     value={maxColumns} 
                                     onChange={(e) => setMaxColumns(parseInt(e.target.value))}
                                     className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                 />
                                 <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                     <span>1</span>
                                     <span>Auto</span>
                                     <span>10</span>
                                 </div>
                             </div>

                             <div>
                                 <div className="flex justify-between items-center mb-2">
                                     <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Font Size</h4>
                                     <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{fontSize}px</span>
                                 </div>
                                 <input 
                                     type="range" 
                                     min="12" 
                                     max="24" 
                                     step="1" 
                                     value={fontSize} 
                                     onChange={(e) => setFontSize(parseInt(e.target.value))}
                                     className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                 />
                                 <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                     <span>Small</span>
                                     <span>Medium</span>
                                     <span>Large</span>
                                 </div>
                             </div>

                             <div className="flex items-center justify-between">
                                 <div className="flex flex-col">
                                     <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Link Opening</span>
                                     <span className="text-xs text-gray-400">Where external links open</span>
                                 </div>
                                 <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                     <button 
                                        onClick={() => setLinkOpenBehavior('newWindow')}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${linkOpenBehavior === 'newWindow' ? 'bg-white dark:bg-gray-600 text-slate-700 dark:text-slate-300 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                     > New Tab </button>
                                     <button 
                                        onClick={() => setLinkOpenBehavior('sameTab')}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${linkOpenBehavior === 'sameTab' ? 'bg-white dark:bg-gray-600 text-slate-700 dark:text-slate-300 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                     > Same Tab </button>
                                 </div>
                             </div>

                             <div className="flex items-center justify-between">
                                 <div className="flex flex-col">
                                     <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Font Family</span>
                                     <span className="text-xs text-gray-400">Switch between Sans and Serif</span>
                                 </div>
                                 <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                     <button 
                                        onClick={() => setFontFamily('sans')}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${fontFamily === 'sans' ? 'bg-white dark:bg-gray-600 text-slate-700 dark:text-slate-300 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                     > Sans </button>
                                     <button 
                                        onClick={() => setFontFamily('serif')}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${fontFamily === 'serif' ? 'bg-white dark:bg-gray-600 text-slate-700 dark:text-slate-300 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                     > Serif </button>
                                 </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Checklist Spacing</h4>
                                        <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{checklistPadding}px</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="10" 
                                        step="1" 
                                        value={checklistPadding} 
                                        onChange={(e) => setChecklistPadding(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bullet Spacing</h4>
                                        <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{bulletPadding}px</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="10" 
                                        step="1" 
                                        value={bulletPadding} 
                                        onChange={(e) => setBulletPadding(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                    />
                                </div>
                             </div>

                             <div>
                                 <div className="flex justify-between items-center mb-2">
                                     <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">List Preview Line Limit</h4>
                                     <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{previewLineLimit} lines</span>
                                 </div>
                                 <input 
                                     type="range" 
                                     min="1" 
                                     max="10" 
                                     step="1" 
                                     value={previewLineLimit} 
                                     onChange={(e) => setPreviewLineLimit(parseInt(e.target.value))}
                                     className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                 />
                                 <p className="text-[10px] text-gray-400 mt-1 italic">Max lines per checklist/bullet item in preview cards.</p>
                             </div>

                              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                  <div className="flex items-center justify-between">
                                      <div className="flex flex-col">
                                          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Global Preview Line Limit</h4>
                                          <p className="text-[10px] text-gray-400 mt-1 italic">Limit the maximum total lines of the note body shown in preview cards.</p>
                                      </div>
                                      <button 
                                          onClick={() => setGlobalPreviewLineLimit(globalPreviewLineLimit > 0 ? 0 : 5)} 
                                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${globalPreviewLineLimit > 0 ? 'bg-slate-700 dark:bg-slate-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                      >
                                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalPreviewLineLimit > 0 ? 'translate-x-6' : 'translate-x-1'}`} />
                                      </button>
                                  </div>
                                  {globalPreviewLineLimit > 0 && (
                                      <div className="mt-3 animate-fade-in">
                                          <div className="flex justify-between items-center mb-1">
                                              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Max body lines to show</span>
                                              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{globalPreviewLineLimit} lines</span>
                                          </div>
                                          <input 
                                              type="range" 
                                              min="1" 
                                              max="25" 
                                              step="1" 
                                              value={globalPreviewLineLimit} 
                                              onChange={(e) => setGlobalPreviewLineLimit(parseInt(e.target.value))}
                                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                          />
                                      </div>
                                  )}
                              </div>

                             <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Sidebar & Navigation</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recent Tags</h4>
                                            <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{maxRecentTags}</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="15" 
                                            step="1" 
                                            value={maxRecentTags} 
                                            onChange={(e) => setMaxRecentTags(parseInt(e.target.value))}
                                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Favorite Tags</h4>
                                            <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{maxFavoriteTags}</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="15" 
                                            step="1" 
                                            value={maxFavoriteTags} 
                                            onChange={(e) => setMaxFavoriteTags(parseInt(e.target.value))}
                                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                        />
                                    </div>
                                </div>
                             </div>

                             <div>
                                 <div className="flex justify-between items-center mb-2">
                                     <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Color Saturation</h4>
                                     <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{saturation}x</span>
                                 </div>
                                 <input 
                                     type="range" 
                                     min="0" 
                                     max="2" 
                                     step="0.1" 
                                     value={saturation} 
                                     onChange={(e) => setSaturation(parseFloat(e.target.value))}
                                     className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                 />
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Card brightness</h4>
                                        <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{cardBrightness}x</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0.5" 
                                        max="3" 
                                        step="0.1" 
                                        value={cardBrightness} 
                                        onChange={(e) => setCardBrightness(parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Border brightness</h4>
                                        <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{borderBrightness}x</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0.1" 
                                        max="3" 
                                        step="0.1" 
                                        value={borderBrightness} 
                                        onChange={(e) => setBorderBrightness(parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                    />
                                </div>
                             </div>

                             <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">List Text Wrapping</span>
                                        <span className="text-xs text-gray-400">Wrap list items to multiple lines</span>
                                    </div>
                                    <button 
                                        onClick={() => setTextWrap(!textWrap)} 
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${textWrap ? 'bg-slate-700 dark:bg-slate-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${textWrap ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Uniform Note Height</span>
                                        <span className="text-xs text-gray-400">Stretch notes to same height</span>
                                    </div>
                                    <button 
                                        onClick={() => setMatchHeight(!matchHeight)} 
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${matchHeight ? 'bg-slate-700 dark:bg-slate-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${matchHeight ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                             </div>
                         </div>
                     ) : activeTab === 'smart' ? (
                        <div className="space-y-8">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">AI Provider</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'ollama', icon: Icons.Cpu, label: 'Ollama' },
                                        { id: 'cloud', icon: Icons.Cloud, label: 'Cloud API' },
                                        { id: 'disabled', icon: Icons.X, label: 'Disabled' }
                                    ].map(opt => (
                                        <button key={opt.id} onClick={() => setAiProvider(opt.id)} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${aiProvider === opt.id ? 'border-slate-500 bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-500' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                            <opt.icon size={24} className="mb-2" />
                                            <span className="text-xs font-medium">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {aiProvider === 'ollama' && (
                                <div className="space-y-4 animate-fade-in bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ollama Configuration</h4>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${ollamaStatus === 'online' ? 'bg-green-500 animate-pulse' : ollamaStatus === 'offline' ? 'bg-red-500' : 'bg-gray-400'}`} />
                                            <span className="text-[10px] font-medium text-gray-500 uppercase">{ollamaStatus}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Server URL</label>
                                            <input type="text" value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} onBlur={() => checkOllama()} placeholder="http://localhost:11434" className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none dark:text-white" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Embed Model</label>
                                                <input type="text" value={ollamaEmbedModel} onChange={(e) => setOllamaEmbedModel(e.target.value)} placeholder="nomic-embed-text" className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none dark:text-white" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Chat Model</label>
                                                <input type="text" value={ollamaChatModel} onChange={(e) => setOllamaChatModel(e.target.value)} placeholder="llama3" className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none dark:text-white" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Vision Model (for OCR)</label>
                                            <input type="text" value={ollamaVisionModel} onChange={(e) => setOllamaVisionModel(e.target.value)} placeholder="llava" className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none dark:text-white" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {aiProvider === 'cloud' && (
                                <div className="space-y-4 animate-fade-in bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cloud API Configuration</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">OpenAI API Key</label>
                                            <input type="password" value={openAiKey} onChange={(e) => setOpenAiKey(e.target.value)} placeholder="sk-..." className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Google Gemini Key</label>
                                            <input type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="AIza..." className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none dark:text-white" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Feature Toggles</h4>
                                
                                <div className="flex items-center justify-between group">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Semantic Search</span>
                                        <span className="text-[10px] text-gray-400">Find notes by meaning, not just keywords</span>
                                    </div>
                                    <button onClick={() => setIsSemanticSearchEnabled(!isSemanticSearchEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isSemanticSearchEnabled ? 'bg-slate-700 dark:bg-slate-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSemanticSearchEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between group">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Smart Auto-Tagging</span>
                                        <span className="text-[10px] text-gray-400">Suggest tags based on note content</span>
                                    </div>
                                    <button onClick={() => setIsAutoTaggingEnabled(!isAutoTaggingEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAutoTaggingEnabled ? 'bg-slate-700 dark:bg-slate-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAutoTaggingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between group">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">AI OCR & Transcription</span>
                                        <span className="text-[10px] text-gray-400">Extract text from images and audio</span>
                                    </div>
                                    <button onClick={() => setIsOcrEnabled(!isOcrEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isOcrEnabled ? 'bg-slate-700 dark:bg-slate-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isOcrEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                     ) : activeTab === 'relationships' ? (
                        <div className="space-y-6">
                            <div className="bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-900/50">
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Manage Relationships</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400">Define semantic connections between tags (e.g., "Causes", "Explains").</p>
                            </div>

                            <div className="space-y-3">
                                {relationshipTypes && relationshipTypes.map(rel => (
                                    <div key={rel.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                                        <div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-white capitalize">{rel.id}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {rel.forward} <span className="mx-1 text-gray-300">/</span> {rel.reverse}
                                            </div>
                                        </div>
                                        <div className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-[10px] font-mono text-gray-500 dark:text-gray-300">
                                            ID: {rel.id}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={handleAddRel} className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Add New Type</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="ID (e.g. causes)" 
                                        value={newRel.id}
                                        onChange={e => setNewRel({...newRel, id: e.target.value})}
                                        className="col-span-2 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none dark:text-white"
                                        required
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Forward Label (e.g. Causes)" 
                                        value={newRel.forward}
                                        onChange={e => setNewRel({...newRel, forward: e.target.value})}
                                        className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none dark:text-white"
                                        required
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Reverse Label (e.g. Caused by)" 
                                        value={newRel.reverse}
                                        onChange={e => setNewRel({...newRel, reverse: e.target.value})}
                                        className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none dark:text-white"
                                        required
                                    />
                                </div>
                                <button type="submit" className="w-full py-2 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded-lg text-sm font-medium transition-colors">Add Relationship Type</button>
                            </form>
                        </div>
                     ) : activeTab === 'backup' ? (
                        <div className="space-y-6">
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/50 flex gap-3">
                                <Icons.AlertTriangle className="text-yellow-600 dark:text-yellow-400 shrink-0" size={20} />
                                <div>
                                    <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-300 mb-1">Backup Your Data</h4>
                                    <p className="text-xs text-yellow-700 dark:text-yellow-400">Regular backups ensure you never lose your notes. You can export a local file or save directly to Google Drive.</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-white dark:bg-gray-600 rounded-lg shadow-sm">
                                            <Icons.Download className="text-slate-500" size={20} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-white">Local Export</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">Download a .json file of all notes & settings</div>
                                        </div>
                                    </div>
                                    <button onClick={onLocalExport} className="w-full py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors shadow-sm">
                                        Download Backup
                                    </button>
                                </div>

                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-white dark:bg-gray-600 rounded-lg shadow-sm">
                                            <Icons.Upload className="text-purple-500" size={20} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-white">Import Backup</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">Restore notes from a .json file</div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3 mb-4">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conflict Strategy</div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {[
                                                { id: 'skip', label: 'Keep Existing', desc: 'Skip imported notes if ID exists' },
                                                { id: 'overwrite', label: 'Overwrite', desc: 'Replace existing notes with imported' },
                                                { id: 'duplicate', label: 'Add All', desc: 'Create new notes even if ID exists' }
                                            ].map(s => (
                                                <button 
                                                    key={s.id}
                                                    onClick={() => setImportStrategy(s.id)}
                                                    className={`px-3 py-2 text-left rounded-lg border transition-all ${importStrategy === s.id ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                                >
                                                    <div className="text-xs font-bold dark:text-white">{s.label}</div>
                                                    <div className="text-[10px] text-gray-400 leading-tight">{s.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <input type="file" ref={importFileRef} onChange={onFileChange} accept=".json" className="hidden" />
                                    <button onClick={() => importFileRef.current?.click()} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                                        Select File & Import
                                    </button>
                                </div>
                            </div>
                        </div>
                     ) : activeTab === 'tags' ? (
                         <div className="space-y-4">
                             <div className="flex flex-col gap-3 mb-3">
                                 <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">All Tags ({allTags.length})</h4>
                                    <button onClick={onRefreshTags} className="p-1 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded" title="Refresh Tags"><Icons.RefreshCw size={16} /></button>
                                 </div>
                                 <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="Search tags..." 
                                        value={tagFilter}
                                        onChange={(e) => setTagFilter(e.target.value)}
                                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none dark:text-white"
                                    />
                                    {tagFilter && (
                                        <button 
                                            onClick={() => setTagFilter('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                        >
                                            <Icons.X size={14} />
                                        </button>
                                    )}
                                 </div>
                             </div>
                             {filteredTags.length === 0 ? <p className="text-gray-400 italic text-sm text-center py-4">No tags found.</p> : filteredTags.map(tag => (
                                 <div key={tag} className="flex flex-col p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 group">
                                     <div className="flex items-center justify-between mb-2">
                                         {editingTag === tag ? (
                                             <div className="flex items-center gap-2 flex-1">
                                                 <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1 text-sm border rounded px-2 py-1 dark:bg-gray-600 dark:text-white dark:border-gray-500" autoFocus />
                                                 <button onClick={() => handleRename(tag)} className="text-green-600 hover:bg-green-100 p-1 rounded"><Icons.Check size={16} /></button>
                                                 <button onClick={() => setEditingTag(null)} className="text-gray-500 hover:bg-gray-100 p-1 rounded"><Icons.X size={16} /></button>
                                             </div>
                                         ) : (
                                             <>
                                                 <span className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-sm"><Icons.Tag size={14} className="text-slate-500" /> #{tag}</span>
                                                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                     <button onClick={() => { setEditingTag(tag); setEditValue(tag); }} className="p-1 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded" title="Rename"><Icons.Edit size={14} /></button>
                                                     <button onClick={() => { 
                                                         setConfirmModal({
                                                             isOpen: true,
                                                             title: "Delete Tag?",
                                                             message: `Delete tag #${tag} from all notes?`,
                                                             confirmText: "Delete",
                                                             onConfirm: () => onDeleteTag(tag)
                                                         });
                                                     }} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Delete"><Icons.Trash2 size={14} /></button>
                                                 </div>
                                             </>
                                         )}
                                     </div>
                                     
                                     {/* Relations Section */}
                                     <div className="space-y-2 mt-1">
                                         {/* Parents */}
                                         <div className="flex flex-wrap items-center gap-1.5">
                                             <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Parents:</span>
                                             {(tagParents[tag] || []).length === 0 ? <span className="text-[10px] text-gray-400 italic">None (Root)</span> : tagParents[tag].map(pObj => {
                                                 const pId = typeof pObj === 'string' ? pObj : pObj.id;
                                                 const pType = typeof pObj === 'string' ? 'parent' : pObj.type;
                                                 const relType = relationshipTypes.find(r => r.id === pType) || { forward: pType, reverse: '' };
                                                 return (
                                                     <div key={pId} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded px-2 py-0.5 border border-gray-200 dark:border-gray-600">
                                                         <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                                                             {pType !== 'parent' ? `${relType.forward} ${pId}` : pId}
                                                         </span>
                                                         <button 
                                                            onClick={() => setRelModal({ isOpen: true, tag, initialParent: pId, initialType: pType, isEditing: true })}
                                                            className="text-slate-500 hover:text-slate-700"
                                                            title="Edit Relationship"
                                                         >
                                                             <Icons.Edit size={10} />
                                                         </button>
                                                         <button 
                                                            onClick={() => {
                                                                if (onReverseRelationship) {
                                                                    onReverseRelationship(tag, pId, pType);
                                                                } else {
                                                                    // Fallback
                                                                    onMoveTag(tag, null, false, pId);
                                                                    onMoveTag(pId, tag, true, null, pType);
                                                                }
                                                            }}
                                                            className="text-purple-500 hover:text-purple-700"
                                                            title="Reverse Direction"
                                                         >
                                                             <Icons.RefreshCw size={10} />
                                                         </button>
                                                         <button 
                                                            onClick={() => onMoveTag(tag, null, false, pId)}
                                                            className="text-red-400 hover:text-red-600 ml-0.5"
                                                            title="Remove Relationship"
                                                         >
                                                             <Icons.X size={10} />
                                                         </button>
                                                     </div>
                                                 );
                                             })}
                                             <button 
                                                onClick={() => setRelModal({ isOpen: true, tag, initialParent: '', initialType: 'parent', isEditing: false })}
                                                className="p-1 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-full"
                                                title="Add Parent"
                                             >
                                                 <Icons.Plus size={10} />
                                             </button>
                                         </div>

                                         {/* Children */}
                                         <div className="flex flex-wrap items-center gap-1.5">
                                             <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Children:</span>
                                             {(tagChildren[tag] || []).length === 0 ? <span className="text-[10px] text-gray-400 italic">None</span> : tagChildren[tag].map(c => {
                                                 const relType = relationshipTypes.find(r => r.id === c.type) || { forward: '', reverse: c.type };
                                                 return (
                                                     <div key={c.id} className="flex items-center gap-1 bg-slate-50/50 dark:bg-slate-900/20 rounded px-2 py-0.5 border border-slate-100/50 dark:border-slate-900/40 opacity-80">
                                                         <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                                             {c.type !== 'parent' ? `${relType.reverse} ${c.id}` : c.id}
                                                         </span>
                                                     </div>
                                                 );
                                             })}
                                         </div>
                                     </div>
                                 </div>
                             ))}
                             <RelationshipModal 
                                isOpen={relModal.isOpen} 
                                onClose={() => setRelModal({ ...relModal, isOpen: false })}
                                allTags={allTags}
                                relationshipTypes={relationshipTypes}
                                initialParent={relModal.initialParent}
                                initialType={relModal.initialType}
                                title={relModal.isEditing ? "Edit Relationship" : "Add Relationship"}
                                onSubmit={(newP, newType) => {
                                    if (relModal.isEditing) {
                                        if (onUpdateRelationship) {
                                            onUpdateRelationship(relModal.tag, relModal.initialParent, newP, newType);
                                        } else {
                                            onMoveTag(relModal.tag, newP, false, relModal.initialParent, newType);
                                        }
                                    } else {
                                        onMoveTag(relModal.tag, newP, true, null, newType);
                                    }
                                }}
                             />
                         </div>
                     ) : null}
                 </div>
             </div>
        </div>
    )
};

const ShareModal = ({ isOpen, onClose, note, onShare }) => {
    const [email, setEmail] = React.useState('');
    const [error, setError] = React.useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setError('Please enter a valid email address.');
            return;
        }
        if (email.trim()) {
            onShare(note.id, email.trim());
            setEmail('');
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-backdrop" onClick={onClose} />
             <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-modal-entry">
                 <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 relative z-10">
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white">Share Note</h3>
                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Allow another user to see this note in their app.</p>
                 </div>
                 <div className="p-6 space-y-4 relative z-10">
                     <form onSubmit={handleSubmit} className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User Email</label>
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <input type="email" required placeholder="friend@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} className={`flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-slate-500 outline-none ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                <button type="submit" className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">Share</button>
                            </div>
                            {error && <span className="text-xs text-red-500">{error}</span>}
                        </div>
                     </form>
                     {note && note.sharedWith && note.sharedWith.length > 0 && (
                         <div>
                             <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Shared with</p>
                             <div className="flex flex-wrap gap-2">
                                {note.sharedWith.map(email => (
                                    <span key={email} className="inline-flex items-center px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300">{email}</span>
                                ))}
                             </div>
                         </div>
                     )}
                 </div>
             </div>
        </div>
    );
};

const PinModal = ({ isOpen, onClose, mode, onConfirm }) => {
    const [pin, setPin] = React.useState('');
    const inputRef = React.useRef(null);

    React.useEffect(() => {
        if (isOpen) {
            setPin('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(pin);
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-backdrop" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-xs overflow-hidden animate-modal-entry p-6 text-center">
                <div className="relative z-10">
                    <div className="mb-4 text-slate-500 dark:text-slate-400 flex justify-center"><Icons.Lock size={32} /></div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{mode === 'create' ? 'Set Privacy PIN' : 'Enter PIN'}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">{mode === 'create' ? 'Create a 4-digit PIN to secure your locked tags.' : 'Access your locked notes.'}</p>
                    <form onSubmit={handleSubmit}>
                        <input ref={inputRef} type="password" pattern="[0-9]*" inputMode="numeric" maxLength="4" className="w-32 text-center text-3xl tracking-widest font-bold border-b-2 border-gray-300 dark:border-gray-600 focus:border-slate-500 bg-transparent outline-none dark:text-white mb-6" value={pin} onChange={(e) => setPin(e.target.value)} />
                        <button type="submit" className="w-full bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white py-2 rounded-lg font-medium transition-colors">{mode === 'create' ? 'Save PIN' : 'Unlock'}</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

const LinksModal = ({ isOpen, onClose, note, allNotes, onOpenNote }) => {
    if (!isOpen || !note) return null;

    // Outgoing links: Links FROM this note TO others
    const outgoingLinks = [];
    const seenOutgoingIds = new Set();
    const linkRegex = /(?:internal:\/\/|::)([a-z0-9]{4,})/gi;
    let match;
    const content = note.content || '';
    while ((match = linkRegex.exec(content)) !== null) {
        const targetId = match[1].toLowerCase();
        if (seenOutgoingIds.has(targetId)) continue;
        seenOutgoingIds.add(targetId);
        const target = allNotes.find(n => (n.shortId && n.shortId.toLowerCase() === targetId) || n.id === targetId);
        if (target && target.id !== note.id) outgoingLinks.push(target);
    }

    // Incoming links: Links FROM others TO this note
    const incomingLinks = allNotes.filter(n => {
        if (n.id === note.id) return false;
        const c = n.content || '';
        const shortIdMatch = note.shortId && (c.includes(`::${note.shortId}`) || c.includes(`internal://${note.shortId}`));
        const idMatch = note.id && (c.includes(`::${note.id}`) || c.includes(`internal://${note.id}`));
        return shortIdMatch || idMatch;
    });

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-backdrop" onClick={onClose} />
             <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-modal-entry flex flex-col max-h-[80vh]">
                 <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center relative z-10">
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white">Note Links</h3>
                     <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"><Icons.X size={20} /></button>
                 </div>
                 <div className="p-6 overflow-y-auto flex-1 space-y-6 relative z-10">
                     <div>
                         <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Linked to (Outgoing)</h4>
                         {outgoingLinks.length === 0 ? <p className="text-sm text-gray-400 italic">No outgoing links.</p> : (
                             <div className="space-y-2">
                                 {outgoingLinks.map(n => (
                                     <div key={n.id} onClick={() => onOpenNote(n)} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors">
                                         <div className="font-medium text-gray-900 dark:text-white text-sm">{n.title || 'Untitled Note'}</div>
                                         <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{n.content}</div>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </div>
                     <div>
                         <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Linked by (Backlinks)</h4>
                         {incomingLinks.length === 0 ? <p className="text-sm text-gray-400 italic">No backlinks found.</p> : (
                             <div className="space-y-2">
                                 {incomingLinks.map(n => (
                                     <div key={n.id} onClick={() => onOpenNote(n)} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors">
                                         <div className="font-medium text-gray-900 dark:text-white text-sm">{n.title || 'Untitled Note'}</div>
                                         <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{n.content}</div>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </div>
                 </div>
             </div>
        </div>
    );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", type = "danger" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-backdrop" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-modal-entry p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">{cancelText}</button>
                    <button 
                        onClick={() => { onConfirm(); onClose(); }} 
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

const RelationshipModal = ({ isOpen, onClose, onSubmit, title, allTags, relationshipTypes, initialParent = "", initialType = "parent" }) => {
    const [parent, setParent] = React.useState(initialParent);
    const [type, setType] = React.useState(initialType);
    const [tagFilter, setTagFilter] = React.useState("");

    React.useEffect(() => {
        if (isOpen) {
            setParent(initialParent);
            setType(initialType);
            setTagFilter("");
        }
    }, [isOpen, initialParent, initialType]);

    if (!isOpen) return null;

    const filteredTags = allTags.filter(t => t.toLowerCase().includes(tagFilter.toLowerCase())).slice(0, 10);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-backdrop" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-modal-entry p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Parent Tag</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={parent}
                                onChange={(e) => { setParent(e.target.value); setTagFilter(e.target.value); }}
                                placeholder="Tag name..."
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none dark:text-white text-sm"
                            />
                            {tagFilter && filteredTags.length > 0 && parent !== filteredTags[0] && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden">
                                    {filteredTags.map(t => (
                                        <button key={t} onClick={() => { setParent(t); setTagFilter(""); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors">#{t}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Relationship Type</label>
                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {relationshipTypes.map(rel => (
                                <button 
                                    key={rel.id} 
                                    onClick={() => setType(rel.id)}
                                    className={`px-4 py-2 text-sm text-left rounded-lg border transition-all ${type === rel.id ? 'border-slate-500 bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300' : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600'}`}
                                >
                                    <div className="font-bold">{rel.forward}</div>
                                    <div className="text-[10px] opacity-70">{rel.reverse}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                        <button 
                            disabled={!parent}
                            onClick={() => { onSubmit(parent.trim().toLowerCase(), type); onClose(); }}
                            className="px-4 py-2 text-sm font-medium text-white bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md shadow-slate-900/10"
                        >
                            Save Relationship
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PromptModal = ({ isOpen, onClose, onSubmit, title, message, placeholder, defaultValue = "", confirmText = "Submit", type = "primary" }) => {
    const [value, setValue] = React.useState(defaultValue);
    const inputRef = React.useRef(null);

    React.useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, defaultValue]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(value);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-backdrop" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-modal-entry p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                {message && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{message}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={value} 
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none dark:text-white text-sm"
                    />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
                        <button 
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 rounded-lg transition-colors"
                        >
                            {confirmText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

window.DrawingModal = DrawingModal;
window.SettingsModal = SettingsModal;
window.ShareModal = ShareModal;
window.PinModal = PinModal;
window.LinksModal = LinksModal;
window.ConfirmationModal = ConfirmationModal;
window.PromptModal = PromptModal;