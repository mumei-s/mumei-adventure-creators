"""Render Atelier's exact, season-neutral typographic link cards.

Usage: python scripts/build-atelier-text-card.py --font /path/to/Japanese-font.otf
Requires Pillow. The square safe area keeps both title lines inside note's crop.
"""
from argparse import ArgumentParser
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

parser = ArgumentParser()
parser.add_argument('--font', required=True)
args = parser.parse_args()
assets = Path(__file__).resolve().parents[1] / 'assets'
serif = '/usr/share/fonts/type1/urw-base35/P052-Italic.t1'

def render(width, height):
    scale = 2
    image = Image.new('RGB', (width * scale, height * scale), '#152d3c')
    draw = ImageDraw.Draw(image)
    short = min(width, height)
    for inset, color in [(short * .022, '#a9c9cb'), (short * .034, '#658b96')]:
        draw.rounded_rectangle((inset * scale, inset * scale,
                                (width-inset) * scale, (height-inset) * scale),
                               radius=short*.035*scale, outline=color, width=max(1, round(short*.002*scale)))
    for text, font_path, size, y in [
        ('無名S note', args.font, short*.098, height*.40),
        ('Atelier', serif, short*.19, height*.585),
    ]:
        font = ImageFont.truetype(font_path, round(size*scale))
        box = draw.textbbox((0,0), text, font=font)
        x=(width*scale-(box[2]-box[0]))/2-box[0]
        top=y*scale-(box[3]-box[1])/2-box[1]
        draw.text((x,top),text,font=font,fill='#f2f8f3')
    return image.resize((width,height),Image.Resampling.LANCZOS)

square = render(1254,1254)
for name in ['atelier-text-card-20261108.jpg', 'atelier-link-card-square-20261103.jpg']:
    square.save(assets/name, quality=94, optimize=True)
wide = render(1200,630)
for name in ['atelier-link-card-20261102.jpg', 'illustration-tool-share-20261102.jpg']:
    wide.save(assets/name, quality=94, optimize=True)
# A crawler may still know the original asset URL. Keep it neutral as well.
wide.save(assets/'halloween-share-card-v28-4-6.png', optimize=True)
