/*
 * TehSaad portfolio — front-end interactivity
 * Plain JS, no build step.
 */

// ---------------------------------------------------------------
// Cloudflare Worker API
// ---------------------------------------------------------------

const CONTACT_API_URL =
    'https://tehsaad-portfolio-api.srizwan-bscs26seecs.workers.dev/api/contact';

// ---------------------------------------------------------------
// Mobile nav toggle
// ---------------------------------------------------------------

function initNavToggle() {
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('siteMenu');

    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
        const isOpen = menu.classList.toggle('open');

        toggle.setAttribute(
            'aria-expanded',
            String(isOpen)
        );
    });

    menu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            menu.classList.remove('open');

            toggle.setAttribute(
                'aria-expanded',
                'false'
            );
        });
    });
}


// ---------------------------------------------------------------
// Scroll reveal via IntersectionObserver
// ---------------------------------------------------------------

function initScrollReveal() {
    const targets = document.querySelectorAll(
        '.reveal, .reveal-stagger'
    );

    if (!targets.length) return;

    const prefersReduced =
        window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

    if (prefersReduced) {
        targets.forEach((el) => {
            el.classList.add('in-view');
        });

        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');

                    observer.unobserve(
                        entry.target
                    );
                }
            });
        },
        {
            threshold: 0.15,
            rootMargin: '0px 0px -8% 0px'
        }
    );

    targets.forEach((el) => {
        observer.observe(el);
    });
}


// ---------------------------------------------------------------
// Contact form
// Saves message to Cloudflare Worker → D1
// ---------------------------------------------------------------

function initContactForm() {
    const form = document.getElementById('contactForm');
    const status = document.getElementById('formStatus');

    // No contact form on this page
    if (!form || !status) return;

    form.addEventListener(
        'submit',
        async (e) => {
            e.preventDefault();

            const name =
                form.querySelector('#name')
                    .value.trim();

            const email =
                form.querySelector('#email')
                    .value.trim();

            const subject =
                form.querySelector('#subject')
                    .value.trim();

            const message =
                form.querySelector('#message')
                    .value.trim();

            // ---------------------------------------------------
            // Validation
            // ---------------------------------------------------

            if (!name || !email || !message) {
                status.textContent =
                    'Please fill in your name, email, and message.';

                status.className =
                    'form-status err';

                return;
            }

            // ---------------------------------------------------
            // Sending state
            // ---------------------------------------------------

            status.textContent =
                'Sending message...';

            status.className =
                'form-status';

            const submitButton =
                form.querySelector(
                    'button[type="submit"], input[type="submit"]'
                );

            if (submitButton) {
                submitButton.disabled = true;
            }

            try {
                // ------------------------------------------------
                // Save message through Cloudflare Worker
                // ------------------------------------------------

                const response = await fetch(
                    CONTACT_API_URL,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({
                            name: name,
                            email: email,
                            subject: subject,
                            message: message
                        })
                    }
                );

                const result =
                    await response.json();

                if (!response.ok || !result.success) {
                    console.error(
                        'Cloudflare API error:',
                        result
                    );

                    status.textContent =
                        'Could not send your message. Please try again.';

                    status.className =
                        'form-status err';

                    return;
                }

                // ------------------------------------------------
                // Success
                // ------------------------------------------------

                status.textContent =
                    'Message sent successfully!';

                status.className =
                    'form-status ok';

                form.reset();

            } catch (error) {
                console.error(
                    'Contact form error:',
                    error
                );

                status.textContent =
                    'Something went wrong. Please try again.';

                status.className =
                    'form-status err';

            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                }
            }
        }
    );
}


// ---------------------------------------------------------------
// 1-Click Copy Email to Clipboard
// ---------------------------------------------------------------

function initCopyEmail() {
    const copyButtons =
        document.querySelectorAll(
            '[data-copy-email]'
        );

    copyButtons.forEach((btn) => {
        btn.addEventListener(
            'click',
            async (e) => {
                e.preventDefault();

                const email =
                    btn.getAttribute(
                        'data-copy-email'
                    ) ||
                    'tehsaad13453310@gmail.com';

                const originalText =
                    btn.innerHTML;

                try {
                    await navigator.clipboard.writeText(
                        email
                    );

                    btn.classList.add('copied');

                    btn.innerHTML =
                        '✓ Copied!';

                    setTimeout(() => {
                        btn.classList.remove(
                            'copied'
                        );

                        btn.innerHTML =
                            originalText;
                    }, 2000);

                } catch (err) {
                    console.error(
                        'Clipboard API failed:',
                        err
                    );

                    const textarea =
                        document.createElement(
                            'textarea'
                        );

                    textarea.value = email;

                    textarea.style.position =
                        'fixed';

                    textarea.style.opacity =
                        '0';

                    document.body.appendChild(
                        textarea
                    );

                    textarea.select();

                    try {
                        document.execCommand(
                            'copy'
                        );
                    } catch (copyError) {
                        console.error(
                            'Fallback copy failed:',
                            copyError
                        );
                    }

                    document.body.removeChild(
                        textarea
                    );

                    btn.classList.add('copied');

                    btn.innerHTML =
                        '✓ Copied!';

                    setTimeout(() => {
                        btn.classList.remove(
                            'copied'
                        );

                        btn.innerHTML =
                            originalText;
                    }, 2000);
                }
            }
        );
    });
}


// ---------------------------------------------------------------
// Initialize everything
// ---------------------------------------------------------------

document.addEventListener(
    'DOMContentLoaded',
    () => {
        initNavToggle();
        initScrollReveal();
        initContactForm();
        initCopyEmail();
    }
);