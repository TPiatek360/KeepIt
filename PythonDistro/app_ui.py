import customtkinter as ctk
from datetime import datetime
import threading
import uuid
import tkinter.messagebox as messagebox
from storage import Storage
from sync_service import FirebaseSync

ctk.set_appearance_mode("System")
ctk.set_default_color_theme("blue")

class NoteCard(ctk.CTkFrame):
    def __init__(self, master, note, on_click):
        super().__init__(master, corner_radius=10, fg_color=("gray95", "gray20"))
        self.note = note
        self.on_click = on_click
        
        self.bind("<Button-1>", self.clicked)
        
        # Color mapping (approximate)
        colors = {
            'default': ("gray95", "gray20"),
            'red': ("#fee2e2", "#7f1d1d"),
            'orange': ("#ffedd5", "#7c2d12"),
            'yellow': ("#fef9c3", "#713f12"),
            'green': ("#dcfce7", "#14532d"),
            'blue': ("#dbeafe", "#1e3a8a"),
            'purple': ("#f3e8ff", "#581c87"),
        }
        bg_color = colors.get(note.get('color', 'default'), colors['default'])
        self.configure(fg_color=bg_color)

        self.title_lbl = ctk.CTkLabel(self, text=note.get('title', 'Untitled'), font=("Arial", 16, "bold"), anchor="w")
        self.title_lbl.pack(padx=10, pady=(10, 5), fill="x")
        self.title_lbl.bind("<Button-1>", self.clicked)

        preview = note.get('content', '')[:100].replace('\n', ' ')
        self.content_lbl = ctk.CTkLabel(self, text=preview, font=("Arial", 12), text_color=("gray40", "gray70"), anchor="w", wraplength=180)
        self.content_lbl.pack(padx=10, pady=(0, 10), fill="x")
        self.content_lbl.bind("<Button-1>", self.clicked)

        # Tags
        tags = note.get('tags', [])
        if tags:
            tag_str = " ".join([f"#{t}" for t in tags[:3]])
            self.tag_lbl = ctk.CTkLabel(self, text=tag_str, font=("Arial", 10), text_color="gray50", anchor="w")
            self.tag_lbl.pack(padx=10, pady=(0, 10), fill="x")
            self.tag_lbl.bind("<Button-1>", self.clicked)

    def clicked(self, event):
        self.on_click(self.note)

class EditorWindow(ctk.CTkToplevel):
    def __init__(self, master, note, on_save):
        super().__init__(master)
        self.title("Edit Note")
        self.geometry("500x600")
        self.note = note
        self.on_save = on_save
        
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # Title
        self.title_entry = ctk.CTkEntry(self, placeholder_text="Title", font=("Arial", 20, "bold"), border_width=0)
        self.title_entry.grid(row=0, column=0, padx=20, pady=20, sticky="ew")
        if note.get('title'): self.title_entry.insert(0, note['title'])

        # Content
        self.content_text = ctk.CTkTextbox(self, font=("Arial", 14), wrap="word")
        self.content_text.grid(row=1, column=0, padx=20, pady=(0, 20), sticky="nsew")
        if note.get('content'): self.content_text.insert("0.0", note['content'])

        # Tags
        self.tags_entry = ctk.CTkEntry(self, placeholder_text="Tags (comma separated)")
        self.tags_entry.grid(row=2, column=0, padx=20, pady=(0, 10), sticky="ew")
        if note.get('tags'): self.tags_entry.insert(0, ", ".join(note['tags']))

        # Bottom Bar
        self.bottom_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.bottom_frame.grid(row=3, column=0, padx=20, pady=20, sticky="ew")

        self.color_opt = ctk.CTkOptionMenu(self.bottom_frame, values=['default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple'])
        self.color_opt.pack(side="left")
        self.color_opt.set(note.get('color', 'default'))

        self.save_btn = ctk.CTkButton(self.bottom_frame, text="Save", command=self.save)
        self.save_btn.pack(side="right")
        
        self.delete_btn = ctk.CTkButton(self.bottom_frame, text="Trash", fg_color="red", hover_color="darkred", command=self.delete_note)
        if note.get('id'): # Only show if existing note
             self.delete_btn.pack(side="right", padx=10)

    def save(self):
        new_data = {
            **self.note,
            'title': self.title_entry.get(),
            'content': self.content_text.get("0.0", "end").strip(),
            'tags': [t.strip() for t in self.tags_entry.get().split(',') if t.strip()],
            'color': self.color_opt.get(),
            'updatedAt': datetime.now().timestamp()
        }
        if not new_data.get('id'):
            new_data['id'] = str(uuid.uuid4())
            new_data['createdAt'] = datetime.now().timestamp()
        
        self.on_save(new_data)
        self.destroy()
        
    def delete_note(self):
        if messagebox.askyesno("Delete", "Move to trash?"):
            self.note['isTrashed'] = True
            self.on_save(self.note)
            self.destroy()

