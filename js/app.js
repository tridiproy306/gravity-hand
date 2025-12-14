import { PhysicsEngine } from './physics.js';
import { HandTracker } from './handTracking.js';
import Matter from 'matter-js';

const { Engine, Runner, Composite } = Matter;

// DOM Elements
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('webcam');
const loadingOverlay = document.getElementById('loading');
const objectCountEl = document.getElementById('object-count');
const resetBtn = document.getElementById('reset-btn');
const debugBtn = document.getElementById('debug-btn');

// State
let physics;
let tracker;
let isDebug = false;

// Resize handling
function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    if (physics) physics.resize(canvas.width, canvas.height);
}
window.addEventListener('resize', resize);
resize();

// Init
async function init() {
    try {
        physics = new PhysicsEngine(canvas);
        tracker = new HandTracker(video);

        const runner = Runner.create();
        Runner.run(runner, physics.engine);

        await tracker.init();

        // Initial Spawns
        for (let i = 0; i < 5; i++) {
            physics.spawnCube(canvas.width / 2 + (Math.random() - 0.5) * 200, 100);
        }

        loadingOverlay.classList.add('hidden');
        requestAnimationFrame(loop);
    } catch (e) {
        console.error(e);
        document.querySelector('.loading-text').innerText = "ERROR: " + e.message;
    }
}

// Main Loop
function loop() {
    const results = tracker.detect();
    const handsInfo = tracker.getPinchInfo(results, canvas.width, canvas.height); // Now generic array

    // Reset hands activity? 
    // physics.hands.forEach(h => h.active = false); 
    // Logic: if hand not detected this frame, we should probably release grab?
    // But MediaPipe might flicker. For now let's just update detected ones.

    // 2. Logic
    // We Map retrieved hands to physics hands by index 0,1...
    // Note: MediaPipe order might swap. To do this robustly needs 'handedness' check.
    // For now we assume index stability.

    if (handsInfo && Array.isArray(handsInfo)) {
        handsInfo.forEach((info, index) => {
            if (info.detected) {
                const physicsX = (1 - (info.x / canvas.width)) * canvas.width;
                const physicsY = info.y;

                physics.updateHand(index, physicsX, physicsY, info.pinching);
            }
        });
    }

    // 3. Render
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Physics Objects
    drawPhysicsObjects(ctx);

    // Draw Hand Skeletons
    if (handsInfo && Array.isArray(handsInfo)) {
        handsInfo.forEach(info => {
            if (info.detected) {
                drawHand(ctx, info.landmarks);
            }
        });
    }

    // UI Updates
    objectCountEl.innerText = Composite.allBodies(physics.world).filter(b => b.label === 'Cube').length;

    requestAnimationFrame(loop);
}

function drawPhysicsObjects(ctx) {
    const bodies = Composite.allBodies(physics.world);

    // Draw Constraints (Springs) for all hands
    if (physics.hands) {
        physics.hands.forEach(hand => {
            if (hand.constraint) {
                const c = hand.constraint;
                const bodyA = c.bodyA;
                const bodyB = c.bodyB;
                if (bodyA && bodyB) {
                    ctx.beginPath();
                    ctx.moveTo(bodyA.position.x, bodyA.position.y);
                    ctx.lineTo(bodyB.position.x, bodyB.position.y);
                    ctx.lineWidth = 4;
                    ctx.strokeStyle = '#ccff00';
                    ctx.stroke();

                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#ccff00';
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }
            }
        });
    }

    bodies.forEach(body => {
        if (body.label === 'Wall') return;
        if (body.label === 'HandProxy') return;

        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);

        const w = body.bounds.max.x - body.bounds.min.x;
        const h = body.bounds.max.y - body.bounds.min.y;

        ctx.fillStyle = 'rgba(20, 20, 20, 0.8)';
        ctx.fillRect(-w / 2, -h / 2, w, h);

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#00f0ff';
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f0ff';
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        ctx.fillStyle = '#00f0ff';
        ctx.font = '10px monospace';
        ctx.fillText('BLK-' + body.id, -w / 2 + 5, -h / 2 + 15);

        ctx.restore();
    });
}

function drawHand(ctx, landmarks) {
    const points = landmarks.map(p => ({
        x: (1 - p.x) * canvas.width,
        y: p.y * canvas.height
    }));

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff003c';

    const connections = [
        [0, 1, 2, 3, 4],
        [0, 5, 6, 7, 8],
        [9, 10, 11, 12],
        [13, 14, 15, 16],
        [0, 17, 18, 19, 20],
        [5, 9, 13, 17]
    ];

    connections.forEach(chain => {
        ctx.beginPath();
        const start = points[chain[0]];
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < chain.length; i++) {
            const p = points[chain[i]];
            ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
    });

    ctx.fillStyle = '#fff';
    points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.shadowBlur = 0;
}

resetBtn.addEventListener('click', () => {
    physics.reset();
    for (let i = 0; i < 5; i++) {
        physics.spawnCube(canvas.width / 2 + (Math.random() - 0.5) * 200, 100);
    }
});

debugBtn.addEventListener('click', () => {
    isDebug = !isDebug;
});

init();
