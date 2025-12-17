// This file contains ALL the original JavaScript logic.
// No features were removed.


        // --- Guide Control Logic ---
        const guideOverlay = document.getElementById('guide-overlay');
        const startButton = document.getElementById('start-button');
        const guideToggleButton = document.getElementById('guide-toggle-button');
        const gestureGuidePanel = document.getElementById('gesture-guide-panel');
        const particleSpeedSlider = document.getElementById('particle-speed-slider');
        const speedValueDisplay = document.getElementById('speed-value');
        const visualizationToggleButton = document.getElementById('visualization-toggle-button');
        
        // --- Configuration ---
        const PARTICLE_COUNT = 50000; // REDUCED PARTICLES
        const SHAPE_TYPES = ['Cube', 'Sphere', 'Planet_1', 'Green_Planet', 'Orange_Planet', 'Saturn', 'Torus']; 
        const DEFAULT_EXPANSION = 1.0; 
        const DEFAULT_CAMERA_Z = 5;
        const MIN_CAMERA_Z = 1;
        const MAX_CAMERA_Z = 15;
        const NUM_TEMPLATES = 4;
        const switchCooldown = 1.0; 
        const resetCooldown = 3.0;
        const hyperModeCooldown = 5.0; // Cooldown for hyper mode activation
        const TWO_FISTS_CLOSE_THRESHOLD = 0.2; // Normalized distance (0 to 1)

        // --- Global State ---
        let handGestureData = {
            position: new THREE.Vector3(0, 0, 0),
            pinchDistance: 0,
            gestureType: 'None',
            isPinching: false,
            isVictory: false,
            isLShape: false,
            isPinkyOut: false,
            isThumbsUp: false,
            isFist: false,
            isPointing: false, 
            isOpenPalm: true,
            twoHandDistance: 0,
            isTwoThumbsUp: false,
            isTwoFistsClose: false, // NEW STATE FOR GESTURE
            numHands: 0
        };
        let planetGeometries = {}; 
        let arePlanetsVisible = true; 
        let isRotating = false; 
        let isDynamicMode = false;
        let isWireframeMode = false; 
        let isHyperMode = false; // NEW STATE FOR FEATURE
        let currentTemplateID = 0;
        let particleSpeedFactor = 1.0; // NEW: Particle speed multiplier from slider
        let currentShapeID = 0; 
        let isVisualizationPlaying = true; // NEW: Track visualization pause/play state
        
        let lastTemplateSwitchTime = 0;
        let lastShapeSwitchTime = 0; 
        let lastModeSwitchTime = 0; 
        let lastPlanetToggleTime = 0;
        let lastRotationToggleTime = 0; 
        let lastWireframeToggleTime = 0; 
        let lastResetTime = 0;
        let lastHyperModeToggleTime = 0; // NEW COOLDOWN

        let initialTwoHandDistance = 0;
        let initialCameraZ = DEFAULT_CAMERA_Z;

        const infoBox = document.getElementById('info-box');

        // --- Main Three.js Setup ---
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        const ambientLight = new THREE.AmbientLight(0x404040, 5); 
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        camera.position.z = DEFAULT_CAMERA_Z;
        
        // --- 3D Gesture Guide Setup (omitted for brevity) ---
        let guideScene, guideCamera, guideRenderer, guideHandSpheres = [], guideBones = [];
        const GESTURE_CYCLE_TIME = 3.0;
        let guideAnimationTimer = 0;
        
        let gestureGuideState = {
            currentGestureIndex: 0,
            targetLandmarks: null 
        };

        const GESTURE_NAMES = ['L_Shape', 'Pinch', 'Victory_Sign', 'Pinky_Out', 'Pointing', 'Thumbs_Up', 'Fist', 'Open_Palm']; 

        function getGestureLandmarks(name) {
            const palm = [
                // Wrist (0)
                [0.0, 0.0, 0.0],
                // Thumb
                [-0.05, 0.05, 0.0], [-0.1, 0.05, 0.0],  [-0.15, 0.05, 0.0], [-0.18, 0.15, 0.0], // 4 Tip
                // Index
                [-0.05, 0.1, 0.0], [-0.05, 0.2, 0.0], [-0.05, 0.3, 0.0], [-0.05, 0.4, 0.0], // 8 Tip
                // Middle
                [0.0, 0.1, 0.0], [0.0, 0.2, 0.0], [0.0, 0.3, 0.0], [0.0, 0.4, 0.0], // 12 Tip
                // Ring
                [0.05, 0.1, 0.0], [0.05, 0.2, 0.0], [0.05, 0.3, 0.0], [0.05, 0.4, 0.0], // 16 Tip
                // Pinky
                [0.1, 0.05, 0.0], [0.1, 0.1, 0.0], [0.1, 0.15, 0.0], [0.1, 0.2, 0.0]  // 20 Tip
            ];

            let landmarks = JSON.parse(JSON.stringify(palm)); 

            switch (name) {
                case 'Pinch':
                    landmarks[4] = landmarks[8].map( (val, i) => val * 0.7 + landmarks[4][i] * 0.3 );
                    break;
                case 'Pointing': 
                    for(let i = 9; i <= 20; i++) {
                        landmarks[i][1] = landmarks[i][1] * 0.2; 
                        landmarks[i][2] = Math.random() * 0.05; 
                    }
                    landmarks[4] = landmarks[2].map( (val, i) => (val * 0.5 + landmarks[4][i] * 0.5) );
                    break;
                case 'Fist':
                    for(let i = 5; i <= 20; i++) {
                        landmarks[i][1] = landmarks[i][1] * 0.2; 
                        landmarks[i][2] = Math.random() * 0.05; 
                    }
                    landmarks[4] = landmarks[2].map( (val, i) => (val * 0.5 + landmarks[4][i] * 0.5) );
                    break;
                case 'Thumbs_Up':
                    for(let i = 5; i <= 20; i++) {
                        landmarks[i][1] = landmarks[i][1] * 0.2; 
                        landmarks[i][2] = Math.random() * 0.05; 
                    }
                    landmarks[4][1] = 0.3;
                    landmarks[4][0] = -0.1;
                    break;
                case 'Victory_Sign':
                    for(let i = 9; i <= 16; i++) {
                        landmarks[i][1] = landmarks[i][1] * 0.2; 
                        landmarks[i][2] = Math.random() * 0.05;
                    }
                    break;
                case 'Pinky_Out':
                    for(let i = 5; i <= 16; i++) {
                        landmarks[i][1] = landmarks[i][1] * 0.2; 
                        landmarks[i][2] = Math.random() * 0.05; 
                    }
                    break;
                case 'L_Shape':
                    for(let i = 9; i <= 20; i++) {
                        landmarks[i][1] = landmarks[i][1] * 0.2; 
                        landmarks[i][2] = Math.random() * 0.05;
                    }
                    break;
            }
            return landmarks;
        }

        function createHandModel() {
            const sphereMaterial = new THREE.MeshPhongMaterial({ color: 0x4CAF50, emissive: 0x113311 });
            const boneMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
            const sphereGeometry = new THREE.SphereGeometry(0.012, 16, 16);

            for (let i = 0; i < 21; i++) {
                const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                guideScene.add(sphere);
                guideHandSpheres.push(sphere);
            }

            const connections = [
                [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], 
                [9, 10], [10, 11], [11, 12], [13, 14], [14, 15], [15, 16],   
                [17, 18], [18, 19], [19, 20], [5, 9], [9, 13], [13, 17], [0, 9] 
            ];

            connections.forEach(([start, end]) => {
                const geometry = new THREE.BufferGeometry();
                const line = new THREE.Line(geometry, boneMaterial);
                guideScene.add(line);
                guideBones.push({ line, start: start, end: end });
            });
            
            updateHandModel(getGestureLandmarks('Open_Palm'), 1.0);
        }

        function updateHandModel(targetLandmarks, alpha) {
            guideHandSpheres.forEach((sphere, i) => {
                const targetPos = new THREE.Vector3(
                    targetLandmarks[i][0],
                    targetLandmarks[i][1],
                    targetLandmarks[i][2]
                );
                
                sphere.position.lerp(targetPos, alpha);
            });

            guideBones.forEach(bone => {
                const startPos = guideHandSpheres[bone.start].position;
                const endPos = guideHandSpheres[bone.end].position;

                const positions = new Float32Array(6);
                positions[0] = startPos.x;
                positions[1] = startPos.y;
                positions[2] = startPos.z;
                positions[3] = endPos.x;
                positions[4] = endPos.y;
                positions[5] = endPos.z;

                bone.line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                bone.line.geometry.attributes.position.needsUpdate = true;
            });
        }
        
        function setupGestureGuide3D() {
            const canvas = document.getElementById('gesture-canvas');
            const WIDTH = 250; 
            const HEIGHT = 250;
            
            guideRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
            guideRenderer.setSize(WIDTH, HEIGHT);
            
            guideScene = new THREE.Scene();
            guideCamera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 10);
            
            guideCamera.position.set(0, 0.15, 0.5); 
            guideCamera.lookAt(0, 0.15, 0);

            const guideLight = new THREE.DirectionalLight(0xffffff, 3);
            guideLight.position.set(1, 2, 1);
            guideScene.add(guideLight);
            guideScene.add(new THREE.AmbientLight(0xffffff, 1));
            
            createHandModel();

            gestureGuidePanel.querySelector('h3').textContent = `Gesture Reference: ${GESTURE_NAMES[0].replace(/_/g, ' ')}`;
            gestureGuideState.targetLandmarks = getGestureLandmarks(GESTURE_NAMES[0]);
        }
        
        let lastGuideTime = 0;
        let lastGestureName = GESTURE_NAMES[0];

        function animateGestureModel(time) {
            const deltaTime = time * 0.001;
            const dt = deltaTime - lastGuideTime;
            lastGuideTime = deltaTime;

            if (guideRenderer && gestureGuideState.targetLandmarks) {
                
                guideAnimationTimer += dt;
                
                guideScene.rotation.y += 0.005; 
                guideScene.rotation.z = Math.sin(deltaTime * 0.5) * 0.05;

                if (guideAnimationTimer >= GESTURE_CYCLE_TIME) {
                    gestureGuideState.currentGestureIndex = (gestureGuideState.currentGestureIndex + 1) % GESTURE_NAMES.length;
                    lastGestureName = GESTURE_NAMES[gestureGuideState.currentGestureIndex];
                    gestureGuideState.targetLandmarks = getGestureLandmarks(lastGestureName);
                    guideAnimationTimer = 0;
                    
                    gestureGuidePanel.querySelector('h3').textContent = `Gesture Reference: ${lastGestureName.replace(/_/g, ' ')}`;
                }

                const transitionAlpha = dt * 10; 
                updateHandModel(gestureGuideState.targetLandmarks, transitionAlpha);

                guideRenderer.render(guideScene, guideCamera);
            }
        }
        
        // --- Planet System Initialization (omitted for brevity) ---
        let planets = [];
        let planetRings = []; 
        
        function createPlanets() {
            const planetData = [
                { id: 'Planet_1', size: 4.0, color: 0xaa55ff, orbitRadius: 10, speed: 0.15 }, 
                { id: 'Green_Planet', size: 0.8, color: 0x55ffaa, orbitRadius: 15, speed: 0.08 }, 
                { id: 'Orange_Planet', size: 0.3, color: 0xffaa55, orbitRadius: 7, speed: 0.25 },
                { id: 'Saturn', size: 2.0, color: 0xf5e8c7, orbitRadius: 20, speed: 0.05, hasRings: true } 
            ];

            planetData.forEach((data, index) => {
                const geometry = new THREE.SphereGeometry(data.size, 32, 32);
                planetGeometries[data.id] = geometry;

                const material = new THREE.MeshStandardMaterial({ 
                    color: data.color, 
                    metalness: 0.3, 
                    roughness: 0.5 
                });
                const mesh = new THREE.Mesh(geometry, material);
                
                mesh.userData = { 
                    orbitRadius: data.orbitRadius, 
                    orbitSpeed: data.speed,
                    initialAngle: index * Math.PI / 2.5 
                };
                scene.add(mesh);
                planets.push(mesh);

                if (data.hasRings) {
                    const ringGeometry = new THREE.RingGeometry(data.size * 1.2, data.size * 2.0, 64);
                    const ringMaterial = new THREE.MeshStandardMaterial({ 
                        color: 0x888888, 
                        side: THREE.DoubleSide, 
                        metalness: 0.8, 
                        roughness: 0.2 
                    });
                    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
                    
                    ringMesh.rotation.x = Math.PI / 2; 
                    ringMesh.rotation.y = Math.PI / 6; 
                    ringMesh.userData = mesh.userData; 
                    
                    scene.add(ringMesh);
                    planetRings.push(ringMesh);
                }
            });
        }
        createPlanets();
        
        // --- Particle System Shaders ---
        const vertexShader = `
            attribute float size;
            attribute vec3 initialPosition;
            uniform float uTime;
            uniform float uExpansionFactor;
            uniform vec3 uHandPosition;
            uniform float uTemplateID;
            uniform float uSpeedFactor; 
            uniform float uIsDynamicMode; 
            uniform float uIsPulsing; 
            uniform float uIsHyperMode; // NEW UNIFORM
            varying vec3 vColor;
            
            mat3 rotationMatrix(vec3 axis, float angle) {
                axis = normalize(axis);
                float s = sin(angle);
                float c = cos(angle);
                float oc = 1.0 - c;
                
                return mat3(
                    axis.x * axis.x * oc + c,           axis.x * axis.y * oc - axis.z * s,  axis.x * axis.z * oc + axis.y * s,
                    axis.y * axis.x * oc + axis.z * s,  axis.y * axis.y * oc + c,           axis.y * axis.z * oc - axis.x * s,
                    axis.z * axis.x * oc - axis.y * s,  axis.z * axis.y * oc + axis.x * s,  axis.z * axis.z * oc + c
                );
            }

            vec3 hslToRgb(float h, float s, float l) {
                vec3 rgb = clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
                return l + s * (rgb - 0.5)*(1.0-abs(2.0*l-1.0));
            }

            void main() {
                vec4 p = vec4(initialPosition, 1.0);
                vec3 finalPosition = p.xyz;
                
                // 1. Base Expansion / Movement
                vec3 expandedPosition = p.xyz * (1.0 + uExpansionFactor * 0.5 * sin(uTime * 0.2 + p.x)); 
                
                // NEW: Apply a dramatic pulse movement if in hyper mode
                if (uIsHyperMode > 0.5) {
                    float hyperFactor = sin(uTime * 5.0) * 0.1 + 0.05;
                    expandedPosition += normalize(p.xyz) * hyperFactor * 5.0;
                }

                // 2. Vortex Effect (Template 3)
                if (uTemplateID > 2.5) { 
                    float twistAmount = sin(length(p.xyz) * 0.5 + uTime * 0.5 * uSpeedFactor) * 0.5;
                    mat3 rot = rotationMatrix(vec3(0.0, 1.0, 0.0), twistAmount);
                    expandedPosition = rot * expandedPosition;
                }
                
                finalPosition = expandedPosition;

                // 3. Calculate Force
                vec3 toHand = uHandPosition - finalPosition;
                float distanceToHand = length(toHand);
                
                float strength = smoothstep(0.0, 3.0, 1.0 / (distanceToHand * distanceToHand + 0.5)) * 1.5; 
                float forceDirection = uIsDynamicMode > 0.5 ? 1.0 : -1.0; 
                
                // Apply force
                if (uTemplateID < 2.5) {
                    finalPosition += (normalize(toHand) * strength * forceDirection);
                } else {
                    finalPosition += (normalize(cross(p.xyz, toHand)) * strength * 0.5 * uSpeedFactor); 
                }

                
                vec4 modelViewPosition = modelViewMatrix * vec4(finalPosition, 1.0);
                
                float sizeMultiplier = uIsDynamicMode > 0.5 ? 1.5 : 1.0;
                gl_PointSize = size * sizeMultiplier * (20.0 / -modelViewPosition.z);
                
                // 4. Color Change: Template logic
                vec3 baseColor;
                float t = clamp(distanceToHand / 7.0, 0.0, 1.0); 

                if (uIsHyperMode > 0.5) {
                    // Hyper Mode: Fast, chaotic rainbow/pulse color
                    float hue = mod(uTime * 2.0 + p.x * 0.5 + p.y * 0.5, 1.0);
                    baseColor = hslToRgb(hue, 1.0, 0.7);
                }
                else if (uIsPulsing > 0.5) {
                    float hue = mod(uTime * 0.05 + distanceToHand * 0.05, 1.0);
                    baseColor = hslToRgb(hue, 1.0, 0.5);
                }
                else if (uTemplateID < 0.5) { 
                    baseColor = mix(vec3(0.1, 0.5, 1.0), vec3(1.0, 0.2, 0.1), t);
                } else if (uTemplateID < 1.5) { 
                    baseColor = mix(vec3(0.1, 1.0, 0.5), vec3(1.0, 1.0, 0.1), t);
                } else if (uTemplateID < 2.5) { 
                    baseColor = mix(vec3(0.1, 0.1, 0.1), vec3(0.8, 0.8, 0.8), t);
                } else { 
                    baseColor = mix(vec3(1.0, 0.5, 0.8), vec3(0.5, 0.8, 1.0), t);
                }

                vColor = baseColor;

                gl_Position = projectionMatrix * modelViewPosition;
            }
        `;

        const fragmentShader = `
            uniform sampler2D uTexture;
            uniform float uTemplateID;
            uniform float uIsDynamicMode; 
            varying vec3 vColor;
            
            void main() {
                float r = length(gl_PointCoord - 0.5); 
                if (r > 0.5) discard; 
                float alpha = smoothstep(0.5, 0.45, r);
                
                float opacityMultiplier = uIsDynamicMode > 0.5 ? 1.5 : 1.0; 
                alpha *= opacityMultiplier;

                if (uTemplateID > 3.5) {
                    alpha *= (sin(r * 10.0 + uTemplateID) * 0.2 + 0.8); 
                    gl_FragColor = vec4(vColor * 1.5, alpha); 
                } else {
                    gl_FragColor = vec4(vColor, alpha);
                }
            }
        `;

        // --- Particle Reset Function (omitted for brevity) ---
        function resetParticles(geometry, shapeIndex) {
            const initialPositions = new Float32Array(PARTICLE_COUNT * 3);
            const radius = 5;
            const majorRadius = 4.0;
            const minorRadius = 1.0;
            const shapeName = SHAPE_TYPES[shapeIndex];
            let targetPlanetGeometry = null;
            let planetVertices = null;
            let numPlanetVertices = 0;

            if (planetGeometries[shapeName]) {
                targetPlanetGeometry = planetGeometries[shapeName];
                if (targetPlanetGeometry.attributes.position) {
                    planetVertices = targetPlanetGeometry.attributes.position.array;
                    numPlanetVertices = planetVertices.length / 3;
                }
            }

            for (let i = 0; i < PARTICLE_COUNT; i++) {
                let x, y, z;
                const i3 = i * 3;

                if (shapeName === 'Cube') { 
                    x = (Math.random() - 0.5) * 10;
                    y = (Math.random() - 0.5) * 10;
                    z = (Math.random() - 0.5) * 10;
                } else if (shapeName === 'Sphere') { 
                    const r = Math.pow(Math.random(), 1/3) * radius; 
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(Math.random() * 2 - 1);
                    x = r * Math.sin(phi) * Math.cos(theta);
                    y = r * Math.sin(phi) * Math.sin(theta);
                    z = r * Math.cos(phi);
                } else if (shapeName === 'Torus') { 
                    const u = Math.random() * Math.PI * 2;
                    const v = Math.random() * Math.PI * 2;
                    
                    const majorFactor = majorRadius + minorRadius * Math.cos(v);
                    x = majorFactor * Math.cos(u);
                    y = minorRadius * Math.sin(v);
                    z = majorFactor * Math.sin(u);
                } else if (targetPlanetGeometry && numPlanetVertices > 0) { 
                    const vertexIndex = i % numPlanetVertices;
                    const vIndex3 = vertexIndex * 3;

                    x = planetVertices[vIndex3 + 0];
                    y = planetVertices[vIndex3 + 1];
                    z = planetVertices[vIndex3 + 2];
                }
                else {
                    x = (Math.random() - 0.5) * 10;
                    y = (Math.random() - 0.5) * 10;
                    z = (Math.random() - 0.5) * 10;
                }

                initialPositions[i3 + 0] = x;
                initialPositions[i3 + 1] = y;
                initialPositions[i3 + 2] = z;
            }

            const initialPosAttribute = geometry.getAttribute('initialPosition');
            initialPosAttribute.copyArray(initialPositions);
            initialPosAttribute.needsUpdate = true;
            
            const positionAttribute = geometry.getAttribute('position');
            positionAttribute.copyArray(initialPositions);
            positionAttribute.needsUpdate = true;
        }
        
        // --- Particle System Initialization ---
        function createParticleSystem() {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(PARTICLE_COUNT * 3);
            const initialPositions = new Float32Array(PARTICLE_COUNT * 3);
            const sizes = new Float32Array(PARTICLE_COUNT);
            
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                initialPositions[i * 3 + 0] = (Math.random() - 0.5) * 10;
                initialPositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
                initialPositions[i * 3 + 2] = (Math.random() - 0.5) * 10;

                positions[i * 3 + 0] = initialPositions[i * 3 + 0];
                positions[i * 3 + 1] = initialPositions[i * 3 + 1];
                positions[i * 3 + 2] = initialPositions[i * 3 + 2];
                
                sizes[i] = Math.random() * 0.8 + 0.1;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('initialPosition', new THREE.BufferAttribute(initialPositions, 3));
            geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

            const material = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uTexture: { value: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/disc.png') }, 
                    uExpansionFactor: { value: DEFAULT_EXPANSION },
                    uHandPosition: { value: new THREE.Vector3(0, 0, 0) },
                    uTemplateID: { value: 0.0 },
                    uSpeedFactor: { value: 1.0 }, 
                    uIsDynamicMode: { value: 0.0 },
                    uIsPulsing: { value: 0.0 },
                    uIsHyperMode: { value: 0.0 } // NEW UNIFORM
                },
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                transparent: true,
                depthTest: false,
                blending: THREE.AdditiveBlending 
            });
            
            const mesh = new THREE.Points(geometry, material);
            scene.add(mesh);
            return mesh;
        }

        const particleMesh = createParticleSystem();

        // --- Animation Loop ---
        function animate(time) {
            requestAnimationFrame(animate);

            // Skip animation updates if visualization is paused
            if (!isVisualizationPlaying) {
                renderer.render(scene, camera);
                animateGestureModel(time);
                return;
            }

            animateGestureModel(time);

            const material = particleMesh.material;
            const deltaTime = time * 0.001;

            material.uniforms.uTime.value = deltaTime;
            material.uniforms.uHandPosition.value = handGestureData.position;
            material.uniforms.uSpeedFactor.value = particleSpeedFactor; // Update speed factor from slider

            // --- TWO HAND GESTURE: Reset Visualization ---
            if (handGestureData.isTwoThumbsUp && (deltaTime - lastResetTime > resetCooldown)) {
                camera.position.z = DEFAULT_CAMERA_Z;
                particleMesh.rotation.set(0, 0, 0); 
                isRotating = false; 
                
                currentTemplateID = 0;
                material.uniforms.uTemplateID.value = 0.0;
                currentShapeID = 0;
                resetParticles(particleMesh.geometry, currentShapeID);
                isDynamicMode = false;
                material.uniforms.uIsDynamicMode.value = 0.0;
                material.uniforms.uExpansionFactor.value = DEFAULT_EXPANSION;
                isWireframeMode = false; 
                particleMesh.material.wireframe = isWireframeMode; 
                isHyperMode = false; // Reset hyper mode
                material.uniforms.uIsHyperMode.value = 0.0;

                arePlanetsVisible = true;
                planets.forEach(p => p.visible = arePlanetsVisible);
                planetRings.forEach(r => r.visible = arePlanetsVisible);

                lastResetTime = deltaTime;
            }

            // --- NEW TWO HAND GESTURE: Hyper Color Pulse (Two Fists Close) ---
            if (handGestureData.isTwoFistsClose && (deltaTime - lastHyperModeToggleTime > hyperModeCooldown)) {
                isHyperMode = !isHyperMode;
                lastHyperModeToggleTime = deltaTime;
            }

            material.uniforms.uIsHyperMode.value = isHyperMode ? 1.0 : 0.0;
            
            // --- TWO HAND GESTURE: Zoom Control ---
            if (handGestureData.numHands === 2 && !handGestureData.isTwoThumbsUp && !handGestureData.isTwoFistsClose) {
                if (initialTwoHandDistance === 0) {
                    initialTwoHandDistance = handGestureData.twoHandDistance;
                    initialCameraZ = camera.position.z;
                }
                
                const distRatio = handGestureData.twoHandDistance / initialTwoHandDistance; 
                const targetZ = THREE.MathUtils.clamp(
                    initialCameraZ / distRatio, 
                    MIN_CAMERA_Z, 
                    MAX_CAMERA_Z
                );

                camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.1);

            } else {
                initialTwoHandDistance = 0;
            }

            // 1. Control Wireframe Mode (Pointing Finger)
            if (handGestureData.isPointing && (deltaTime - lastWireframeToggleTime > switchCooldown)) {
                isWireframeMode = !isWireframeMode;
                particleMesh.material.wireframe = isWireframeMode;
                lastWireframeToggleTime = deltaTime;
            }

            // 2. Control Planet Visibility (Thumbs Up)
            if (handGestureData.isThumbsUp && (deltaTime - lastPlanetToggleTime > switchCooldown)) {
                arePlanetsVisible = !arePlanetsVisible;
                planets.forEach(p => p.visible = arePlanetsVisible);
                planetRings.forEach(r => r.visible = arePlanetsVisible);
                lastPlanetToggleTime = deltaTime;
            }
            
            // 3. Control Rotation (FIST)
            if (handGestureData.isFist && (deltaTime - lastRotationToggleTime > switchCooldown)) {
                isRotating = !isRotating;
                lastRotationToggleTime = deltaTime;
            }

            if (isRotating) {
                particleMesh.rotation.y += 0.005;
                particleMesh.rotation.x = Math.sin(deltaTime * 0.1) * 0.1;
            } else {
                particleMesh.rotation.x = THREE.MathUtils.lerp(particleMesh.rotation.x, 0, 0.1);
            }

            // 4. Animate Planets
            planets.forEach(planet => {
                const angle = planet.userData.initialAngle + deltaTime * planet.userData.orbitSpeed;
                planet.position.x = Math.cos(angle) * planet.userData.orbitRadius;
                planet.position.z = Math.sin(angle) * planet.userData.orbitRadius;
                planet.rotation.y += 0.01;
            });

            // Animate Planet Rings
            planetRings.forEach(ring => {
                const angle = ring.userData.initialAngle + deltaTime * ring.userData.orbitSpeed;
                ring.position.x = Math.cos(angle) * ring.userData.orbitRadius;
                ring.position.z = Math.sin(angle) * ring.userData.orbitRadius;
                ring.rotation.z += 0.005;
            });


            // 5. Control Dynamic Mode (L-Shape)
            let modeText = 'Static (Repel)';
            if (handGestureData.isLShape && (deltaTime - lastModeSwitchTime > switchCooldown)) {
                isDynamicMode = !isDynamicMode;
                lastModeSwitchTime = deltaTime;
            }
            
            material.uniforms.uIsDynamicMode.value = isDynamicMode ? 1.0 : 0.0;

            if (isDynamicMode) {
                modeText = 'Dynamic (Attract)';
            }

            // 6. Control Pulse Mode (Open Palm)
            const isPulsing = handGestureData.isOpenPalm && !handGestureData.isPinching && !isHyperMode;
            material.uniforms.uIsPulsing.value = isPulsing ? 1.0 : 0.0;
            let pulseText = isPulsing ? 'ON' : 'OFF';

            // 7. Control Particle Expansion/Contraction (Pinch/Open)
            if (isDynamicMode) {
                const normalizedDistance = Math.min(handGestureData.pinchDistance * 5, 1.0);
                const targetExpansion = THREE.MathUtils.mapLinear(normalizedDistance, 0.0, 1.0, 0.05, 1.5);

                material.uniforms.uExpansionFactor.value = THREE.MathUtils.lerp(
                    material.uniforms.uExpansionFactor.value,
                    targetExpansion,
                    0.1
                );
            } else {
                material.uniforms.uExpansionFactor.value = THREE.MathUtils.lerp(
                    material.uniforms.uExpansionFactor.value,
                    DEFAULT_EXPANSION,
                    0.1
                );
            }
            
            // 8. Control Template Switching (Pinky Out)
            if (handGestureData.isPinkyOut && (deltaTime - lastTemplateSwitchTime > switchCooldown)) {
                currentTemplateID = (currentTemplateID + 1) % NUM_TEMPLATES;
                material.uniforms.uTemplateID.value = currentTemplateID;
                lastTemplateSwitchTime = deltaTime;
            }

            // 9. Control Shape Switching (Victory Sign)
            if (handGestureData.isVictory && (deltaTime - lastShapeSwitchTime > switchCooldown)) {
                currentShapeID = (currentShapeID + 1) % SHAPE_TYPES.length;
                resetParticles(particleMesh.geometry, currentShapeID); 
                lastShapeSwitchTime = deltaTime;
            }

            // 10. Update Info Box
            let displayGesture = handGestureData.gestureType;
            if (handGestureData.isTwoThumbsUp) {
                displayGesture = 'Two_Thumbs_Up (Reset)';
            } else if (handGestureData.isTwoFistsClose) {
                displayGesture = 'Clap (Hyper Mode)';
            } else if (handGestureData.numHands === 2 && handGestureData.twoHandDistance > 0.05) {
                displayGesture = 'Zoom_Control';
            }

            infoBox.textContent = `Gesture: ${displayGesture} | Template: ${currentTemplateID} | Shape: ${SHAPE_TYPES[currentShapeID]} | Mode: ${modeText} | HyperMode: ${isHyperMode ? 'ON' : 'OFF'} | Wireframe: ${isWireframeMode ? 'ON' : 'OFF'} | Planets: ${arePlanetsVisible ? 'Visible' : 'Hidden'} | Rotation: ${isRotating ? 'ON' : 'OFF'} | Pulse: ${pulseText} | Hands: ${handGestureData.numHands}`;

            renderer.render(scene, camera);
        }
        
        // --- Hand Tracking Helper Function ---
        function detectHandGesture(landmarks) {
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const middleTip = landmarks[12];
            const ringTip = landmarks[16];
            const pinkyTip = landmarks[20];
            
            const thumbMcp = landmarks[2];
            const indexMcp = landmarks[5]; 
            const middleMcp = landmarks[9];
            const ringMcp = landmarks[13];
            const pinkyMcp = landmarks[17];

            const pinchDistance = Math.sqrt(
                Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2)
            );
            const isPinching = pinchDistance < 0.05;

            // Check if fingertips are below their MCP joints (curled/bent)
            const isIndexCurled = indexTip.y > indexMcp.y + 0.05;
            const isMiddleCurled = middleTip.y > middleMcp.y + 0.05;
            const isRingCurled = ringTip.y > ringMcp.y + 0.05;
            const isPinkyCurled = pinkyTip.y > pinkyMcp.y + 0.05;
            
            // Check if thumb is roughly straight/out
            const isThumbStraight = thumbTip.y < thumbMcp.y - 0.05; 
            
            let gestureType = 'Open_Palm';
            let isFist = false;
            let isThumbsUp = false;
            let isPinkyOut = false;
            let isVictory = false;
            let isLShape = false;
            let isPointing = false; 
            let isOpenPalm = false;

            // Fist: All curled, thumb over/tucked
            if (isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled && (thumbTip.x > thumbMcp.x + 0.05 || thumbTip.y > thumbMcp.y + 0.05)) {
                isFist = true;
                gestureType = 'Fist';
            }
            // Thumbs Up: All curled except thumb (upright)
            else if (isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled && isThumbStraight) {
                isThumbsUp = true;
                gestureType = 'Thumbs_Up';
            }
            // Pinky Out: All curled except pinky
            else if (isIndexCurled && isMiddleCurled && isRingCurled && !isPinkyCurled && pinchDistance > 0.1) {
                isPinkyOut = true;
                gestureType = 'Pinky_Out';
            }
            // Victory Sign: Index and Middle straight, Ring and Pinky curled
            else if (!isIndexCurled && !isMiddleCurled && isRingCurled && isPinkyCurled && pinchDistance > 0.1) {
                isVictory = true;
                gestureType = 'Victory_Sign';
            }
            // L-Shape: Index straight, thumb straight, rest curled
            else if (!isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled && isThumbStraight && pinchDistance > 0.15) {
                isLShape = true;
                gestureType = 'L_Shape';
            } 
            // Pointing Finger: Index straight, all others curled (including thumb)
            else if (!isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled && !isThumbStraight && pinchDistance > 0.1) {
                 isPointing = true;
                 gestureType = 'Pointing';
            }
            // Pinch: Thumb and Index close
            else if (isPinching) {
                gestureType = 'Pinch';
            }
            // Default: Open Palm (Check if most fingers are uncurled)
            else if (!isIndexCurled && !isMiddleCurled && !isRingCurled && !isPinkyCurled) {
                isOpenPalm = true;
                gestureType = 'Open_Palm';
            }

            return {
                gestureType,
                pinchDistance,
                isPinching,
                isLShape,
                isVictory,
                isPinkyOut,
                isThumbsUp,
                isFist,
                isPointing, 
                isOpenPalm
            };
        }


        // --- Hand Tracking Logic ---
        function initializeHandTracking(onHandDataUpdate) {
            infoBox.textContent = "Initializing camera...";
            console.log("Step 1: Creating video element");
            
            const video = document.createElement('video');
            video.autoplay = true;
            video.muted = true;
            video.playsInline = true; 

            video.style.width = '200px'; 
            video.style.height = '150px';
            video.style.transform = 'scaleX(-1)'; 
            video.style.objectFit = 'cover';
            video.style.borderRadius = '5px';
            video.style.border = '2px solid #2196F3';
            
            document.getElementById('webcam-container').appendChild(video);
            console.log("Step 2: Video element created and added to DOM");

            console.log("Step 3: Checking for Hands class:", typeof window.Hands);
            const hands = new window.Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });
            console.log("Step 4: Hands object created");
            
            hands.setOptions({ maxNumHands: 2, modelComplexity: 1 });
            console.log("Step 5: Hands options set");

            hands.onResults((results) => {
                const newHandData = {
                    numHands: 0, twoHandDistance: 0, isTwoThumbsUp: false, isTwoFistsClose: false, position: new THREE.Vector3(0, 0, 0),
                    pinchDistance: 0, gestureType: 'None', isPinching: false, isVictory: false, isLShape: false, 
                    isPinkyOut: false, isThumbsUp: false, isFist: false, isPointing: false, isOpenPalm: true
                };

                if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                    newHandData.numHands = results.multiHandLandmarks.length;
                    const landmarks1 = results.multiHandLandmarks[0];
                    const wrist1 = landmarks1[0];
                    
                    newHandData.position.set( (wrist1.x - 0.5) * 10, -(wrist1.y - 0.5) * 10, wrist1.z * -5 + 2 );
                    
                    const gestureResult1 = detectHandGesture(landmarks1);
                    Object.assign(newHandData, gestureResult1);

                    if (results.multiHandLandmarks.length >= 2) {
                        const landmarks2 = results.multiHandLandmarks[1];
                        const wrist2 = landmarks2[0];
                        newHandData.twoHandDistance = Math.sqrt( Math.pow(wrist1.x - wrist2.x, 2) + Math.pow(wrist1.y - wrist2.y, 2) + Math.pow(wrist1.z - wrist2.z, 2) );
                        
                        const gestureResult2 = detectHandGesture(landmarks2);
                        
                        // Check for Two Thumbs Up
                        if (gestureResult1.isThumbsUp && gestureResult2.isThumbsUp) {
                            newHandData.isTwoThumbsUp = true;
                        }

                        // NEW: Check for Two Fists Close (Hyper Mode Trigger)
                        if (gestureResult1.isFist && gestureResult2.isFist && newHandData.twoHandDistance < TWO_FISTS_CLOSE_THRESHOLD) {
                             newHandData.isTwoFistsClose = true;
                        }
                    }

                    onHandDataUpdate(newHandData);

                } else {
                    onHandDataUpdate(newHandData); 
                }
            });

            console.log("Step 6: Checking for Camera class:", typeof window.Camera);
            try {
                infoBox.textContent = "Requesting camera access...";
                const cameraUtil = new window.Camera(video, {
                    onFrame: async () => {
                        await hands.send({ image: video });
                    },
                    width: 640,
                    height: 480
                });
                console.log("Step 7: Camera object created");
                
                infoBox.textContent = "Starting camera...";
                cameraUtil.start();
                console.log("Step 8: Camera started successfully");
                infoBox.textContent = "✓ Camera ready! Show your hand!";
            } catch (error) {
                console.error("Camera error at step:", error);
                console.error("Error message:", error.message);
                console.error("Error stack:", error.stack);
                infoBox.textContent = "❌ Camera Error: " + error.message;
                
                // Try explicit permission request
                console.log("Step 9: Attempting explicit permission request");
                infoBox.textContent = "Requesting camera permission...";
                
                navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
                    .then(stream => {
                        console.log("Step 10: Permission granted, stopping stream");
                        stream.getTracks().forEach(track => track.stop());
                        
                        infoBox.textContent = "Permission granted, starting camera...";
                        const cameraUtil = new window.Camera(video, {
                            onFrame: async () => {
                                await hands.send({ image: video });
                            },
                            width: 640,
                            height: 480
                        });
                        cameraUtil.start();
                        console.log("Step 11: Camera started after permission");
                        infoBox.textContent = "✓ Camera ready! Show your hand!";
                    })
                    .catch(permissionError => {
                        console.error("Step 12: Permission denied", permissionError);
                        console.error("Permission error:", permissionError.message);
                        infoBox.textContent = "❌ Camera blocked. Please check browser permissions.";
                    });
            }
        }


        // Fix: UI hiding is prioritized and initialization is deferred.
        function hideGuide() {
            startButton.disabled = true;

            // 1. CRITICAL: Start the UI hide transition immediately.
            guideOverlay.style.opacity = '0';
            guideToggleButton.style.display = 'block'; 
            visualizationToggleButton.style.display = 'block'; // Show visualization button
            visualizationToggleButton.classList.add('playing'); // Start in playing state

            // 2. Schedule the UI removal (after the transition)
            setTimeout(() => {
                guideOverlay.style.display = 'none';
            }, 1000); 
            
            // 3. Defer the heavy initialization slightly to allow UI transition to start.
            setTimeout(() => {
                try {
                    initializeHandTracking((data) => {
                        handGestureData = data;
                    });
                    
                    setupGestureGuide3D();
                } catch (e) {
                    console.error("Initialization Error:", e);
                    infoBox.textContent = "Error during startup. Check browser console.";
                }
            }, 10);
        }

        // Toggle the visibility of the 3D guide panel
        guideToggleButton.addEventListener('click', () => {
            const isVisible = gestureGuidePanel.style.display === 'flex';
            gestureGuidePanel.style.display = isVisible ? 'none' : 'flex';
            guideToggleButton.textContent = isVisible ? 'Show Gesture Guide' : 'Hide Gesture Guide';
        });

        // Toggle visualization play/pause
        visualizationToggleButton.addEventListener('click', () => {
            isVisualizationPlaying = !isVisualizationPlaying;
            if (isVisualizationPlaying) {
                visualizationToggleButton.textContent = 'Pause';
                visualizationToggleButton.classList.remove('paused');
                visualizationToggleButton.classList.add('playing');
            } else {
                visualizationToggleButton.textContent = 'Resume';
                visualizationToggleButton.classList.remove('playing');
                visualizationToggleButton.classList.add('paused');
            }
        });

        // Handle particle speed slider
        particleSpeedSlider.addEventListener('input', (event) => {
            particleSpeedFactor = parseFloat(event.target.value);
            speedValueDisplay.textContent = particleSpeedFactor.toFixed(1);
        });

        // Attach the function to the button click
        startButton.addEventListener('click', hideGuide);
        
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            
            if (guideRenderer) {
                 const canvas = document.getElementById('gesture-canvas');
                 // For the guide, we'll keep the aspect ratio locked to 1:1 since the canvas is 250x250
                 guideCamera.aspect = 1; 
                 guideCamera.updateProjectionMatrix();
                 // If the canvas size somehow changed, this would update it, but usually the outer div controls it.
                 guideRenderer.setSize(canvas.clientWidth, canvas.clientHeight); 
            }
        });

        animate(0);
    