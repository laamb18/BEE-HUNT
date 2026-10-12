"""
Sprite pipeline for BEE HUNT.

Removes the white JPG background *and* the light-grey anti-aliasing halo left
by JPEG compression, then crops and downsamples with high quality filtering.

Steps:
  1. Flood fill (BFS) from the image border through "background-like" pixels
     (very light and unsaturated).
  2. Halo erosion: several passes removing light/unsaturated pixels that touch
     transparency. Interior whites (target rings, eyes) are protected because
     they are enclosed by the black pixel-art outline.
  3. Crop to content, resize with LANCZOS (Pillow premultiplies alpha, so no
     white fringe is reintroduced).
"""
import os
from collections import deque
from PIL import Image

OUTPUT_DIR = "public/assets/sprites"

# source -> (output, target height in px)
IMAGES = {
    "abeja_10.jpg": ("bee_10.png", 256),
    "abeja_15.jpg": ("bee_15.png", 256),
    "abeja_20.jpg": ("bee_20.png", 256),
    "abeja_25.jpg": ("bee_25.png", 256),
    "abeja50.jpg": ("bee_50.png", 256),
    "caballo obstaculo.jpg": ("horse_laugh.png", 560),
    "caballo_obtaculo_parte1.jpg": ("horse_cheer.png", 560),
}


def is_background(r, g, b):
    return min(r, g, b) >= 200 and (max(r, g, b) - min(r, g, b)) <= 30


def is_halo(r, g, b):
    return min(r, g, b) >= 130 and (max(r, g, b) - min(r, g, b)) <= 45


def remove_background(path):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    px = img.load()
    transparent = bytearray(w * h)

    # 1. BFS flood fill from all border pixels
    queue = deque()
    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(h):
        queue.append((0, y))
        queue.append((w - 1, y))

    while queue:
        x, y = queue.popleft()
        idx = y * w + x
        if transparent[idx]:
            continue
        r, g, b, _ = px[x, y]
        if not is_background(r, g, b):
            continue
        transparent[idx] = 1
        if x > 0: queue.append((x - 1, y))
        if x < w - 1: queue.append((x + 1, y))
        if y > 0: queue.append((x, y - 1))
        if y < h - 1: queue.append((x, y + 1))

    # 2. Halo erosion passes
    for _ in range(4):
        to_clear = []
        for y in range(h):
            row = y * w
            for x in range(w):
                if transparent[row + x]:
                    continue
                touches = (
                    (x > 0 and transparent[row + x - 1]) or
                    (x < w - 1 and transparent[row + x + 1]) or
                    (y > 0 and transparent[row - w + x]) or
                    (y < h - 1 and transparent[row + w + x])
                )
                if touches:
                    r, g, b, _ = px[x, y]
                    if is_halo(r, g, b):
                        to_clear.append(row + x)
        if not to_clear:
            break
        for idx in to_clear:
            transparent[idx] = 1

    # Apply alpha
    for y in range(h):
        row = y * w
        for x in range(w):
            if transparent[row + x]:
                px[x, y] = (0, 0, 0, 0)

    return img


def process(src, dst, target_h):
    img = remove_background(src)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    ratio = target_h / img.height
    size = (max(1, round(img.width * ratio)), target_h)
    img = img.resize(size, Image.Resampling.LANCZOS)
    img.save(dst, "PNG", optimize=True)
    print(f"{src} -> {dst} {size[0]}x{size[1]}")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for src, (dst, target_h) in IMAGES.items():
        if os.path.exists(src):
            process(src, os.path.join(OUTPUT_DIR, dst), target_h)
        else:
            print(f"Warning: {src} not found")


if __name__ == "__main__":
    main()
