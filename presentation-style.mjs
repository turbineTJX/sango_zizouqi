// Compare the browser's normalized value as well as our requested value. This
// also detects another renderer replacing style.cssText between frames.
const values=new WeakMap();
export function presentationStyle(element,name,value){
 const style=element?.style;if(!style)return;
 value=String(value);const actual=style.getPropertyValue?.(name);
 let properties=values.get(element);const previous=properties?.get(name);
 if(actual===value||previous?.value===value&&previous.actual===actual)return;
 style.setProperty(name,value);
 if(!properties){properties=new Map();values.set(element,properties);}
 properties.set(name,{value,actual:style.getPropertyValue?.(name)});
}
