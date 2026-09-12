/**
 * TehSaad portfolio — front-end interactivity (plain JS, no build step).
 */

// ---------------------------------------------------------------
// Mobile nav toggle
// ---------------------------------------------------------------


const SUPABASE_URL = 'https://myfcyubdhxzthhdgustu.supabase.co/rest/v1/';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Wjqf-ZZtYTcovUi7k469SQ_ihmUsqzu';

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);



function initNavToggle() {
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('siteMenu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ---------------------------------------------------------------
// Scroll-reveal via IntersectionObserver
// ---------------------------------------------------------------
function initScrollReveal() {
  const targets = document.querySelectorAll('.reveal, .reveal-stagger');
  if (!targets.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    targets.forEach((el) => el.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
  );

  targets.forEach((el) => observer.observe(el));
}

// ---------------------------------------------------------------
// Contact form — no backend, so this opens the visitor's email
// client with the message pre-filled (mailto:). Swap this out for
// a fetch() call to Formspree / Netlify Forms / your own API later.
// ---------------------------------------------------------------
function initContactForm() {
    const form = document.getElementById('contactForm');
    const status = document.getElementById('formStatus');

    if (!form || !status) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = form.querySelector('#name').value.trim();
        const email = form.querySelector('#email').value.trim();
        const subject = form.querySelector('#subject').value.trim();
        const message = form.querySelector('#message').value.trim();

        if (!name || !email || !message) {
            status.textContent = 'Please fill in your name, email, and message.';
            status.className = 'form-status err';
            return;
        }

        status.textContent = 'Sending message...';
        status.className = 'form-status';

        const { error } = await supabaseClient
            .from('messages')
            .insert({
                name: name,
                email: email,
                subject: subject || null,
                message: message
            });

        if (error) {
            console.error('Supabase error:', error);

            status.textContent = 'Sorry, your message could not be sent. Please try again.';
            status.className = 'form-status err';

            return;
        }

        status.textContent = 'Message sent successfully!';
        status.className = 'form-status ok';

        form.reset();
    });
}

// ---------------------------------------------------------------
// 1-Click Copy Email to Clipboard
// ---------------------------------------------------------------
function initCopyEmail() {
  const copyButtons = document.querySelectorAll('[data-copy-email]');
  copyButtons.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = btn.getAttribute('data-copy-email') || 'tehsaad13453310@gmail.com';
      try {
        await navigator.clipboard.writeText(email);
        const originalText = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = '✓ Copied!';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = originalText;
        }, 2000);
      } catch (err) {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = email;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        btn.classList.add('copied');
        btn.innerHTML = '✓ Copied!';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = originalText;
        }, 2000);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  initScrollReveal();
  initContactForm();
  initHeroParallax();
  initCopyEmail();
});