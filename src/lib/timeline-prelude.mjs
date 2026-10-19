export const PRELUDE_STYLE = Object.freeze({ radius:3.5, opacity:.52, labelSize:10, dateSize:8 });

/** Fit early project history into the existing wave before SVM; keep model geometry intact. */
export function buildPrelude(articles, firstModelX, points) {
  const early=articles.filter(a=>a.timelinePhase==='pre-svm')
    .sort((a,b)=>a.date.localeCompare(b.date)||a.href.localeCompare(b.href));
  if(!early.length)return [];
  const start=28, end=firstModelX-110;
  if(end<=start)throw new Error('Not enough space before the first model');
  return early.map((article,index)=>{
    const x=early.length===1?start:start+(end-start)*index/(early.length-1);
    const point=points.reduce((best,p)=>Math.abs(p.x-x)<Math.abs(best.x-x)?p:best,points[0]);
    return {...article,x,y:point.y};
  });
}

export function adjacentTimelineStop(stops, current, direction) {
  const epsilon=1e-5;
  return direction<0
    ? [...stops].reverse().find(p=>p<current-epsilon) ?? stops[0]
    : stops.find(p=>p>current+epsilon) ?? stops.at(-1);
}
