"""Sinh các bài tập MusicXML mẫu (2 khuông: khóa Sol tay phải, khóa Fa tay trái).
divisions = 2  -> móc đơn=1, đen=2, đen chấm=3, trắng=4, tròn=8
"""
TYPES = {1: ("eighth", False), 2: ("quarter", False), 3: ("quarter", True),
         4: ("half", False), 6: ("half", True), 8: ("whole", False)}

def note(pitch, dur, staff, voice, chord=False, finger=None):
    t, dot = TYPES[dur]
    x = "<note>"
    if chord: x += "<chord/>"
    if pitch == "R":
        x += "<rest/>"
    else:
        step, octv = pitch[0], pitch[-1]
        alter = "<alter>1</alter>" if "#" in pitch else ("<alter>-1</alter>" if "b" in pitch[1:] else "")
        x += f"<pitch><step>{step}</step>{alter}<octave>{octv}</octave></pitch>"
    x += f"<duration>{dur}</duration><voice>{voice}</voice><type>{t}</type>"
    if dot: x += "<dot/>"
    x += f"<staff>{staff}</staff>"
    if finger: x += f"<notations><technical><fingering>{finger}</fingering></technical></notations>"
    return x + "</note>"

def score(title, rh, lh, beats=4):
    """rh/lh: list các ô nhịp; mỗi ô là list (pitch|[pitches], dur, finger)."""
    ms = []
    for i, (r, l) in enumerate(zip(rh, lh)):
        m = f'<measure number="{i+1}">'
        if i == 0:
            m += ("<attributes><divisions>2</divisions><key><fifths>0</fifths></key>"
                  f"<time><beats>{beats}</beats><beat-type>4</beat-type></time><staves>2</staves>"
                  "<clef number=\"1\"><sign>G</sign><line>2</line></clef>"
                  "<clef number=\"2\"><sign>F</sign><line>4</line></clef></attributes>")
        total = 0
        for p, d, *f in r:
            ps = p if isinstance(p, list) else [p]
            for k, pp in enumerate(ps):
                m += note(pp, d, 1, 1, chord=k > 0, finger=(f[0] if f and k == 0 else None))
            total += d
        m += f"<backup><duration>{total}</duration></backup>"
        for p, d, *f in l:
            ps = p if isinstance(p, list) else [p]
            for k, pp in enumerate(ps):
                m += note(pp, d, 2, 5, chord=k > 0, finger=(f[0] if f and k == 0 else None))
        if i == len(rh) - 1:
            m += '<barline location="right"><bar-style>light-heavy</bar-style></barline>'
        ms.append(m + "</measure>")
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" '
            '"http://www.musicxml.org/dtds/partwise.dtd">\n'
            f'<score-partwise version="4.0"><work><work-title>{title}</work-title></work>'
            '<part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>'
            '<part id="P1">' + "".join(ms) + "</part></score-partwise>\n")

# Bài 1: 5 ngón tay phải (thế Đô), tay trái nghỉ
rh1 = [[("C4",2,"1"),("D4",2,"2"),("E4",2,"3"),("F4",2,"4")],
       [("G4",2,"5"),("F4",2,"4"),("E4",2,"3"),("D4",2,"2")],
       [("C4",2,"1"),("E4",2,"3"),("G4",2,"5"),("E4",2,"3")],
       [("C4",8,"1")]]
lh1 = [[("R",8)]]*4

# Bài 2: 5 ngón tay trái (thế Đô), tay phải nghỉ
lh2 = [[("C3",2,"5"),("D3",2,"4"),("E3",2,"3"),("F3",2,"2")],
       [("G3",2,"1"),("F3",2,"2"),("E3",2,"3"),("D3",2,"4")],
       [("C3",2,"5"),("E3",2,"3"),("G3",2,"1"),("E3",2,"3")],
       [("C3",8,"5")]]
rh2 = [[("R",8)]]*4

# Bài 3: Ode to Joy (Beethoven - public domain), tay trái nốt trầm tròn
rh3 = [[("E4",2,"3"),("E4",2),("F4",2),("G4",2)],
       [("G4",2),("F4",2),("E4",2),("D4",2)],
       [("C4",2,"1"),("C4",2),("D4",2),("E4",2)],
       [("E4",3),("D4",1),("D4",4)],
       [("E4",2),("E4",2),("F4",2),("G4",2)],
       [("G4",2),("F4",2),("E4",2),("D4",2)],
       [("C4",2),("C4",2),("D4",2),("E4",2)],
       [("D4",3),("C4",1),("C4",4)]]
lh3 = [[("C3",8,"5")],[("G2",8)],[("C3",8)],[("G2",8)],
       [("C3",8)],[("G2",8)],[("C3",8)],[("G2",4),("C3",4)]]

# Bài 4: Hợp âm đệm C - F - G - C (tay trái hợp âm, tay phải giai điệu)
rh4 = [[("E4",4),("G4",4)],[("F4",4),("A4",4)],[("D4",4),("B4",4)],[("C5",8)]]
lh4 = [[(["C3","E3","G3"],8)],[(["C3","F3","A3"],8)],[(["B2","D3","G3"],8)],[(["C3","E3","G3"],8)]]

import os
out = os.path.join(os.path.dirname(__file__), "..", "public", "songs")
songs = [("01-5-ngon-tay-phai", "Bài 1 - 5 ngón tay phải", rh1, lh1),
         ("02-5-ngon-tay-trai", "Bài 2 - 5 ngón tay trái", rh2, lh2),
         ("03-ode-to-joy", "Bài 3 - Ode to Joy", rh3, lh3),
         ("04-hop-am-C-F-G", "Bài 4 - Hợp âm C F G", rh4, lh4)]
import json
for fn, title, r, l in songs:
    open(os.path.join(out, fn + ".musicxml"), "w", encoding="utf-8").write(score(title, r, l))
json.dump([{"file": fn + ".musicxml", "title": t} for fn, t, _, _ in songs],
          open(os.path.join(out, "index.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("ok", len(songs))
