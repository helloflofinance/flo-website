/* ============================================================
   flo Intelligence — app.js
   Dashboard switching + deep-link router, count-up animator,
   SVG draw-in replay, working filter tabs. Zero dependencies.
   ============================================================ */
(function(){
  'use strict';
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DASH = ['treasury','revenue','support'];
  var app = document.querySelector('.di-app');

  /* ---------- count-up ---------- */
  function easeOutCubic(t){ return 1 - Math.pow(1-t, 3); }
  function fmt(n, dec){
    return n.toLocaleString('en-US', {minimumFractionDigits:dec, maximumFractionDigits:dec});
  }
  function countUp(el){
    var target = parseFloat(el.getAttribute('data-count'));
    if(isNaN(target)) return;
    var dec = parseInt(el.getAttribute('data-dec')||'0',10);
    var pre = el.getAttribute('data-pre')||'';
    var suf = el.getAttribute('data-suf')||'';
    if(REDUCED){ el.textContent = pre + fmt(target,dec) + suf; return; }
    var dur = 1100 + Math.random()*350, t0 = null;
    function step(ts){
      if(!t0) t0 = ts;
      var p = Math.min((ts - t0)/dur, 1);
      var v = target * easeOutCubic(p);
      el.textContent = pre + fmt(v,dec) + suf;
      if(p < 1) requestAnimationFrame(step);
      else el.textContent = pre + fmt(target,dec) + suf;
    }
    requestAnimationFrame(step);
  }

  /* ---------- donut builder (from data-segs="value,value,..")
     Uses real SVG arc <path> segments — robust across renderers. ---------- */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function polar(cx,cy,r,deg){ var a=(deg-90)*Math.PI/180; return [cx+r*Math.cos(a), cy+r*Math.sin(a)]; }
  function arcD(cx,cy,r,start,end){
    if(end-start >= 359.999) end = start + 359.999;      // avoid full-circle collapse
    var s = polar(cx,cy,r,start), e = polar(cx,cy,r,end);
    var large = (end-start) > 180 ? 1 : 0;
    return 'M '+s[0].toFixed(2)+' '+s[1].toFixed(2)+' A '+r+' '+r+' 0 '+large+' 1 '+e[0].toFixed(2)+' '+e[1].toFixed(2);
  }
  function buildDonuts(scope){
    scope.querySelectorAll('.donut[data-segs]').forEach(function(d){
      if(d.dataset.built) return; d.dataset.built = '1';
      var vals = d.getAttribute('data-segs').split(',').map(Number);
      var cols = (d.getAttribute('data-cols')||'').split(',');
      var total = vals.reduce(function(a,b){return a+b;},0);
      var R = 54, cx = 70, cy = 70, GAP = 3; // deg gap between segments
      var svg = document.createElementNS(SVGNS,'svg');
      svg.setAttribute('viewBox','0 0 140 140'); svg.setAttribute('class','donut-svg');
      // track
      var track = document.createElementNS(SVGNS,'path');
      track.setAttribute('d', arcD(cx,cy,R,0,359.999));
      track.setAttribute('fill','none'); track.setAttribute('stroke','var(--track)');
      track.setAttribute('stroke-width','15'); track.setAttribute('stroke-linecap','round');
      svg.appendChild(track);
      var acc = 0;
      vals.forEach(function(v,i){
        var frac = v/total, sweep = frac*360;
        var start = acc + GAP/2, end = acc + sweep - GAP/2;
        var p = document.createElementNS(SVGNS,'path');
        p.setAttribute('d', arcD(cx,cy,R,start,end));
        p.setAttribute('fill','none');
        p.setAttribute('stroke', cols[i] ? cols[i].trim() : 'var(--c'+((i%6)+1)+')');
        p.setAttribute('stroke-width','15'); p.setAttribute('stroke-linecap','round');
        p.setAttribute('class','donut-seg');
        var len = p.getTotalLength() || 1;
        p.setAttribute('stroke-dasharray', len);
        p.style.strokeDashoffset = len;   // hidden until animate
        p.dataset.final = '0';
        svg.appendChild(p);
        acc += sweep;
      });
      var g = document.createElementNS(SVGNS,'g'); g.setAttribute('class','donut-center');
      var t1 = document.createElementNS(SVGNS,'text');
      t1.setAttribute('x',cx);t1.setAttribute('y',cy-1);t1.setAttribute('text-anchor','middle');
      t1.setAttribute('class','dc-val');t1.textContent = d.getAttribute('data-center')||total;
      var t2 = document.createElementNS(SVGNS,'text');
      t2.setAttribute('x',cx);t2.setAttribute('y',cy+17);t2.setAttribute('text-anchor','middle');
      t2.setAttribute('class','dc-lab');t2.textContent = d.getAttribute('data-centerlab')||'';
      g.appendChild(t1);g.appendChild(t2);svg.appendChild(g);
      d.appendChild(svg);
    });
  }

  /* ---------- gauge builder (data-pct) ---------- */
  function primeGauges(scope){
    scope.querySelectorAll('.gauge-val').forEach(function(g){
      var len = g.getAttribute('data-len');
      if(len && !g.dataset.primed){ g.dataset.primed='1'; g.style.strokeDashoffset = len; }
    });
  }

  /* ---------- animate a view (replay draw-ins + counts) ---------- */
  function animateView(view){
    buildDonuts(view);
    primeGauges(view);
    // prime hidden state
    view.classList.remove('di-animate');
    view._revealed = false;
    view.querySelectorAll('.donut-seg').forEach(function(s){ s.style.strokeDashoffset = s.getAttribute('stroke-dasharray'); });
    void view.offsetWidth;   // reflow so re-adding the class re-triggers transitions

    function reveal(){
      if(view._revealed) return; view._revealed = true;
      view.classList.add('di-animate');
      view.querySelectorAll('.donut-seg').forEach(function(s){ s.style.strokeDashoffset = '0'; });
      view.querySelectorAll('.gauge-val').forEach(function(g){ g.style.strokeDashoffset = g.getAttribute('data-off')||'0'; });
      view.querySelectorAll('[data-count]').forEach(countUp);
    }
    // rAF for smoothness; setTimeout fallback for throttled/background tabs
    requestAnimationFrame(function(){ requestAnimationFrame(reveal); });
    setTimeout(reveal, 90);
  }

  /* ---------- routing / dashboard switch ---------- */
  function setDash(name, push){
    if(DASH.indexOf(name) < 0) name = DASH[0];
    app.setAttribute('data-theme', name);
    document.querySelectorAll('.di-view').forEach(function(v){
      v.classList.toggle('active', v.getAttribute('data-dash') === name);
    });
    document.querySelectorAll('[data-goto]').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-goto') === name);
    });
    var active = document.querySelector('.di-view[data-dash="'+name+'"]');
    if(active) animateView(active);
    var titleEl = document.querySelector('[data-doctitle="'+name+'"]');
    if(titleEl) document.title = titleEl.textContent + ' — flo Intelligence';
    if(push && location.hash !== '#'+name){ history.pushState(null,'','#'+name); }
    // scroll canvas to top on switch
    var canv = active ? active.closest('.di-canvas') : null;
    if(canv) canv.scrollTop = 0;
  }

  function currentHash(){ return (location.hash||'').replace('#',''); }

  document.addEventListener('click', function(e){
    var nav = e.target.closest('[data-goto]');
    if(nav){ e.preventDefault(); setDash(nav.getAttribute('data-goto'), true); return; }

    // view tabs within a dashboard (Overview / Detail etc.)
    var tab = e.target.closest('[data-subview]');
    if(tab){
      var group = tab.getAttribute('data-subview-group');
      var target = tab.getAttribute('data-subview');
      document.querySelectorAll('[data-subview-group="'+group+'"]').forEach(function(b){
        b.classList.toggle('active', b === tab);
      });
      document.querySelectorAll('[data-subpanel-group="'+group+'"]').forEach(function(p){
        var on = p.getAttribute('data-subpanel') === target;
        p.style.display = on ? '' : 'none';
      });
      return;
    }
  });

  window.addEventListener('hashchange', function(){ setDash(currentHash(), false); });

  /* ---------- segment dropdown: filter table rows by data-seg ---------- */
  document.addEventListener('change', function(e){
    var sel = e.target.closest('select[data-filter-table]');
    if(!sel) return;
    var tbl = document.getElementById(sel.getAttribute('data-filter-table'));
    if(!tbl) return;
    var val = sel.value;
    tbl.querySelectorAll('tbody tr[data-seg]').forEach(function(tr){
      if(tr.classList.contains('total')) return;
      tr.style.display = (val==='all' || tr.getAttribute('data-seg')===val) ? '' : 'none';
    });
  });

  /* ---------- init ---------- */
  function init(){ setDash(currentHash() || DASH[0], false); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
