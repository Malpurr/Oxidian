// ===== Oxidian Premium Landing Page — Enhanced JS =====
(function () {
  'use strict';

  // === NAVBAR SCROLL BEHAVIOR ===
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  
  let isScrolling = false;
  
  function handleScroll() {
    if (!isScrolling) {
      requestAnimationFrame(() => {
        const scrolled = window.scrollY > 50;
        navbar.classList.toggle('scrolled', scrolled);
        isScrolling = false;
      });
      isScrolling = true;
    }
  }
  
  window.addEventListener('scroll', handleScroll, { passive: true });

  // === MOBILE NAVIGATION ===
  function toggleMobileMenu() {
    const isOpen = navLinks.classList.contains('open');
    
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
    
    // Update ARIA states
    hamburger.setAttribute('aria-expanded', !isOpen);
    
    // Prevent body scroll when menu is open
    document.body.style.overflow = !isOpen ? 'hidden' : '';
    
    // Focus management
    if (!isOpen) {
      // Trap focus in the mobile menu
      const firstLink = navLinks.querySelector('a');
      firstLink?.focus();
    }
  }
  
  function closeMobileMenu() {
    hamburger.classList.remove('active');
    navLinks.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  
  hamburger.addEventListener('click', toggleMobileMenu);
  
  // Close mobile menu when clicking on links
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });
  
  // Close mobile menu with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) {
      closeMobileMenu();
      hamburger.focus();
    }
  });
  
  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!navbar.contains(e.target) && navLinks.classList.contains('open')) {
      closeMobileMenu();
    }
  });

  // === ENHANCED INTERSECTION OBSERVER ===
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Add staggered delay for grid items
        const delay = entry.target.dataset.delay || 0;
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);
        fadeObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all fade-in elements with staggered delays
  document.querySelectorAll('.fade-in').forEach((el, index) => {
    // Add delay data attribute for grid items
    if (el.closest('.features-grid, .testimonial-grid')) {
      el.dataset.delay = (index % 3) * 100; // 100ms delay per item in row
    }
    fadeObserver.observe(el);
  });

  // === ENHANCED PARTICLE SYSTEM ===
  const canvas = document.getElementById('particles');
  
  if (canvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId;
    let mouseX = 0;
    let mouseY = 0;
    
    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    }
    
    function createParticles() {
      particles = [];
      const area = (canvas.width / window.devicePixelRatio) * (canvas.height / window.devicePixelRatio);
      const count = Math.min(Math.floor(area / 12000), 120);
      
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * (canvas.width / window.devicePixelRatio),
          y: Math.random() * (canvas.height / window.devicePixelRatio),
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          r: Math.random() * 2 + 1,
          alpha: Math.random() * 0.4 + 0.2,
          originalAlpha: Math.random() * 0.4 + 0.2,
          pulsePhase: Math.random() * Math.PI * 2,
          color: `hsl(${260 + Math.random() * 40}, 70%, ${60 + Math.random() * 20}%)`
        });
      }
    }
    
    function drawConnections() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 120) {
            const opacity = (1 - distance / 120) * 0.1;
            const gradient = ctx.createLinearGradient(
              particles[i].x, particles[i].y,
              particles[j].x, particles[j].y
            );
            gradient.addColorStop(0, `hsla(260, 70%, 70%, ${opacity})`);
            gradient.addColorStop(1, `hsla(280, 70%, 70%, ${opacity})`);
            
            ctx.beginPath();
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }
    
    function drawParticles(time) {
      particles.forEach((particle) => {
        // Subtle pulsing effect
        particle.alpha = particle.originalAlpha + 
          Math.sin(time * 0.002 + particle.pulsePhase) * 0.2;
        
        // Mouse interaction
        const mouseDistance = Math.sqrt(
          Math.pow(mouseX - particle.x, 2) + 
          Math.pow(mouseY - particle.y, 2)
        );
        
        if (mouseDistance < 100) {
          const force = (100 - mouseDistance) / 100;
          particle.alpha += force * 0.3;
          particle.r += force * 0.5;
        } else {
          particle.r += (particle.r > 1 ? -0.1 : 0);
        }
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        ctx.fillStyle = particle.color.replace('hsl', 'hsla').replace(')', `, ${particle.alpha})`);
        ctx.fill();
        
        // Add subtle glow
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.r * 2, 0, Math.PI * 2);
        ctx.fillStyle = particle.color.replace('hsl', 'hsla').replace(')', `, ${particle.alpha * 0.1})`);
        ctx.fill();
      });
    }
    
    function animate(time) {
      ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
      
      // Update particles
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Bounce off walls with slight randomness
        if (particle.x < 0 || particle.x > canvas.width / window.devicePixelRatio) {
          particle.vx *= -1;
          particle.vx += (Math.random() - 0.5) * 0.1;
        }
        if (particle.y < 0 || particle.y > canvas.height / window.devicePixelRatio) {
          particle.vy *= -1;
          particle.vy += (Math.random() - 0.5) * 0.1;
        }
        
        // Keep velocities in check
        particle.vx = Math.max(-1, Math.min(1, particle.vx));
        particle.vy = Math.max(-1, Math.min(1, particle.vy));
      });
      
      drawConnections();
      drawParticles(time);
      
      animationId = requestAnimationFrame(animate);
    }
    
    // Mouse tracking
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });
    
    // Pause animation when not visible
    const canvasObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!animationId) animate();
        } else {
          if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
          }
        }
      });
    });
    
    canvasObserver.observe(canvas);
    
    // Initialize
    resize();
    createParticles();
    animate();
    
    // Handle resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        resize();
        createParticles();
      }, 250);
    });
  }

  // === SMOOTH SCROLL ENHANCEMENT ===
  function smoothScrollTo(target, offset = 80) {
    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = Math.min(Math.max(Math.abs(distance) / 3, 300), 1000);
    let start = null;

    function animation(currentTime) {
      if (start === null) start = currentTime;
      const timeElapsed = currentTime - start;
      const run = easeInOutCubic(timeElapsed, startPosition, distance, duration);
      window.scrollTo(0, run);
      if (timeElapsed < duration) requestAnimationFrame(animation);
    }

    function easeInOutCubic(t, b, c, d) {
      t /= d / 2;
      if (t < 1) return c / 2 * t * t * t + b;
      t -= 2;
      return c / 2 * (t * t * t + 2) + b;
    }

    requestAnimationFrame(animation);
  }

  // Enhanced smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        smoothScrollTo(target);
        
        // Update URL without triggering scroll
        if (history.pushState) {
          history.pushState(null, null, this.getAttribute('href'));
        }
      }
    });
  });

  // === COPY BUTTON FUNCTIONALITY ===
  const copyButtons = document.querySelectorAll('.copy-btn');
  
  copyButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const codeBlock = button.parentElement.querySelector('code');
      const text = codeBlock.textContent;
      
      try {
        await navigator.clipboard.writeText(text);
        
        // Visual feedback
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.style.background = 'var(--success)';
        button.style.color = 'white';
        
        setTimeout(() => {
          button.textContent = originalText;
          button.style.background = '';
          button.style.color = '';
        }, 2000);
        
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          button.textContent = 'Copied!';
          setTimeout(() => {
            button.textContent = 'Copy';
          }, 2000);
        } catch (err) {
          button.textContent = 'Error';
          setTimeout(() => {
            button.textContent = 'Copy';
          }, 2000);
        }
        
        textArea.remove();
      }
    });
  });

  // === PERFORMANCE OPTIMIZATIONS ===
  
  // Debounced resize handler
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Re-trigger any resize-dependent calculations
      document.body.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    }, 250);
  });
  
  // Set initial CSS custom property for viewport height
  document.body.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);

  // === ACCESSIBILITY ENHANCEMENTS ===
  
  // Skip to main content link
  const skipLink = document.createElement('a');
  skipLink.href = '#hero';
  skipLink.textContent = 'Skip to main content';
  skipLink.className = 'skip-link';
  skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 6px;
    background: var(--accent-primary);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    text-decoration: none;
    font-weight: 600;
    z-index: 9999;
    transition: top 0.3s;
  `;
  
  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '6px';
  });
  
  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
  });
  
  document.body.insertBefore(skipLink, document.body.firstChild);
  
  // Announce page load to screen readers
  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  announcer.style.cssText = `
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  `;
  document.body.appendChild(announcer);
  
  // Announce when animations are complete
  setTimeout(() => {
    announcer.textContent = 'Page loaded successfully. Welcome to Oxidian.';
  }, 1000);

  // === THEME DETECTION ===
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  
  // Add classes based on user preferences
  if (prefersDark.matches) {
    document.documentElement.classList.add('dark-theme');
  }
  
  if (prefersReducedMotion.matches) {
    document.documentElement.classList.add('reduced-motion');
  }
  
  // Listen for changes
  prefersDark.addEventListener('change', (e) => {
    document.documentElement.classList.toggle('dark-theme', e.matches);
  });
  
  prefersReducedMotion.addEventListener('change', (e) => {
    document.documentElement.classList.toggle('reduced-motion', e.matches);
  });

  // === ERROR HANDLING ===
  window.addEventListener('error', (e) => {
    console.warn('Oxidian Website Error:', e.error);
    // Could send to analytics in production
  });
  
  // === STARTUP COMPLETE ===
  console.log('🦀 Oxidian website loaded successfully');
  
})();