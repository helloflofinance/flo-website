/* ============================================================
   flo OS — view router, animation replay and the interaction
   state that makes a demo read as software rather than a mock:
   live relative clocks, persistent status changes, working
   search, real toggles, expandable step trails.
   Zero dependencies. Shares app.css tokens and components.
   ============================================================ */
(function(){
  'use strict';

  var SVGNS   = 'http://www.w3.org/2000/svg';
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var VIEWS   = ['today','autos','pipeline','numbers'];
  var app     = document.querySelector('.di-app');
  if(!app) return;

  /* ---------- relative clocks -------------------------------
     Every timestamp is derived from the real clock at render
     time, so the demo never shows a stale date. data-ago is in
     minutes.                                                  */
  function ago(mins){
    if(mins < 1)    return 'just now';
    if(mins < 60)   return mins + ' min ago';
    var h = Math.round(mins/60);
    if(h < 24)      return h + (h === 1 ? ' hr ago' : ' hrs ago');
    var d = Math.round(h/24);
    return d + (d === 1 ? ' day ago' : ' days ago');
  }
  function paintClocks(){
    document.querySelectorAll('[data-ago]').forEach(function(el){
      var base = parseInt(el.getAttribute('data-ago'), 10) || 0;
      // drift forward with real elapsed time so the page ages honestly
      el.textContent = ago(base + Math.floor((Date.now() - START) / 60000));
    });
  }
  var START = Date.now();

  function paintTodayLabel(){
    var el = document.querySelector('[data-today-label]');
    if(!el) return;
    el.textContent = new Date().toLocaleDateString('en-US',
      { weekday:'long', month:'short', day:'numeric' });
  }

  /* ---------- count-up -------------------------------------- */
  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
  function fmt(n, dec){
    return n.toLocaleString('en-US',{ minimumFractionDigits:dec, maximumFractionDigits:dec });
  }
  function countUp(el){
    var target = parseFloat(el.getAttribute('data-count'));
    var dec    = parseInt(el.getAttribute('data-dec') || '0', 10);
    if(isNaN(target)) return;
    if(REDUCED){ el.textContent = fmt(target, dec); return; }
    var dur = 1150, t0 = null;
    function step(ts){
      if(t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      el.textContent = fmt(target * easeOutCubic(p), dec);
      if(p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- donut ----------------------------------------- */
  function polar(cx,cy,r,deg){ var a=(deg-90)*Math.PI/180; return [cx+r*Math.cos(a), cy+r*Math.sin(a)]; }
  function arcD(cx,cy,r,start,end){
    if(end - start >= 359.999) end = start + 359.999;
    var s = polar(cx,cy,r,start), e = polar(cx,cy,r,end);
    var large = (end - start) > 180 ? 1 : 0;
    return 'M '+s[0].toFixed(2)+' '+s[1].toFixed(2)+' A '+r+' '+r+' 0 '+large+' 1 '+e[0].toFixed(2)+' '+e[1].toFixed(2);
  }
  function buildDonuts(scope){
    scope.querySelectorAll('.donut[data-segs]').forEach(function(d){
      if(d.dataset.built) return; d.dataset.built = '1';
      var vals  = d.getAttribute('data-segs').split(',').map(Number);
      var cols  = (d.getAttribute('data-cols') || '').split(',');
      var total = vals.reduce(function(a,b){ return a+b; }, 0);
      var R = 54, cx = 70, cy = 70, GAP = 3;
      var svg = document.createElementNS(SVGNS,'svg');
      svg.setAttribute('viewBox','0 0 140 140');
      svg.setAttribute('class','donut-svg');
      var track = document.createElementNS(SVGNS,'path');
      track.setAttribute('d', arcD(cx,cy,R,0,359.999));
      track.setAttribute('fill','none');
      track.setAttribute('stroke','var(--track)');
      track.setAttribute('stroke-width','15');
      track.setAttribute('stroke-linecap','round');
      svg.appendChild(track);
      var acc = 0;
      vals.forEach(function(v,i){
        var sweep = (v/total) * 360;
        var p = document.createElementNS(SVGNS,'path');
        p.setAttribute('d', arcD(cx, cy, R, acc + GAP/2, acc + sweep - GAP/2));
        p.setAttribute('fill','none');
        p.setAttribute('stroke', cols[i] ? cols[i].trim() : 'var(--c'+((i%6)+1)+')');
        p.setAttribute('stroke-width','15');
        p.setAttribute('stroke-linecap','round');
        p.setAttribute('class','donut-seg');
        var len = p.getTotalLength() || 1;
        p.setAttribute('stroke-dasharray', len);
        p.style.strokeDashoffset = len;
        svg.appendChild(p);
        acc += sweep;
      });
      var g  = document.createElementNS(SVGNS,'g'); g.setAttribute('class','donut-center');
      var t1 = document.createElementNS(SVGNS,'text');
      t1.setAttribute('x',cx); t1.setAttribute('y',cy-1);
      t1.setAttribute('text-anchor','middle'); t1.setAttribute('class','dc-val');
      t1.textContent = d.getAttribute('data-center') || total;
      var t2 = document.createElementNS(SVGNS,'text');
      t2.setAttribute('x',cx); t2.setAttribute('y',cy+17);
      t2.setAttribute('text-anchor','middle'); t2.setAttribute('class','dc-lab');
      t2.textContent = d.getAttribute('data-centerlab') || '';
      g.appendChild(t1); g.appendChild(t2); svg.appendChild(g);
      d.appendChild(svg);
    });
  }

  /* ---------- animate a view -------------------------------- */
  function animateView(view){
    buildDonuts(view);
    view.classList.remove('di-animate');
    view._revealed = false;
    view.querySelectorAll('.donut-seg').forEach(function(s){
      s.style.strokeDashoffset = s.getAttribute('stroke-dasharray');
    });
    view.querySelectorAll('.os-bfill').forEach(function(b){ b.style.width = '0'; });
    void view.offsetWidth;

    function reveal(){
      if(view._revealed) return; view._revealed = true;
      view.classList.add('di-animate');
      view.querySelectorAll('.donut-seg').forEach(function(s){ s.style.strokeDashoffset = '0'; });
      view.querySelectorAll('[data-count]').forEach(countUp);
      view.querySelectorAll('.os-bfill').forEach(function(b){
        b.style.width = (b.getAttribute('data-w') || 0) + '%';
      });
    }
    requestAnimationFrame(function(){ requestAnimationFrame(reveal); });
    setTimeout(reveal, 90);
  }

  /* ---------- routing --------------------------------------- */
  function setView(name, push){
    if(VIEWS.indexOf(name) < 0) name = VIEWS[0];
    document.querySelectorAll('.di-view').forEach(function(v){
      v.classList.toggle('active', v.getAttribute('data-dash') === name);
    });
    document.querySelectorAll('[data-topbar]').forEach(function(t){
      t.style.display = (t.getAttribute('data-topbar') === name) ? '' : 'none';
    });
    document.querySelectorAll('[data-goto]').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-goto') === name);
    });
    var active = document.querySelector('.di-view[data-dash="'+name+'"]');
    if(active) animateView(active);
    var t = document.querySelector('[data-doctitle="'+name+'"]');
    if(t) document.title = t.textContent.replace('● Live','').trim() + ' — flo OS';
    if(push && location.hash !== '#'+name) history.pushState(null,'','#'+name);
    var canvas = document.querySelector('.di-canvas');
    if(canvas) canvas.scrollTop = 0;
  }
  function currentHash(){ return (location.hash || '').replace('#',''); }

  /* ---------- pipeline: search + filter + status ------------- */
  var STAGES = [
    { key:'new',    label:'New',    cls:'risk'    },
    { key:'quoted', label:'Quoted', cls:'pend'    },
    { key:'won',    label:'Won',    cls:'ok'      },
    { key:'cold',   label:'Cold',   cls:'neutral' }
  ];
  var pipeFilter = 'all', pipeQuery = '';

  function applyPipe(){
    var rows = document.querySelectorAll('#tbl-pipe tbody tr[data-stage]');
    var shown = 0;
    rows.forEach(function(tr){
      var stage = tr.getAttribute('data-stage');
      var okStage = (pipeFilter === 'all') || (stage === pipeFilter);
      var okText  = !pipeQuery || tr.textContent.toLowerCase().indexOf(pipeQuery) > -1;
      var show = okStage && okText;
      tr.style.display = show ? '' : 'none';
      if(show) shown++;
    });
    var total = document.querySelector('#tbl-pipe tbody tr.total');
    if(total) total.style.display = shown ? '' : 'none';
    var count = document.getElementById('pipe-count');
    if(count) count.textContent = shown + (shown === 1 ? ' job' : ' jobs');

    var empty = document.getElementById('pipe-empty');
    if(!shown){
      if(!empty){
        empty = document.createElement('div');
        empty.id = 'pipe-empty';
        empty.className = 'os-empty';
        empty.textContent = 'Nothing matches that — try another name or job type.';
        document.querySelector('#tbl-pipe').parentNode.appendChild(empty);
      }
    } else if(empty){ empty.remove(); }
  }

  function cycleStage(btn){
    var tr  = btn.closest('tr');
    var cur = tr.getAttribute('data-stage');
    var i   = STAGES.findIndex(function(s){ return s.key === cur; });
    var next = STAGES[(i + 1) % STAGES.length];
    tr.setAttribute('data-stage', next.key);       // persists for the session
    btn.textContent = next.label;
    btn.className = 'status-chip ' + next.cls + ' os-chipbtn';
    applyPipe();
  }

  /* ---------- today: clearing an item ----------------------- */
  function clearItem(btn){
    var item = btn.closest('[data-item]');
    if(!item || item.classList.contains('done')) return;
    item.classList.add('done');
    btn.disabled = true;
    btn.classList.add('ghost');
    btn.textContent = (btn.getAttribute('data-done') || 'Done') + ' ✓';
    var open = document.querySelectorAll('#today-feed [data-item]:not(.done)').length;
    var tag  = document.getElementById('todo-count');
    if(tag) tag.textContent = open ? open + ' open' : 'all clear';
  }

  /* ---------- delegated events ------------------------------ */
  document.addEventListener('click', function(e){
    var nav = e.target.closest('[data-goto]');
    if(nav){ e.preventDefault(); setView(nav.getAttribute('data-goto'), true); return; }

    var sw = e.target.closest('.os-sw');
    if(sw){
      e.stopPropagation();
      var on = sw.getAttribute('aria-checked') === 'true';
      sw.setAttribute('aria-checked', on ? 'false' : 'true');
      var row = sw.closest('[data-auto]');
      if(row){ row.classList.toggle('off', on); row.classList.toggle('live', !on); }
      return;
    }

    var head = e.target.closest('[data-expand]');
    if(head){ head.closest('[data-auto]').classList.toggle('open'); return; }

    var chip = e.target.closest('[data-cycle]');
    if(chip){ cycleStage(chip); return; }

    var act = e.target.closest('[data-done]');
    if(act){ clearItem(act); return; }

    var seg = e.target.closest('[data-pipe]');
    if(seg){
      seg.parentNode.querySelectorAll('[data-pipe]').forEach(function(b){
        b.classList.toggle('active', b === seg);
      });
      pipeFilter = seg.getAttribute('data-pipe');
      applyPipe();
      return;
    }
  });

  // keyboard support for the switches
  document.addEventListener('keydown', function(e){
    if(e.key !== 'Enter' && e.key !== ' ') return;
    var sw = e.target.closest && e.target.closest('.os-sw');
    if(!sw) return;
    e.preventDefault();
    sw.click();
  });

  var search = document.getElementById('pipe-search');
  if(search){
    search.addEventListener('input', function(){
      pipeQuery = search.value.trim().toLowerCase();
      applyPipe();
    });
  }

  window.addEventListener('hashchange', function(){ setView(currentHash(), false); });

  /* ---------- init ----------------------------------------- */
  function init(){
    paintClocks();
    paintTodayLabel();
    setView(currentHash() || VIEWS[0], false);
    applyPipe();
    setInterval(paintClocks, 30000);   // keep the clocks honest while the tab is open
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
