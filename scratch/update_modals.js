const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'js', 'components', 'modals.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Rename "Preview Line Limit" header
const oldHeader = 'uppercase tracking-wider">Preview Line Limit</h4>';
const newHeader = 'uppercase tracking-wider">List Preview Line Limit</h4>';

if (!content.includes(oldHeader)) {
    console.error("Error: Could not find Preview Line Limit header in modals.js");
    process.exit(1);
}
content = content.replace(oldHeader, newHeader);

// 2. Rename the description
const oldDesc = 'Max lines per list item in preview cards.';
const newDesc = 'Max lines per checklist/bullet item in preview cards.';

if (!content.includes(oldDesc)) {
    console.error("Error: Could not find description in modals.js");
    process.exit(1);
}
content = content.replace(oldDesc, newDesc);

// 3. Insert the Global Preview Line Limit setting
// We want to insert it right after the closing </div> of the "List Preview Line Limit" block.
// The block ends with:
// <p className="text-[10px] text-gray-400 mt-1 italic">Max lines per checklist/bullet item in preview cards.</p>
// </div>
const oldEndMarker = `Max lines per checklist/bullet item in preview cards.</p>
                              </div>`;
const oldEndMarkerCRLF = `Max lines per checklist/bullet item in preview cards.</p>\r\n                              </div>`;

const newGlobalLimitBlock = `

                              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                  <div className="flex items-center justify-between">
                                      <div className="flex flex-col">
                                          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Global Preview Line Limit</h4>
                                          <p className="text-[10px] text-gray-400 mt-1 italic">Limit the maximum total lines of the note body shown in preview cards.</p>
                                      </div>
                                      <button 
                                          onClick={() => setGlobalPreviewLineLimit(globalPreviewLineLimit > 0 ? 0 : 5)} 
                                          className={\`relative inline-flex h-6 w-11 items-center rounded-full transition-colors \${globalPreviewLineLimit > 0 ? 'bg-slate-700 dark:bg-slate-600' : 'bg-gray-200 dark:bg-gray-700'}\`}
                                      >
                                          <span className={\`inline-block h-4 w-4 transform rounded-full bg-white transition-transform \${globalPreviewLineLimit > 0 ? 'translate-x-6' : 'translate-x-1'}\`} />
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
                              </div>`;

if (content.includes(oldEndMarker)) {
    content = content.replace(oldEndMarker, oldEndMarker + newGlobalLimitBlock);
} else if (content.includes(oldEndMarkerCRLF)) {
    content = content.replace(oldEndMarkerCRLF, oldEndMarkerCRLF + newGlobalLimitBlock);
} else {
    // If exact end marker with spaces failed, find the description and do a dynamic insert
    const descIndex = content.indexOf(newDesc);
    const nextClosingDiv = content.indexOf('</div>', descIndex);
    if (descIndex !== -1 && nextClosingDiv !== -1) {
        const insertPos = nextClosingDiv + '</div>'.length;
        content = content.slice(0, insertPos) + newGlobalLimitBlock + content.slice(insertPos);
    } else {
        console.error("Error: Could not find insertion point dynamically in modals.js");
        process.exit(1);
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated modals.js dynamically!");
