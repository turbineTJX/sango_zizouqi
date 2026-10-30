import json, sys
from pathlib import Path
root = Path('work/battle-roles-prototype')
sys.path.insert(0, str(root / 'plot-libs'))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
font = FontProperties(fname='C:/Windows/Fonts/msyh.ttc')
plt.rcParams['axes.unicode_minus'] = False
cases = json.loads((root / 'plot-input.json').read_text(encoding='utf-8'))
colors = {'fixed':'#267e9d','pressure':'#8659a5','late':'#bc8629','wrong':'#cf5c40','none':'#738081'}
labels = {'fixed':'固定条件','pressure':'承压保护','late':'较晚保护','wrong':'错位保护','none':'不用军略'}
fig, axes = plt.subplots(2, 1, figsize=(12, 8.2), constrained_layout=True)
fig.set_facecolor('#f8faf7')
for ax,c in zip(axes,cases):
    ax.set_facecolor('#f8faf7')
    for r in c['runs']:
        xs=[t['tick']/24 for t in r['trajectory']]
        ys=[(t['sides'][0]['fighting']-t['sides'][1]['fighting'])/1000 for t in r['trajectory']]
        ax.plot(xs,ys,lw=2,color=colors[r['profile']],label=labels[r['profile']])
        if r['firstSpecial']:
            t=r['firstSpecial']['tick']; ax.scatter([t/24],[ys[t]],color=colors[r['profile']],s=27,zorder=5)
    ax.axhline(0,color='#536a70',lw=0.9)
    ax.grid(alpha=.2)
    ax.set_title(c['title']+'  /  种子 '+str(c['seed']),fontproperties=font,fontsize=13,pad=16)
    ax.set_xlabel('交战天数（24模拟步／天）',fontproperties=font)
    ax.set_ylabel('仍可参战兵力差（千人）',fontproperties=font)
    ax.legend(prop=font,loc='best',ncol=3,framealpha=.85)
    ax.spines[['top','right']].set_visible(False)
fig.savefig(root/'curves.png',dpi=160)
fig.savefig(root/'curves.svg')
print(root/'curves.png')
