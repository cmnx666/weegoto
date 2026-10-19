// Standard 10-20 spherical positions from MNE-Python 1.13.2 spherical_1020.tsv.
// Source: https://mne.tools/stable/generated/mne.channels.make_standard_montage.html
// Original coordinates: right +X, anterior +Y, superior +Z.
// T3/T4/T5/T6 are the project's legacy names for T7/T8/P7/P8.
export const EEG_ELECTRODES = [
  {
    "name": "Fp1",
    "standardName": "Fp1",
    "region": "左额极",
    "position": [
      -0.2939,
      0.9045,
      0.309
    ]
  },
  {
    "name": "Fp2",
    "standardName": "Fp2",
    "region": "右额极",
    "position": [
      0.2939,
      0.9045,
      0.309
    ]
  },
  {
    "name": "F7",
    "standardName": "F7",
    "region": "左外侧额区",
    "position": [
      -0.7695,
      0.559,
      0.309
    ]
  },
  {
    "name": "F3",
    "standardName": "F3",
    "region": "左额区",
    "position": [
      -0.4591,
      0.58,
      0.673
    ]
  },
  {
    "name": "Fz",
    "standardName": "Fz",
    "region": "额中线",
    "position": [
      0.0,
      0.5878,
      0.809
    ]
  },
  {
    "name": "F4",
    "standardName": "F4",
    "region": "右额区",
    "position": [
      0.4591,
      0.58,
      0.673
    ]
  },
  {
    "name": "F8",
    "standardName": "F8",
    "region": "右外侧额区",
    "position": [
      0.7695,
      0.559,
      0.309
    ]
  },
  {
    "name": "T3",
    "standardName": "T7",
    "region": "左颞区",
    "position": [
      -0.9511,
      0.0,
      0.309
    ]
  },
  {
    "name": "C3",
    "standardName": "C3",
    "region": "左中央区",
    "position": [
      -0.5878,
      0.0,
      0.809
    ]
  },
  {
    "name": "Cz",
    "standardName": "Cz",
    "region": "中央中线",
    "position": [
      0.0,
      0.0,
      1.0
    ]
  },
  {
    "name": "C4",
    "standardName": "C4",
    "region": "右中央区",
    "position": [
      0.5878,
      0.0,
      0.809
    ]
  },
  {
    "name": "T4",
    "standardName": "T8",
    "region": "右颞区",
    "position": [
      0.9511,
      0.0,
      0.309
    ]
  },
  {
    "name": "T5",
    "standardName": "P7",
    "region": "左后颞区",
    "position": [
      -0.7695,
      -0.559,
      0.309
    ]
  },
  {
    "name": "P3",
    "standardName": "P3",
    "region": "左顶区",
    "position": [
      -0.4591,
      -0.58,
      0.673
    ]
  },
  {
    "name": "Pz",
    "standardName": "Pz",
    "region": "顶中线",
    "position": [
      0.0,
      -0.5878,
      0.809
    ]
  },
  {
    "name": "P4",
    "standardName": "P4",
    "region": "右顶区",
    "position": [
      0.4591,
      -0.58,
      0.673
    ]
  },
  {
    "name": "T6",
    "standardName": "P8",
    "region": "右后颞区",
    "position": [
      0.7695,
      -0.559,
      0.309
    ]
  },
  {
    "name": "O1",
    "standardName": "O1",
    "region": "左枕区",
    "position": [
      -0.2939,
      -0.9045,
      0.309
    ]
  },
  {
    "name": "O2",
    "standardName": "O2",
    "region": "右枕区",
    "position": [
      0.2939,
      -0.9045,
      0.309
    ]
  }
];

/** Scalp montage displayed around this illustrative cortex, not a clinical coregistration. */
export function electrodeAnchors() {
  return EEG_ELECTRODES.map(e => ({ ...e,
    x: -e.position[1] * 1.37,
    y: (e.position[2] - .30) * 1.56,
    z: -e.position[0] * 1.28,
  }));
}

/** Keep all named targets distinct even when left/right scalp sites project together. */
export function layoutElectrodeLabels(points, width, height) {
  const placed = [];
  return [...points].sort((a,b) => a.y-b.y || b.z-a.z).map(p => {
    const side = p.name.endsWith('z') ? 0 : Number(p.name.at(-1)) % 2 ? 1 : -1;
    let best=null;
    for (let radius=0; radius<=240; radius+=12) {
      let clear=null;
      for (let dx=-radius;dx<=radius;dx+=12) for(let dy=-radius;dy<=radius;dy+=12) {
        if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;
        const x=Math.max(28,Math.min(width-28,p.x+dx));
        const y=Math.max(105,Math.min(height-110,p.y+dy));
        const overlap=placed.reduce((sum,q)=>sum+Math.max(0,48-Math.abs(q.x-x))*Math.max(0,30-Math.abs(q.y-y)),0);
        const candidate={x,y,score:overlap*1000+dx*dx+dy*dy+(side*dx<0?4:0)};
        if(!best||candidate.score<best.score)best=candidate;
        if(overlap===0&&(!clear||candidate.score<clear.score))clear=candidate;
      }
      if(clear){best=clear;break;}
    }
    const label={...p,labelX:best.x,labelY:best.y};
    placed.push(best);
    return label;
  });
}
