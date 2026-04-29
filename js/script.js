// Theme Management
const html = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

function setTheme(theme) {
    if (theme === 'dark') {
        html.classList.remove('theme-light');
        html.classList.add('theme-dark', 'dark');
        if (themeIcon) {
            themeIcon.classList.remove('fa-moon', 'text-primary');
            themeIcon.classList.add('fa-sun', 'text-accent');
        }
        localStorage.setItem('theme', 'dark');
    } else {
        html.classList.remove('theme-dark', 'dark');
        html.classList.add('theme-light');
        if (themeIcon) {
            themeIcon.classList.remove('fa-sun', 'text-accent');
            themeIcon.classList.add('fa-moon', 'text-primary');
        }
        localStorage.setItem('theme', 'light');
    }
}
setTheme(localStorage.getItem('theme') || 'light');
if(themeToggle) {
    themeToggle.addEventListener('click', () => {
        setTheme(html.classList.contains('theme-dark') ? 'light' : 'dark');
    });
}

// Navigation Scroll & Mobile Menu
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if(navbar) {
        if (window.scrollY > 100) navbar.classList.add('glass', 'backdrop-blur-xl', 'shadow-lg');
        else navbar.classList.remove('glass', 'backdrop-blur-xl', 'shadow-lg');
    }
});

const mobileBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
if(mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        mobileMenu.classList.toggle('flex');
    });
    document.querySelectorAll('.mobile-link').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            mobileMenu.classList.remove('flex');
        });
    });
}

// ScrollSpy for Navigation
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 150) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// GSAP Animations
if (typeof gsap !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    
    // Hero Animations
    gsap.to("#hero-title", {opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: "back.out(1.2)", startAt: {y: 30, scale: 0.95}});
    gsap.to("#hero-subtitle", {opacity: 1, y: 0, duration: 0.8, delay: 0.4, ease: "back.out(1.2)", startAt: {y: 30, scale: 0.95}});
    gsap.to("#hero-actions-text, #hero-actions-btns", {opacity: 1, y: 0, duration: 0.8, delay: 0.6, ease: "back.out(1.5)", startAt: {y: 30, scale: 0.95}});
    
    // Reveal Animations
    gsap.utils.toArray('.gs-reveal').forEach(el => gsap.fromTo(el, {opacity:0, y:40}, {scrollTrigger:{trigger:el, start:"top 85%"}, opacity:1, y:0, duration:0.8, ease:"back.out(1.2)"}));
    gsap.utils.toArray('.gs-reveal-left').forEach(el => gsap.fromTo(el, {opacity:0, x:-40}, {scrollTrigger:{trigger:el, start:"top 85%"}, opacity:1, x:0, duration:0.8, ease:"back.out(1.2)"}));
    gsap.utils.toArray('.gs-reveal-right').forEach(el => gsap.fromTo(el, {opacity:0, x:40}, {scrollTrigger:{trigger:el, start:"top 85%"}, opacity:1, x:0, duration:0.8, ease:"back.out(1.2)"}));
    gsap.utils.toArray('.gs-reveal-up').forEach(el => gsap.fromTo(el, {opacity:0, y:40}, {scrollTrigger:{trigger:el, start:"top 90%"}, opacity:1, y:0, duration:0.6, ease:"back.out(1.2)"}));

    // 3D Hover effect for elegant cards
    document.querySelectorAll('.elegant-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            if(window.innerWidth > 768) {
                card.style.transform = 'translateY(-8px) scale(1.02)';
                card.style.boxShadow = '0 20px 40px -10px rgba(0,0,0,0.1)';
            }
        });
        card.addEventListener('mouseleave', () => {
            if(window.innerWidth > 768) {
                card.style.transform = '';
                card.style.boxShadow = '';
            }
        });
    });
}

