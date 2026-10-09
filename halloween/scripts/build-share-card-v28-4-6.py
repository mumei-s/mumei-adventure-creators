"""Build the original Halloween URL preview and favicon assets.

Usage: python3 scripts/build-share-card-v28-4-6.py --font /path/to/NotoSansCJKjp-Regular.otf
Requires Pillow. No photographs or external artwork are used.
"""
from argparse import ArgumentParser
from math import cos, sin, pi
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

parser = ArgumentParser()
parser.add_argument('--font', required=True, help='Japanese OpenType or TrueType font')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
scale = 3
NAVY = '#192334'
ORANGE = '#ff9b44'
CREAM = '#fff4d9'
PURPLE = '#a59acf'

def canvas(width, height, color):
    im = Image.new('RGB', (width * scale, height * scale), color)
    return im, ImageDraw.Draw(im)

def xy(box):
    return tuple(round(v * scale) for v in box)

def ellipse(draw, box, fill, outline=None, width=1):
    draw.ellipse(xy(box), fill, outline, width * scale)

def line(draw, points, fill, width):
    draw.line([xy(p) for p in points], fill=fill, width=width * scale, joint='curve')

def polygon(draw, points, fill):
    draw.polygon([xy(p) for p in points], fill=fill)

def star(draw, cx, cy, radius, fill):
    polygon(draw, [(cx + cos(-pi/2+i*pi/4) * radius * (1 if i % 2 == 0 else .27),
                    cy + sin(-pi/2+i*pi/4) * radius * (1 if i % 2 == 0 else .27))
                   for i in range(8)], fill)

def pumpkin(draw, cx, cy, size):
    # Distinct rounded lobes, curved stem, smiling face and soft cheeks.
    for dx, shade in [(-.22, '#ed752b'), (.22, '#ed752b'), (-.1, '#ff983c'), (.1, '#ff983c'), (0, '#ffac4b')]:
        ellipse(draw, (cx + (dx-.28)*size, cy-.35*size, cx+(dx+.28)*size, cy+.33*size), shade)
    line(draw, [(cx-.03*size, cy-.33*size), (cx+.01*size, cy-.48*size), (cx+.12*size, cy-.52*size)], '#759758', max(2, round(size*.055)))
    for dx in [-.16,.16]:
        ellipse(draw, (cx+(dx-.035)*size, cy-.10*size, cx+(dx+.035)*size, cy-.005*size), NAVY)
    polygon(draw, [(cx-.11*size, cy+.085*size), (cx,cy+.19*size), (cx+.11*size,cy+.085*size)], NAVY)
    for dx in [-.29,.29]:
        ellipse(draw, (cx+(dx-.06)*size, cy+.025*size, cx+(dx+.06)*size,cy+.08*size), '#ed7d55')

def ghost(draw, cx, cy, size):
    ellipse(draw, (cx-.33*size,cy-.44*size,cx+.33*size,cy+.23*size), CREAM)
    polygon(draw, [(cx-.33*size,cy-.10*size),(cx+.33*size,cy-.10*size),
                    (cx+.37*size,cy+.38*size),(cx+.18*size,cy+.28*size),
                    (cx,cy+.4*size),(cx-.18*size,cy+.28*size),(cx-.37*size,cy+.38*size)], CREAM)
    for dx in [-.11,.11]:
        ellipse(draw, (cx+(dx-.035)*size,cy-.12*size,cx+(dx+.035)*size,cy-.035*size), NAVY)
    ellipse(draw,(cx-.03*size,cy+.04*size,cx+.03*size,cy+.105*size),NAVY)
    for dx in [-.21,.21]:
        ellipse(draw,(cx+(dx-.045)*size,cy-.01*size,cx+(dx+.045)*size,cy+.04*size),'#facac0')

def centered(draw, text, y, size, color, jp=True):
    font_path = args.font if jp else '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
    font = ImageFont.truetype(font_path, size * scale)
    bbox = draw.textbbox((0,0), text, font=font)
    width = bbox[2] - bbox[0]
    # All public preview lettering stays within the center safe area.
    assert width <= 800 * scale, (text, width / scale)
    draw.text((600*scale-width/2-bbox[0], y*scale-bbox[1]),text,fill=color,font=font)

im, draw = canvas(1200,630,NAVY)
draw.rounded_rectangle(xy((24,24,1176,606)), radius=34*scale, outline='#c68750',width=2*scale)
draw.rounded_rectangle(xy((40,40,1160,590)), radius=26*scale, outline='#3e485b',width=1*scale)
# Original character decorations stay outside the central text safe area.
ghost(draw,139,279,191)
pumpkin(draw,1054,393,204)
star(draw,146,439,28,ORANGE)
star(draw,1024,168,32,CREAM)
star(draw,214,147,14,PURPLE)
star(draw,968,282,13,PURPLE)
for x,y,r in [(104,151,4),(212,375,4),(1000,492,4),(1100,250,4),(298,92,3),(900,543,3)]:
    ellipse(draw,(x-r,y-r,x+r,y+r),CREAM)
centered(draw,'無名S note',106,46,CREAM)
centered(draw,'Halloween',199,81,ORANGE,False)
centered(draw,'Atelier',299,72,CREAM,False)
centered(draw,'あなたのキャラで、世界を描こう。',410,29,CREAM)
draw.rounded_rectangle(xy((352,489,580,541)),radius=26*scale,fill='#ed8436')
draw.rounded_rectangle(xy((600,489,848,541)),radius=26*scale,fill='#3e4860')
jp_font=ImageFont.truetype(args.font,23*scale)
for label,cx in [('Halloween',466),('普段使いにも',724)]:
    bbox=draw.textbbox((0,0),label,font=jp_font)
    draw.text((cx*scale-(bbox[2]-bbox[0])/2-bbox[0],501*scale-bbox[1]),label,font=jp_font,fill=CREAM)
assets=root/'assets'
im.resize((1200,630),Image.Resampling.LANCZOS).save(assets/'halloween-share-card-v28-4-6.png',optimize=True)

icon, icon_draw=canvas(192,192,NAVY)
icon_draw.rounded_rectangle(xy((5,5,187,187)),radius=42*scale,fill=NAVY,outline='#c68750',width=2*scale)
pumpkin(icon_draw,96,103,139)
for size in [192,32]:
    icon.resize((size,size),Image.Resampling.LANCZOS).save(assets/f'halloween-icon-{size}-v28-4-6.png',optimize=True)
print('Original 1200×630 share card and 192px / 32px PNG icons created.')
