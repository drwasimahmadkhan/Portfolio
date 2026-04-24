// Feature Carousel Logic
const features = [
    { icon: '🤖', title: 'Cognitive Agents', desc: 'Developing intelligent systems with affective intent and top-down attention mechanisms.', color: 'from-blue-500 to-cyan-500', stats: ['Q-Learning', 'Emotional Manipulation'] },
    { icon: '☁️', title: 'Cloud Robotics', desc: 'Task planning and knowledge processing in cloud-based robotic systems.', color: 'from-purple-500 to-pink-500', stats: ['Rapuyta Framework', 'Load Balancing', 'Attention Mechanism'] },
    { icon: '🗣️', title: 'Natural Language Processing', desc: 'Evolution towards Artificial General Intelligence (AGI) and Urdu text sentiment classification.', color: 'from-green-500 to-emerald-500', stats: ['Lexicon Based', 'Cyber Security'] }
];
let featIdx = 1;
function updateFeature(idx) {
    featIdx = idx;
    const featIcon = document.getElementById('feature-icon');
    if(featIcon) {
        featIcon.innerText = features[idx].icon;
        featIcon.className = `text-6xl md:text-8xl mb-6 bg-gradient-to-r ${features[idx].color} bg-clip-text text-transparent transition-all duration-300`;
        document.getElementById('feature-title').innerText = features[idx].title;
        document.getElementById('feature-desc').innerText = features[idx].desc;
        
        const statsHtml = features[idx].stats.map(s => `<div class="flex items-center space-x-3"><div class="w-2 h-2 bg-accent rounded-full animate-pulse"></div><span class="text-muted text-sm md:text-base">${s}</span></div>`).join('');
        document.getElementById('feature-stats').innerHTML = statsHtml;

        const dots = document.querySelectorAll('.feature-dot');
        dots.forEach((dot, i) => {
            if (i === idx) {
                dot.className = 'w-5 h-5 rounded-full border-2 bg-accent border-accent shadow-accent animate-glow feature-dot flex items-center justify-center transition-all';
                dot.innerHTML = '<span class="block w-2.5 h-2.5 rounded-full bg-white/90"></span>';
            } else {
                dot.className = 'w-5 h-5 rounded-full border-2 bg-glass border-muted hover:border-accent feature-dot flex items-center justify-center transition-all';
                dot.innerHTML = '<span class="block w-2.5 h-2.5 rounded-full bg-accent/30"></span>';
            }
        });
    }
}
setInterval(() => { updateFeature((featIdx + 1) % features.length); }, 4000);

// Video Sidebar Toggle (Fix applied)
const sidebar = document.getElementById('video-sidebar');
const sidebarToggleBtn = document.getElementById('video-sidebar-toggle');
const sidebarCloseBtn = document.getElementById('close-video-sidebar');

if(sidebarToggleBtn && sidebar) {
    sidebarToggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('translate-x-full');
    });
}
if(sidebarCloseBtn && sidebar) {
    sidebarCloseBtn.addEventListener('click', () => {
        sidebar.classList.add('translate-x-full');
    });
}

// Theme Management
const html = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

