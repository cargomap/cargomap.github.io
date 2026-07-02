var hdr=document.getElementById('hdr');
  var alwaysSolid=hdr.hasAttribute('data-solid');
  var onScroll=function(){ if(alwaysSolid||window.scrollY>40||nl.classList.contains('open')){hdr.classList.add('solid');}else{hdr.classList.remove('solid');} };
  var mb=document.getElementById('menubtn'), nl=document.getElementById('navlinks');
  onScroll(); window.addEventListener('scroll',onScroll,{passive:true});
  mb.addEventListener('click',function(){
    var open=nl.classList.toggle('open');
    mb.setAttribute('aria-expanded',open);
    onScroll();
  });
  nl.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){nl.classList.remove('open');mb.setAttribute('aria-expanded',false);onScroll();});});

  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12});
  document.querySelectorAll('.reveal').forEach(function(el){io.observe(el);});


  /* ===== Field notes auto-publish engine =====
     EDIT ONE LINE: FN_START is the date Post No.01 goes live (a Monday).
     Posts then publish every Monday and Thursday automatically, in order.
     Re-uploading this file is NOT needed for new posts to appear — the page
     reveals each note by itself once its date arrives. */
  var FN_START = "2026-06-08";   // <-- Monday of Week 1. Change to your real Post 01 date.

  (function(){
    var feed=document.getElementById('fnFeed');
    if(!feed) return;
    var arts=Array.prototype.slice.call(feed.querySelectorAll('.fn'));
    var MS=86400000;
    var start=new Date(FN_START+"T00:00:00");
    // today at local midnight
    var now=new Date(); var today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    var months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var wdays=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    // publish date for post number n (1-based): week = floor((n-1)/2); Mon if odd index, Thu if even
    function pubDate(n){
      var idx=n-1, wk=Math.floor(idx/2), isThu=(idx%2===1);
      var d=new Date(start.getTime()+ wk*7*MS + (isThu?3:0)*MS);
      return new Date(d.getFullYear(),d.getMonth(),d.getDate());
    }
    function fmt(d){ return wdays[d.getDay()]+", "+months[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear(); }
    function fmtShort(d){ return months[d.getMonth()]+" "+d.getDate(); }

    var published=[], upcoming=[];
    arts.forEach(function(a){
      var n=parseInt(a.getAttribute('data-i'),10);
      var d=pubDate(n); a._d=d; a._n=n;
      var t=a.querySelector('.fn-date');
      if(d.getTime()<=today.getTime()){
        a.setAttribute('data-locked','0');
        t.textContent=fmt(d); t.setAttribute('datetime',d.toISOString().slice(0,10));
        published.push(a);
      } else {
        a.setAttribute('data-locked','1');
        t.textContent="Scheduled";
        // swap the read-cue for a lock line
        var cue=a.querySelector('.fn-cue');
        cue.outerHTML='<span class="fn-lock"><svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.4"/></svg> Publishes '+fmtShort(d)+'</span>';
        upcoming.push(a);
      }
    });

    // order: newest published first, then the next few scheduled
    published.sort(function(a,b){return b._d-a._d || b._n-a._n;});
    upcoming.sort(function(a,b){return a._d-b._d || a._n-b._n;});
    var SHOW_UPCOMING=2;
    var ord=0;
    published.forEach(function(a){a.style.order=ord++;});
    upcoming.forEach(function(a,i){
      if(i<SHOW_UPCOMING){a.style.order=ord++;}
      else {a.style.display='none';}
    });

    // status line
    var cEl=document.getElementById('fnCount'), nEl=document.getElementById('fnNext');
    cEl.textContent=published.length+" of 52 notes published";
    if(upcoming.length){ nEl.textContent="· next on "+fmtShort(upcoming[0]._d); }
    else { nEl.textContent="· series complete"; }
    var moreEl=document.getElementById('fnMore');
    var hidden=upcoming.length-Math.min(SHOW_UPCOMING,upcoming.length);
    if(hidden>0){ moreEl.textContent="+ "+hidden+" more notes scheduled through the series"; }

    // accordion (published only)
    published.forEach(function(a){
      var head=a.querySelector('.fn-head'), body=a.querySelector('.fn-body');
      head.addEventListener('click',function(){
        var open=a.getAttribute('data-open')==='1';
        if(open){ a.setAttribute('data-open','0'); head.setAttribute('aria-expanded','false'); body.style.maxHeight=null; }
        else { a.setAttribute('data-open','1'); head.setAttribute('aria-expanded','true'); body.style.maxHeight=body.scrollHeight+'px'; }
      });
    });
    // keep an open card sized correctly on resize
    window.addEventListener('resize',function(){
      published.forEach(function(a){
        if(a.getAttribute('data-open')==='1'){ a.querySelector('.fn-body').style.maxHeight=a.querySelector('.fn-body').scrollHeight+'px'; }
      });
    });
  })();
