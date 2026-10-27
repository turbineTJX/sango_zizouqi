// Purpose is independent of the terrain painted on each hex.
export const MAP_CATEGORIES=Object.freeze({
 field:{id:'field',name:'野战',scene:'field'},
 siege:{id:'siege',name:'攻城',scene:'siege'},
 gate:{id:'gate',name:'关卡',scene:'gate'},
 port:{id:'port',name:'港口',scene:'port'},
 naval:{id:'naval',name:'水战',scene:'naval'},
});
export const BUILTIN_MAP_CATEGORIES=Object.freeze({
 'plain-open':'field','plain-ridges':'field','plain-crossroads':'field',
 'forest-belt':'field','forest-ravine':'field','forest-stream':'field',
 'hill-plateau':'field','hill-pass':'gate','hill-spurs':'field',
 'marsh-flats':'field','marsh-dykes':'field','marsh-lakes':'field',
 'river-crossing':'naval','river-twin-bridges':'naval','river-harbor':'port',
 xiapi:'siege',guandu:'field',chibi:'naval',hefei:'siege',yiling:'field',wuzhang:'field',
});
