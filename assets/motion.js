!function(){
  const root = document.documentElement;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (motion) return;
  root.classList.add('m');
  document.querySelectorAll('.story .ch').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    setTimeout(() => {
      el.style.transition = 'all .6s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 100 + i * 120);
  });
}();
