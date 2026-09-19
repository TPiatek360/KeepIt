const GraphView = ({ notes, tags, tagParents, tagLayout, savedViewport, snapshots, selectedTags, onSave, onSaveTagLayout, onBatchSaveLayout, onSaveSnapshot, onLoadSnapshot, onDeleteSnapshot, onEdit, onAddTag, onTagOperation, onUpdateRelationship, relationshipTypes }) => {
    const [scale, setScale] = React.useState(savedViewport?.scale || 1);
    const [pan, setPan] = React.useState(savedViewport ? { x: savedViewport.x, y: savedViewport.y } : { x: 0, y: 0 });
    const [isDraggingCanvas, setIsDraggingCanvas] = React.useState(false);
    const longPressTimeoutRef = React.useRef(null);
    const hasTriggeredLongPressRef = React.useRef(false);
    const [draggingNode, setDraggingNode] = React.useState(null); 
    const [connectingNode, setConnectingNode] = React.useState(null); 
    const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
    const [selectedRelType, setSelectedRelType] = React.useState(relationshipTypes[0]?.id || 'related');
    const [isSnapEnabled, setIsSnapEnabled] = React.useState(false);
    const [selectedEdge, setSelectedEdge] = React.useState(null); 
    const [showArchived, setShowArchived] = React.useState(false);
    const [isOrganizing, setIsOrganizing] = React.useState(false);
    const [showSnapshots, setShowSnapshots] = React.useState(false);
    const [snapshotName, setSnapshotName] = React.useState('');
    const [selectedNodeIds, setSelectedNodeIds] = React.useState(new Set());
    const [selectionBox, setSelectionBox] = React.useState(null);
    
    const canvasRef = React.useRef(null);
    const workerRef = React.useRef(null);
    const lastMouseRef = React.useRef({ x: 0, y: 0 });
    const TAG_PREFIX = 'TAG__';
    const GRID_SIZE = 20;

    // Initialize Worker
    React.useEffect(() => {
        workerRef.current = new Worker('js/graph-worker.js');
        workerRef.current.onmessage = (e) => {
            const { updates } = e.data;
            
            // Phase 3: Add a settling delay before snapping
            setTimeout(() => {
                if (onBatchSaveLayout) {
                    const snappedUpdates = updates.map(u => ({
                        ...u,
                        x: isSnapEnabled ? Math.round(u.x / GRID_SIZE) * GRID_SIZE : u.x,
                        y: isSnapEnabled ? Math.round(u.y / GRID_SIZE) * GRID_SIZE : u.y
                    }));
                    onBatchSaveLayout(snappedUpdates, { x: pan.x, y: pan.y, scale });
                }
                setIsOrganizing(false);
            }, 150);
        };
        return () => workerRef.current.terminate();
    }, [pan.x, pan.y, scale, onBatchSaveLayout, isSnapEnabled]);

    React.useEffect(() => {
        const canvasEl = canvasRef.current;
        if (!canvasEl) return;

        const onWheel = (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const zoomSensitivity = 0.001;
                
                const rect = canvasEl.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                setScale(prevScale => {
                    const newScale = Math.min(Math.max(0.1, prevScale - e.deltaY * zoomSensitivity), 5);
                    const scaleDiff = newScale - prevScale;
                    
                    setPan(prevPan => {
                        const newPanX = prevPan.x - (mouseX - prevPan.x) * (scaleDiff / prevScale);
                        const newPanY = prevPan.y - (mouseY - prevPan.y) * (scaleDiff / prevScale);
                        return { x: newPanX, y: newPanY };
                    });
                    
                    return newScale;
                });
            } else {
                setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
            }
        };

        canvasEl.addEventListener('wheel', onWheel, { passive: false });
        return () => canvasEl.removeEventListener('wheel', onWheel);
    }, []);

    // Filter Notes based on Show Archived toggle
    const displayNotes = React.useMemo(() => {
        return showArchived ? notes : notes.filter(n => !n.isArchived);
    }, [notes, showArchived]);

    // Combine Notes and Tags into Nodes with Default Positions
    const nodesWithPos = React.useMemo(() => {
        // Place notes in a grid starting at 100,100
        const noteNodes = displayNotes.map((n, i) => ({
            ...n,
            nodeType: 'note',
            x: n.x ?? (100 + (i % 4) * 260),
            y: n.y ?? (100 + Math.floor(i / 4) * 220)
        }));

        // Place tags in a column to the right
        const tagNodes = (tags || []).map((t, i) => {
            const layout = tagLayout[t] || {};
            return {
                id: `${TAG_PREFIX}${t}`,
                originalId: t,
                title: `#${t}`,
                nodeType: 'tag',
                x: layout.x ?? (1200 + (i % 3) * 180),
                y: layout.y ?? (100 + Math.floor(i / 3) * 100),
                color: 'gray'
            };
        });

        return [...noteNodes, ...tagNodes];
    }, [displayNotes, tags, tagLayout]);

    // Zoom to Tag
    React.useEffect(() => {
        if (selectedTags && selectedTags.length > 0 && canvasRef.current) {
            const targetTag = selectedTags[selectedTags.length - 1];
            const targetId = `${TAG_PREFIX}${targetTag}`;
            const node = nodesWithPos.find(n => n.id === targetId);
            
            if (node) {
                const rect = canvasRef.current.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                setPan({
                    x: centerX - node.x * scale,
                    y: centerY - node.y * scale
                });
            }
        }
    }, [selectedTags, nodesWithPos, scale]); 

    // Build Edges
    const edges = React.useMemo(() => {
        const list = [];
        const seenEdges = new Set();
        const addEdge = (source, target, type, color, dashed) => {
            const key = `${source}->${target}`;
            if (seenEdges.has(key)) return;
            seenEdges.add(key);
            list.push({ source, target, type, color, dashed });
        };

        const linkRegex = /(?:internal:\/\/|::)([a-z0-9]{4,})/gi;

        displayNotes.forEach(note => {
            (note.relations || []).forEach(rel => {
                addEdge(note.id, rel.targetId, rel.type, '#64748b', false); 
            });
            (note.tags || []).forEach(t => {
                addEdge(note.id, `${TAG_PREFIX}${t}`, 'tagged', '#10b981', false); 
            });
            // Extract internal links from content
            const content = note.content || '';
            let match;
            linkRegex.lastIndex = 0;
            while ((match = linkRegex.exec(content)) !== null) {
                const targetId = match[1].toLowerCase();
                const target = displayNotes.find(n => (n.shortId && n.shortId.toLowerCase() === targetId) || n.id === targetId);
                if (target && target.id !== note.id) {
                    addEdge(note.id, target.id, 'link', '#38bdf8', true);
                }
            }
        });
        Object.entries(tagParents).forEach(([child, parents]) => {
            if (!parents) return;
            parents.forEach(pObj => {
                const pId = typeof pObj === 'string' ? pObj : pObj.id;
                addEdge(`${TAG_PREFIX}${child}`, `${TAG_PREFIX}${pId}`, 'parent', '#9ca3af', true); 
            });
        });
        return list;
    }, [displayNotes, tagParents]);

    const handleAutoOrganize = () => {
        if (!workerRef.current) return;
        setIsOrganizing(true);
        
        // Prepare data for worker
        const nodes = JSON.parse(JSON.stringify(nodesWithPos));
        const center = { x: 1000, y: 750 };
        
        workerRef.current.postMessage({
            nodes,
            edges,
            center,
            iterations: 150,
            k: 0.05,
            repulsion: 100000,
            damping: 0.6
        });
    };

    const handleSaveView = () => {
        // Saves current positions + Viewport
        const updates = nodesWithPos.map(n => ({
            id: n.originalId || n.id,
            type: n.nodeType,
            x: Math.round(n.x),
            y: Math.round(n.y)
        }));
        if (onBatchSaveLayout) onBatchSaveLayout(updates, { x: pan.x, y: pan.y, scale });
    };

    const snap = (val) => isSnapEnabled ? Math.round(val / GRID_SIZE) * GRID_SIZE : val;
    const getNodeDim = (type) => type === 'tag' ? { w: 120, h: 50 } : { w: 220, h: 180 }; 

    const checkCollision = (node, x, y, excludeId) => {
        const dim = getNodeDim(node.nodeType);
        const padding = 15;
        const rect1 = { x, y, w: dim.w, h: dim.h };

        for (const other of nodesWithPos) {
            if (other.id === excludeId) continue;
            const otherDim = getNodeDim(other.nodeType);
            const rect2 = { x: other.x, y: other.y, w: otherDim.w, h: otherDim.h };

            if (rect1.x < rect2.x + rect2.w + padding &&
                rect1.x + rect1.w + padding > rect2.x &&
                rect1.y < rect2.y + rect2.h + padding &&
                rect1.y + rect1.h + padding > rect2.y) {
                return true;
            }
        }
        return false;
    };

    const findFreePos = (node, startX, startY) => {
        let x = snap(startX);
        let y = snap(startY);
        if (!checkCollision(node, x, y, node.id)) return { x, y };

        let angle = 0;
        let radius = 40; // Increased initial radius for cluster avoidance
        const maxRadius = 3000;
        
        while (radius < maxRadius) {
            // More steps as radius increases for higher resolution search
            const steps = Math.max(12, Math.floor(2 * Math.PI * radius / 30)); 
            for (let i = 0; i < steps; i++) {
                const curAngle = angle + (i / steps) * 2 * Math.PI;
                const testX = snap(startX + radius * Math.cos(curAngle));
                const testY = snap(startY + radius * Math.sin(curAngle));
                if (!checkCollision(node, testX, testY, node.id)) return { x: testX, y: testY };
            }
            radius += 60; // Larger increments to skip dense clusters faster
            angle += 0.5;
        }
        return { x: snap(startX), y: snap(startY) }; 
    };

    const handlePointerDown = (e) => {
        if (selectedEdge && !e.target.closest('.edge-popover')) setSelectedEdge(null);
        if (showSnapshots && !e.target.closest('.snapshots-menu')) setShowSnapshots(false);

        // Check for node interaction
        const nodeEl = e.target.closest('[data-node-id]');
        
        // If clicking canvas with Shift => Start Selection Box
        if (e.shiftKey && !nodeEl && e.button === 0) {
            e.preventDefault();
            const rect = canvasRef.current.getBoundingClientRect();
            const startX = (e.clientX - rect.left - pan.x) / scale;
            const startY = (e.clientY - rect.top - pan.y) / scale;
            setSelectionBox({ startX, startY, currentX: startX, currentY: startY });
            lastMouseRef.current = { x: e.clientX, y: e.clientY };
            e.target.setPointerCapture(e.pointerId);
            return;
        }

        if (e.button === 1 || (e.button === 0 && e.target === canvasRef.current && !e.shiftKey)) { 
            e.preventDefault();
            setIsDraggingCanvas(true);
            // Clear selection unless Shift/Ctrl
            if (!e.shiftKey && !e.ctrlKey) setSelectedNodeIds(new Set());
            lastMouseRef.current = { x: e.clientX, y: e.clientY };
            e.target.setPointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - pan.x) / scale;
        const mouseY = (e.clientY - rect.top - pan.y) / scale;
        setMousePos({ x: mouseX, y: mouseY });

        if (selectionBox) {
            setSelectionBox(prev => ({ ...prev, currentX: mouseX, currentY: mouseY }));
        } else if (isDraggingCanvas) {
            const dx = e.clientX - lastMouseRef.current.x;
            const dy = e.clientY - lastMouseRef.current.y;
            setPan(p => ({ x: p.x + dx, y: p.y + dy }));
            lastMouseRef.current = { x: e.clientX, y: e.clientY };
        } else if (draggingNode) {
            // Cancel long press if dragged more than 8 pixels
            if (longPressTimeoutRef.current) {
                const totalDx = Math.abs(e.clientX - draggingNode.startMouseX);
                const totalDy = Math.abs(e.clientY - draggingNode.startMouseY);
                if (totalDx > 8 || totalDy > 8) {
                    clearTimeout(longPressTimeoutRef.current);
                    longPressTimeoutRef.current = null;
                }
            }

            if (hasTriggeredLongPressRef.current) {
                return;
            }

            setDraggingNode(prev => {
                const newNodes = prev.nodes.map(n => {
                    const rawX = n.startX + (e.clientX - prev.startMouseX) / scale;
                    const rawY = n.startY + (e.clientY - prev.startMouseY) / scale;
                    return { ...n, currentX: isSnapEnabled ? snap(rawX) : rawX, currentY: isSnapEnabled ? snap(rawY) : rawY };
                });
                return { ...prev, nodes: newNodes };
            });
            lastMouseRef.current = { x: e.clientX, y: e.clientY };
        }
    }

    const handlePointerUp = (e) => {
        setIsDraggingCanvas(false);

        if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
        }

        if (hasTriggeredLongPressRef.current) {
            hasTriggeredLongPressRef.current = false;
            setDraggingNode(null);
            return;
        }

        if (selectionBox) {
            // Finalize Selection
            const x1 = Math.min(selectionBox.startX, selectionBox.currentX);
            const x2 = Math.max(selectionBox.startX, selectionBox.currentX);
            const y1 = Math.min(selectionBox.startY, selectionBox.currentY);
            const y2 = Math.max(selectionBox.startY, selectionBox.currentY);

            const newSelection = new Set(selectedNodeIds);
            
            nodesWithPos.forEach(n => {
                const w = n.nodeType === 'tag' ? 100 : 200;
                const h = n.nodeType === 'tag' ? 30 : 60; // Approx dims
                if (n.x < x2 && n.x + w > x1 && n.y < y2 && n.y + h > y1) {
                    newSelection.add(n.id);
                }
            });
            setSelectedNodeIds(newSelection);
            setSelectionBox(null);
        }

        if (draggingNode) {
            const updates = [];

            draggingNode.nodes.forEach(dn => {
                const totalDx = (e.clientX - draggingNode.startMouseX) / scale;
                const totalDy = (e.clientY - draggingNode.startMouseY) / scale;
                let finalX = dn.startX + totalDx;
                let finalY = dn.startY + totalDy;

                if (draggingNode.nodes.length === 1) {
                    const resolved = findFreePos({ id: dn.id, nodeType: dn.nodeType }, finalX, finalY);
                    finalX = resolved.x;
                    finalY = resolved.y;
                } else if (isSnapEnabled) {
                    finalX = snap(finalX);
                    finalY = snap(finalY);
                }

                if (dn.nodeType === 'tag') {
                    if (onSaveTagLayout) onSaveTagLayout(dn.originalId, finalX, finalY);
                } else {
                     updates.push({ id: dn.originalId, x: finalX, y: finalY, type: 'note' });
                }
            });
            
            if (updates.length > 0) {
                 if (onBatchSaveLayout) onBatchSaveLayout(updates);
            }

            setDraggingNode(null);
        }
        if (connectingNode) {
            const elements = document.elementsFromPoint(e.clientX, e.clientY);
            const targetEl = elements.find(el => el.closest && el.closest('[data-node-id]'));
            if (targetEl) {
                const nodeId = targetEl.closest('[data-node-id]').getAttribute('data-node-id');
                const targetNode = nodesWithPos.find(n => n.id === nodeId);
                if (targetNode && targetNode.id !== connectingNode.id) {
                    handleNodeConnectEnd(targetNode);
                }
            }
            setConnectingNode(null);
        }
    };

    const handleNodeDragStart = (e, node) => {
        if (e.button === 2) {
            e.stopPropagation();
            return;
        }

        e.stopPropagation();
        
        // Start long press detection
        if (node.nodeType === 'note') {
            hasTriggeredLongPressRef.current = false;
            if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
            
            longPressTimeoutRef.current = setTimeout(() => {
                hasTriggeredLongPressRef.current = true;
                if (window.vibrate) window.vibrate(50);
                onEdit(node);
                setDraggingNode(null);
            }, 600);
        }
        
        let newSelection = new Set(selectedNodeIds);
        
        if (e.shiftKey || e.ctrlKey) {
            if (newSelection.has(node.id)) {
                newSelection.delete(node.id);
                setSelectedNodeIds(newSelection);
                return; 
            } else {
                newSelection.add(node.id);
            }
        } else {
            if (!newSelection.has(node.id)) {
                newSelection = new Set([node.id]);
            }
        }
        setSelectedNodeIds(newSelection);

        const nodesToDrag = nodesWithPos.filter(n => newSelection.has(n.id));
        const dragNodesState = nodesToDrag.map(n => ({
            id: n.id,
            originalId: n.originalId || n.id,
            nodeType: n.nodeType,
            startX: n.x ?? 0,
            startY: n.y ?? 0,
            currentX: n.x ?? 0,
            currentY: n.y ?? 0
        }));

        setDraggingNode({ 
            nodes: dragNodesState,
            startMouseX: e.clientX, 
            startMouseY: e.clientY
        });
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleNodeConnectStart = (e, node) => {
        e.stopPropagation();
        setConnectingNode({ id: node.id, x: node.x, y: node.y, nodeType: node.nodeType, originalId: node.originalId || node.id });
    };

    const handleNodeConnectEnd = (targetNode) => {
        if (!connectingNode || connectingNode.id === targetNode.id) return;
        const sourceId = connectingNode.originalId;
        const targetId = targetNode.originalId || targetNode.id;
        const sourceType = connectingNode.nodeType;
        const targetType = targetNode.nodeType;

        if (sourceType === 'note' && targetType === 'note') {
            const sourceNote = notes.find(n => n.id === sourceId);
            if (!sourceNote) return;
            const currentRelations = sourceNote.relations || [];
            if (!currentRelations.some(r => r.targetId === targetId && r.type === selectedRelType)) {
                onSave({ ...sourceNote, relations: [...currentRelations, { targetId: targetId, type: selectedRelType }] });
            }
        } else if (sourceType === 'note' && targetType === 'tag') {
             if (onAddTag) onAddTag(sourceId, targetId);
        } else if (sourceType === 'tag' && targetType === 'note') {
             if (onAddTag) onAddTag(targetId, sourceId);
        } else if (sourceType === 'tag' && targetType === 'tag') {
            if (onTagOperation) onTagOperation(sourceId, targetId, true);
        }
    };

    const handleEdgeClick = (e, rel, midX, midY) => {
        e.stopPropagation();
        setSelectedEdge({ ...rel, x: midX, y: midY });
    };

    const handleUpdateEdgeType = (newType) => {
        if (!selectedEdge) return;
        const { source, target, type } = selectedEdge;
        
        if (!source.startsWith(TAG_PREFIX) && !target.startsWith(TAG_PREFIX)) {
            const note = notes.find(n => n.id === source);
            if (note) {
                const newRelations = (note.relations || []).map(r => r.targetId === target ? { ...r, type: newType } : r);
                onSave({ ...note, relations: newRelations });
            }
        } else if (source.startsWith(TAG_PREFIX) && target.startsWith(TAG_PREFIX)) {
            const child = source.replace(TAG_PREFIX, '');
            const parent = target.replace(TAG_PREFIX, '');
            if (onUpdateRelationship) onUpdateRelationship(child, parent, parent, newType);
        }
        setSelectedEdge(null);
    };

    const handleDeleteEdge = () => {
        if (!selectedEdge) return;
        const { source, target } = selectedEdge;

        if (!source.startsWith(TAG_PREFIX) && !target.startsWith(TAG_PREFIX)) {
            const note = notes.find(n => n.id === source);
            if (note) {
                const newRelations = (note.relations || []).filter(r => r.targetId !== target);
                onSave({ ...note, relations: newRelations });
            }
        } else if (!source.startsWith(TAG_PREFIX) && target.startsWith(TAG_PREFIX)) {
            const note = notes.find(n => n.id === source);
            if (note) {
                const tagName = target.replace(TAG_PREFIX, '');
                const newTags = (note.tags || []).filter(t => t !== tagName);
                onSave({ ...note, tags: newTags });
            }
        } else if (source.startsWith(TAG_PREFIX) && target.startsWith(TAG_PREFIX)) {
            const child = source.replace(TAG_PREFIX, '');
            const parent = target.replace(TAG_PREFIX, '');
            if (onTagOperation) onTagOperation(child, null, false, parent);
        }
        setSelectedEdge(null);
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-gray-900 relative select-none" onContextMenu={(e) => e.preventDefault()}>
            <div className="absolute top-4 left-4 z-50 flex gap-2 bg-gray-800/90 backdrop-blur p-2 rounded-xl shadow-xl border border-gray-700 items-center">
                <button onClick={() => setIsSnapEnabled(!isSnapEnabled)} className={`p-1.5 rounded-lg border transition-colors ${isSnapEnabled ? 'bg-slate-500/20 text-slate-400 border-slate-500/50' : 'text-gray-400 border-transparent hover:bg-gray-700'}`} title="Toggle Snap to Grid"><Icons.Grid size={18} /></button>
                <div className="h-6 w-px bg-gray-700 mx-1"></div>
                <select value={selectedRelType} onChange={e => setSelectedRelType(e.target.value)} className="bg-gray-900 text-white text-sm px-3 py-1 rounded-lg border border-gray-600 outline-none focus:border-slate-500">{relationshipTypes.map(r => <option key={r.id} value={r.id}>{r.forward}</option>)}</select>
                <div className="h-6 w-px bg-gray-700 mx-1"></div>
                <button onClick={() => setShowArchived(!showArchived)} className={`p-1.5 rounded-lg border transition-colors ${showArchived ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'text-gray-400 border-transparent hover:bg-gray-700'}`} title={showArchived ? "Hide Archived" : "Show Archived"}><Icons.Archive size={18} /></button>
                <button onClick={handleAutoOrganize} disabled={isOrganizing} className={`flex items-center gap-2 px-3 py-1 rounded-lg border border-transparent text-sm transition-colors ${isOrganizing ? 'bg-gray-700 text-gray-500 cursor-wait' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`} title="Auto Organize"><Icons.RefreshCw size={14} className={isOrganizing ? 'animate-spin' : ''} /><span>Auto Organize</span></button>
                <button onClick={handleSaveView} className="flex items-center gap-2 px-3 py-1 rounded-lg border border-gray-600 text-sm text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500 transition-colors" title="Save current layout & view"><Icons.Save size={14} /><span>Save View</span></button>
                
                <div className="relative snapshots-menu">
                    <button onClick={() => setShowSnapshots(!showSnapshots)} className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-colors ${showSnapshots ? 'bg-gray-700 border-gray-600' : 'border-transparent text-gray-300 hover:bg-gray-700'}`} title="Snapshots"><Icons.Menu size={14} /><span>Snapshots</span></button>
                    {showSnapshots && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-3 z-50 flex flex-col gap-3">
                            <div className="flex gap-2">
                                <input type="text" placeholder="Snapshot name" value={snapshotName} onChange={(e) => setSnapshotName(e.target.value)} className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-slate-500" />
                                <button onClick={() => { if(snapshotName) { onSaveSnapshot(snapshotName, nodesWithPos, {x:pan.x, y:pan.y, scale}); setSnapshotName(''); } }} className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white"><Icons.Plus size={14} /></button>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {snapshots.length === 0 && <p className="text-xs text-gray-500 text-center py-2">No snapshots</p>}
                                {snapshots.map(snap => (
                                    <div key={snap.id} className="flex items-center justify-between group hover:bg-gray-700 p-1 rounded">
                                        <span className="text-xs text-gray-300 truncate cursor-pointer flex-1" onClick={() => onLoadSnapshot(snap.id)}>{snap.name}</span>
                                        <button onClick={() => onDeleteSnapshot(snap.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Icons.Trash size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div ref={canvasRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden" style={{ touchAction: 'none' }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
                <div className="absolute top-0 left-0 transform-origin-0-0 will-change-transform" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10" style={{ backgroundImage: isSnapEnabled ? `radial-gradient(#fff 1px, transparent 1px)` : 'none', backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px` }} />
                    <svg className="absolute top-0 left-0 overflow-visible pointer-events-none" style={{ width: 1, height: 1 }}>
                        <defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" /></marker></defs>
                        {edges.map((rel, i) => {
                            const source = nodesWithPos.find(n => n.id === rel.source);
                            const target = nodesWithPos.find(n => n.id === rel.target);
                            if (!source || !target) return null;
                            const sourceDrag = draggingNode?.nodes.find(n => n.id === source.id);
                            const targetDrag = draggingNode?.nodes.find(n => n.id === target.id);
                            const sourcePos = sourceDrag ? { x: sourceDrag.currentX, y: sourceDrag.currentY } : { x: source.x, y: source.y };
                            const targetPos = targetDrag ? { x: targetDrag.currentX, y: targetDrag.currentY } : { x: target.x, y: target.y };
                            const w = source.nodeType === 'tag' ? 100 : 200;
                            const h = source.nodeType === 'tag' ? 30 : 60; 
                            const sx = sourcePos.x + w/2;
                            const sy = sourcePos.y + h/2;
                            const tx = targetPos.x + (target.nodeType === 'tag' ? 50 : 100);
                            const ty = targetPos.y + (target.nodeType === 'tag' ? 15 : 30);
                            const dist = Math.abs(tx - sx);
                            const cp1x = sx + dist * 0.5;
                            const cp2x = tx - dist * 0.5;
                            const t = 0.5;
                            const cx = Math.pow(1-t, 3)*sx + 3*Math.pow(1-t, 2)*t*cp1x + 3*(1-t)*Math.pow(t, 2)*cp2x + Math.pow(t, 3)*tx;
                            const cy = Math.pow(1-t, 3)*sy + 3*Math.pow(1-t, 2)*t*sy + 3*(1-t)*Math.pow(t, 2)*ty + Math.pow(t, 3)*ty;
                            const d = `M ${sx} ${sy} C ${cp1x} ${sy}, ${cp2x} ${ty}, ${tx} ${ty}`;
                            return ( <g key={`${rel.source}-${rel.target}-${i}`}><path d={d} stroke={rel.color || '#64748b'} strokeWidth="2" strokeDasharray={rel.dashed ? "5,5" : "0"} fill="none" markerEnd="url(#arrowhead)" opacity="0.6" /><path d={d} stroke="transparent" strokeWidth="20" fill="none" className="cursor-pointer" pointerEvents="stroke" onClick={(e) => handleEdgeClick(e, rel, cx, cy)} ><title>Click to edit link</title></path></g> );
                        })}
                        {connectingNode && ( <path d={`M ${connectingNode.x + (connectingNode.nodeType === 'tag' ? 50 : 100)} ${connectingNode.y + (connectingNode.nodeType === 'tag' ? 15 : 30)} L ${mousePos.x} ${mousePos.y}`} stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,5" fill="none" /> )}
                    </svg>
                    {nodesWithPos.map(node => {
                        const dragNode = draggingNode?.nodes.find(n => n.id === node.id);
                        const pos = dragNode ? { x: dragNode.currentX, y: dragNode.currentY } : { x: node.x, y: node.y };
                        const isTag = node.nodeType === 'tag';
                        const isSelected = selectedNodeIds.has(node.id);
                        return (
                            <div key={node.id} data-node-id={node.id} className={`absolute flex flex-col group shadow-md border transition-shadow hover:shadow-xl ${isSelected ? 'ring-2 ring-slate-500' : ''} ${isTag ? 'w-[100px] h-[30px] rounded-full bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 justify-center items-center' : 'w-[200px] rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`} style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, opacity: node.isArchived ? 0.6 : 1 }} onPointerDown={(e) => handleNodeDragStart(e, node)} onPointerUp={() => handleNodeConnectEnd(node)} onContextMenu={(e) => { if (node.nodeType === 'note') { e.preventDefault(); e.stopPropagation(); if (longPressTimeoutRef.current) { clearTimeout(longPressTimeoutRef.current); longPressTimeoutRef.current = null; } onEdit(node); } }}>
                                {isTag ? ( <div className="font-bold text-xs text-gray-700 dark:text-gray-300 truncate px-2 pointer-events-none">{node.title}</div> ) : ( <> <div className={`p-2 border-b border-gray-100 dark:border-gray-700 rounded-t-lg flex justify-between items-center cursor-move ${node.isArchived ? 'bg-gray-100 dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}`}> <div className="font-bold text-xs truncate max-w-[150px] text-gray-700 dark:text-gray-200 flex items-center gap-1"> {node.isArchived && <Icons.Archive size={10} className="text-gray-400" />} {node.title || "Untitled"} </div> <button onClick={(e) => { e.stopPropagation(); onEdit(node); }} className="text-gray-400 hover:text-slate-500"><Icons.Edit size={12} /></button> </div> <div className="p-2 text-[10px] text-gray-500 dark:text-gray-400 line-clamp-3 h-[50px] overflow-hidden pointer-events-none prose-mini" dangerouslySetInnerHTML={{ __html: window.parseMarkdown(node.content || '', new Set(), true, 5) }}></div> </> )}
                                <div className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-500 rounded-full cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity border-2 border-white dark:border-gray-900 shadow-sm z-10 hover:scale-125" onPointerDown={(e) => handleNodeConnectStart(e, node)} title="Drag to link" />
                            </div>
                        );
                    })}
                    {selectionBox && (
                        <div className="absolute border border-slate-400 bg-slate-500/20 pointer-events-none"
                            style={{
                                left: Math.min(selectionBox.startX, selectionBox.currentX),
                                top: Math.min(selectionBox.startY, selectionBox.currentY),
                                width: Math.abs(selectionBox.currentX - selectionBox.startX),
                                height: Math.abs(selectionBox.currentY - selectionBox.startY)
                            }}
                        />
                    )}
                    {selectedEdge && (
                        <div className="absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 flex flex-col gap-2 w-48 edge-popover animate-fade-in" style={{ left: selectedEdge.x, top: selectedEdge.y, transform: 'translate(-50%, -100%) translateY(-10px)' }}>
                            <div className="text-xs font-bold text-gray-500 uppercase pb-1 border-b border-gray-100 dark:border-gray-700 mb-1">
                                {selectedEdge.type === 'link' ? 'Note Link' : 'Edit Link'}
                            </div>
                            {selectedEdge.type === 'link' ? (
                                <div className="text-xs text-gray-400 p-1">Link defined inside note text</div>
                            ) : (
                                <>
                                    {!(selectedEdge.type === 'tagged') && (
                                        <select value={selectedEdge.type} onChange={(e) => handleUpdateEdgeType(e.target.value)} className="text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-1 w-full">
                                            {relationshipTypes.map(r => <option key={r.id} value={r.id}>{r.forward}</option>)}
                                        </select>
                                    )}
                                    <button onClick={handleDeleteEdge} className="flex items-center gap-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded transition-colors w-full">
                                        <Icons.Trash size={14} /> Delete Link
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

window.GraphView = GraphView;