function setTheme(theme) {
    if (theme === 'dark') {
        html.classList.remove('theme-light');
        html.classList.add('theme-dark', 'dark');
        themeIcon.classList.remove('fa-moon', 'text-primary');
        themeIcon.classList.add('fa-sun', 'text-accent');
        localStorage.setItem('theme', 'dark');
    } else {
        html.classList.remove('theme-dark', 'dark');
        html.classList.add('theme-light');
        themeIcon.classList.remove('fa-sun', 'text-accent');
        themeIcon.classList.add('fa-moon', 'text-primary');
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

// Typewriter Effect
const professions = [' Computer Scientist', ' AI Researcher', ' Professor', ' ML Engineer'];
const typeTarget = document.getElementById('typewriter');
let profIdx = 0, charIdx = 0, isDeleting = false;
function typeWriter() {
    if(!typeTarget) return;
    const txt = professions[profIdx];
    if (!isDeleting && charIdx <= txt.length) {
        typeTarget.innerText = txt.substring(0, charIdx++);
        setTimeout(typeWriter, 50 + Math.random() * 50);
    } else if (isDeleting && charIdx >= 0) {
        typeTarget.innerText = txt.substring(0, charIdx--);
        setTimeout(typeWriter, 30);
    } else {
        isDeleting = !isDeleting;
        if (!isDeleting) { profIdx = (profIdx + 1) % professions.length; setTimeout(typeWriter, 500); }
        else setTimeout(typeWriter, 1500);
    }
}
setTimeout(typeWriter, 1000);

// GSAP Animations
if (typeof gsap !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    gsap.to("#hero-title", {opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: "back.out(1.2)", startAt: {y: 50, scale: 0.95}});
    gsap.to("#hero-subtitle", {opacity: 1, y: 0, duration: 0.8, delay: 0.4, ease: "back.out(1.2)", startAt: {y: 50, scale: 0.95}});
    gsap.to("#hero-cta", {opacity: 1, y: 0, duration: 0.8, delay: 0.6, ease: "back.out(1.5)", startAt: {y: 50, scale: 0.95}});
    
    gsap.utils.toArray('.gs-reveal').forEach(el => gsap.fromTo(el, {opacity:0, y:50}, {scrollTrigger:{trigger:el, start:"top 85%"}, opacity:1, y:0, duration:0.8, ease:"back.out(1.2)"}));
    gsap.utils.toArray('.gs-reveal-left').forEach(el => gsap.fromTo(el, {opacity:0, x:-50}, {scrollTrigger:{trigger:el, start:"top 85%"}, opacity:1, x:0, duration:0.8, ease:"back.out(1.2)"}));
    gsap.utils.toArray('.gs-reveal-right').forEach(el => gsap.fromTo(el, {opacity:0, x:50}, {scrollTrigger:{trigger:el, start:"top 85%"}, opacity:1, x:0, duration:0.8, ease:"back.out(1.2)"}));
    gsap.utils.toArray('.gs-reveal-up').forEach(el => gsap.fromTo(el, {opacity:0, y:50}, {scrollTrigger:{trigger:el, start:"top 90%"}, opacity:1, y:0, duration:0.6, ease:"back.out(1.2)"}));

    // 3D Hover effect for projects (Responsive handling)
    document.querySelectorAll('.project-card').forEach(card => {
        setTimeout(() => { card.style.transitionDelay = '0s'; }, 1000);
        card.addEventListener('mouseenter', () => {
            card.style.transform = window.innerWidth > 768 ? 'scale(1.12) rotateY(0deg)' : 'scale(1.05)';
            card.style.zIndex = '10';
            card.style.boxShadow = '0 8px 32px 0 rgba(79,195,247,0.18)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            const index = card.getAttribute('data-index');
            if(window.innerWidth > 768) {
                if (index === '0') { card.style.zIndex = '1'; }
                else if (index === '1') { card.style.zIndex = '2'; }
                else { card.style.zIndex = '1'; }
            }
            card.style.boxShadow = '0 8px 32px 0 rgba(79,195,247,0)';
        });
    });
}

// Cursor Particles
const cCanvas = document.getElementById('cursor-canvas');
if(cCanvas) {
    const cCtx = cCanvas.getContext('2d');
    const cParts = [];
    let mx = window.innerWidth/2, my = window.innerHeight/2;
    const P_COLORS = ['rgba(79,195,247,0.7)', 'rgba(245,0,87,0.6)', 'rgba(167,255,235,0.5)', 'rgba(255,255,255,0.7)'];
    
    window.addEventListener('resize', () => { cCanvas.width = window.innerWidth; cCanvas.height = window.innerHeight; });
    cCanvas.width = window.innerWidth; cCanvas.height = window.innerHeight;
    
    window.addEventListener('mousemove', (e) => {
        mx = e.clientX; my = e.clientY;
        cParts.push({x: mx, y: my, r: 7+Math.random()*6, c: P_COLORS[Math.floor(Math.random()*P_COLORS.length)], a: 1});
    });

    function animCursor() {
        cCtx.clearRect(0,0,cCanvas.width,cCanvas.height);
        cCtx.save(); cCtx.beginPath(); cCtx.arc(mx, my, 12, 0, Math.PI*2);
        cCtx.shadowColor='rgba(79,195,247,0.7)'; cCtx.shadowBlur=16; cCtx.fillStyle='rgba(79,195,247,0.7)'; cCtx.fill(); cCtx.restore();
        
        for(let i=cParts.length-1; i>=0; i--){
            let p = cParts[i];
            cCtx.save(); cCtx.globalAlpha = p.a; cCtx.beginPath(); cCtx.arc(p.x, p.y, p.r, 0, Math.PI*2);
            cCtx.fillStyle = p.c; cCtx.shadowColor = p.c; cCtx.shadowBlur = 12; cCtx.fill(); cCtx.restore();
            p.r *= 0.97; p.a *= 0.94; p.y -= 0.5+Math.random();
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
            // Update active button styling
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

    const pCount = 1000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(pCount*3);
    const cols = new Float32Array(pCount*3);

    for(let i=0; i<pCount*3; i+=3) {
        pos[i] = (Math.random()-0.5)*20; pos[i+1] = (Math.random()-0.5)*20; pos[i+2] = (Math.random()-0.5)*20;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    
    function updateColors(theme) {
        for(let i=0; i<pCount*3; i+=3) {
            if(theme === 'light'){ cols[i]=33/255; cols[i+1]=150/255; cols[i+2]=243/255; }
            else { cols[i]=0.3+Math.random()*0.7; cols[i+1]=0.8+Math.random()*0.2; cols[i+2]=1.0; }
        }
        geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    }
    updateColors(html.classList.contains('theme-dark') ? 'dark' : 'light');

    const mat = new THREE.PointsMaterial({size: 0.05, vertexColors: true, transparent: true, opacity: 0.8});
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    camera.position.z = 5;

    function animThree() {
        requestAnimationFrame(animThree);
        points.rotation.x += 0.001; points.rotation.y += 0.002;
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
