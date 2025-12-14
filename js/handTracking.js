import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export class HandTracker {
    constructor(videoElement) {
        this.video = videoElement;
        this.landmarker = null;
        this.lastVideoTime = -1;
        this.results = null;
    }

    async init() {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );

        this.landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2
        });

        await this.startCamera();
    }

    async startCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Browser API navigator.mediaDevices.getUserMedia not available");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 1280,
                height: 720
            }
        });

        this.video.srcObject = stream;

        return new Promise((resolve) => {
            this.video.addEventListener("loadeddata", () => {
                resolve();
            });
        });
    }

    detect() {
        if (!this.landmarker) return null;

        let nowInMs = Date.now();
        if (this.video.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = this.video.currentTime;
            this.results = this.landmarker.detectForVideo(this.video, nowInMs);
        }

        return this.results;
    }

    getPinchInfo(results, canvasWidth, canvasHeight) {
        if (!results || !results.landmarks || results.landmarks.length === 0) {
            return [];
        }

        return results.landmarks.map(landmarks => {
            const index = landmarks[8];
            const thumb = landmarks[4];

            const distance = Math.sqrt(
                Math.pow(index.x - thumb.x, 2) +
                Math.pow(index.y - thumb.y, 2)
            );

            const x = (index.x + thumb.x) / 2 * canvasWidth;
            const y = (index.y + thumb.y) / 2 * canvasHeight;

            return {
                detected: true,
                x: x,
                y: y,
                pinching: distance < 0.05,
                landmarks: landmarks,
                distance: distance
            };
        });
    }
}
