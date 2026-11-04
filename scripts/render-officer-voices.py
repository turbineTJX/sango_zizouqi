"""Authoring helper. Game clients only use the completed local WAV files."""
import asyncio
import json
import os
from importlib.metadata import version
from pathlib import Path
import sys

# Optional project-local installation keeps authoring dependencies out of the game.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / '.local/voice-tools/python'))
try:
    import edge_tts
except ImportError:
    sys.exit('Install authoring dependency: python -m pip install --target .local/voice-tools/python edge-tts==7.3.1')
if version('edge-tts') != '7.3.1':
    sys.exit('This voice pack uses edge-tts==7.3.1; install the pinned authoring dependency.')


async def render(job, semaphore):
    async with semaphore:
        target = Path(job['source'])
        if target.is_file() and target.stat().st_size > 1000:
            return
        partial = target.with_suffix('.part')
        for attempt in range(3):
            try:
                speech = edge_tts.Communicate(
                    job['text'], job['voice'], rate=job['rate'], pitch=job['pitch'],
                    proxy=os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy'),
                    connect_timeout=15, receive_timeout=30,
                )
                await asyncio.wait_for(speech.save(str(partial)), timeout=50)
                if partial.stat().st_size <= 1000:
                    raise ValueError('Empty speech response')
                partial.replace(target)
                print('Rendered ' + job['id'], flush=True)
                return
            except Exception:
                partial.unlink(missing_ok=True)
                if attempt == 2:
                    raise
                await asyncio.sleep(1 + attempt)


async def main():
    jobs = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    semaphore = asyncio.Semaphore(2)
    await asyncio.gather(*(render(job, semaphore) for job in jobs))


if __name__ == '__main__':
    asyncio.run(main())
