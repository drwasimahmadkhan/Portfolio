
document.addEventListener('DOMContentLoaded', () => {
    /* =========================================
       MOBILE MENU TOGGLE
       ========================================= */
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle') || document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');

            // Animate hamburger lines
            const spans = mobileMenuToggle.querySelectorAll('span');
            if (spans.length === 3) {
                // Simple toggle class logic is handled often by CSS, 
                // but ensuring active class is set for styling hooks.
            }
        });
    }

    /* =========================================
       SCROLL ANIMATIONS (Intersection Observer)
       ========================================= */
    const observerOptions = {
        threshold: 0.1, // Trigger when 10% of the element is visible
        rootMargin: "0px 0px -50px 0px" // Offset slightly so it triggers before bottom
    };

    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // Optional: Stop observing once animated
                scrollObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Elements to animate
    const animatedElements = document.querySelectorAll(
        '.hero-content, .hero-image, .section-title, .section-subtitle, .service-card, .course-card, .expert-card, .timeline-content, .edu-card, .award-tile'
    );

    animatedElements.forEach(el => {
        el.classList.add('animate-on-scroll');
        scrollObserver.observe(el);
    });
    /* =========================================
       ENROLLMENT MODAL LOGIC
       ========================================= */
    const modal = document.getElementById('enrollmentModal');
    const enrollButtons = document.querySelectorAll('.btn-enroll');
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelBtn = document.querySelector('.btn-link-cancel');
    const enrollmentForm = document.getElementById('enrollmentForm');
    const courseSelect = document.getElementById('courseSelect');

    if (modal && enrollButtons.length > 0) {
        // Open Modal
        enrollButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                modal.classList.add('active');
                document.body.style.overflow = 'hidden'; // Prevent background scrolling

                // Attempt to pre-select course based on card title
                const card = btn.closest('.course-card');
                if (card) {
                    const title = card.querySelector('.course-title').textContent.trim();
                    // Try to match title with option values
                    // Note: Use 'contains' logic or exact match depending on consistency
                    for (let i = 0; i < courseSelect.options.length; i++) {
                        if (courseSelect.options[i].value === title ||
                            courseSelect.options[i].text.includes(title)) {
                            courseSelect.selectedIndex = i;
                            break;
                        }
                    }
                }
            });
        });

        // Close Modal Helper
        const closeModal = () => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        };

        // Close Events
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        // Click outside modal
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Form Submission
        if (enrollmentForm) {
            enrollmentForm.addEventListener('submit', (e) => {
                e.preventDefault();

                // Simulate processing
                const submitBtn = enrollmentForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Enrolling...';
                submitBtn.disabled = true;

                setTimeout(() => {
                    alert(`Thank you, ${document.getElementById('firstName').value}! \n\nYour enrollment request for "${courseSelect.value}" has been received. We will contact you shortly.`);
                    enrollmentForm.reset();
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    closeModal();
                }, 1500);
            });
        }
    }
    /* =========================================
       VIEW MORE SERVICES TOGGLE
       ========================================= */
    const viewMoreServicesBtn = document.getElementById('viewMoreServices');
    const hiddenServicesGrid = document.getElementById('hiddenServicesGrid');

    if (viewMoreServicesBtn && hiddenServicesGrid) {
        viewMoreServicesBtn.addEventListener('click', () => {
            hiddenServicesGrid.classList.remove('hidden-services');
            viewMoreServicesBtn.style.display = 'none'; // Hide button after expanding
        });
    }
});
