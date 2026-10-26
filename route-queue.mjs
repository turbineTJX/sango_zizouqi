// Same Dijkstra tie break as the previous full scan: cost, then node id.
export class RouteQueue{
 constructor(){this.items=[];}
 before(a,b){return a.cost<b.cost||a.cost===b.cost&&a.id.localeCompare(b.id)<0;}
 push(value){const a=this.items;let i=a.length;a.push(value);while(i){const p=(i-1)>>1;if(!this.before(value,a[p]))break;a[i]=a[p];i=p;}a[i]=value;}
 pop(){const a=this.items;if(!a.length)return null;const first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let child=i*2+1;if(child+1<a.length&&this.before(a[child+1],a[child]))child++;if(!this.before(a[child],last))break;a[i]=a[child];i=child;}a[i]=last;}return first;}
}
