import sys,os
from PIL import Image, ImageFilter
import pathlib
SRC=sys.argv[2] if len(sys.argv)>2 else '/tmp/render'; OUT=str(pathlib.Path(__file__).resolve().parent.parent/'public/art/px')
os.makedirs(OUT,exist_ok=True)
N=int(sys.argv[1]) if len(sys.argv)>1 else 64
OUTLINE=(31,26,48,255)
for f in sorted(os.listdir(SRC)):
    im=Image.open(os.path.join(SRC,f)).convert('RGBA')
    bbox=im.getbbox()
    if not bbox: print('empty',f); continue
    # keep full canvas framing so all forms align; downscale with box filter
    small=im.resize((N,N),Image.BOX)
    px=small.load()
    # alpha threshold
    for y in range(N):
        for x in range(N):
            r,g,b,a=px[x,y]
            px[x,y]=(r,g,b,255) if a>=110 else (0,0,0,0)
    # quantize colours (keep it pixel-art flat)
    rgb=Image.new('RGB',small.size,(255,0,255)); rgb.paste(small,mask=small.split()[3])
    q=rgb.quantize(colors=20,method=Image.MEDIANCUT,dither=Image.Dither.NONE).convert('RGB')
    alpha=small.split()[3]
    res=q.convert('RGBA'); res.putalpha(alpha)
    # 1px dark outline around the silhouette
    rp=res.load(); a=alpha.load()
    for y in range(N):
        for x in range(N):
            if a[x,y]==0 and any(0<=x+dx<N and 0<=y+dy<N and a[x+dx,y+dy]>0 for dx,dy in((1,0),(-1,0),(0,1),(0,-1))):
                rp[x,y]=OUTLINE
    res.save(os.path.join(OUT,f))
print('ok',len(os.listdir(OUT)))
