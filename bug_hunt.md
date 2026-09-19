# KeepIt Pro: Bug Hunt & Workflow Analysis

This document outlines the bugs and unintended behaviors identified during development and confirms their resolution.

---

## 1. Data Integrity & Sync
### **A. Import Collision on `shortId` [RESOLVED]**
- **Scenario:** A user imports a note with a `shortId` that already exists.
- **Solution:** Import logic now checks for clashes and automatically generates new unique IDs for clashing imports to maintain linking reliability.

### **B. Batch Import Firestore Limit [RESOLVED]**
- **Scenario:** A user imports a backup file containing more than 500 notes.
- **Solution:** `handleImportNotes` now chunks imports into batches of 450, supporting backups of any size.

---

## 2. Editor & Undo/Redo
### **C. Undo Stack Persistence**
- **Status:** Correctly cleared on note switch for security and memory safety.

### **D. Global Undo Interception [RESOLVED]**
- **Scenario:** User is typing and presses `Ctrl+Z`.
- **Solution:** Refined the interception logic so that the custom stack only handles the main editor, while the Title field retains its native browser undo behavior.

---

## 3. Sidebar & Tags
### **E. The "Hidden Tags" Mirroring Paradox [RESOLVED]**
- **Scenario:** A tag is both **Pinned** and **Excluded**.
- **Solution:** Implemented a "Priority Rule" where Pinned tags remain visible in the Pinned section regardless of their "Hidden" status in the main tree.

### **F. Deleting a Tagged Parent [RESOLVED]**
- **Scenario:** User deletes a tag that has children or pins.
- **Solution:** `handleDeleteTag` now scrubs the tag from all metadata arrays (`pinnedTags`, `lockedTags`, `excludedTags`) in the settings document.

---

## 4. Graph View
### **G. Orphaned Note Drift [RESOLVED]**
- **Scenario:** Notes overlap when added or moved.
- **Solution:** Overhauled `findFreePos` with a high-resolution spiral search pattern to ensure new notes find truly empty space.

### **H. Snap-to-Grid vs. Auto-Organize [RESOLVED]**
- **Scenario:** Notes "jump" jarringly after auto-organizing.
- **Solution:** Added a 150ms "Snap Delay" to allow the physics layout to settle before applying grid constraints.

---

## 5. Search & Filtering
### **I. Search Exclusion vs. Selection [RESOLVED]**
- **Scenario:** Hidden notes appearing in general search.
- **Solution:** Hardened `filteredNotes` to strictly exclude hidden content from search results unless the specific hidden tag is selected.

---

## 6. Mobile & Performance
### **J. Hover States on Mobile [RESOLVED]**
- **Scenario:** Cannot delete list items on mobile.
- **Solution:** Added a media query to make delete buttons permanently accessible on touch devices.

### **K. Drawing Modal Scalability [RESOLVED]**
- **Scenario:** Large sketches causing Firestore document limit errors.
- **Solution:** Sketches are now compressed as 70% quality JPEGs with a white background layer, keeping notes safely below the 1MB limit.
