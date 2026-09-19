import sqlite3
import json
import os
from datetime import datetime

DB_NAME = "notes_db.sqlite"

class Storage:
    def __init__(self):
        self.conn = sqlite3.connect(DB_NAME, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.create_tables()

    def create_tables(self):
        cursor = self.conn.cursor()
        
        # Notes table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            title TEXT,
            content TEXT,
            tags TEXT,
            color TEXT,
            isList INTEGER,
            checklistItems TEXT,
            attachments TEXT,
            reminder TEXT,
            isPinned INTEGER,
            isArchived INTEGER,
            isTrashed INTEGER,
            updatedAt REAL,
            ownerId TEXT,
            isDirty INTEGER DEFAULT 0,
            pendingDelete INTEGER DEFAULT 0
        )
        ''')

        # Settings table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
        ''')

        self.conn.commit()

    def save_note(self, note_data, is_dirty=True):
        cursor = self.conn.cursor()
        
        # Prepare complex types
        tags = json.dumps(note_data.get('tags', []))
        checklist = json.dumps(note_data.get('checklistItems', []))
        attachments = json.dumps(note_data.get('attachments', []))
        
        cursor.execute('''
        INSERT OR REPLACE INTO notes (
            id, title, content, tags, color, isList, checklistItems, attachments, 
            reminder, isPinned, isArchived, isTrashed, updatedAt, ownerId, isDirty, pendingDelete
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        ''', (
            note_data['id'],
            note_data.get('title', ''),
            note_data.get('content', ''),
            tags,
            note_data.get('color', 'default'),
            1 if note_data.get('isList') else 0,
            checklist,
            attachments,
            note_data.get('reminder', ''),
            1 if note_data.get('isPinned') else 0,
            1 if note_data.get('isArchived') else 0,
            1 if note_data.get('isTrashed') else 0,
            note_data.get('updatedAt', datetime.now().timestamp()),
            note_data.get('ownerId', ''),
            1 if is_dirty else 0
        ))
        self.conn.commit()

    def get_notes(self, owner_id=None, view='notes'):
        cursor = self.conn.cursor()
        query = "SELECT * FROM notes WHERE pendingDelete = 0"
        params = []
        
        if owner_id:
            query += " AND ownerId = ?"
            params.append(owner_id)
            
        if view == 'notes':
            query += " AND isTrashed = 0 AND isArchived = 0"
        elif view == 'archive':
            query += " AND isTrashed = 0 AND isArchived = 1"
        elif view == 'trash':
            query += " AND isTrashed = 1"
            
        query += " ORDER BY isPinned DESC, updatedAt DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        notes = []
        for row in rows:
            d = dict(row)
            # Parse JSON fields
            d['tags'] = json.loads(d['tags']) if d['tags'] else []
            d['checklistItems'] = json.loads(d['checklistItems']) if d['checklistItems'] else []
            d['attachments'] = json.loads(d['attachments']) if d['attachments'] else []
            d['isList'] = bool(d['isList'])
            d['isPinned'] = bool(d['isPinned'])
            d['isArchived'] = bool(d['isArchived'])
            d['isTrashed'] = bool(d['isTrashed'])
            notes.append(d)
            
        return notes

    def get_dirty_notes(self):
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM notes WHERE isDirty = 1")
        rows = cursor.fetchall()
        # Convert to dicts and parse JSON similar to get_notes
        notes = []
        for row in rows:
            d = dict(row)
            d['tags'] = json.loads(d['tags']) if d['tags'] else []
            d['checklistItems'] = json.loads(d['checklistItems']) if d['checklistItems'] else []
            d['attachments'] = json.loads(d['attachments']) if d['attachments'] else []
            d['isList'] = bool(d['isList'])
            d['isPinned'] = bool(d['isPinned'])
            d['isArchived'] = bool(d['isArchived'])
            d['isTrashed'] = bool(d['isTrashed'])
            notes.append(d)
        return notes

    def mark_synced(self, note_id):
        cursor = self.conn.cursor()
        cursor.execute("UPDATE notes SET isDirty = 0 WHERE id = ?", (note_id,))
        self.conn.commit()
        
    def delete_note_permanent(self, note_id):
        cursor = self.conn.cursor()
        cursor.execute("UPDATE notes SET pendingDelete = 1, isDirty = 1 WHERE id = ?", (note_id,))
        self.conn.commit()

    def hard_delete(self, note_id):
        """Actually remove from DB"""
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        self.conn.commit()

    def get_deleted_notes(self):
        cursor = self.conn.cursor()
        cursor.execute("SELECT id FROM notes WHERE pendingDelete = 1")
        return [row['id'] for row in cursor.fetchall()]

    def set_setting(self, key, value):
        cursor = self.conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, json.dumps(value)))
        self.conn.commit()

    def get_setting(self, key, default=None):
        cursor = self.conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        if row:
            return json.loads(row['value'])
        return default
