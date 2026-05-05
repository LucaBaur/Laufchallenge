#!/usr/bin/env python3
"""
Schnell-Lauf-Hinzufüger für Handball Laufchallenge 2026
Nutzer gibt ein: Name/ID Datum Distanz Höhenmeter Dauer [Partner1 Partner2 ...] [--activity=Radfahren]
Beispiel: Franzi O. 2026-05-06 5.5 120 38
Beispiel: p1 2026-05-06 5.5 120 38 p2 (mit Partner)
Beispiel: Rebi 2026-05-05 12.3 0 52 --activity=Radfahren
"""

import json
import os
from pathlib import Path
import re

DATA_FILE = Path(__file__).parent / 'data.json'

def load_data():
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def find_player_id(data, name_or_id):
    """Findet Spieler-ID nach Name oder ID"""
    name_or_id = name_or_id.strip()
    
    # Wenn es schon eine ID ist
    if name_or_id.startswith('p'):
        for p in data['players']:
            if p['id'] == name_or_id:
                return p['id'], p['name']
        return None, f"Spieler {name_or_id} nicht gefunden"
    
    # Nach Name suchen (case-insensitive, Substring-Match)
    lower_input = name_or_id.lower()
    matches = [p for p in data['players'] 
               if lower_input in p['name'].lower()]
    
    if len(matches) == 1:
        return matches[0]['id'], matches[0]['name']
    elif len(matches) > 1:
        options = '\n  '.join([f"{p['id']}: {p['name']}" for p in matches])
        return None, f"Mehrere Spieler gefunden:\n  {options}\nBitte ID angeben"
    else:
        return None, f"Spieler '{name_or_id}' nicht gefunden"

def get_next_id(data, is_activity=False):
    """Generiert die nächste Lauf- oder Aktivitäts-ID"""
    prefix = 'a' if is_activity else 'r'
    max_num = 0
    
    for run in data['runs']:
        run_id = run.get('id', '')
        if run_id.startswith(prefix):
            try:
                num = int(run_id[1:])
                max_num = max(max_num, num)
            except ValueError:
                pass
    
    return f"{prefix}{max_num + 1:03d}"

def parse_time_to_minutes(time_str):
    """Konvertiert "29:22" oder "29.37" oder "29" zu Minuten als float"""
    time_str = str(time_str).strip()
    
    # Format MM:SS
    if ':' in time_str:
        parts = time_str.split(':')
        minutes = int(parts[0])
        seconds = int(parts[1]) if len(parts) > 1 else 0
        return minutes + seconds / 60
    
    # Format MM.SS oder einfach MM
    try:
        return float(time_str)
    except ValueError:
        raise ValueError(f"Ungültiges Zeit-Format: {time_str}")

def add_run(player_input, date_str, distance_str, elevation_str, duration_str, 
            partners_input=None, activity=None):
    """Fügt einen Lauf/eine Aktivität hinzu"""
    
    data = load_data()
    
    # Spieler suchen
    player_id, player_result = find_player_id(data, player_input)
    if not player_id:
        return False, player_result
    
    # Werte parsen und validieren
    try:
        distance = float(distance_str)
        elevation = int(elevation_str)
        duration = parse_time_to_minutes(duration_str)
    except ValueError as e:
        return False, f"Fehler beim Parsen: {e}"
    
    # Partner verarbeiten
    partners = []
    if partners_input:
        for partner_name in partners_input:
            partner_id, partner_result = find_player_id(data, partner_name)
            if not partner_id:
                return False, f"Partner '{partner_name}': {partner_result}"
            if partner_id != player_id:
                partners.append(partner_id)
    
    # Neue Lauf-ID generieren
    is_activity = activity is not None
    new_id = get_next_id(data, is_activity)
    
    # Neue Lauf erstellen
    new_run = {
        "id": new_id,
        "player": player_id,
        "date": date_str,
        "distance": distance,
        "elevation": elevation,
        "duration": duration,
        "partners": partners
    }
    
    if activity:
        new_run["activity"] = activity
    
    # Falls startTime nicht gegeben, auf 18:00 setzen (kann manuell angepasst werden)
    if "startTime" not in new_run:
        new_run["startTime"] = "18:00"
    
    # Zur Liste hinzufügen
    data['runs'].append(new_run)
    save_data(data)
    
    # Ausgabe
    type_label = f"Aktivität ({activity})" if activity else "Lauf"
    partner_str = f" mit {', '.join([find_player_id(data, p)[1] for p in partners])}" if partners else ""
    
    return True, f"✅ {type_label} hinzugefügt (ID: {new_id})\n   {player_result}: {distance}km, {int(duration)}min{partner_str}"

def interactive_mode():
    """Interaktive Eingabe"""
    print("=" * 60)
    print("Lauf/Aktivität hinzufügen")
    print("=" * 60)
    
    player = input("Spieler (Name oder ID): ").strip()
    date = input("Datum (YYYY-MM-DD): ").strip()
    distance = input("Distanz (km): ").strip()
    elevation = input("Höhenmeter: ").strip()
    duration = input("Dauer (MM:SS oder Minuten): ").strip()
    
    partners_str = input("Partner (durch Leerzeichen getrennt, optional): ").strip()
    partners = partners_str.split() if partners_str else None
    
    activity = input("Aktivitätstyp (optional, zB 'Radfahren'): ").strip() or None
    
    success, message = add_run(player, date, distance, elevation, duration, partners, activity)
    
    print()
    if success:
        print("✅ " + message)
    else:
        print("❌ Fehler: " + message)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Command-line Modus
        args = sys.argv[1:]
        activity = None
        
        # --activity=... extrahieren
        filtered_args = []
        for arg in args:
            if arg.startswith('--activity='):
                activity = arg.split('=', 1)[1]
            else:
                filtered_args.append(arg)
        
        if len(filtered_args) < 5:
            print("Verwendung: python add_run.py <Spieler> <Datum> <Distanz> <Höhenmeter> <Dauer> [Partner...] [--activity=Typ]")
            sys.exit(1)
        
        player = filtered_args[0]
        date = filtered_args[1]
        distance = filtered_args[2]
        elevation = filtered_args[3]
        duration = filtered_args[4]
        partners = filtered_args[5:] if len(filtered_args) > 5 else None
        
        success, message = add_run(player, date, distance, elevation, duration, partners, activity)
        print(message)
        sys.exit(0 if success else 1)
    else:
        # Interaktiver Modus
        interactive_mode()
