document.addEventListener('DOMContentLoaded', function() {
  const fadeEls = document.querySelectorAll('.services, .pricing, .contact, .service-card');
  fadeEls.forEach(el => el.classList.add('fade-in'));

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  fadeEls.forEach(el => observer.observe(el));

  const video = document.querySelector('.hero-video');
  if (video) {
    window.addEventListener('scroll', function() {
      const scrollY = window.scrollY;
      const heroH = document.getElementById('hero').offsetHeight;
      if (scrollY < heroH) {
        const progress = scrollY / heroH;
        video.currentTime = progress * (video.duration || 0);
      }
    }, { passive: true });
  }
});