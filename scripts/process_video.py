#!/usr/bin/env python3
"""ClipRush AI — GitHub Actions video processing pipeline.

Steps: download (yt-dlp) → normalise → colour-grade → zoom → transcribe
       (faster-whisper) → burn subtitles → watermark → export → Supabase upload
"""

import os, sys, json, subprocess, tempfile, traceback
from pathlib import Path

# ── env ──────────────────────────────────────────────────────────────────────
JOB_ID          = os.environ["JOB_ID"]
TIKTOK_URL      = os.environ["TIKTOK_URL"]
COLOR_GRADING   = float(os.environ.get("COLOR_GRADING",  "65"))
MOTION_ZOOM     = float(os.environ.get("MOTION_ZOOM",    "40"))
BEAT_SYNC       = os.environ.get("BEAT_SYNC",        "true").lower() == "true"
AUTO_SUBTITLES  = os.environ.get("AUTO_SUBTITLES",   "true").lower() == "true"
SUBTITLE_STYLE  = os.environ.get("SUBTITLE_STYLE",  "viral")
WATERMARK       = os.environ.get("WATERMARK",       "false").lower() == "true"
SUPABASE_URL    = os.environ["SUPABASE_URL"]
SB_SERVICE_KEY  = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

WORK = Path(tempfile.mkdtemp())

# ── helpers ──────────────────────────────────────────────────────────────────
def sb():
    from supabase import create_client
    return create_client(SUPABASE_URL, SB_SERVICE_KEY)

def progress(pct: int, status: str = "processing"):
    try:
        sb().table("video_jobs").update({"status": status, "progress": pct}) \
            .eq("id", JOB_ID).execute()
        print(f"[{status}] {pct}%", flush=True)
    except Exception as e:
        print(f"[warn] progress update failed: {e}", flush=True)

def fail(msg: str):
    print(f"[ERROR] {msg}", file=sys.stderr, flush=True)
    try:
        sb().table("video_jobs").update({"status": "failed", "error": msg[:500], "progress": 0}) \
            .eq("id", JOB_ID).execute()
    except Exception:
        pass
    sys.exit(1)

def run(cmd: list, **kw):
    print(" ".join(str(c) for c in cmd[:6]) + " ...", flush=True)
    result = subprocess.run(cmd, check=True, **kw)
    return result

