// Lossless transport for the six recorded visual replays; raw evidence stays untouched.
export function packReplayData(data){
  const dictionary=[''],known=new Map([['',0]]),word=s=>{s=s??'';if(!known.has(s)){known.set(s,dictionary.length);dictionary.push(s);}return known.get(s);};
  const maps={};
  const pairs=data.pairs.map(pair=>{
    maps[pair.context]=pair.A.tiles;
    const packed={family:pair.family,context:pair.context};
    for(const arm of ['A','B']){
      const replay=pair[arm],ids=new Map(replay.units.map((u,i)=>[u.id,i]));let previous=replay.frames[0].units;
      const deltas=replay.frames.slice(1).map(frame=>{
        const edits=[];frame.units.forEach((state,i)=>{let mask=0;const values=[];state.forEach((value,j)=>{if(value!==previous[i][j]){mask|=1<<j;values.push(value);}});if(mask)edits.push([i,mask,...values]);});previous=frame.units;return[frame.tick,edits];
      });
      packed[arm]={row:{side:replay.row.side,ticks:replay.row.ticks,winner:replay.row.winner,win:replay.row.win},units:replay.units.map(({id,name,side,initial})=>({id,name,side,initial})),initial:replay.frames[0],deltas,
        events:replay.events.map(e=>{const row=[e.tick,ids.has(e.from)?ids.get(e.from):e.from,ids.has(e.to)?ids.get(e.to):e.to,word(e.label),word(e.text),e.damage||0,e.healing||0];while(row.length>4&&!row.at(-1))row.pop();return row;})};
    }
    return packed;
  });
  return{version:2,summary:{battles:data.summary.battles,validationBattles:data.summary.validationBattles,groups:data.summary.groups.map(({family,context,version,wins,battles,meanMargin,layoutSensitivity})=>({family,context,version,wins,battles,meanMargin,layoutSensitivity}))},families:data.families,dictionary,maps,pairs};
}

export function unpackReplayData(packed){
  if(packed.version!==2)throw Error('Unsupported replay payload');
  return{summary:packed.summary,families:packed.families,pairs:packed.pairs.map(pair=>{
    const result={family:pair.family,context:pair.context};
    for(const arm of ['A','B']){
      const replay=pair[arm];let previous=replay.initial.units.map(s=>s.slice());const frames=[{tick:replay.initial.tick,units:previous}];
      for(const [tick,edits]of replay.deltas){const next=previous.map(s=>s.slice());for(const [i,mask,...values]of edits){let n=0;for(let j=0;j<7;j++)if(mask&(1<<j))next[i][j]=values[n++];}frames.push({tick,units:next});previous=next;}
      const id=value=>typeof value==='number'?replay.units[value].id:value;
      result[arm]={row:replay.row,units:replay.units,tiles:packed.maps[pair.context],frames,events:replay.events.map(e=>({tick:e[0],from:id(e[1]),to:id(e[2]),label:packed.dictionary[e[3]],text:packed.dictionary[e[4]||0],damage:e[5]||0,healing:e[6]||0}))};
    }
    return result;
  })};
}
