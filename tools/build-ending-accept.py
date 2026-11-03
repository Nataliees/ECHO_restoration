"""Rebuild the accept ending voice track. Requires ffmpeg; video is copied unchanged."""
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
video = root / 'assets/ending_accept.mp4'
voice = root / 'assets/ending_accept_hero.mp3'
with tempfile.TemporaryDirectory(dir=video.parent) as temporary:
    output = Path(temporary) / 'ending.mp4'
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error',
        '-i', str(video), '-i', str(voice),
        # The source has 950 ms of leading room noise before the spoken line.
        '-filter_complex', '[1:a]atrim=start=0.95,asetpts=PTS-STARTPTS,adelay=6000:all=1,apad,asetnsamples=n=1024:p=1,asetpts=N/SR/TB[voice]',
        '-map', '0:v:0', '-map', '[voice]', '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '192k', '-t', '10', '-movflags', '+faststart', str(output)
    ], check=True)
    output.replace(video)
