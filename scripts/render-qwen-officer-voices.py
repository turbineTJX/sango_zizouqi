"""Free local Qwen authoring with an optional official public-demo fallback.

No account, paid API or secret is needed. The demo stops on errors or quotas;
completed jobs are cached. The game only loads completed local audio.
"""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import sys
import threading
import time
import urllib.error
import urllib.request

BASE = 'https://qwen-qwen3-tts.hf.space'
stopped = threading.Event()


def job_settings(job):
    settings = {key: job[key] for key in ('id', 'text', 'speaker', 'instruct')}
    if job.get('design'):
        settings['design'] = job['design']
    return settings


def character_reference(job):
    key = hashlib.sha256(json.dumps(job['design'], ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]
    return Path(__file__).resolve().parents[1] / '.local/voice-tools/characters' / job['character'] / key / 'reference.wav'


def reference_valid(job):
    path = character_reference(job)
    try:
        receipt = json.loads(path.with_suffix('.json').read_text(encoding='utf-8'))
        return receipt['design'] == job['design'] and receipt['sha256'] == hashlib.sha256(path.read_bytes()).hexdigest()
    except (OSError, ValueError, KeyError):
        return False


def cached(job):
    target = Path(job['source'])
    receipt = target.with_suffix('.json')
    if not target.is_file() or not receipt.is_file():
        return False
    settings = job_settings(job)
    try:
        previous = json.loads(receipt.read_text(encoding='utf-8'))
        valid = previous.get('settings') == settings and previous.get('sha256') == hashlib.sha256(target.read_bytes()).hexdigest()
        if job.get('design'):
            reference = character_reference(job)
            valid = valid and reference_valid(job) and previous.get('referenceSha256') == hashlib.sha256(reference.read_bytes()).hexdigest()
        return valid
    except (OSError, ValueError):
        return False


def render_local(jobs):
    import gc
    import numpy as np
    import soundfile as sf
    import torch
    from qwen_tts import Qwen3TTSModel
    pending = [job for job in jobs if not cached(job)]
    if not pending:
        return
    models = Path(__file__).resolve().parents[1] / '.local/voice-tools/models'
    if not torch.cuda.is_available():
        raise RuntimeError('CUDA is unavailable in the local Qwen authoring environment')
    torch.set_num_threads(4)
    batch_size = int(os.environ.get('SANGO_QWEN_BATCH', '2'))
    if batch_size not in (1, 2, 4):
        raise ValueError('SANGO_QWEN_BATCH must be 1, 2 or 4')
    def load_model(kind):
        path = Path(os.environ['SANGO_QWEN_MODEL_PATH']) if kind == 'CustomVoice' and os.environ.get('SANGO_QWEN_MODEL_PATH') else models / ('Qwen3-TTS-12Hz-1.7B-' + kind)
        print('Loading local ' + kind + ' on ' + torch.cuda.get_device_name(0), flush=True)
        return Qwen3TTSModel.from_pretrained(str(path), device_map='cuda:0', dtype=torch.bfloat16, attn_implementation='sdpa', local_files_only=True)

    def write_audio(job, samples, rate, kind):
        samples = np.asarray(samples, dtype=np.float32)
        if not np.isfinite(samples).all() or not .1 < len(samples) / rate < 12 or np.max(np.abs(samples)) < .02:
            raise ValueError('Invalid local speech: ' + job['id'])
        target = Path(job['source'])
        sf.write(str(target), samples, rate, subtype='PCM_16')
        receipt = {'settings': job_settings(job), 'model': 'Qwen/Qwen3-TTS-12Hz-1.7B-' + kind, 'provider': 'local NVIDIA inference', 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}
        if job.get('design'):
            receipt['referenceSha256'] = hashlib.sha256(character_reference(job).read_bytes()).hexdigest()
        target.with_suffix('.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding='utf-8')
        print('Rendered locally ' + job['id'], flush=True)

    general = [job for job in pending if not job.get('design')]
    if general:
        model = load_model('CustomVoice')
    for offset in range(0, len(general), batch_size):
        batch = general[offset:offset + batch_size]
        torch.manual_seed(int(hashlib.sha256(batch[0]['id'].encode()).hexdigest()[:8], 16))
        started = time.perf_counter()
        with torch.inference_mode():
            audio, rate = model.generate_custom_voice(text=[job['text'] for job in batch], language=['Chinese'] * len(batch), speaker=[job['speaker'] for job in batch], instruct=[job['instruct'] for job in batch], non_streaming_mode=True, max_new_tokens=256)
        if len(audio) != len(batch):
            raise ValueError('Local speech batch was incomplete')
        for job, samples in zip(batch, audio):
            write_audio(job, samples, rate, 'CustomVoice')
        print('Batch seconds: ' + str(round(time.perf_counter() - started, 2)), flush=True)
    if general:
        del model
        gc.collect()
        torch.cuda.empty_cache()

    named = [job for job in pending if job.get('design')]
    missing_references = list({job['character']: job for job in named if not reference_valid(job)}.values())
    if missing_references:
        model = load_model('VoiceDesign')
        for job in missing_references:
            torch.manual_seed(int(hashlib.sha256(job['character'].encode()).hexdigest()[:8], 16))
            with torch.inference_mode():
                audio, rate = model.generate_voice_design(text=job['design']['text'], language='Chinese', instruct=job['design']['instruct'], non_streaming_mode=True, max_new_tokens=256)
            samples = np.asarray(audio[0], dtype=np.float32)
            if not np.isfinite(samples).all() or not 1 < len(samples) / rate < 20 or np.max(np.abs(samples)) < .02:
                raise ValueError('Invalid designed character: ' + job['character'])
            path = character_reference(job)
            path.parent.mkdir(parents=True, exist_ok=True)
            sf.write(str(path), samples, rate, subtype='PCM_16')
            path.with_suffix('.json').write_text(json.dumps({'character': job['character'], 'design': job['design'], 'model': 'Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign', 'source': 'original synthetic reference', 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}, ensure_ascii=False, indent=2), encoding='utf-8')
            print('Designed original voice ' + job['character'], flush=True)
        del model, audio, samples
        gc.collect()
        torch.cuda.empty_cache()
    if named:
        model = load_model('Base')
        prompts = {}
        for job in named:
            if job['character'] not in prompts:
                prompts[job['character']] = model.create_voice_clone_prompt(ref_audio=str(character_reference(job)), ref_text=job['design']['text'])[0]
        # Two short lines plus references fit the author's 8 GB GPU.
        size = min(batch_size, 2)
        for offset in range(0, len(named), size):
            batch = named[offset:offset + size]
            torch.manual_seed(int(hashlib.sha256(batch[0]['id'].encode()).hexdigest()[:8], 16))
            with torch.inference_mode():
                audio, rate = model.generate_voice_clone(text=[job['text'] for job in batch], language=['Chinese'] * len(batch), voice_clone_prompt=[prompts[job['character']] for job in batch], non_streaming_mode=True, max_new_tokens=192)
            if len(audio) != len(batch):
                raise ValueError('Character batch was incomplete')
            for job, samples in zip(batch, audio):
                write_audio(job, samples, rate, 'Base')


def open_url(request, timeout):
    for attempt in range(3):
        try:
            return urllib.request.urlopen(request, timeout=timeout)
        except urllib.error.HTTPError as error:
            if error.code < 500 or attempt == 2:
                raise
        except urllib.error.URLError:
            if attempt == 2:
                raise
        time.sleep(2 + attempt * 3)


def render(job):
    if job.get('design'):
        raise ValueError('Character voice packs require local VoiceDesign and Base models')
    if stopped.is_set():
        return
    target = Path(job['source'])
    receipt = target.with_suffix('.json')
    settings = {key: job[key] for key in ('id', 'text', 'speaker', 'instruct')}
    if cached(job):
        return
    try:
        request = urllib.request.Request(
            BASE + '/gradio_api/call/generate_custom_voice',
            data=json.dumps({'data': [job['text'], 'Chinese', job['speaker'], job['instruct'], '1.7B']}).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
        )
        with open_url(request, timeout=30) as response:
            event_id = json.load(response)['event_id']
        result = None
        kind = None
        with open_url(BASE + '/gradio_api/call/generate_custom_voice/' + event_id, timeout=180) as response:
            for raw in response:
                line = raw.decode('utf-8').strip()
                if line.startswith('event:'):
                    kind = line[6:].strip()
                if line.startswith('data:') and kind in ('complete', 'error'):
                    result = json.loads(line[5:].strip())
                    if kind == 'error':
                        raise RuntimeError('Official demo rejected generation: ' + str(result))
                    break
        if not result or not result[0] or not result[0].get('url'):
            raise RuntimeError('Official demo returned no audio: ' + str(result))
        url = result[0]['url']
        if not url.startswith(BASE + '/'):
            raise ValueError('Unexpected generated-media host')
        with open_url(url, timeout=60) as response:
            data = response.read(12 * 1024 * 1024)
        if len(data) < 1000 or data[:4] != b'RIFF':
            raise ValueError('Invalid generated WAV')
        target.write_bytes(data)
        receipt.write_text(json.dumps({'settings': settings, 'model': 'Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice', 'provider': BASE, 'event_id': event_id, 'sha256': hashlib.sha256(data).hexdigest()}, ensure_ascii=False, indent=2), encoding='utf-8')
        print('Rendered ' + job['id'], flush=True)
    except Exception:
        stopped.set()
        raise


if __name__ == '__main__':
    jobs = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    if os.environ.get('SANGO_QWEN_LOCAL') == '1':
        render_local(jobs)
    else:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            list(pool.map(render, jobs))
