"""Read the 100 transcripts faster. Run it locally on the folder you unzipped:

    python scripts/skim.py path/to/transcripts

It writes two files NEXT TO the transcripts (not into this repo; they are not to be published):
  themes.txt : how often prospects use certain phrasings, with call ids and the line, so you can check
               what you think you saw at stages 2, 3 and 6.
  ends.txt   : the last few lines of every call with its logged outcome: where do calls end?
It reads only. It does not decide what your screen says; you do."""
import re
import sys
from pathlib import Path

THEMES = {
    "2 asks where we got the number": r"where did you get|who gave|how did you get|got my number",
    "2 says or guesses it is a sales call": r"sales call|selling|marketing call|you are selling|trying to sell",
    "2 asks what the company does": r"what (do you|does your company|does the company)|what is this (about|regarding)|which company|what company",
    "2/7 asks to send it first / WhatsApp": r"whatsapp|send (me |it |us )?(the |some )?(details|detail|mail|email|something|information|info|document|report)",
    "1/3 busy, driving, meeting": r"\bbusy\b|driving|in a meeting|\bmeeting\b|at lunch|on a call",
    "3 call me later": r"call (me )?(later|back|tomorrow|after|again)|after (two|three|four|five|\d)",
    "6 already have an agency or team": r"already (have|work|using|got)|agency|consultant|in-?house|our own team",
    "6 not interested": r"not interested|no (need|requirement)|don'?t need|do not need",
    "6 not the right person": r"not the right person|wrong person|speak to|talk to|contact (my|our|the)|connect you",
    "1 left the company": r"no longer|left the company|resigned|not (with|working)|moved on",
    "1/3 language": r"hindi|kannada|marathi|telugu|tamil|english",
    "3 do not call": r"do not call|don'?t call|stop calling|remove (my|the) number",
}


def parse(path: Path):
    head, turns = {}, []
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.strip()
        m = re.match(r"^(CALLER|PROSPECT|RECEPTION):\s*(.*)$", line)
        if m:
            turns.append((m.group(1), m.group(2)))
        elif turns:
            if line:
                turns[-1] = (turns[-1][0], turns[-1][1] + " " + line)  # a turn that wraps onto the next line
        elif ":" in line:
            k, v = line.split(":", 1)
            head[k.strip()] = v.strip()
    return head, turns


def main(folder):
    files = sorted(Path(folder).glob("T*.txt"))
    if not files:
        sys.exit(f"No T*.txt files in {folder}")
    hits = {t: [] for t in THEMES}
    ends = []
    for f in files:
        head, turns = parse(f)
        cid = f.stem
        for who, text in turns:
            if who == "CALLER":
                continue
            for theme, rx in THEMES.items():
                if re.search(rx, text, re.I):
                    hits[theme].append((cid, text))
        tail = "\n    ".join(f"{w}: {t}" for w, t in turns[-4:])
        ends.append(f"{cid}  outcome={head.get('outcome')}  turns={len(turns)}  duration={head.get('duration_seconds')}s\n    {tail}\n")
    out = Path(folder).parent
    with open(out / "themes.txt", "w", encoding="utf-8") as fh:
        for theme, rows in hits.items():
            ids = sorted({c for c, _ in rows})
            fh.write(f"\n== {theme}: {len(ids)} calls\n")
            for cid, text in rows[:6]:
                fh.write(f"  {cid}: {text[:160]}\n")
    (out / "ends.txt").write_text("\n".join(ends), encoding="utf-8")
    print(f"{len(files)} calls read. Wrote {out / 'themes.txt'} and {out / 'ends.txt'}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "transcripts")
