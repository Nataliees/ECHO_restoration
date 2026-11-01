"""Extract aligned keystrokes from the supplied recording; requires ffmpeg."""
from array import array
from pathlib import Path
import subprocess
import sys
import tempfile
import wave

root = Path(__file__).resolve().parents[1]
rate = 44100
starts = [.647, .851, 1.041, 1.222, 1.363, 1.607]
length, slot = .072, .085
with tempfile.TemporaryDirectory() as temporary:
    decoded = Path(temporary) / 'decoded.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(root / 'assets/typewriter.mp3'),
                    '-t', '3', '-ac', '1', '-ar', str(rate), str(decoded)], check=True)
    with wave.open(str(decoded), 'rb') as source:
        samples = array('h', source.readframes(source.getnframes()))
    if sys.byteorder != 'little':
        samples.byteswap()
    bank = array('h', [0]) * round(rate * slot * len(starts))
    for index, start in enumerate(starts):
        clip = samples[round(start * rate):round((start + length) * rate)]
        fade = min(round(.004 * rate), len(clip))
        for i in range(fade):
            clip[len(clip) - fade + i] = int(clip[len(clip) - fade + i] * (1 - i / (fade - 1)))
        begin = round(index * slot * rate)
        bank[begin:begin + len(clip)] = clip
    if sys.byteorder != 'little':
        bank.byteswap()
    with wave.open(str(root / 'assets/typewriter-keys.wav'), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(rate)
        output.writeframes(bank.tobytes())
