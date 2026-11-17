/* 차시 페이지 공통 동작: 탭, 차림 고르기(?p=), 큰 화면, 학습지 저장·복사·인쇄, 스스로 풀기 */
window.LESSON = {
  init(cfg){
    const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
    const store = {
      get(k){try{return JSON.parse(localStorage.getItem(cfg.id+':'+k))}catch(e){return null}},
      set(k,v){try{localStorage.setItem(cfg.id+':'+k,JSON.stringify(v))}catch(e){}}
    };

    /* 탭 */
    const tabs = $$('[role=tab]');
    function show(name){
      tabs.forEach(t=>t.setAttribute('aria-selected', t.dataset.tab===name));
      $$('[role=tabpanel]').forEach(p=>p.hidden = p.id!==name);
      if(history.replaceState) history.replaceState(null,'',location.search+'#'+name);
    }
    tabs.forEach(t=>t.addEventListener('click',()=>show(t.dataset.tab)));
    const h = location.hash.slice(1);
    if(tabs.some(t=>t.dataset.tab===h)) show(h);

    /* 차림 */
    const p = new URLSearchParams(location.search).get('p') || 'a';
    const pre = (cfg.presets||{})[p] || {};
    $$('.scene').forEach(s=>{
      const want = pre[s.dataset.slot] || 'A';
      if(s.dataset.v!==want) s.remove();
    });
    const form = pre.sheet || 'A';
    $$('[data-form]').forEach(d=>{ if(d.dataset.form!==form) d.remove(); });

    /* QR: 상대 주소를 절대 주소로 바꿔 만든다 */
    $$('img[data-qr]').forEach(img=>{
      const url = new URL(img.dataset.qr, location.href).href;
      img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=10&data='+encodeURIComponent(url);
    });

    /* 제출 버튼 */
    if(cfg.formUrl){
      $$('.submit-slot').forEach(el=>{
        const a = document.createElement('a');
        a.className='btn'; a.href=cfg.formUrl; a.target='_blank'; a.rel='noopener'; a.textContent='제출하기 ↗';
        el.appendChild(a);
      });
    }

    /* 복사 */
    function copy(text, msgEl){
      const ok = ()=>{ if(msgEl) msgEl.textContent='복사했어요.'; };
      const no = ()=>{ if(msgEl) msgEl.textContent='복사가 막혀 있어요. 직접 드래그해 복사하세요.'; };
      if(navigator.clipboard) navigator.clipboard.writeText(text).then(ok,no); else no();
    }
    $$('[data-copy]').forEach(b=>b.addEventListener('click',()=>{
      copy(document.getElementById(b.dataset.copy).textContent, b.parentElement.querySelector('.msg'));
    }));

    /* 큰 화면 */
    const scenes = () => $$('.scene');
    let cur = 0;
    const counter = document.createElement('span'); counter.className='counter';
    function paint(){
      scenes().forEach((s,i)=>s.classList.toggle('cur', i===cur));
      counter.textContent = (cur+1)+' / '+scenes().length;
    }
    function stage(on){
      document.body.classList.toggle('stage', on);
      $('#stageBtn').textContent = on ? '나가기' : '큰 화면으로 보기';
      if(on){ $('#stageBtn').after(counter); show('lesson'); paint(); scenes()[cur].scrollIntoView(); }
      else counter.remove();
    }
    $('#stageBtn').addEventListener('click',()=>stage(!document.body.classList.contains('stage')));
    document.addEventListener('keydown',e=>{
      if(!document.body.classList.contains('stage')) return;
      if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
      if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '){ e.preventDefault(); cur=Math.min(cur+1,scenes().length-1); paint(); }
      if(e.key==='ArrowLeft'||e.key==='PageUp'){ e.preventDefault(); cur=Math.max(cur-1,0); paint(); }
      if(e.key==='Escape') stage(false);
    });

    /* 학습지: 이 기기에 저장 */
    const ans = store.get('sheet') || {};
    $$('#sheetBody [data-k]').forEach(el=>{
      if(ans[el.dataset.k]) el.value = ans[el.dataset.k];
      el.addEventListener('input',()=>{ ans[el.dataset.k]=el.value; store.set('sheet',ans); });
    });
    const copyBtn = $('#copyAns');
    if(copyBtn) copyBtn.addEventListener('click',()=>{
      const lines = [];
      $$('#sheetBody [data-k]').forEach(el=>{
        if(!el.value) return;
        const lab = el.closest('label');
        const row = el.closest('tr');
        let name = el.getAttribute('aria-label') || '';
        if(!name && lab) name = lab.firstChild.textContent.trim() || lab.querySelector('b')?.textContent || '';
        if(!name && row) name = row.cells[0].textContent.trim();
        lines.push((name? name+': ' : '')+el.value);
      });
      copy(lines.join('\n'), $('#ansMsg'));
    });

    /* 인쇄 */
    const pb = $('#printBtn');
    if(pb) pb.addEventListener('click',()=>{ show('sheet'); window.print(); });
    $$('[data-print]').forEach(b=>b.addEventListener('click',()=>{ show(b.dataset.print); window.print(); }));

    /* 스스로 풀기 */
    const qb = $('#quizBody');
    if(qb && cfg.quiz){
      const done = store.get('quiz') || {};
      const levels = [...new Set(cfg.quiz.map(q=>q.lv))];
      function render(){
        qb.innerHTML='';
        let open = true;
        levels.forEach(lv=>{
          const h = document.createElement('p'); h.className='lv'; h.textContent=lv; qb.appendChild(h);
          const items = cfg.quiz.map((q,i)=>({q,i})).filter(x=>x.q.lv===lv);
          if(!open){ const l=document.createElement('p'); l.className='locked'; l.textContent='앞 단계를 모두 맞히면 열려요.'; qb.appendChild(l); return; }
          items.forEach(({q,i})=>{
            const box = document.createElement('div'); box.className='item';
            const p = document.createElement('p'); p.textContent=(i+1)+'. '+q.q; box.appendChild(p);
            const opts = document.createElement('div'); opts.className='opts';
            const why = document.createElement('p'); why.className='why';
            q.a.forEach((t,j)=>{
              const b=document.createElement('button'); b.textContent=t;
              if(done[i] && j===q.ok){ b.classList.add('right'); why.textContent=q.why; }
              b.addEventListener('click',()=>{
                if(j===q.ok){ b.classList.add('right'); why.textContent='맞아요. '+q.why; done[i]=true; store.set('quiz',done); setTimeout(render,900); }
                else { b.classList.add('wrong'); why.textContent='다시 생각해 봐요.'; }
              });
              opts.appendChild(b);
            });
            box.appendChild(opts); box.appendChild(why); qb.appendChild(box);
          });
          open = items.every(({i})=>done[i]);
        });
        const n = Object.keys(done).length;
        $('#score').textContent = n ? '지금까지 '+cfg.quiz.length+'문제 중 '+n+'문제를 맞혔어요.' : '';
      }
      render();
    }
  }
};
