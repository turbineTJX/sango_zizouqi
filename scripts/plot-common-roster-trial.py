import json, sys
from pathlib import Path
sys.path.insert(0, str(Path('work/battle-roles-prototype/plot-libs')))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
root=Path('work/common-roster-trial')
data=json.loads((root/'plot-input.json').read_text(encoding='utf-8'))
font=FontProperties(fname='C:/Windows/Fonts/msyh.ttc')
plt.rcParams['axes.unicode_minus']=False
fig,axes=plt.subplots(1,2,figsize=(13,4.5),layout='constrained')
fig.set_facecolor('#f4f1e9')
ax=axes[0]
labels=['上一轮候选','仅开场准备','仅战损曲线','本轮两项合用']
for i,p in enumerate(data['paired']):
    ax.barh(i,p['ticks'],color='#b8cfc7',height=.6)
    ax.barh(i,p['tail'],color='#287c76',height=.6)
    ax.text(p['ticks']+2,i,f"{p['ticks']:.1f}",va='center',fontsize=10)
    ax.text(p['tail']/2,i,f"{p['tail']:.1f}",va='center',ha='center',color='white',fontsize=10)
ax.set_yticks(range(4),labels,fontproperties=font)
ax.invert_yaxis();ax.set_xlim(0,210)
ax.set_title('同开局固定策略：每版96局',fontproperties=font,fontsize=13)
ax.set_xlabel('平均战斗步（深色为末次自动战法后时长）',fontproperties=font)
colors={'fixed':'#267e9d','reactive':'#20815a','wrong':'#c56941','none':'#777f8a'}
names={'fixed':'固定条件','reactive':'观察后响应','wrong':'低压落点','none':'不下军略'}
case=data['examples'][0];ax=axes[1]
for r in case['runs']:
    ts=r['trajectory'];ax.plot([t['tick'] for t in ts],[(t['hp'][0]-t['hp'][1])/1000 for t in ts],color=colors[r['profile']],label=names[r['profile']],lw=2,ls='--' if r['profile']=='fixed' else '-')
ax.axhline(0,color='#52646a',lw=.8);ax.grid(alpha=.15)
ax.set_title('普通曹军对河北主力：落点可以改变胜负',fontproperties=font,fontsize=13)
ax.set_xlabel(f"战斗步 / 种子 {case['seed']} / 右侧曹军",fontproperties=font)
ax.set_ylabel('剩余兵力差（千人）',fontproperties=font)
ax.legend(prop=font,fontsize=9,loc='lower left')
for ax in axes:
    ax.set_facecolor('#f4f1e9')
    ax.spines[['top','right']].set_visible(False)
fig.savefig(root/'comparison.png',dpi=160)
fig.savefig(root/'comparison.svg')
