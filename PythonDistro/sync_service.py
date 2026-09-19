import requests
import json
import time

API_KEY = "AIzaSyBjQRbjvhqj1KPPcwbzLT4KNxIcuBCBQt0"
PROJECT_ID = "test-6826a"
APP_ID = "keepit-local" # Matching the web app default

AUTH_URL = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}"
SIGNUP_URL = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}"
FIRESTORE_ROOT = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"

class FirebaseSync:
    def __init__(self, storage):
        self.storage = storage
        self.id_token = None
        self.local_id = None
        self.email = None

    def login(self, email, password):
        try:
            payload = {"email": email, "password": password, "returnSecureToken": True}
            r = requests.post(AUTH_URL, json=payload)
            if r.status_code == 200:
                data = r.json()
                self.id_token = data['idToken']
                self.local_id = data['localId']
                self.email = data['email']
                return True, "Success"
            else:
                return False, r.json().get('error', {}).get('message', 'Login failed')
        except Exception as e:
            return False, str(e)

    def signup(self, email, password):
        try:
            payload = {"email": email, "password": password, "returnSecureToken": True}
            r = requests.post(SIGNUP_URL, json=payload)
            if r.status_code == 200:
                data = r.json()
                self.id_token = data['idToken']
                self.local_id = data['localId']
                self.email = data['email']
                return True, "Success"
            else:
                return False, r.json().get('error', {}).get('message', 'Signup failed')
        except Exception as e:
            return False, str(e)

    def _to_firestore_value(self, value):
        if value is None: return {"nullValue": None}
        if isinstance(value, bool): return {"booleanValue": value}
        if isinstance(value, int): return {"integerValue": str(value)}
        if isinstance(value, float): return {"doubleValue": value}
        if isinstance(value, str): return {"stringValue": value}
        if isinstance(value, list): return {"arrayValue": {"values": [self._to_firestore_value(v) for v in value]}}
        if isinstance(value, dict): return {"mapValue": {"fields": {k: self._to_firestore_value(v) for k, v in value.items()}}}
        return {"stringValue": str(value)}

    def _from_firestore_value(self, value):
        if 'stringValue' in value: return value['stringValue']
        if 'booleanValue' in value: return value['booleanValue']
        if 'integerValue' in value: return int(value['integerValue'])
        if 'doubleValue' in value: return float(value['doubleValue'])
        if 'arrayValue' in value: return [self._from_firestore_value(v) for v in value['arrayValue'].get('values', [])]
        if 'mapValue' in value: return {k: self._from_firestore_value(v) for k, v in value['mapValue'].get('fields', {}).items()}
        if 'timestampValue' in value: 
             # Simplify timestamp to float
             # Format: 2023-10-10T10:00:00Z
             # We store seconds in storage.py
             try:
                 from datetime import datetime
                 dt = datetime.fromisoformat(value['timestampValue'].replace('Z', '+00:00'))
                 return dt.timestamp()
             except:
                 return 0
        return None

    def sync(self):
        if not self.id_token: return False, "Not logged in"
        
        # 1. Push local changes
        dirty_notes = self.storage.get_dirty_notes()
        deleted_ids = self.storage.get_deleted_notes()

        headers = {"Authorization": f"Bearer {self.id_token}"}
        
        # Handle deletions
        for nid in deleted_ids:
            # Secure path: users/{uid}/notes
            url = f"{FIRESTORE_ROOT}/artifacts/{APP_ID}/users/{self.local_id}/notes/{nid}"
            requests.delete(url, headers=headers) 
            self.storage.hard_delete(nid)

        # Handle updates/creates
        for note in dirty_notes:
            if note['pendingDelete']: continue 
            
            # Construct Firestore document
            fields = {}
            for k, v in note.items():
                if k in ['id', 'isDirty', 'pendingDelete']: continue
                
                if k == 'updatedAt':
                    from datetime import datetime, timezone
                    dt = datetime.fromtimestamp(v, timezone.utc)
                    fields[k] = {"timestampValue": dt.isoformat().replace('+00:00', 'Z')}
                else:
                    fields[k] = self._to_firestore_value(v)
            
            fields['ownerId'] = {"stringValue": self.local_id}

            url = f"{FIRESTORE_ROOT}/artifacts/{APP_ID}/users/{self.local_id}/notes/{note['id']}"
            r = requests.patch(url, json={"fields": fields}, headers=headers)
            if r.status_code == 200:
                self.storage.mark_synced(note['id'])
            else:
                print(f"Failed to sync note {note['id']}: {r.text}")

        # 2. Pull remote changes
        # Fetch from users/{uid}/notes
        url = f"{FIRESTORE_ROOT}/artifacts/{APP_ID}/users/{self.local_id}/notes"
        
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            results = r.json()
            if 'documents' in results:
                for doc in results['documents']:
                    doc_id = doc['name'].split('/')[-1]
                    fields = doc['fields']
                    
                    note_data = {'id': doc_id}
                    for k, v in fields.items():
                        note_data[k] = self._from_firestore_value(v)
                    
                    self.storage.save_note(note_data, is_dirty=False)
                
            return True, "Synced"
        else:
            return False, f"Pull failed: {r.text}"
