const SEED = Math.floor(Math.random() * 4294967296);

const GROUND = [7, 13, 19];
const INK = [230, 237, 243];

const SWELL = 16;
const SWAY = 0.02;
const GLOW = 0.1;
const STOPS = [0, 0.01, 0.02, 0.04, 0.06, 0.09, 0.13, 0.18, 0.25, 0.35, 0.5, 0.7, 1];

const VIEWS = { "#tools": "tools", "#guidelines": "guidelines" };

const TITLES = {
    home: "OCE\u039bNO",
    tools: "Tools | OCE\u039bNO",
    guidelines: "Guidelines | OCE\u039bNO",
};

const root = document.documentElement;
const brand = document.querySelector(".brand");
const backdrop = document.querySelector(".backdrop");
const context = backdrop.getContext("2d");
const still = window.matchMedia("(prefers-reduced-motion: reduce)");

const [walk, weights] = makeWalks();
const order = [...weights.keys()].sort((a, b) => weights[a] - weights[b]);
let beam = null;
let time = 0;
let lag = 0;


function current() {
    return VIEWS[location.hash] || "home";
}


function random(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}


function makeWalks() {
    const next = random(SEED);
    const walk = new Float32Array(9000);
    let drift = 0;
    let level = 0;
    for (let i = 0; i < walk.length; i++) {
        drift = drift * 0.94 + (next() - 0.5) * 0.9;
        level += drift;
        walk[i] = level;
    }
    const weights = [];
    for (let path = 0; path < 9; path++) {
        weights.push(0.16 + next() * 0.16);
    }
    return [walk, weights];
}


function solid(strength) {
    const channels = GROUND.map((ground, i) => ground + strength * (INK[i] - ground));
    return "rgb(" + channels.map(Math.round).join(", ") + ")";
}


function traceBeam(width, height) {
    const view = document.querySelector(".view." + current());
    const [from, rise, ink] = view.dataset.beam.split(" ").map(Number);
    const span = 160;
    const points = Math.max(104, Math.min(span, Math.round(width / 7)));
    const strokes = Math.max(20, Math.min(26, Math.round(width / 55)));
    const middle = (strokes - 1) / 2;
    const fanout = 0.32 * 25 / (strokes - 1);
    const alpha = ink * 26 / strokes;
    const side = Math.min(width, height);

    return order.map((path) => {
        const head = (40 + path * 811) % (walk.length - span - 2);
        const tail = weights[path] * alpha;
        const shade = context.createLinearGradient(0, 0, width * 1.02, 0);
        for (const stop of STOPS) {
            const glow = 1 / (1 + (stop / GLOW) ** 2);
            shade.addColorStop(stop, solid(tail + (1 - tail) * glow));
        }
        const lines = new Path2D();
        for (let stroke = 0; stroke < strokes; stroke++) {
            for (let j = 0; j <= points; j++) {
                const f = j / points;
                const position = head + f * span;
                const k = Math.floor(position);
                const value = walk[k] + (walk[k + 1] - walk[k]) * (position - k)
                    - walk[head];
                const x = f * width * 1.02;
                const y = height * from - f * height * rise
                    + value * f * (3 + stroke * fanout) * side / 900
                    + (stroke - middle) / middle * f * f * 0.047 * side
                    + Math.sin(j * 1.7 + stroke) * f * 5;
                if (j === 0) {
                    lines.moveTo(x, y);
                } else {
                    lines.lineTo(x, y);
                }
            }
        }
        return { path, shade, lines };
    });
}


function drawBeam() {
    const width = backdrop.clientWidth;
    const height = backdrop.clientHeight;
    if (width === 0 || height === 0) {
        return;
    }
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const across = Math.round(width * ratio);
    const down = Math.round(height * ratio);
    if (backdrop.width !== across || backdrop.height !== down) {
        backdrop.width = across;
        backdrop.height = down;
    }
    const key = [width, height, current()].join(" ");
    if (beam === null || beam.key !== key) {
        beam = { key, walks: traceBeam(width, height) };
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.lineWidth = 0.7;
    const reach = SWAY * Math.min(width, height) / width;
    for (const { path, shade, lines } of beam.walks) {
        const tilt = reach * Math.sin(2 * Math.PI * time / SWELL + path);
        context.setTransform(ratio, ratio * tilt, 0, ratio, 0, 0);
        context.strokeStyle = shade;
        context.stroke(lines);
    }
}


function animate(now) {
    if (still.matches || lag > 9) {
        return;
    }
    const gap = now - time * 1000;
    if (gap >= 30) {
        lag = gap > 50 && gap < 1000 ? lag + 1 : 0;
        time = now / 1000;
        drawBeam();
    }
    requestAnimationFrame(animate);
}


function show(arrived) {
    const view = current();
    root.dataset.view = view;
    document.title = TITLES[view];
    brand.toggleAttribute("aria-current", view === "home");
    for (const link of document.querySelectorAll(".nav a")) {
        if (VIEWS[link.hash] === view) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    }
    drawBeam();
    if (arrived) {
        window.scrollTo(0, 0);
        document.querySelector(".view." + view + " h1").focus({ preventScroll: true });
    }
}


document.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (link === null || event.button !== 0
            || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
    }
    let view;
    let address;
    if (link === brand) {
        view = "home";
        address = location.pathname + location.search;
    } else if (link.hash in VIEWS && link.pathname === location.pathname) {
        view = VIEWS[link.hash];
        address = link.hash;
    } else {
        return;
    }
    event.preventDefault();
    if (view !== current()) {
        history.pushState(null, "", address);
    }
    show(true);
});

window.addEventListener("popstate", () => show(false));
window.addEventListener("hashchange", () => show(false));
new ResizeObserver(drawBeam).observe(backdrop);
still.addEventListener("change", () => requestAnimationFrame(animate));

show(false);
requestAnimationFrame(animate);