// Cursor Particles
const cCanvas = document.getElementById('cursor-canvas');
if(cCanvas && window.matchMedia('(pointer: fine)').matches) {
    const cCtx = cCanvas.getContext('2d');
    const cParts = [];
    let mx = window.innerWidth/2, my = window.innerHeight/2;
    const P_COLORS = ['rgba(79,195,247,0.7)', 'rgba(0,119,192,0.6)', 'rgba(167,255,235,0.5)', 'rgba(255,255,255,0.7)'];
    
    window.addEventListener('resize', () => { cCanvas.width = window.innerWidth; cCanvas.height = window.innerHeight; });
    cCanvas.width = window.innerWidth; cCanvas.height = window.innerHeight;
    
    window.addEventListener('mousemove', (e) => {
        mx = e.clientX; my = e.clientY;
        cParts.push({x: mx, y: my, r: 5+Math.random()*5, c: P_COLORS[Math.floor(Math.random()*P_COLORS.length)], a: 1});
    });

    function animCursor() {
        cCtx.clearRect(0,0,cCanvas.width,cCanvas.height);
        cCtx.save(); cCtx.beginPath(); cCtx.arc(mx, my, 8, 0, Math.PI*2);
        cCtx.shadowColor='rgba(0,119,192,0.5)'; cCtx.shadowBlur=12; cCtx.fillStyle='rgba(0,119,192,0.4)'; cCtx.fill(); cCtx.restore();
        
        for(let i=cParts.length-1; i>=0; i--){
            let p = cParts[i];
            cCtx.save(); cCtx.globalAlpha = p.a; cCtx.beginPath(); cCtx.arc(p.x, p.y, p.r, 0, Math.PI*2);
            cCtx.fillStyle = p.c; cCtx.shadowColor = p.c; cCtx.shadowBlur = 8; cCtx.fill(); cCtx.restore();
            p.r *= 0.95; p.a *= 0.92; p.y -= 0.5+Math.random();
            if(p.a < 0.05) cParts.splice(i,1);
        }
        requestAnimationFrame(animCursor);
    }
    animCursor();
}

// Media Gallery Filter Logic
const filterBtns = document.querySelectorAll('.gallery-filter-btn');
const galleryItems = document.querySelectorAll('.gallery-item');

if (filterBtns.length > 0 && galleryItems.length > 0) {
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.classList.remove('bg-accent', 'text-secondary');
                b.classList.add('glass', 'text-muted');
            });
            btn.classList.add('bg-accent', 'text-secondary');
            btn.classList.remove('glass', 'text-muted');

            const filterValue = btn.getAttribute('data-filter');
            galleryItems.forEach(item => {
                if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
                    item.style.display = 'block';
                    setTimeout(() => item.style.opacity = '1', 50);
                } else {
                    item.style.opacity = '0';
                    setTimeout(() => item.style.display = 'none', 300);
                }
            });
        });
    });
}

// Three.js Background
const tCanvas = document.getElementById('three-canvas');
if(tCanvas && typeof THREE !== 'undefined') {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({canvas: tCanvas, alpha: true, antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const pCount = 800; // slightly reduced for performance
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(pCount*3);
    const cols = new Float32Array(pCount*3);

    for(let i=0; i<pCount*3; i+=3) {
        pos[i] = (Math.random()-0.5)*20; pos[i+1] = (Math.random()-0.5)*20; pos[i+2] = (Math.random()-0.5)*20;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    
    function updateColors(theme) {
        for(let i=0; i<pCount*3; i+=3) {
            if(theme === 'light'){ cols[i]=0/255; cols[i+1]=119/255; cols[i+2]=192/255; }
            else { cols[i]=0.3+Math.random()*0.4; cols[i+1]=0.6+Math.random()*0.4; cols[i+2]=1.0; }
        }
        geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    }
    updateColors(html.classList.contains('theme-dark') ? 'dark' : 'light');

    const mat = new THREE.PointsMaterial({size: 0.04, vertexColors: true, transparent: true, opacity: 0.6});
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    camera.position.z = 5;

    function animThree() {
        requestAnimationFrame(animThree);
        points.rotation.x += 0.0005; points.rotation.y += 0.001;
        renderer.render(scene, camera);
    }
    animThree();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    new MutationObserver(() => {
        updateColors(html.classList.contains('theme-dark') ? 'dark' : 'light');
    }).observe(html, {attributes:true, attributeFilter:['class']});
}