# ── step 1: download ─────────────────────────────────────────────────────────
def download() -> Path:
    progress(5)
    import yt_dlp
    out_tpl = str(WORK / "raw.%(ext)s")
    opts = {
        "format": "bestvideo[height<=1920][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "outtmpl": out_tpl, "quiet": True, "no_warnings": True,
        "max_filesize": 100 * 1024 * 1024,  # 100 MB guard
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(TIKTOK_URL, download=True)
    files = list(WORK.glob("raw.*"))
    if not files:
        fail("yt-dlp downloaded nothing")
    f = files[0]
    print(f"Downloaded {f.name} ({f.stat().st_size/1024/1024:.1f} MB)", flush=True)
    progress(18)
    return f

# ── step 2: normalise to 1080×1920 ───────────────────────────────────────────
def normalise(src: Path) -> tuple[Path, Path]:
    norm = WORK / "norm.mp4"
    audio = WORK / "audio.wav"
    run(["ffmpeg", "-i", str(src),
         "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,"
                "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black",
         "-c:v", "libx264", "-preset", "fast", "-crf", "23",
         "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
         str(norm), "-y"])
    run(["ffmpeg", "-i", str(norm), "-vn", "-ac", "1", "-ar", "22050", str(audio), "-y"])
    progress(28)
    return norm, audio

# ── step 3: colour grade (teal-orange) ───────────────────────────────────────
def colour_grade(src: Path, strength: float) -> Path:
    if strength < 5:
        return src
    out = WORK / "graded.mp4"
    s = strength / 100.0
    r = f"0/0 0.5/{0.45+s*0.10:.2f} 1/{0.85+s*0.10:.2f}"
    g = f"0/0 0.5/{0.50-s*0.02:.2f} 1/{0.90-s*0.05:.2f}"
    b = f"0/{0.10*s:.2f} 0.5/{0.50+s*0.05:.2f} 1/{0.70-s*0.05:.2f}"
    run(["ffmpeg", "-i", str(src),
         "-vf", f"curves=r='{r}':g='{g}':b='{b}'",
         "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "copy",
         str(out), "-y"])
    progress(40)
    return out

# ── step 4: motion zoom (fast static crop-scale) ─────────────────────────────
def motion_zoom(src: Path, intensity: float) -> Path:
    if intensity < 5:
        return src
    out = WORK / "zoomed.mp4"
    factor = 1.0 + (intensity / 100.0) * 0.15          # up to +15%
    nw, nh = int(1080 * factor), int(1920 * factor)
    cx, cy = (nw - 1080) // 2, (nh - 1920) // 2
    run(["ffmpeg", "-i", str(src),
         "-vf", f"scale={nw}:{nh},crop=1080:1920:{cx}:{cy}",
         "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "copy",
         str(out), "-y"])
    progress(52)
    return out

# ── step 5: transcribe ────────────────────────────────────────────────────────
def transcribe(audio: Path) -> str:
    progress(55)
    from faster_whisper import WhisperModel
    model = WhisperModel("base.en", device="cpu", compute_type="int8",
                         download_root="/tmp/whisper_models")
    segs, _ = model.transcribe(str(audio), beam_size=5, vad_filter=True,
                                vad_parameters={"min_silence_duration_ms": 300})

    def fmt(s: float) -> str:
        h = int(s // 3600); m = int((s % 3600) // 60); sec = s % 60
        return f"{h:02d}:{m:02d}:{sec:06.3f}".replace(".", ",")

    lines = []
    idx = 1
    for seg in segs:
        words = seg.text.strip().split()
        chunks = [words[i:i+7] for i in range(0, len(words), 7)] or [words]
        chunk_dur = (seg.end - seg.start) / max(len(chunks), 1)
        for ci, chunk in enumerate(chunks):
            t0 = seg.start + ci * chunk_dur
            t1 = t0 + chunk_dur
            lines.append(f"{idx}\n{fmt(t0)} --> {fmt(t1)}\n{' '.join(chunk)}\n")
            idx += 1

    progress(70)
    return "\n".join(lines)

# ── step 6: burn subtitles ───────────────────────────────────────────────────
STYLES = {
    "minimal": "FontName=Arial,FontSize=20,PrimaryColour=&H00FFFFFF,Outline=1,OutlineColour=&H00000000,Alignment=2,MarginV=30",
    "bold":    "FontName=Impact,FontSize=28,PrimaryColour=&H00FFFFFF,Bold=1,Outline=2,OutlineColour=&H00000000,Alignment=2,MarginV=30",
    "neon":    "FontName=Arial,FontSize=24,PrimaryColour=&H0000FFFF,Bold=1,Outline=2,OutlineColour=&H00000000,Alignment=2,MarginV=30",
    "viral":   "FontName=Impact,FontSize=30,PrimaryColour=&H00FFFFFF,Bold=1,Outline=3,OutlineColour=&H000000CC,BackColour=&H80000000,Alignment=2,MarginV=50",
}

def burn_subs(src: Path, srt: str, style: str) -> Path:
    out = WORK / "subtitled.mp4"
    srt_path = WORK / "subs.srt"
    srt_path.write_text(srt, encoding="utf-8")
    style_str = STYLES.get(style, STYLES["viral"])
    run(["ffmpeg", "-i", str(src),
         "-vf", f"subtitles={str(srt_path)}:force_style='{style_str}'",
         "-c:v", "libx264", "-preset", "fast", "-crf", "22", "-c:a", "copy",
         str(out), "-y"])
    progress(80)
    return out

# ── step 7: watermark ────────────────────────────────────────────────────────
def add_watermark(src: Path) -> Path:
    out = WORK / "wm.mp4"
    run(["ffmpeg", "-i", str(src),
         "-vf", "drawtext=text='ClipRush AI':fontcolor=white:fontsize=20:alpha=0.6:"
                "x=w-tw-20:y=h-th-20:shadowcolor=black:shadowx=1:shadowy=1",
         "-c:v", "libx264", "-preset", "fast", "-crf", "22", "-c:a", "copy",
         str(out), "-y"])
    return out

# ── step 8: final export ─────────────────────────────────────────────────────
def final_export(src: Path) -> Path:
    out = WORK / "final.mp4"
    run(["ffmpeg", "-i", str(src),
         "-c:v", "libx264", "-preset", "medium", "-crf", "23",
         "-profile:v", "high", "-level", "4.1",
         "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
         str(out), "-y"])
    progress(88)
    return out

# ── step 9: upload ────────────────────────────────────────────────────────────
def upload(video: Path) -> str:
    path = f"videos/{JOB_ID}.mp4"
    client = sb()
    with open(video, "rb") as f:
        client.storage.from_("renders").upload(
            path, f, {"content-type": "video/mp4", "upsert": "true"})
    url = client.storage.from_("renders").get_public_url(path)
    progress(95)
    print(f"Uploaded → {url}", flush=True)
    return url

# ── main ──────────────────────────────────────────────────────────────────────
def main():
    print(f"=== ClipRush AI processing job {JOB_ID} ===", flush=True)
    print(f"URL: {TIKTOK_URL}", flush=True)
    try:
        sb().table("video_jobs").update({"status": "processing", "progress": 5}) \
            .eq("id", JOB_ID).execute()

        raw           = download()
        norm, audio   = normalise(raw)
        current       = colour_grade(norm, COLOR_GRADING)
        current       = motion_zoom(current, MOTION_ZOOM)

        if AUTO_SUBTITLES:
            srt = transcribe(audio)
            if srt.strip():
                current = burn_subs(current, srt, SUBTITLE_STYLE)

        if WATERMARK:
            current = add_watermark(current)

        final = final_export(current)
        url   = upload(final)

        sb().table("video_jobs").update({
            "status": "completed", "progress": 100, "video_url": url
        }).eq("id", JOB_ID).execute()

        print(f"=== Done: {url} ===", flush=True)

    except Exception as e:
        fail(f"{type(e).__name__}: {e}\n{traceback.format_exc()[:800]}")

if __name__ == "__main__":
    main()
