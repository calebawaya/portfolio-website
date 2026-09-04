document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const menuButton = document.querySelector('.menu-button');
  const nav = document.querySelector('.site-nav');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    }));
  }

  const themeButton = document.querySelector('.theme-button');
  const savedTheme = localStorage.getItem('portfolio-theme');
  if (savedTheme === 'light') document.body.classList.add('light-theme');
  if (themeButton) {
    themeButton.textContent = document.body.classList.contains('light-theme') ? '☀️' : '🌙';
    themeButton.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const light = document.body.classList.contains('light-theme');
      localStorage.setItem('portfolio-theme', light ? 'light' : 'dark');
      themeButton.textContent = light ? '☀️' : '🌙';
      themeButton.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
    });
  }

  const revealItems = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach(item => observer.observe(item));

  const backTop = document.querySelector('.back-top');
  window.addEventListener('scroll', () => {
    if (backTop) backTop.classList.toggle('show', window.scrollY > 500);
  });
});
