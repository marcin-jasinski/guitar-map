import { describe, expect, test } from 'vitest';
import {
  CHORDS,
  SCALES,
  chordNotes,
  chordSymbol,
  diatonicTriads,
  freq,
  fretMidi,
  midiOf,
  notePc,
  scaleNotes,
  spell,
} from './theory';

const names = (ns: { name: string }[]) => ns.map((n) => n.name);

describe('note parsing', () => {
  test('pitch classes', () => {
    expect(notePc('C')).toBe(0);
    expect(notePc('F♯')).toBe(6);
    expect(notePc('G♭')).toBe(6);
    expect(notePc('B𝄫')).toBe(9);
  });
});

// The five cases the spec pins as the spelling engine's self-check (§Cross-cutting).
describe('spelling engine — spec self-check', () => {
  test('F♯ major spells E♯, not F', () => {
    expect(names(scaleNotes('F♯', 'Major (Ionian)'))).toEqual([
      'F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯',
    ]);
  });

  test('C blues = C E♭ F G♭ G B♭ (letter G twice)', () => {
    expect(names(scaleNotes('C', 'Minor blues'))).toEqual(['C', 'E♭', 'F', 'G♭', 'G', 'B♭']);
  });

  test('C minor pentatonic = C E♭ F G B♭', () => {
    expect(names(scaleNotes('C', 'Minor pentatonic'))).toEqual(['C', 'E♭', 'F', 'G', 'B♭']);
  });

  test("Cdim7's 7th is B𝄫", () => {
    expect(names(chordNotes('C', 'dim7'))).toEqual(['C', 'E♭', 'G♭', 'B𝄫']);
  });

  test('Caug = C E G♯', () => {
    expect(names(chordNotes('C', 'aug'))).toEqual(['C', 'E', 'G♯']);
  });

  test('A♯ major reaches a double sharp (C𝄪)', () => {
    expect(names(scaleNotes('A♯', 'Major (Ionian)'))[2]).toBe('C𝄪');
  });
});

describe('spelling engine — letter arithmetic', () => {
  test('one letter per degree in every 7-note scale, from every root', () => {
    const sevens = Object.keys(SCALES).filter((s) => SCALES[s].intervals.length === 7);
    for (const root of ['C', 'F♯', 'G♭', 'A♯', 'E♭', 'B']) {
      for (const s of sevens) {
        const letters = scaleNotes(root, s).map((n) => n.name[0]);
        expect(new Set(letters).size, `${root} ${s}`).toBe(7);
      }
    }
  });

  test('spelled names always match their pitch class', () => {
    for (const root of ['C', 'D♭', 'F♯', 'A♯']) {
      for (const c of Object.keys(CHORDS)) {
        for (const n of chordNotes(root, c)) expect(notePc(n.name)).toBe(n.pc);
      }
    }
  });

  test('spell() is pure letter-step + accidental', () => {
    expect(spell('C', 11, 6)).toBe('B');
    expect(spell('C', 10, 6)).toBe('B♭');
    expect(spell('E♭', 4, 2)).toBe('G');
  });
});

describe('interval + degree labels', () => {
  test('minor 7th chord labels', () => {
    expect(chordNotes('C', 'min7').map((n) => n.interval)).toEqual(['R', '♭3', '5', '♭7']);
  });

  test('scale degrees are 1..7', () => {
    expect(scaleNotes('C', 'Dorian').map((n) => n.degree)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
  });

  test('roles drive colour: root / 3rd / 5th / 7th', () => {
    expect(chordNotes('C', 'maj7').map((n) => n.role)).toEqual(['root', '3rd', '5th', '7th']);
    expect(chordNotes('C', 'sus4').map((n) => n.role)).toEqual(['root', 'other', '5th']);
  });
});

describe('chord symbols', () => {
  test('key-correct symbols', () => {
    expect(chordSymbol('C', 'major')).toBe('C');
    expect(chordSymbol('E♭', 'min7')).toBe('E♭m7');
    expect(chordSymbol('F♯', 'dim')).toBe('F♯°');
  });
});

describe('diatonic triads (§7)', () => {
  test('C major gives I ii iii IV V vi vii°', () => {
    const t = diatonicTriads('C', 'Major (Ionian)');
    expect(t.map((x) => x.numeral)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
    expect(t.map((x) => x.symbol)).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°']);
  });

  test('harmonic minor has the augmented III+', () => {
    const t = diatonicTriads('A', 'Harmonic minor');
    expect(t.map((x) => x.numeral)).toEqual(['i', 'ii°', 'III+', 'iv', 'V', 'VI', 'vii°']);
  });

  test('triad notes carry root/3rd/5th roles keyed to the triad root', () => {
    const v = diatonicTriads('C', 'Major (Ionian)')[4]; // V = G major
    expect(v.notes.map((n) => n.name)).toEqual(['G', 'B', 'D']);
    expect(v.notes.map((n) => n.role)).toEqual(['root', '3rd', '5th']);
  });

  test('no triads for 5/6-note scales — the selector hides', () => {
    expect(diatonicTriads('C', 'Minor blues')).toEqual([]);
    expect(diatonicTriads('C', 'Major pentatonic')).toEqual([]);
  });
});

describe('pitch, tuning and audio frequency (§6)', () => {
  test('scientific pitch notation → MIDI', () => {
    expect(midiOf({ note: 'C', octave: 4 })).toBe(60);
    expect(midiOf({ note: 'A', octave: 4 })).toBe(69);
    expect(midiOf({ note: 'E', octave: 2 })).toBe(40);
  });

  test('A4 = 440 Hz', () => {
    expect(freq(69)).toBeCloseTo(440);
    expect(freq(57)).toBeCloseTo(220);
  });

  test('fret pitch follows the tuning, not a hard-coded EADGBE', () => {
    const dropD = { strings: [{ note: 'D', octave: 2 }, { note: 'A', octave: 2 }] };
    expect(fretMidi(dropD, 0, 0)).toBe(38);
    expect(fretMidi(dropD, 0, 12)).toBe(50);
    expect(fretMidi(dropD, 1, 5)).toBe(50);
  });
});
