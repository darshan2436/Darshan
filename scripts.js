
/* ---------- Heavy, weighted scroll engine ---------- */
const heavyScroll = (function(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  const enabled = !reduceMotion && !isCoarse;

  let current = window.scrollY;
  let target = window.scrollY;
  let raf = null;
  const EASE = 0.065;      // lower = heavier / slower catch-up
  const WHEEL_WEIGHT = 0.62; // lower = slower travel per wheel notch

  function maxScroll(){ return document.documentElement.scrollHeight - window.innerHeight; }
  function clamp(){ target = Math.max(0, Math.min(target, maxScroll())); }

  function tick(){
    const diff = target - current;
    current += diff * EASE;
    if(Math.abs(diff) < 0.35){
      current = target;
      window.scrollTo(0, current);
      raf = null;
      return;
    }
    window.scrollTo(0, current);
    raf = requestAnimationFrame(tick);
  }
  function play(){ if(!raf){ raf = requestAnimationFrame(tick); } }

  function goTo(y){
    target = y;
    clamp();
    play();
  }
  function goToEl(el, offset){
    const y = el.getBoundingClientRect().top + window.scrollY - (offset || 88);
    goTo(y);
  }

  if(enabled){
    document.documentElement.classList.add('has-heavy-scroll');

    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      target += e.deltaY * WHEEL_WEIGHT;
      clamp();
      play();
    }, { passive:false });

    window.addEventListener('keydown', (e) => {
      const step = window.innerHeight * 0.85;
      if(e.key === 'PageDown' || e.key === ' '){ e.preventDefault(); target += step; clamp(); play(); }
      else if(e.key === 'PageUp'){ e.preventDefault(); target -= step; clamp(); play(); }
      else if(e.key === 'ArrowDown'){ target += 90; clamp(); play(); }
      else if(e.key === 'ArrowUp'){ target -= 90; clamp(); play(); }
      else if(e.key === 'Home'){ target = 0; play(); }
      else if(e.key === 'End'){ target = maxScroll(); play(); }
    });

    window.addEventListener('resize', clamp);

    // keep target in sync if the browser scrolls us directly (e.g. scrollbar drag)
    let syncTimer;
    window.addEventListener('scroll', () => {
      if(raf) return; // we're already driving it
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => { current = window.scrollY; target = window.scrollY; }, 80);
    }, { passive:true });
  }

  return { goTo, goToEl, enabled };
})();

(function(){
  const html = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const saved = localStorage.getItem('portfolio-theme');
  if(saved){ html.setAttribute('data-theme', saved); }
  else if(window.matchMedia('(prefers-color-scheme: light)').matches){ html.setAttribute('data-theme','light'); }

  toggle.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('portfolio-theme', next);
  });

  // Scroll progress
  const bar = document.getElementById('progressBar');
  const nav = document.getElementById('nav');
  const backTop = document.getElementById('backTop');
  function onScroll(){
    const h = document.documentElement;
    const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
    bar.style.width = scrolled + '%';
    nav.classList.toggle('scrolled', h.scrollTop > 30);
    backTop.classList.toggle('show', h.scrollTop > 600);
  }
  document.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
  backTop.addEventListener('click', () => heavyScroll.enabled ? heavyScroll.goTo(0) : window.scrollTo({top:0, behavior:'smooth'}));

  // Mobile menu
  const burger = document.getElementById('burger');
  const panel = document.getElementById('mobilePanel');
  const scrim = document.getElementById('scrim');
  function closeMenu(){ burger.classList.remove('open'); panel.classList.remove('open'); scrim.classList.remove('open'); }
  burger.addEventListener('click', () => {
    burger.classList.toggle('open'); panel.classList.toggle('open'); scrim.classList.toggle('open');
  });
  scrim.addEventListener('click', closeMenu);
  document.querySelectorAll('.mobile-panel a').forEach(a => a.addEventListener('click', closeMenu));

  // Anchor navigation eased through the same heavy-scroll engine
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if(!id || id.length < 2) return;
      const target = document.querySelector(id);
      if(!target) return;
      e.preventDefault();
      if(heavyScroll.enabled){ heavyScroll.goToEl(target, 88); }
      else { target.scrollIntoView({ behavior:'smooth', block:'start' }); }
      history.pushState(null, '', id);
    });
  });

  // Scrollspy
  const links = document.querySelectorAll('[data-link]');
  const sections = document.querySelectorAll('main section[id]');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + entry.target.id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  sections.forEach(s => spy.observe(s));

  // Reveal on scroll
  const revealEls = document.querySelectorAll('[data-reveal]');
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('in-view');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  revealEls.forEach(el => revealObs.observe(el));

  // Card spotlight
  document.querySelectorAll('.skill-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--x', (e.clientX - r.left) + 'px');
      card.style.setProperty('--y', (e.clientY - r.top) + 'px');
    });
  });

  // Project filter
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.project-card');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      cards.forEach(card => {
        const match = f === 'all' || card.dataset.category === f;
        card.style.opacity = match ? '1' : '0';
        card.style.transform = match ? 'translateY(0) scale(1)' : 'translateY(6px) scale(.97)';
        setTimeout(() => card.classList.toggle('hide', !match), match ? 0 : 220);
        if(match) card.classList.remove('hide');
      });
    });
  });

  // Toast helper
  const toast = document.getElementById('toast');
  let toastTimer;
  function showToast(msg){
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%,0)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%,20px)';
    }, 3200);
  }

  // Resume button (no real file attached yet)
  // document.getElementById('resumeBtn').addEventListener('click', () => {
  //   showToast("Resume coming soon — reach out via the contact form in the meantime!");
  // });

  // Contact form (front-end only — no backend wired up)
  const form = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');
  const submitLabel = document.getElementById('submitLabel');
  const formMsg = document.getElementById('formMsg');
  form.addEventListener('submit', async(e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitLabel.textContent = "Sending...";
    try {
        const response = await fetch(form.action, {
            method: form.method,
            body: new FormData(form),
            headers: {
                Accept: "application/json"
            }
        });

        if (response.ok) {
            formMsg.textContent = "Thank you for reaching out! Your message has been sent.";
            formMsg.classList.add("show");
            form.reset();
        } else {
            formMsg.textContent = "❌ Failed to send message.";
        }
    } catch (err) {
        formMsg.textContent = "❌ Something went wrong.";
    }

    submitBtn.disabled = false;
    submitLabel.textContent = "Send Message";
  });

  document.getElementById('year').textContent = new Date().getFullYear();
})();