class App(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("KeepIt Pro (Python)")
        self.geometry("1000x700")
        try:
            self.iconbitmap(r"..\favicon.ico")
        except:
            pass

        self.storage = Storage()
        self.sync_service = FirebaseSync(self.storage)
        self.user = None

        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # Sidebar
        self.sidebar = ctk.CTkFrame(self, width=200, corner_radius=0)
        self.sidebar.grid(row=0, column=0, sticky="nsew")
        
        self.logo_lbl = ctk.CTkLabel(self.sidebar, text="KeepIt Pro", font=("Arial", 20, "bold"))
        self.logo_lbl.pack(padx=20, pady=20)

        self.add_btn = ctk.CTkButton(self.sidebar, text="+ New Note", command=self.new_note)
        self.add_btn.pack(padx=20, pady=10)
        
        self.sync_btn = ctk.CTkButton(self.sidebar, text="Sync Now", command=self.run_sync, fg_color="transparent", border_width=2)
        self.sync_btn.pack(padx=20, pady=10)
        
        self.status_lbl = ctk.CTkLabel(self.sidebar, text="Offline", text_color="gray")
        self.status_lbl.pack(side="bottom", pady=20)

        # Main Area
        self.main_area = ctk.CTkScrollableFrame(self, fg_color="transparent")
        self.main_area.grid(row=0, column=1, sticky="nsew", padx=20, pady=20)
        
        # Check login
        self.check_login()

    def check_login(self):
        # Simple check: try to read a stored setting or show login
        creds = self.storage.get_setting("user_creds")
        if creds:
            success, msg = self.sync_service.login(creds['email'], creds['password'])
            if success:
                self.user = {'email': creds['email']}
                self.status_lbl.configure(text=f"Logged in: {creds['email']}")
                self.refresh_notes()
                return
        
        self.show_login()

    def show_login(self):
        dialog = ctk.CTkInputDialog(text="Enter Email:", title="Login")
        email = dialog.get_input()
        if not email: return
        
        dialog_pw = ctk.CTkInputDialog(text="Enter Password:", title="Login") # CTK doesn't support password mask nicely in InputDialog
        # Custom login window would be better, but sticking to basics
        password = dialog_pw.get_input()
        
        if email and password:
            success, msg = self.sync_service.login(email, password)
            if success:
                self.storage.set_setting("user_creds", {"email": email, "password": password})
                self.user = {'email': email}
                self.status_lbl.configure(text=f"Logged in: {email}")
                self.refresh_notes()
            else:
                messagebox.showerror("Login Failed", msg)

    def refresh_notes(self):
        # Clear
        for widget in self.main_area.winfo_children():
            widget.destroy()
            
        notes = self.storage.get_notes(owner_id=self.sync_service.local_id if self.user else None)
        
        # Grid layout logic
        col = 0
        row = 0
        MAX_COLS = 3
        
        for note in notes:
            card = NoteCard(self.main_area, note, self.edit_note)
            card.grid(row=row, column=col, padx=10, pady=10, sticky="nsew")
            col += 1
            if col >= MAX_COLS:
                col = 0
                row += 1
                
        # Fill weights for grid
        for i in range(MAX_COLS):
            self.main_area.grid_columnconfigure(i, weight=1)

    def new_note(self):
        self.edit_note({})

    def edit_note(self, note):
        EditorWindow(self, note, self.save_note_callback)

    def save_note_callback(self, note_data):
        self.storage.save_note(note_data)
        self.refresh_notes()
        # Trigger background sync
        threading.Thread(target=self.run_sync).start()

    def run_sync(self):
        if not self.user: 
            self.status_lbl.configure(text="Offline")
            return
            
        self.status_lbl.configure(text="Syncing...", text_color="orange")
        success, msg = self.sync_service.sync()
        if success:
            self.status_lbl.configure(text="Synced", text_color="green")
            self.after(0, self.refresh_notes)
        else:
            self.status_lbl.configure(text="Sync Error", text_color="red")
            print(msg)

if __name__ == "__main__":
    app = App()
    app.mainloop()
