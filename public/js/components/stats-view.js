const StatsView = ({ notes, allTags }) => {
    // --- Computations ---
    const totalNotes = notes.length;
    const activeNotes = notes.filter(n => !n.isTrashed && !n.isArchived).length;
    const archivedNotes = notes.filter(n => n.isArchived).length;
    const trashedNotes = notes.filter(n => n.isTrashed).length;
    const totalTags = allTags.length;

    // Word Count & Character Count
    let totalWords = 0;
    let totalChars = 0;
    let largestNote = null;

    // Tag Usage
    const tagCounts = {};
    allTags.forEach(t => tagCounts[t] = 0);

    // Link Usage
    const linkCounts = {};

    // Creation Dates for Chart
    const creationDates = {}; // "YYYY-MM-DD": count

    notes.forEach(note => {
        // Content Stats
        const text = note.content || '';
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        const chars = text.length;
        
        totalWords += words;
        totalChars += chars;

        if (!largestNote || chars > largestNote.chars) {
            largestNote = { title: note.title || 'Untitled', chars, id: note.id };
        }

        // Tag Stats
        if (note.tags) {
            note.tags.forEach(t => {
                tagCounts[t] = (tagCounts[t] || 0) + 1;
            });
        }

        // Link Stats (Internal)
        const linkRegex = /(?:internal:\/\/|::)([a-z0-9]{4,})/gi;
        let lMatch;
        while ((lMatch = linkRegex.exec(text)) !== null) {
            const id = lMatch[1].toLowerCase();
            linkCounts[id] = (linkCounts[id] || 0) + 1;
        }

        // Date Stats
        if (note.createdAt) {
            const date = new Date(note.createdAt.seconds * 1000 || note.createdAt).toISOString().split('T')[0];
            creationDates[date] = (creationDates[date] || 0) + 1;
        }
    });

    // Top Tags
    const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // Top Linked Notes
    const sortedLinks = Object.entries(linkCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, count]) => {
            const n = notes.find(x => x.shortId === id || x.id === id);
            return { title: n?.title || 'Unknown Note', count };
        });

    // Chart Data (Last 30 days)
    const chartData = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        chartData.push({ date: key, count: creationDates[key] || 0 });
    }
    const maxChartValue = Math.max(...chartData.map(d => d.count), 1);

    // Helper Components
    const StatCard = ({ title, value, subtext, icon: Icon, color }) => (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-start hover:shadow-md transition-shadow">
            <div className={`p-3 rounded-xl mb-4 ${color}`}>
                <Icon size={24} className="text-white" />
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">{title}</h3>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
            {subtext && <div className="text-xs text-gray-400 dark:text-gray-500">{subtext}</div>}
        </div>
    );

    return (
        <div className="p-6 md:p-10 overflow-y-auto h-full custom-scrollbar bg-gray-50 dark:bg-gray-900 w-full">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white flex items-center gap-3">
                <Icons.BarChart2 size={32} className="text-slate-500" /> Stats & Metrics
            </h1>

            {/* Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard title="Total Notes" value={totalNotes} subtext={`${activeNotes} active, ${archivedNotes} archived`} icon={Icons.FileText} color="bg-slate-500" />
                <StatCard title="Total Tags" value={totalTags} subtext={`${sortedTags[0] ? '#' + sortedTags[0][0] : 'None'} is top tag`} icon={Icons.Tag} color="bg-green-500" />
                <StatCard title="Word Count" value={totalWords.toLocaleString()} subtext="Across all notes" icon={Icons.AlignLeft} color="bg-purple-500" />
                <StatCard title="Internal Links" value={Object.values(linkCounts).reduce((a,b)=>a+b,0)} subtext="Connections between notes" icon={Icons.Link} color="bg-orange-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                {/* Activity Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Note Creation Activity (30 Days)</h3>
                    <div className="h-48 flex items-end gap-1 sm:gap-2">
                        {chartData.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col justify-end group relative min-w-[5px]">
                                <div 
                                    className="w-full bg-slate-500/80 hover:bg-slate-500 rounded-t-sm transition-all relative"
                                    style={{ height: `${(d.count / maxChartValue) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                                ></div>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                    {d.date}: {d.count} notes
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2 flex justify-between text-xs text-gray-400">
                        <span>30 days ago</span>
                        <span>Today</span>
                    </div>
                </div>

                {/* Top Tags */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Top Tags</h3>
                    <div className="space-y-4">
                        {sortedTags.length === 0 ? <p className="text-gray-400 text-sm">No tags used yet.</p> : sortedTags.map(([tag, count], idx) => (
                            <div key={tag} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${['bg-slate-100 text-slate-600', 'bg-green-100 text-green-600', 'bg-yellow-100 text-yellow-600'][idx] || 'bg-gray-100 text-gray-600'}`}>
                                        {idx + 1}
                                    </div>
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">#{tag}</span>
                                </div>
                                <div className="text-sm text-gray-500 font-bold">{count}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Largest Note */}
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Largest Note</h3>
                    {largestNote ? (
                        <div>
                            <div className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2 truncate">{largestNote.title}</div>
                            <div className="text-sm text-gray-500">{largestNote.chars.toLocaleString()} characters</div>
                            <div className="mt-4 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 w-full animate-pulse"></div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-400">No notes found.</p>
                    )}
                 </div>

                 {/* Most Linked */}
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Most Linked Notes</h3>
                    <div className="space-y-3">
                        {sortedLinks.length === 0 ? <p className="text-gray-400 text-sm">No internal links found.</p> : sortedLinks.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between border-b border-gray-50 dark:border-gray-700/50 last:border-0 pb-2 last:pb-0">
                                <span className="text-gray-700 dark:text-gray-300 truncate pr-4">{item.title}</span>
                                <span className="text-xs font-bold px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500">{item.count} links</span>
                            </div>
                        ))}
                    </div>
                 </div>
            </div>
        </div>
    );
};

window.StatsView = StatsView;