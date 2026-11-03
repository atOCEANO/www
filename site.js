const SEED = Math.floor(Math.random() * 4294967296);

const VIEWS = { "#tools": "tools", "#guidelines": "guidelines" };

const TITLES = {
    home: "OCE\u039bNO",
    tools: "Tools | OCE\u039bNO",
    guidelines: "Guidelines | OCE\u039bNO",
};

const root = document.documentElement;
const brand = document.querySelector(".brand");
const backdrop = document.querySelector(".backdrop");


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


function drawBeam() {
    const width = backdrop.clientWidth;
    const height = backdrop.clientHeight;
    if (width === 0 || height === 0) {
        return;
    }
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    backdrop.width = Math.round(width * ratio);
    backdrop.height = Math.round(height * ratio);
    const context = backdrop.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

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

    const view = document.querySelector(".view." + current());
    const [from, rise, ink] = view.dataset.beam.split(" ").map(Number);
    const span = 160;
    const points = Math.max(104, Math.min(span, Math.round(width / 7)));
    const strokes = Math.max(20, Math.min(26, Math.round(width / 55)));
    const middle = (strokes - 1) / 2;
    const fanout = 0.32 * 25 / (strokes - 1);
    const alpha = ink * 26 / strokes;
    const side = Math.min(width, height);

    context.lineWidth = 0.7;
    for (let path = 0; path < 9; path++) {
        const head = (40 + path * 811) % (walk.length - span - 2);
        context.strokeStyle = "rgba(230, 237, 243, " + (weights[path] * alpha).toFixed(4) + ")";
        for (let stroke = 0; stroke < strokes; stroke++) {
            context.beginPath();
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
                    context.moveTo(x, y);
                } else {
                    context.lineTo(x, y);
                }
            }
            context.stroke();
        }
    }
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

show(false);
