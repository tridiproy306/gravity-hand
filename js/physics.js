import Matter from 'matter-js';

const { Engine, Render, Runner, World, Bodies, Composite, Events, MouseConstraint, Mouse, Constraint, Body, Vector } = Matter;

export class PhysicsEngine {
    constructor(canvas) {
        this.engine = Engine.create();
        this.world = this.engine.world;

        this.engine.gravity.y = 1;

        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Walls
        this.createBoundaries();

        // Hand Proxies (Multi-hand support)
        this.hands = [];
        // Create 2 hand proxies (index 0 and 1)
        for (let i = 0; i < 2; i++) {
            const body = Bodies.circle(0, 0, 10, {
                isStatic: true,
                isSensor: true,
                render: { visible: false },
                label: 'HandProxy'
            });
            World.add(this.world, body);
            this.hands.push({
                body: body,
                heldObject: null,
                constraint: null,
                active: false
            });
        }
    }

    createBoundaries() {
        const wallOptions = {
            isStatic: true,
            render: { fillStyle: '#333' },
            friction: 1,
            restitution: 0.5
        };
        const floorOptions = {
            isStatic: true,
            render: { fillStyle: '#333' },
            friction: 1,
            restitution: 0.1
        };

        Composite.allBodies(this.world).forEach(body => {
            if (body.label === 'Wall') World.remove(this.world, body);
        });

        const thick = 100;
        this.walls = [
            Bodies.rectangle(this.width / 2, this.height + thick / 2 - 10, this.width, thick, { ...floorOptions, label: 'Wall' }),
            Bodies.rectangle(-thick / 2, this.height / 2, thick, this.height * 2, { ...wallOptions, label: 'Wall' }),
            Bodies.rectangle(this.width + thick / 2, this.height / 2, thick, this.height * 2, { ...wallOptions, label: 'Wall' })
        ];

        World.add(this.world, this.walls);
    }

    spawnCube(x, y) {
        const size = 60 + Math.random() * 40;
        const body = Bodies.rectangle(x, y, size, size, {
            chamfer: { radius: 10 },
            friction: 0.9,
            frictionAir: 0.01,
            restitution: 0.4,
            density: 0.002,
            render: {
                fillStyle: 'transparent',
                strokeStyle: '#ccff00',
                lineWidth: 2
            },
            label: 'Cube'
        });
        World.add(this.world, body);
        return body;
    }

    updateHand(index, x, y, isPinching) {
        if (index >= this.hands.length) return;
        const hand = this.hands[index];
        hand.active = true;

        Body.setPosition(hand.body, { x, y });

        if (hand.heldObject) {
            Body.setAngularVelocity(hand.heldObject, hand.heldObject.angularVelocity * 0.9);
        }

        if (isPinching) {
            this.tryGrab(hand);
        } else {
            this.releaseGrab(hand);
        }
    }

    tryGrab(hand) {
        if (hand.heldObject) return;

        // Find bodies near hand
        const bodies = Composite.allBodies(this.world).filter(b => b.label === 'Cube');
        const nearby = bodies.filter(b => {
            const d = Vector.magnitude(Vector.sub(b.position, hand.body.position));
            return d < 100; // Grab radius
        });

        if (nearby.length > 0) {
            // Pick closest
            nearby.sort((a, b) => {
                const da = Vector.magnitude(Vector.sub(a.position, hand.body.position));
                const db = Vector.magnitude(Vector.sub(b.position, hand.body.position));
                return da - db;
            });
            const target = nearby[0];

            hand.heldObject = target;

            // Create soft spring constraint
            hand.constraint = Constraint.create({
                bodyA: hand.body,
                bodyB: target,
                stiffness: 0.2,
                damping: 0.05,
                length: 0,
                render: {
                    visible: true,
                    strokeStyle: '#ccff00',
                    lineWidth: 2
                }
            });
            World.add(this.world, hand.constraint);
        }
    }

    releaseGrab(hand) {
        if (hand.constraint) {
            World.remove(this.world, hand.constraint);
            hand.constraint = null;
            hand.heldObject = null;
        }
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.createBoundaries();
    }

    reset() {
        const bodies = Composite.allBodies(this.world).filter(b => b.label === 'Cube');
        bodies.forEach(b => World.remove(this.world, b));
    }
}
