#!/usr/bin/env python3
"""
Handball Laufchallenge - Grafische Oberfläche zum Hinzufügen von Läufen
Mit Dropdown-Menüs, Datepicker und Validierung
"""

import json
import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime, timedelta
from pathlib import Path
import sys

DATA_FILE = Path(__file__).parent / 'data.json'

class RunAdderGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Handball Laufchallenge - Lauf hinzufügen")
        self.root.geometry("500x700")
        self.root.resizable(False, False)
        
        # Daten laden
        self.data = self.load_data()
        self.players = {p['id']: p['name'] for p in self.data['players']}
        self.player_ids = {p['name']: p['id'] for p in self.data['players']}
        
        # Style
        style = ttk.Style()
        style.theme_use('clam')
        
        # Hauptframe
        main_frame = ttk.Frame(root, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Titel
        title = ttk.Label(main_frame, text="➕ Neuer Lauf / Aktivität", 
                          font=('Arial', 14, 'bold'))
        title.pack(pady=(0, 20))
        
        # Spieler
        ttk.Label(main_frame, text="Spieler *", font=('Arial', 10, 'bold')).pack(anchor='w')
        self.player_combo = ttk.Combobox(
            main_frame,
            values=sorted([p['name'] for p in self.data['players']]),
            width=40,
            state='readonly'
        )
        self.player_combo.pack(fill='x', pady=(0, 15))
        
        # Datum
        ttk.Label(main_frame, text="Datum (optional: leer=heute, -1=gestern)", font=('Arial', 10, 'bold')).pack(anchor='w')
        date_frame = ttk.Frame(main_frame)
        date_frame.pack(fill='x', pady=(0, 15))
        
        self.date_entry = ttk.Entry(date_frame, width=15)
        self.date_entry.pack(side='left')
        self.date_entry.insert(0, "")
        
        ttk.Button(date_frame, text="📅 Heute", width=10,
                   command=lambda: self.date_entry.delete(0, tk.END) or 
                   self.date_entry.insert(0, datetime.now().strftime('%Y-%m-%d'))).pack(side='left', padx=(5, 0))
        
        ttk.Button(date_frame, text="Gestern (-1)", width=12,
                   command=lambda: self.date_entry.delete(0, tk.END) or 
                   self.date_entry.insert(0, "-1")).pack(side='left', padx=(5, 0))
        
        # Startzeit
        ttk.Label(main_frame, text="Startzeit (optional)", font=('Arial', 10, 'bold')).pack(anchor='w')
        time_frame = ttk.Frame(main_frame)
        time_frame.pack(fill='x', pady=(0, 15))
        
        # Stunden und Minuten Spinner
        ttk.Label(time_frame, text="Uhr:").pack(side='left')
        self.hour_var = tk.StringVar(value="18")
        hour_spin = ttk.Spinbox(time_frame, from_=0, to=23, textvariable=self.hour_var, width=4)
        hour_spin.pack(side='left', padx=(5, 0))
        
        ttk.Label(time_frame, text=":").pack(side='left', padx=(2, 2))
        self.minute_var = tk.StringVar(value="00")
        minute_spin = ttk.Spinbox(time_frame, from_=0, to=59, textvariable=self.minute_var, width=4)
        minute_spin.pack(side='left')
        
        # Quick-Buttons für beliebte Zeiten
        ttk.Button(time_frame, text="🌅 06:00", width=8,
                   command=lambda: (self.hour_var.set("06"), self.minute_var.set("00"))).pack(side='left', padx=(10, 2))
        
        ttk.Button(time_frame, text="☀️ 12:00", width=8,
                   command=lambda: (self.hour_var.set("12"), self.minute_var.set("00"))).pack(side='left', padx=(2, 2))
        
        ttk.Button(time_frame, text="🌆  18:00", width=8,
                   command=lambda: (self.hour_var.set("18"), self.minute_var.set("00"))).pack(side='left', padx=(2, 2))
        
        ttk.Button(time_frame, text="🌙 20:00", width=8,
                   command=lambda: (self.hour_var.set("20"), self.minute_var.set("00"))).pack(side='left', padx=(2, 0))
        
        # Distanz
        ttk.Label(main_frame, text="Distanz (km) *", font=('Arial', 10, 'bold')).pack(anchor='w')
        self.distance_entry = ttk.Entry(main_frame)
        self.distance_entry.pack(fill='x', pady=(0, 15))
        
        # Höhenmeter
        ttk.Label(main_frame, text="Höhenmeter *", font=('Arial', 10, 'bold')).pack(anchor='w')
        self.elevation_entry = ttk.Entry(main_frame)
        self.elevation_entry.pack(fill='x', pady=(0, 15))
        
        # Dauer
        ttk.Label(main_frame, text="Dauer (MM:SS oder Minuten) *", font=('Arial', 10, 'bold')).pack(anchor='w')
        self.duration_entry = ttk.Entry(main_frame)
        self.duration_entry.pack(fill='x', pady=(0, 15))
        
        # Partner
        ttk.Label(main_frame, text="Partner (optional)", font=('Arial', 10, 'bold')).pack(anchor='w')
        self.partners_frame = ttk.Frame(main_frame)
        self.partners_frame.pack(fill='x', pady=(0, 15))
        
        self.partners_var = tk.Variable()
        partner_names = sorted([p['name'] for p in self.data['players']])
        
        # Scrollable Listbox für Partner
        scrollbar = ttk.Scrollbar(self.partners_frame)
        scrollbar.pack(side='right', fill='y')
        
        self.partners_listbox = tk.Listbox(
            self.partners_frame,
            height=4,
            yscrollcommand=scrollbar.set,
            selectmode='multiple',
            font=('Arial', 9)
        )
        self.partners_listbox.pack(fill='both', expand=True)
        scrollbar.config(command=self.partners_listbox.yview)
        
        for name in partner_names:
            self.partners_listbox.insert(tk.END, name)
        
        # Aktivitätstyp
        ttk.Label(main_frame, text="Aktivitätstyp (optional)", font=('Arial', 10, 'bold')).pack(anchor='w')
        self.activity_combo = ttk.Combobox(
            main_frame,
            values=['Lauf', 'Radfahren', 'Schwimmen', 'Wandern', 'Yoga', 'Pilates', 'Krafttraining', 'Sonstiges'],
            width=40,
            state='readonly'
        )
        self.activity_combo.pack(fill='x', pady=(0, 20))
        self.activity_combo.current(0)  # Default: Lauf
        
        # Buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill='x', pady=(20, 0))
        
        ttk.Button(button_frame, text="✅ Hinzufügen", 
                   command=self.add_run,
                   width=20).pack(side='left', padx=(0, 5))
        
        ttk.Button(button_frame, text="🔄 Zurücksetzen", 
                   command=self.reset_form,
                   width=20).pack(side='left')
        
        # Status
        self.status_label = ttk.Label(main_frame, text="", foreground="green")
        self.status_label.pack(pady=(10, 0))
    
    def load_data(self):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def save_data(self):
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=4, ensure_ascii=False)
    
    def parse_time(self, time_str):
        """Konvertiert Zeit zu Minuten"""
        time_str = str(time_str).strip()
        if ':' in time_str:
            parts = time_str.split(':')
            minutes = int(parts[0])
            seconds = int(parts[1]) if len(parts) > 1 else 0
            return minutes + seconds / 60
        return float(time_str)
    
    def get_next_id(self, is_activity=False):
        prefix = 'a' if is_activity else 'r'
        max_num = 0
        for run in self.data['runs']:
            run_id = run.get('id', '')
            if run_id.startswith(prefix):
                try:
                    num = int(run_id[1:])
                    max_num = max(max_num, num)
                except ValueError:
                    pass
        return f"{prefix}{max_num + 1:03d}"
    
    def add_run(self):
        # Validierung
        player_name = self.player_combo.get()
        if not player_name:
            messagebox.showerror("Fehler", "Bitte Spieler auswählen!")
            return
        
        date_str = self.date_entry.get().strip()
        
        # Datum verarbeiten
        if not date_str or date_str == "":
            # Leer = heute
            date_str = datetime.now().strftime('%Y-%m-%d')
        elif date_str == "-1":
            # -1 = gestern
            date_str = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        else:
            # Gültiges Datum validieren
            try:
                datetime.strptime(date_str, '%Y-%m-%d')
            except ValueError:
                messagebox.showerror("Fehler", "Ungültiges Datumsformat (YYYY-MM-DD, oder leer für heute, oder -1 für gestern)")
                return
        
        distance_str = self.distance_entry.get().strip()
        if not distance_str:
            messagebox.showerror("Fehler", "Bitte Distanz eingeben!")
            return
        
        elevation_str = self.elevation_entry.get().strip()
        if not elevation_str:
            messagebox.showerror("Fehler", "Bitte Höhenmeter eingeben!")
            return
        
        duration_str = self.duration_entry.get().strip()
        if not duration_str:
            messagebox.showerror("Fehler", "Bitte Dauer eingeben!")
            return
        
        # Werte parsen
        try:
            distance = float(distance_str)
            elevation = int(elevation_str)
            duration = self.parse_time(duration_str)
        except ValueError as e:
            messagebox.showerror("Fehler", f"Ungültige Eingabe: {e}")
            return
        
        # Partner sammeln
        partner_indices = self.partners_listbox.curselection()
        partners = []
        for idx in partner_indices:
            partner_name = self.partners_listbox.get(idx)
            if partner_name != player_name:
                partners.append(self.player_ids[partner_name])
        
        # Aktivitätstyp
        activity = self.activity_combo.get()
        is_activity = activity != 'Lauf'
        
        # Neue Lauf-ID
        new_id = self.get_next_id(is_activity)
        
        # Spieler-ID
        player_id = self.player_ids[player_name]
        
        # Startzeit zusammensetzen
        hour = self.hour_var.get().zfill(2)
        minute = self.minute_var.get().zfill(2)
        start_time = f"{hour}:{minute}"
        
        # Lauf erstellen
        new_run = {
            "id": new_id,
            "player": player_id,
            "date": date_str,
            "startTime": start_time,
            "distance": distance,
            "elevation": elevation,
            "duration": duration,
            "partners": partners
        }
        
        if is_activity:
            new_run["activity"] = activity
        
        # Zur Liste hinzufügen
        self.data['runs'].append(new_run)
        self.save_data()
        
        # Erfolgsmeldung
        type_label = f"Aktivität ({activity})" if is_activity else "Lauf"
        partner_count = len(partners)
        partner_text = f" mit {partner_count} Partner{'n' if partner_count != 1 else ''}" if partners else ""
        
        self.status_label.config(
            text=f"✅ {type_label} hinzugefügt (ID: {new_id}){partner_text}",
            foreground="green"
        )
        
        messagebox.showinfo("Erfolg!", f"{type_label} gespeichert!\nID: {new_id}")
        self.reset_form()
    
    def reset_form(self):
        self.player_combo.set("")
        self.date_entry.delete(0, tk.END)
        self.hour_var.set("18")
        self.minute_var.set("00")
        self.distance_entry.delete(0, tk.END)
        self.elevation_entry.delete(0, tk.END)
        self.duration_entry.delete(0, tk.END)
        self.partners_listbox.selection_clear(0, tk.END)
        self.activity_combo.current(0)
        self.status_label.config(text="")

if __name__ == "__main__":
    root = tk.Tk()
    app = RunAdderGUI(root)
    root.mainloop()
