#!/usr/bin/env python3
"""Unpack a carrier pack into trimmed, levelled sounds in audio/. See README.md."""
import sys, json, struct, subprocess, wave, os, tempfile
import numpy as np
pack, spec = open(sys.argv[1], 'rb').read(), json.load(open(sys.argv[2]))
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'audio'); tmp = tempfile.mkdtemp(); o = 0
def rd(f):
    w = wave.open(f); a = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32768
    return a.reshape(-1, w.getnchannels()), w.getframerate()
for s in spec:
    L = struct.unpack('>I', pack[o:o + 4])[0]; o += 4; raw = os.path.join(tmp, 'raw.mp3'); open(raw, 'wb').write(pack[o:o + L]); o += L
    ch = '2' if s.get('stereo') else '1'; c = float(s['cap'])
    af = ['-af', 'dynaudnorm=f=120:g=5:m=14:p=0.9'] if s.get('level') else []
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw] + af + ['-ar', '44100', '-ac', ch, tmp + '/x.wav'], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-ar', '44100', '-ac', ch, tmp + '/r.wav'], check=True)
    r, sr = rd(tmp + '/r.wav'); er = np.abs(r).max(axis=1); i = np.nonzero(er > er.max() * 0.06)[0]
    x, sr = rd(tmp + '/x.wav'); lead = 0 if s.get('keepLead') else max(0, i[0] - int(0.003 * sr)); x = x[lead:].copy(); x = x[:int(c * sr)]
    if s.get('level'):   # gate the noise floor the leveller lifts
        rr = er[lead:lead + len(x)]; w = int(0.03 * sr); sm = np.convolve(rr, np.ones(w) / w, 'same'); g = np.clip(sm / (er.max() * 0.0025), 0, 1)[:len(x)]; x[:len(g)] *= g[:, None]
    f = min(len(x), int((0.03 if c < 0.4 else 0.06 if c < 1 else 0.35) * sr)); x[-f:] *= np.linspace(1, 0, f)[:, None]; x = x * (0.85 / max(1e-6, np.abs(x).max()))
    w = wave.open(tmp + '/o.wav', 'wb'); w.setnchannels(int(ch)); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x * 32767).astype('<i2').tobytes()); w.close()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp + '/o.wav', '-c:a', 'libmp3lame', '-b:a', '160k' if s.get('stereo') else '128k', os.path.join(root, s['file'])], check=True)
    e2 = np.abs(x).max(axis=1); step = int((0.2 if c > 1 else 0.02) * sr); env = ''.join(str(int(e2[k:k + step].max() * 9)) for k in range(0, len(e2), step))
    print(f"{s['name']:18s} raw {len(r)/sr:5.2f}s lead {lead/sr:4.2f}s kept {len(x)/sr:5.2f}s shape {env}")
assert o == len(pack), 'pack has more files than the spec'
