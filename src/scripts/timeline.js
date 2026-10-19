/** Existing homepage timeline. Initialized once, after the brain opening finishes. */
let initialized = false;
export function initTimeline() {
  if (initialized) return;
  initialized = true;

  /* =====================================================================
     数据：8 个世代 + 各自的【实验报告 / 心得分享】（知识图谱小节点）
     ===================================================================== */
  const GENS = [
    { gen:1, model:'SVM', cn:'支持向量机', color:'#6d5cff', band:'δ · 低频起步',
      one:'在两个人群之间划一条最宽的路 —— 但路是你先替它铺好的。',
      body:['<b>小样本、高维特征下非常稳</b>；有最大间隔的理论保证，可解释、训练快。',
            '代价是<b>特征必须由人设计</b> —— 95 维 PSD 把 2 秒的时间结构整个平均掉了。'],
      gain:'小样本、高维特征下非常稳；有最大间隔的理论保证、可解释、训练快。',
      cost:'特征必须由人设计。95 维 PSD 把 2 秒的时间结构整个平均掉了 —— 模型从头到尾没「看见」过时间。',
      eeg:'就是我们现在做的事：手工频带功率 + RBF 核 SVM，被试级分组评估；历史结果与当前版本来源见资源页，不作诊断能力解释。',
      tags:['手工特征','核技巧','最大间隔'],
      arts:[]},

    { gen:2, model:'MLP', cn:'多层感知机', color:'#8b6df0', band:'δ/θ · 起步',
      one:'让机器自己铺路 —— 但它不知道路该往哪延伸。',
      body:['引入<b>反向传播</b>：特征不再靠人设计，端到端一起学。',
            '但它<b>没有结构先验</b> —— 打乱输入的时间点，结果也跟着乱。'],
      gain:'引入反向传播：特征不再靠人设计，端到端一起学。这是所有深度模型的起点。',
      cost:'没有结构先验。把输入的时间点随便打乱，MLP 的结果也只是跟着打乱 —— 它不知道「相邻」意味着什么。',
      eeg:'几乎不单独用于原始波形，一般只作为最后的分类头（Global Pooling → Linear → 2 类）。',
      tags:['全连接','反向传播','无结构先验'],
      arts:[]},

    { gen:3, model:'1D-CNN / EEGNet', cn:'卷积网络', color:'#a96fe6', band:'α · 提速',
      one:'只看眼前一小段 —— 但看得又快又准。',
      body:['把<b>「局部性」和「平移不变性」写进结构</b>；参数量与序列长度无关，可完全并行。',
            '但<b>感受野有限</b> —— 覆盖 512 点要堆很多层。'],
      gain:'第一次把「局部性」和「平移不变性」写进网络结构：同一个波形模式出现在哪都识别得出。参数量与序列长度无关。',
      cost:'感受野有限。要覆盖 512 个点得堆很多层；对真正隔得远的两个事件仍然无力。',
      eeg:'EEGNet 是最该先跑的深度基线：时间卷积 → 空间深度卷积 → 可分离卷积，参数量只有几千。',
      tags:['权值共享','感受野','深度可分离卷积'],
      arts:[]},

    { gen:4, model:'RNN / LSTM / GRU', cn:'循环网络', color:'#c56fd2', band:'α/β',
      one:'一边看一边记 —— 但只能一个点一个点地看。',
      body:['第一次真正建模「历史」：<b>h_t = f(h_{t−1}, x_t)</b>，理论感受野无限大。',
            '但<b>必须串行</b>，GPU 并行度极低；梯度消失导致实际记不住太久。'],
      gain:'第一次真正建模「历史」：h_t = f(h_{t−1}, x_t)，权重在所有时间步共享，理论感受野无限大。',
      cost:'必须串行（要算 t 得先算 t−1），GPU 并行度极低；梯度消失导致实际记不住太久。',
      eeg:'多数场合已被 CNN / Transformer 取代。但「隐藏状态」是理解 Mamba 的前提。',
      tags:['隐藏状态','门控机制','梯度消失'],
      arts:[]},

    { gen:5, model:'Transformer', cn:'注意力机制', color:'#de6fb4', band:'β · 全局',
      one:'一眼看完全文 —— 但文章越长越贵。',
      body:['任意两位置的路径长度从 O(n) 降到 <b>O(1)</b>，完全可并行，表达力强。',
            '但 <b>O(n²)</b> 的时间与内存 —— 序列翻倍、代价翻四倍。'],
      gain:'每个位置直接用 Q 和所有位置的 K 算相似度、加权聚合 V。任意两位置的路径长度从 O(n) 降到 O(1)，完全可并行。',
      cost:'O(n²) 的时间和内存：序列翻倍、代价翻四倍。位置信息还得靠外加的位置编码。',
      eeg:'EEG-Conformer 一类的代表。对 2 秒 epoch（512 点）完全够用，这一代要认真学。',
      tags:['Q / K / V','多头注意力','O(n²)'],
      arts:[]},

    { gen:6, model:'SSM / S4', cn:'状态空间模型', color:'#f06f8a', band:'β/γ',
      one:'用一套固定的压缩规则记住全部历史 —— 便宜，但规则是死的。',
      body:['用<b>线性时不变系统</b>压缩历史；时不变 ⇒ 等价于一个卷积 ⇒ 训练并行、推理 O(1)。',
            '但<b>时不变 = 不能选择</b> —— 无法按内容决定记什么、忘什么。'],
      gain:'用一个线性时不变系统压缩历史。关键洞察：时不变 ⇒ 整体等价于一个卷积 ⇒ 训练用 FFT 并行、推理递归 O(1) 内存。',
      cost:'时不变 = 不能选择。A / B / C / Δ 与输入无关，无法「根据内容决定记住什么、忽略什么」。',
      eeg:'原始 S4 在 EEG 上用得不多，主要是通往 Mamba 的必经一站。',
      tags:['状态空间','卷积视角','线性时不变'],
      arts:[]},

    { gen:7, model:'Mamba / S6', cn:'选择性状态空间', color:'#f7954a', band:'γ · 高频',
      one:'根据内容决定记什么 —— 又便宜又聪明，但只能往后看。',
      body:['让 <b>B、C、Δ 变成输入的函数（selective）</b>，按内容决定写入与读出。',
            '代价是失去卷积形式 → 改用<b>并行扫描</b>；遗留问题是<b>因果性</b>。'],
      gain:'让 B、C、Δ 变成输入的函数（selective）。模型能按当前内容决定「要不要写进状态、要不要读出来」。',
      cost:'失去卷积形式 → 改用并行扫描 + 硬件感知优化。遗留问题：因果的（单向），只能看历史、看不到未来。',
      eeg:'已有若干探索工作。线性复杂度的优势只有在序列很长时才体现得出来。',
      tags:['选择性机制','并行扫描','O(n) 线性'],
      arts:[]},

    { gen:8, model:'Bi-Mamba', cn:'双向 Mamba', color:'#fbbf24', band:'γ · 终点',
      one:'前后一起看 —— 适合探索离线上下文的候选路线。',
      body:['<b>前向 + 后向两条 Mamba</b> 输出融合，去掉因果限制，每个位置同时拥有左右上下文。',
            '需要更多参数和计算；双向上下文适合离线任务，但不能直接用于因果流式预测。'],
      gain:'前向 + 后向两条 Mamba，输出相加 / 拼接 / 门控融合。去掉因果限制：每个位置同时拥有左右上下文。',
      cost:'双向结构增加计算与参数成本，不能直接做因果流式预测；是否更好需要相同划分下的实验验证。',
      eeg:'这是后续待验证的离线模型路线，目前尚未报告本项目的 Bi-Mamba 实验结果。',
      tags:['双向扫描','上下文融合','离线候选'],
      arts:[]},
  ];
  const published = JSON.parse(document.getElementById('published-articles').textContent || '[]');
  for (const g of GENS) g.arts = published.filter(a => a.generation === g.gen);
  const TYPE = { rep:{name:'项目进展',color:'#fbbf24',text:'#fcd34d'},
                 note:{name:'心得分享',color:'#a78bfa',text:'#c9bcfd'} };
  const BAND_OF = ['δ · 低频起步','δ/θ · 起步','α · 提速','α/β','β · 全局','β/γ','γ · 高频','γ · 终点'];

  document.body.classList.add('tl-lock');

  /* =====================================================================
     神经网络背景（与知识图谱小节点共用同一套视觉参数）
     ===================================================================== */
  (function () {
    const cv = document.getElementById('net'), ctx = cv.getContext('2d');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W, H, DPR, nodes = [];
    const N = 34, LD = 150;
    function rs(){ DPR = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
      cv.width = W*DPR; cv.height = H*DPR; ctx.setTransform(DPR,0,0,DPR,0,0); }
    function init(){ nodes = Array.from({length:N}, () => ({ x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-.5)*.16, vy:(Math.random()-.5)*.16, r:1.3+Math.random()*1.8, ph:Math.random()*6.3 })); }
    addEventListener('resize', () => { rs(); init(); });
    rs(); init();
    (function draw(t){
      t /= 1000; ctx.clearRect(0,0,W,H);
      if(!reduced) for(const n of nodes){ n.x+=n.vx; n.y+=n.vy;
        if(n.x<-20)n.x=W+20; if(n.x>W+20)n.x=-20; if(n.y<-20)n.y=H+20; if(n.y>H+20)n.y=-20; }
      for(let i=0;i<N;i++) for(let j=i+1;j<N;j++){ const a=nodes[i], b=nodes[j];
        const d=Math.hypot(a.x-b.x, a.y-b.y);
        if(d<LD){ ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
          ctx.strokeStyle=`rgba(167,139,250,${(1-d/LD)*.2})`; ctx.lineWidth=1; ctx.stroke(); } }
      for(const n of nodes){ const r=n.r*(1+.28*Math.sin(t*1.6+n.ph));
        ctx.beginPath(); ctx.arc(n.x,n.y,r,0,7); ctx.fillStyle='rgba(196,181,253,.6)';
        ctx.shadowColor='rgba(167,139,250,.65)'; ctx.shadowBlur=7; ctx.fill(); ctx.shadowBlur=0; }
      if(!reduced) requestAnimationFrame(draw);
    })(0);
  })();

  /* =====================================================================
     光谱波形 + 全谱渐变
     ===================================================================== */
  const NS = 'http://www.w3.org/2000/svg';
  const stage = document.getElementById('stage');
  const CENTER_X = 700, CENTER_Y = 392;
  const SEG = 900, WAVE_X0 = 0, WAVE_X1 = SEG * 8;

  const defs = document.createElementNS(NS, 'defs');
  stage.appendChild(defs);

  const SPECTRUM = [
    [  0,'#6d5cff'], [ 11,'#a78bfa'], [ 22,'#d47fe8'], [ 33,'#f0568f'],
    [ 44,'#f2683c'], [ 54,'#f5a623'], [ 63,'#e8d44d'], [ 72,'#56d364'],
    [ 80,'#35d0d6'], [ 88,'#5b8dfa'], [ 95,'#a78bfa'], [100,'#eae6ff'],
  ];
  const grad = document.createElementNS(NS, 'linearGradient');
  grad.setAttribute('id','wg'); grad.setAttribute('gradientUnits','userSpaceOnUse');
  grad.setAttribute('x1', WAVE_X0); grad.setAttribute('x2', WAVE_X1);
  SPECTRUM.forEach(([off, col]) => { const s = document.createElementNS(NS,'stop');
    s.setAttribute('offset', off+'%'); s.setAttribute('stop-color', col); grad.appendChild(s); });
  defs.appendChild(grad);

  /* 右端紫外高亮（宽度压到 9px，否则高频段会糊成灰带） */
  const tailGrad = document.createElementNS(NS, 'linearGradient');
  tailGrad.setAttribute('id','tailglow'); tailGrad.setAttribute('gradientUnits','userSpaceOnUse');
  tailGrad.setAttribute('x1', WAVE_X1-260); tailGrad.setAttribute('x2', WAVE_X1);
  [[0,'rgba(234,230,255,0)'],[60,'rgba(240,238,255,.10)'],[100,'rgba(255,255,255,.22)']]
    .forEach(([o,c]) => { const s = document.createElementNS(NS,'stop');
      s.setAttribute('offset', o+'%'); s.setAttribute('stop-color', c); tailGrad.appendChild(s); });
  defs.appendChild(tailGrad);

  const NP = 3000, F0 = 1/400, F1 = 1/70;
  const PTS = new Array(NP + 1);
  let dPath = '';
  { let ph = 0; const dx = (WAVE_X1 - WAVE_X0) / NP;
    for (let i = 0; i <= NP; i++) {
      const u = i/NP, x = WAVE_X0 + u*(WAVE_X1-WAVE_X0), f = F0*Math.pow(F1/F0, u);
      const amp = 62 + 34*u, y = CENTER_Y - amp*Math.sin(ph);
      PTS[i] = { x, y, u };
      dPath += (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
      ph += Math.PI * 2 * f * dx;
    } }

  const waveG = document.createElementNS(NS, 'g');
  stage.appendChild(waveG);
  { const tg = document.createElementNS(NS,'path');
    tg.setAttribute('d', dPath); tg.setAttribute('fill','none');
    tg.setAttribute('stroke','url(#tailglow)'); tg.setAttribute('stroke-width','9');
    tg.setAttribute('stroke-linecap','round'); waveG.appendChild(tg); }
  [['13','.09'],['7','.15'],['2.6','1']].forEach(([w,op]) => {
    const p = document.createElementNS(NS,'path');
    p.setAttribute('d', dPath); p.setAttribute('fill','none');
    p.setAttribute('stroke','url(#wg)'); p.setAttribute('stroke-width', w);
    p.setAttribute('stroke-linecap','round'); p.setAttribute('opacity', op);
    waveG.appendChild(p);
  });

  /* ---- 节点吸附到波峰/波谷 ---- */
  const EXT = [];
  for (let i = 2; i < NP-1; i++) {
    const a = PTS[i-1].y, b = PTS[i].y, c = PTS[i+1].y;
    if ((b-a)*(c-b) < 0) EXT.push(i);
  }
  const NODE_X = [], NODE_Y = [], NODE_PROG = [], NODE_PEAK = [];
  GENS.forEach((g, i) => {
    const tx = SEG*i + SEG/2;
    let best = EXT[0], bd = Infinity;
    for (const e of EXT) { const d = Math.abs(PTS[e].x - tx); if (d < bd) { bd = d; best = e; } }
    NODE_X.push(PTS[best].x); NODE_Y.push(PTS[best].y);
    NODE_PROG.push(PTS[best].x / WAVE_X1);
    NODE_PEAK.push(PTS[best].y < CENTER_Y);
  });
  const nodeProg = (i) => NODE_PROG[i];
  const PROG_MIN = NODE_PROG[0], PROG_MAX = NODE_PROG[NODE_PROG.length-1];

  /* ---- 频带分隔 + 标注（复刻电磁波谱图的「频段竖线 + 标注」） ---- */
  const BAND_DEF = [
    { u0:0.000, u1:0.250, key:'δ', name:'Delta', hz:'1–4 Hz'   },
    { u0:0.250, u1:0.375, key:'θ', name:'Theta', hz:'4–8 Hz'   },
    { u0:0.375, u1:0.500, key:'α', name:'Alpha', hz:'8–13 Hz'  },
    { u0:0.500, u1:0.750, key:'β', name:'Beta',  hz:'13–30 Hz' },
    { u0:0.750, u1:1.000, key:'γ', name:'Gamma', hz:'30–45 Hz' },
  ];
  {
    const DLINE_TOP = 104, DLINE_BOT = 742;
    for (let i = 1; i < BAND_DEF.length; i++) {
      const bx = WAVE_X1 * BAND_DEF[i].u0;
      const ln = document.createElementNS(NS,'line');
      ln.setAttribute('x1', bx); ln.setAttribute('x2', bx);
      ln.setAttribute('y1', DLINE_TOP); ln.setAttribute('y2', DLINE_BOT);
      ln.setAttribute('stroke','rgba(236,233,248,.14)'); ln.setAttribute('stroke-width','1');
      waveG.appendChild(ln);
    }
    BAND_DEF.forEach((b) => {
      const cx = WAVE_X1 * (b.u0 + b.u1) / 2;
      const g2 = document.createElementNS(NS,'g');
      const t1 = document.createElementNS(NS,'text');
      t1.setAttribute('x', cx); t1.setAttribute('y', 88);
      t1.setAttribute('text-anchor','middle'); t1.setAttribute('fill','#cfc8ea');
      t1.setAttribute('font-size','13'); t1.setAttribute('font-weight','700');
      t1.textContent = b.key + ' ' + b.name;
      const t2 = document.createElementNS(NS,'text');
      t2.setAttribute('x', cx); t2.setAttribute('y', 104);
      t2.setAttribute('text-anchor','middle'); t2.setAttribute('fill','#7d76a4');
      t2.setAttribute('font-size','10.5'); t2.setAttribute('letter-spacing','0.08em');
      t2.textContent = b.hz;
      g2.append(t1, t2); waveG.appendChild(g2);
    });
  }

  /* ---- 知识图谱小节点（默认与背景小点逐参数一致，悬停才显现） ---- */
  const TOP_SAFE = 104, BOT_SAFE = 744, DRIFT_R = 16;
  const BG_DOT = '#c4b5fd', BG_GLOW = 'rgba(167,139,250,.68)';
  const satReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const satEls = [];
  GENS.forEach((g, gi) => {
    const nx = NODE_X[gi], ny = NODE_Y[gi];
    const up = NODE_PEAK[gi], dir = up ? -1 : 1, n = g.arts.length;
    g.arts.forEach((a, k) => {
      const t = n === 1 ? 0.5 : k/(n-1);
      const ang = (30 + t*120) * Math.PI/180;
      const R = 170 + (k%3)*54;
      let ax = nx + R*Math.cos(ang);
      let ay = ny + dir*R*Math.sin(ang);
      if (up  && ay < TOP_SAFE) ay = TOP_SAFE + (k%2)*24;
      if (!up && ay > BOT_SAFE) ay = BOT_SAFE - (k%2)*24;
      ax = Math.max(60, Math.min(WAVE_X1-60, ax));

      const col = TYPE[a.t].color, bow = up ? -18 : 18;
      const link = document.createElementNS(NS,'path');
      link.setAttribute('fill','none'); link.setAttribute('stroke', col);
      link.setAttribute('stroke-width','1.2'); link.setAttribute('opacity','0');
      link.setAttribute('stroke-dasharray','3 4'); link.setAttribute('class','satlink');
      waveG.appendChild(link);

      const grp = document.createElementNS(NS,'g');
      grp.setAttribute('class','sat');
      grp.setAttribute('transform', `translate(${ax},${ay})`);
      const halo = document.createElementNS(NS,'circle');
      halo.setAttribute('r','9'); halo.setAttribute('fill', col); halo.setAttribute('opacity','0');
      const dot = document.createElementNS(NS,'circle');
      dot.setAttribute('r','2'); dot.setAttribute('fill', BG_DOT);
      dot.setAttribute('fill-opacity','.72');
      dot.setAttribute('style', `filter:drop-shadow(0 0 7px ${BG_GLOW})`);
      const lb = document.createElementNS(NS,'text');
      lb.setAttribute('y', up ? -11 : 18);
      lb.setAttribute('font-size','10.5'); lb.setAttribute('font-weight','600');
      lb.setAttribute('text-anchor','middle');
      lb.setAttribute('fill', TYPE[a.t].text); lb.setAttribute('opacity','0');
      lb.textContent = a.s;
      const hit = document.createElementNS(NS,'circle');
      hit.setAttribute('r','15'); hit.setAttribute('fill','transparent');
      grp.append(halo, dot, lb, hit);
      grp.addEventListener('click', (ev) => { ev.stopPropagation(); openDetail(gi); });
      grp.addEventListener('mouseenter', () => setHover(gi));
      grp.addEventListener('mouseleave', () => setHover(-1));
      waveG.appendChild(grp);
      satEls.push({ grp, link, dot, halo, lb, genIndex:gi, typeCol:col,
        ax, ay, ox:0, oy:0, vx:0, vy:0, ph:Math.random()*6.283, up,
        nx, ny, bow, rev:0, target:0,
        baseR: satReduced ? 2.2 : (1.3 + Math.random()*1.8) });
    });
  });

  let hoverGen = -1;
  function setHover(gi) {
    if (hoverGen === gi) return;
    hoverGen = gi;
    for (const s of satEls) s.target = (s.genIndex === gi) ? 1 : 0;
    nodeEls.forEach((n, j) => {
      n.halo.setAttribute('opacity',
        j === gi ? '.8' : (j === nearest ? '.55' : '0'));
    });
  }

  /* 游走 + 呼吸 + 显现（参数经离线标定：12.1px/秒，半径 ≤16px） */
  function driftSats(t, dt) {
    if (satReduced) return;
    const step = Math.min(2, dt*60), tt = t/1000;
    for (const s of satEls) {
      s.vx = (s.vx + (Math.random()-0.5)*0.18*step - s.ox*0.008) * 0.95;
      s.vy = (s.vy + (Math.random()-0.5)*0.18*step - s.oy*0.008) * 0.95;
      s.ox += s.vx*step; s.oy += s.vy*step;
      const d = Math.hypot(s.ox, s.oy);
      if (d > DRIFT_R) { s.ox *= DRIFT_R/d; s.oy *= DRIFT_R/d; }
      const X = s.ax + s.ox, Y = s.ay + s.oy;
      s.grp.setAttribute('transform', `translate(${X.toFixed(1)},${Y.toFixed(1)})`);

      s.rev += (s.target - s.rev) * Math.min(1, 0.16*step);
      const rv = s.rev;
      const pl = 1 + 0.26*Math.sin(tt*1.7 + s.ph);
      s.dot.setAttribute('r', (s.baseR*pl*(1+0.9*rv)).toFixed(2));
      s.dot.setAttribute('fill-opacity', (0.72 + 0.28*rv).toFixed(2));
      s.dot.setAttribute('fill', rv > 0.5 ? s.typeCol : BG_DOT);
      s.dot.setAttribute('style',
        `filter:drop-shadow(0 0 ${(7+6*rv).toFixed(1)}px ${rv>0.5 ? s.typeCol : BG_GLOW})`);
      s.halo.setAttribute('r', (9*pl).toFixed(2));
      s.halo.setAttribute('opacity', (0.20*rv).toFixed(3));
      s.lb.setAttribute('opacity', rv < 0.02 ? 0 : (rv*rv).toFixed(3));
      s.link.setAttribute('opacity', (0.62*rv).toFixed(3));
      s.link.setAttribute('d',
        `M ${s.nx},${s.ny} Q ${((s.nx+X)/2).toFixed(1)},${((s.ny+Y)/2+s.bow).toFixed(1)} ${X.toFixed(1)},${Y.toFixed(1)}`);
    }
  }

  /* ---- 世代大节点 ---- */
  const nodeEls = GENS.map((g, i) => {
    const x = NODE_X[i], y = NODE_Y[i];
    const grp = document.createElementNS(NS,'g');
    grp.style.cursor = 'pointer';
    grp.setAttribute('role','button'); grp.setAttribute('tabindex','0');
    grp.setAttribute('aria-label',`${g.model}：打开模型详情`);
    grp.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();openDetail(i);}});
    const halo = document.createElementNS(NS,'circle');
    halo.setAttribute('cx',x); halo.setAttribute('cy',y); halo.setAttribute('r','18');
    halo.setAttribute('fill','none'); halo.setAttribute('stroke', g.color);
    halo.setAttribute('stroke-width','1'); halo.setAttribute('opacity','0');
    const c1 = document.createElementNS(NS,'circle');
    c1.setAttribute('cx',x); c1.setAttribute('cy',y); c1.setAttribute('r','11');
    c1.setAttribute('fill','#0b0718'); c1.setAttribute('stroke', g.color); c1.setAttribute('stroke-width','3');
    const c2 = document.createElementNS(NS,'circle');
    c2.setAttribute('cx',x); c2.setAttribute('cy',y); c2.setAttribute('r','4.5');
    c2.setAttribute('fill', g.color);
    grp.append(halo, c1, c2);
    const hit = document.createElementNS(NS,'circle');
    hit.setAttribute('cx',x); hit.setAttribute('cy',y); hit.setAttribute('r','30');
    hit.setAttribute('fill','transparent'); grp.appendChild(hit);
    waveG.appendChild(grp);
    grp.addEventListener('click', () => {
      if (nearest === i) openDetail(); else { vel = 0; jumpTarget = nodeProg(i); }
    });
    grp.addEventListener('mouseenter', () => setHover(i));
    grp.addEventListener('mouseleave', () => setHover(-1));
    return { x, y, grp, halo, c1, c2 };
  });

  /* ---- 动态光点（相机把它恒定保持在水平中心） ---- */
  const dotG = document.createElementNS(NS,'g');
  const dotHalo = document.createElementNS(NS,'circle');
  dotHalo.setAttribute('r','20'); dotHalo.setAttribute('fill','rgba(251,191,36,.18)');
  const dotRing = document.createElementNS(NS,'circle');
  dotRing.setAttribute('r','12'); dotRing.setAttribute('fill','none');
  dotRing.setAttribute('stroke','rgba(251,191,36,.55)'); dotRing.setAttribute('stroke-width','1.4');
  const dotCore = document.createElementNS(NS,'circle');
  dotCore.setAttribute('r','5.5'); dotCore.setAttribute('fill','#fbbf24');
  dotCore.setAttribute('style','filter:drop-shadow(0 0 10px rgba(251,191,36,.95))');
  dotG.append(dotHalo, dotRing, dotCore);
  waveG.appendChild(dotG);

  const cross = document.createElementNS(NS,'line');
  cross.setAttribute('x1', CENTER_X); cross.setAttribute('x2', CENTER_X);
  cross.setAttribute('y1','80'); cross.setAttribute('y2','740');
  cross.setAttribute('stroke','rgba(251,191,36,.13)'); cross.setAttribute('stroke-width','1');
  cross.setAttribute('stroke-dasharray','2 8');
  stage.appendChild(cross);

  /* ---- 迷你全景图 ---- */
  const mm = document.getElementById('minimap');
  const mmG = document.createElementNS(NS,'g');
  const sx = 398/WAVE_X1, sy = 0.125, ox = 12, oy = 22;
  mmG.setAttribute('transform',
    `translate(${ox},${oy}) scale(${sx},${sy}) translate(0,${-CENTER_Y})`);
  const mmWave = document.createElementNS(NS,'path');
  mmWave.setAttribute('d', dPath); mmWave.setAttribute('fill','none');
  mmWave.setAttribute('stroke','url(#wg)'); mmWave.setAttribute('stroke-width','1.5');
  mmG.appendChild(mmWave); mm.appendChild(mmG);
  const mmDot = document.createElementNS(NS,'circle');
  mmDot.setAttribute('r','3.2'); mmDot.setAttribute('fill','#fbbf24');
  mm.appendChild(mmDot);

  /* =====================================================================
     手感：速度模型（冲量 + 指数衰减）+ 双阈值收尾 → 随动随停且不卡壳
     ===================================================================== */
  const IMPULSE = 0.00085, HALFLIFE = 0.090;
  const MAX_VEL = 0.30, JUMP_SPEED = 0.32;
  const EPS_ACTIVE = 0.004, EPS_IDLE = 0.010, IDLE_MS = 300;

  let prog = PROG_MIN, vel = 0, jumpTarget = null, lastWheel = -1e9, lastT = 0;
  let nearest = -1;

  const C = {
    accent: document.getElementById('c-accent'), gen: document.getElementById('c-gen'),
    name: document.getElementById('c-name'),     cn: document.getElementById('c-cn'),
    one: document.getElementById('c-one'),       body: document.getElementById('c-body'),
    kg: document.getElementById('c-kg'),         pg: document.getElementById('pg'),
  };
  const card = document.getElementById('card');
  const cardWrap = document.getElementById('cardWrap');

  let firstPlace = true;
  function placeCard(i) {
    const peak = NODE_PEAK[i];
    const H = card.offsetHeight || 210;
    const y = peak ? Math.max(0, innerHeight - H - 92) : 80;
    if (firstPlace) {
      cardWrap.style.transition = 'none';
      cardWrap.style.transform = `translateY(${y}px)`;
      void cardWrap.offsetWidth;
      cardWrap.style.transition = '';
      firstPlace = false;
    } else {
      cardWrap.style.transform = `translateY(${y}px)`;
    }
  }
  addEventListener('resize', () => placeCard(nearest < 0 ? 0 : nearest));
  /* 卡片高度会随内容换行 / 字体加载变化，高度一变就重新贴底，否则会浮在半空 */
  if (window.ResizeObserver) {
    new ResizeObserver(() => { if (nearest >= 0) placeCard(nearest); }).observe(card);
  }

  function nearestOf(p) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < 8; i++) { const d = Math.abs(nodeProg(i) - p); if (d < bd) { bd = d; best = i; } }
    return best;
  }

  const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  function fillCard(i) {
    const g = GENS[i];
    C.accent.style.background = g.color;
    C.gen.textContent = 'GEN ' + g.gen; C.gen.style.color = g.color;
    C.name.textContent = g.model; C.cn.textContent = g.cn;
    C.one.textContent = g.one;
    C.body.innerHTML = g.body.map((p) => '<p>' + p + '</p>').join('');
    C.pg.textContent = i + 1;

    const nRep = g.arts.filter((a) => a.t === 'rep').length;
    const head = `<span class="chip rep" style="cursor:default"><i></i>已发布进展 ${nRep}</span>` +
                 `<span class="chip note" style="cursor:default"><i></i>心得 ${g.arts.length-nRep}</span>`;
    const items = g.arts.slice(0,2).map((a) =>
      `<button type="button" class="chip ${a.t}" data-g="${i}"><i></i>${escapeHtml(a.s)}</button>`).join('');
    C.kg.innerHTML = head + items +
      `<button type="button" class="chip more" data-g="${i}">${g.arts.length ? `查看已发布 ${g.arts.length} 篇` : "查看模型规划"} →</button>`;
    card.classList.remove('zoomin'); void card.offsetWidth; card.classList.add('zoomin');

    nodeEls.forEach((n, j) => {
      n.c1.setAttribute('stroke-width', j === i ? '4.5' : '3');
      n.c1.setAttribute('r', j === i ? '13' : '11');
      n.c2.setAttribute('r', j === i ? '6' : '4.5');
      n.halo.setAttribute('opacity', j === hoverGen ? '.8' : (j === i ? '.55' : '0'));
    });
    placeCard(i);
  }
  C.kg.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip[data-g]');
    if (chip) openDetail(parseInt(chip.dataset.g, 10));
  });

  function apply() {
    const idx = Math.max(0, Math.min(NP, Math.round(prog * NP)));
    const p = PTS[idx];
    dotG.setAttribute('transform', `translate(${p.x},${p.y})`);
    waveG.setAttribute('transform', `translate(${CENTER_X - p.x},0)`);
    mmDot.setAttribute('cx', ox + p.x*sx);
    mmDot.setAttribute('cy', oy + (p.y - CENTER_Y)*sy);
    const n = nearestOf(prog);
    if (n !== nearest) { nearest = n; fillCard(n); }
  }

  let loopFrame = 0;
  function loop(t) {
    if(document.hidden || !document.body.classList.contains('timeline-visible')) { loopFrame = 0; return; }
    if (!lastT) lastT = t;
    const dt = Math.min(0.05, (t - lastT)/1000); lastT = t;
    driftSats(t, dt);
    let moved = false;
    if (jumpTarget !== null) {
      const diff = jumpTarget - prog;
      if (Math.abs(diff) < 1e-5) { prog = jumpTarget; jumpTarget = null; }
      else { const st = JUMP_SPEED*dt; prog += Math.sign(diff)*Math.min(st, Math.abs(diff)); moved = true; }
    } else if (vel !== 0) {
      prog += vel*dt;
      vel *= Math.pow(0.5, dt/HALFLIFE);
      const eps = (t - lastWheel) > IDLE_MS ? EPS_IDLE : EPS_ACTIVE;
      if (Math.abs(vel) < eps) vel = 0;
      moved = true;
    }
    if (moved) {
      if (prog < PROG_MIN) { prog = PROG_MIN; vel = 0; }
      if (prog > PROG_MAX) { prog = PROG_MAX; vel = 0; jumpTarget = null; }
      apply();
    }
    loopFrame = (!satReduced || jumpTarget !== null || vel !== 0) ? requestAnimationFrame(loop) : 0;
  }
  const resumeLoop = () => { if(!loopFrame && !document.hidden && document.body.classList.contains('timeline-visible')) { lastT = 0; loopFrame = requestAnimationFrame(loop); } };
  document.addEventListener('visibilitychange', resumeLoop);
  new MutationObserver(resumeLoop).observe(document.body, { attributes:true, attributeFilter:['class'] });
  resumeLoop();

  addEventListener('wheel', (e) => {
    if (detail.classList.contains('open')) return;
    if (e.target.closest && e.target.closest('.legend, .reading-entry')) return;
    e.preventDefault();
    /* Firefox 的 deltaMode=1（行）需归一化，否则跨浏览器快慢差十几倍 */
    const dy = e.deltaMode === 1 ? e.deltaY*16 : e.deltaMode === 2 ? e.deltaY*400 : e.deltaY;
    jumpTarget = null;
    vel += dy * IMPULSE;
    vel = Math.max(-MAX_VEL, Math.min(MAX_VEL, vel));
    lastWheel = performance.now(); resumeLoop();
  }, { passive: false });

  document.getElementById('next').onclick = () => {
    vel = 0; jumpTarget = Math.min(PROG_MAX, nodeProg(Math.min(7, nearest+1)));
    if(satReduced) { prog = jumpTarget; jumpTarget = null; apply(); }
    resumeLoop();
  };
  document.getElementById('prev').onclick = () => {
    vel = 0; jumpTarget = Math.max(PROG_MIN, nodeProg(Math.max(0, nearest-1)));
    if(satReduced) { prog = jumpTarget; jumpTarget = null; apply(); }
    resumeLoop();
  };
  addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select, a, button, summary, .reading-entry')) return;
    const open = detail.classList.contains('open');
    if (e.key === 'ArrowRight') open ? dGo(Math.min(7, nearest+1)) : document.getElementById('next').click();
    if (e.key === 'ArrowLeft')  open ? dGo(Math.max(0, nearest-1)) : document.getElementById('prev').click();
    if (e.key === 'Enter' && !open) { e.preventDefault(); openDetail(); }
    if (e.key === 'Escape' && open) closeDetail();
  });

  let tx0 = null;
  addEventListener('touchstart', (e) => { tx0 = e.touches[0].clientX; }, { passive: true });
  addEventListener('touchend', (e) => {
    if (detail.classList.contains('open') || tx0 === null) return;
    const dx = e.changedTouches[0].clientX - tx0; tx0 = null;
    if (Math.abs(dx) > 40) { vel += (dx < 0 ? 1 : -1)*0.16; vel = Math.max(-MAX_VEL, Math.min(MAX_VEL, vel)); }
  }, { passive: true });

  /* =====================================================================
     全屏详情
     ===================================================================== */
  const detail = document.getElementById('detail');
  const D = {
    accent: document.getElementById('d-accent'), gen: document.getElementById('d-gen'),
    name: document.getElementById('d-name'),     cn: document.getElementById('d-cn'),
    one: document.getElementById('d-one'),       gain: document.getElementById('d-gain'),
    cost: document.getElementById('d-cost'),     eeg: document.getElementById('d-eeg'),
    pg: document.getElementById('d-pg'),         big: document.getElementById('d-big'),
    band: document.getElementById('d-band'),     railtags: document.getElementById('d-railtags'),
    kglist: document.getElementById('d-kglist'), kgcnt: document.getElementById('d-kgcnt'),
    body: document.getElementById('d-body'),     view: document.querySelector('#tl .d-view'),
  };

  function dFill(i) {
    const g = GENS[i];
    D.accent.style.background = g.color;
    D.gen.textContent = 'GEN ' + g.gen; D.gen.style.color = g.color;
    D.name.textContent = g.model; D.cn.textContent = g.cn;
    D.one.textContent = g.one; D.gain.textContent = g.gain;
    D.cost.textContent = g.cost; D.eeg.textContent = g.eeg;
    D.pg.textContent = `GEN ${g.gen} / 8`;
    D.big.textContent = 'G' + g.gen; D.big.style.color = g.color;
    D.band.textContent = BAND_OF[i] || '';
    D.railtags.innerHTML = g.tags.map((t) => `<span>${t}</span>`).join('');
    const nRep = g.arts.filter((a) => a.t === 'rep').length;
    D.kgcnt.textContent = `已发布进展 ${nRep} · 心得分享 ${g.arts.length - nRep}`;
    D.kglist.innerHTML = g.arts.length ? g.arts.map((a) =>
      `<li><a href="${escapeHtml(a.href)}"><i class="${a.t}"></i>` +
      `<span class="ty">${TYPE[a.t].name}</span>` +
      `<span class="ti">${escapeHtml(a.title)}</span><span class="arw">→</span></a></li>`).join('') : '<li><a href="/outlook/roadmap-svm-to-mamba/">规划阶段 · 查看学习与实验路线 →</a></li>';
  }
  D.kglist.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-href]');
    if (li) location.href = li.dataset.href;
  });

  function dGo(i) {
    i = Math.max(0, Math.min(7, i));
    if (i === nearest) return;
    const dir = i > nearest ? 1 : -1;
    vel = 0; jumpTarget = nodeProg(i); resumeLoop();
    D.body.classList.add(dir > 0 ? 'out-up' : 'out-dn');
    setTimeout(() => {
      nearest = i; fillCard(i); dFill(i);
      D.body.classList.remove('out-up','out-dn');
      D.body.classList.remove('in-up','in-dn'); void D.body.offsetWidth;
      D.body.classList.add(dir > 0 ? 'in-up' : 'in-dn');
      D.view.scrollTop = 0;
      setTimeout(() => D.body.classList.remove('in-up','in-dn'), 420);
    }, 280);
  }
  let previousFocus = null;
  const background = [...document.getElementById('tl').children].filter(e => e !== detail);
  function openDetail(force) {
    const i = (typeof force === 'number') ? force : nearest;
    if (i !== nearest) { nearest = i; fillCard(i); vel = 0; jumpTarget = nodeProg(i); }
    previousFocus = document.activeElement; document.body.classList.add('detail-open');
    background.forEach(e => e.inert = true);
    const reader = document.querySelector('.reading-entry'); if(reader) reader.inert = true;
    const replay = document.getElementById('replay-intro'); if(replay) replay.inert = true;
    detail.inert = false; dFill(i); detail.classList.add('open'); D.view.scrollTop = 0;
    document.getElementById('d-close').focus();
  }
  function closeDetail() {
    if (!detail.classList.contains('open')) return;
    detail.classList.remove('open'); detail.inert = true; document.body.classList.remove('detail-open');
    background.forEach(e => e.inert = false);
    const reader = document.querySelector('.reading-entry'); if(reader) reader.inert = false;
    const replay = document.getElementById('replay-intro'); if(replay) replay.inert = false;
    (previousFocus?.isConnected ? previousFocus : document.getElementById('next')).focus();
  }
  detail.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); closeDetail(); return; }
    if(e.key !== 'Tab') return;
    const focusable = [...detail.querySelectorAll('button, a[href]')].filter(e => !e.disabled);
    const first = focusable[0], last = focusable.at(-1);
    if(e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.getElementById('d-close').onclick = closeDetail;
  document.getElementById('d-next').onclick = () => dGo(Math.min(7, nearest+1));
  document.getElementById('d-prev').onclick = () => dGo(Math.max(0, nearest-1));

  let dLock = false;
  detail.addEventListener('wheel', (e) => {
    /* 内容超出一屏时，先让内容自己滚，到顶/到底才切换世代 */
    const canScroll = D.view.scrollHeight > D.view.clientHeight + 4;
    if (canScroll) {
      const atTop = D.view.scrollTop <= 0;
      const atBot = D.view.scrollTop + D.view.clientHeight >= D.view.scrollHeight - 2;
      if (!(atTop && e.deltaY < 0) && !(atBot && e.deltaY > 0)) return;
    }
    e.preventDefault();
    if (dLock) return; dLock = true; setTimeout(() => { dLock = false; }, 560);
    dGo(nearest + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  /* 初始化 */
  apply(); fillCard(0);
  window.addEventListener('weegoto:timeline-reset', () => {
    closeDetail(); prog = PROG_MIN; vel = 0; jumpTarget = null; apply(); fillCard(0);
  });

  /* 便于分享定位：?gen=3 直接跳到第 3 代 */
  const q = new URLSearchParams(location.search);
  const gq = q.get('gen');
  if (gq !== null) {
    const n = Math.max(0, Math.min(7, (parseInt(gq, 10) || 1) - 1));
    prog = nodeProg(n); vel = 0; jumpTarget = null; nearest = n;
    firstPlace = true; apply(); fillCard(n);
  }

}
