document.addEventListener('DOMContentLoaded', () => {
    let audioContext, analyser, source;
    const audioControl = document.getElementById('audio-control');
    const audio = document.getElementById('audio');
    const scanningOverlay = document.getElementById('scanning-overlay');
    const scene = document.querySelector('a-scene');
    const sphere = document.getElementById('visualSphere');
    const model = document.getElementById('base-entity');
    const equalizerContainer = document.getElementById('equalizer-container');
    const mindarTarget = document.querySelector('[mindar-image-target]');
    const lyricsOverlay = document.getElementById('lyrics-overlay');
    const toggleLyricsButton = document.getElementById('toggle-lyrics');
    const websiteButton = document.getElementById('website-button');

    //音楽再生バー
    const seekBar = document.getElementById('seek-bar');
    const currentTimeDisplay = document.getElementById('current-time');
    const durationDisplay = document.getElementById('duration');

    const FFT_SIZE = 256;
    const numBars = 32; // 固定のバーの数に変更
    let bars = [];
    let isLyricsVisible = false;

    // 3Dパーティクルシステムの定数（視認性向上のため最適化）
    const PARTICLE_COUNT = 50000; // 密度を高めて視認性向上
    const SHAPE_STABLE_TIME = 4000; // 4秒
    const MORPHING_TIME = 2000; // 2秒
    const ANIMATION_CYCLE = SHAPE_STABLE_TIME + MORPHING_TIME; // 6秒

    // パーティクルシステムの変数
    let particleSystem = null;
    let particleGeometry = null;
    let particleMaterial = null;
    let particlePositions = null;
    let particleColors = null;
    
    // 形状データ（事前計算済み）
    let torusPositions = null;
    let spherePositions = null;
    let lissajousPositions = null;
    let dnaHelixPositions = null;
    let fractalCubePositions = null;
    let galaxySpiralPositions = null;
    let waveFormPositions = null;
    
    // アニメーション状態
    let currentShape = 'TORUS';
    let nextShape = 'SPHERE';
    let morphProgress = 0;
    let animationStartTime = 0;
    let isStable = true;
    
    // リッチアニメーション状態
    let globalRotation = { x: 0, y: 0, z: 0 };
    let pulsePhase = 0;
    let colorWavePhase = 0;
    let rotationSpeed = 0.008;
    
    // パフォーマンス最適化用変数
    let lastUpdateTime = 0;
    const UPDATE_FREQUENCY = 16; // 60FPS相当
    let frameSkipCounter = 0;
    const MAX_FRAME_SKIP = 2; // 最大2フレームまでスキップ可能
    
    // パフォーマンス監視用変数
    let frameCount = 0;
    let lastFpsTime = 0;
    let currentFps = 60;
    let performanceLevel = 'high'; // 'high', 'medium', 'low'

    // 歌詞の初期状態設定
    isLyricsVisible = false;
    lyricsOverlay.style.display = 'none';

    // 3つの形状の数学的定義と事前計算
    function generateTorusPositions() {
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const R = 2; // 主半径
        const r = 0.8; // 管半径
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const u = Math.random() * Math.PI * 2; // [0, 2π]
            const v = Math.random() * Math.PI * 2; // [0, 2π]
            
            const x = (R + r * Math.cos(v)) * Math.cos(u);
            const y = (R + r * Math.cos(v)) * Math.sin(u);
            const z = r * Math.sin(v);
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }
        
        return positions;
    }

    function generateSpherePositions() {
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const R = 2.2; // 半径
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const lat = Math.random() * Math.PI; // [0, π]
            const lon = Math.random() * Math.PI * 2; // [0, 2π]
            
            const x = R * Math.sin(lat) * Math.cos(lon);
            const y = R * Math.sin(lat) * Math.sin(lon);
            const z = R * Math.cos(lat);
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }
        
        return positions;
    }

    function generateLissajousPositions() {
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const a = 3, b = 5, c = 7; // 周波数
        const A = 2, B = 2, C = 2; // 振幅
        const delta1 = Math.PI / 2, delta2 = Math.PI / 4; // 位相
        const thicknessRadius = 0.08; // 線の太さ
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const t = (i / PARTICLE_COUNT) * Math.PI * 4; // より均等な分布
            
            // 基本のリサージュカーブ
            const baseX = A * Math.sin(a * t + delta1);
            const baseY = B * Math.sin(b * t);
            const baseZ = C * Math.sin(c * t + delta2);
            
            // 線の太さを作るためのランダムオフセット
            const offsetAngle = Math.random() * Math.PI * 2;
            const offsetRadius = Math.random() * thicknessRadius;
            
            // 法線方向にオフセットを追加（簡易的な方法）
            const offsetX = Math.cos(offsetAngle) * offsetRadius;
            const offsetY = Math.sin(offsetAngle) * offsetRadius;
            
            positions[i * 3] = baseX + offsetX;
            positions[i * 3 + 1] = baseY + offsetY;
            positions[i * 3 + 2] = baseZ;
        }
        
        return positions;
    }

    // DNA螺旋の生成
    function generateDnaHelixPositions() {
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const R = 1.5; // 螺旋の半径
        const height = 4; // 螺旋の高さ
        const turns = 3; // 螺旋の回転数
        const thicknessRadius = 0.05; // 線の太さ
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const t = (i / PARTICLE_COUNT) * turns * Math.PI * 2;
            const y = (i / PARTICLE_COUNT) * height - height / 2;
            
            // 二重螺旋の計算
            const strand = Math.floor(i / (PARTICLE_COUNT / 2));
            const offset = strand * Math.PI;
            
            const baseX = R * Math.cos(t + offset);
            const baseZ = R * Math.sin(t + offset);
            
            // 線の太さのためのランダムオフセット
            const offsetAngle = Math.random() * Math.PI * 2;
            const offsetRadius = Math.random() * thicknessRadius;
            const offsetX = Math.cos(offsetAngle) * offsetRadius;
            const offsetZ = Math.sin(offsetAngle) * offsetRadius;
            
            positions[i * 3] = baseX + offsetX;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = baseZ + offsetZ;
        }
        
        return positions;
    }

    // フラクタルキューブの生成
    function generateFractalCubePositions() {
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const size = 2.0; // 基本サイズ
        const levels = 3; // フラクタルレベル
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            let x = 0, y = 0, z = 0;
            let currentSize = size;
            
            // フラクタル構造を生成
            for (let level = 0; level < levels; level++) {
                const subdivide = Math.pow(2, level);
                const localSize = currentSize / subdivide;
                
                // ランダムな位置を選択
                const localX = (Math.random() - 0.5) * localSize;
                const localY = (Math.random() - 0.5) * localSize;
                const localZ = (Math.random() - 0.5) * localSize;
                
                x += localX;
                y += localY;
                z += localZ;
                
                currentSize *= 0.5;
            }
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }
        
        return positions;
    }

    // 銀河渦巻きの生成
    function generateGalaxySpiralPositions() {
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const arms = 3; // 渦巻きの腕の数
        const maxRadius = 3.0; // 最大半径
        const pitch = 0.3; // 渦巻きの角度
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const armIndex = i % arms;
            const t = (i / PARTICLE_COUNT) * Math.PI * 4;
            const radius = (i / PARTICLE_COUNT) * maxRadius;
            
            // 渦巻きの角度計算
            const angle = t + (armIndex * Math.PI * 2 / arms) + (radius * pitch);
            
            const x = radius * Math.cos(angle);
            const z = radius * Math.sin(angle);
            
            // Y軸方向の分布（平たい銀河）
            const y = (Math.random() - 0.5) * 0.2 * radius;
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }
        
        return positions;
    }

    // 波形の生成
    function generateWaveFormPositions() {
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const width = 4.0; // 波の幅
        const amplitude = 1.5; // 振幅
        const frequency = 2.0; // 周波数
        const waveCount = 5; // 波の数
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const t = (i / PARTICLE_COUNT) * Math.PI * 2 * waveCount;
            const x = (i / PARTICLE_COUNT) * width - width / 2;
            
            // 複数の波を重ね合わせ
            const wave1 = Math.sin(t) * amplitude;
            const wave2 = Math.sin(t * 2 + Math.PI / 3) * amplitude * 0.5;
            const wave3 = Math.sin(t * 3 + Math.PI / 6) * amplitude * 0.25;
            
            const y = wave1 + wave2 + wave3;
            
            // Z軸方向の分布
            const z = Math.sin(t * frequency) * 0.3;
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }
        
        return positions;
    }

    // EaseInOutSine イージング関数
    function easeInOutSine(x) {
        return -(Math.cos(Math.PI * x) - 1) / 2;
    }

    // シンプルなパーリンノイズ実装
    function generateNoiseTable() {
        const table = [];
        for (let i = 0; i < 256; i++) {
            table[i] = Math.random() * 2 - 1;
        }
        return table;
    }

    const noiseTable = generateNoiseTable();

    function noise(x, y, z) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        
        const fx = x - Math.floor(x);
        const fy = y - Math.floor(y);
        const fz = z - Math.floor(z);
        
        const u = fade(fx);
        const v = fade(fy);
        const w = fade(fz);
        
        const A = (noiseTable[X] + Y) & 255;
        const B = (noiseTable[X + 1] + Y) & 255;
        const AA = (noiseTable[A] + Z) & 255;
        const AB = (noiseTable[A + 1] + Z) & 255;
        const BA = (noiseTable[B] + Z) & 255;
        const BB = (noiseTable[B + 1] + Z) & 255;
        
        return lerp(w, lerp(v, lerp(u, grad(noiseTable[AA], fx, fy, fz),
                                      grad(noiseTable[BA], fx - 1, fy, fz)),
                              lerp(u, grad(noiseTable[AB], fx, fy - 1, fz),
                                      grad(noiseTable[BB], fx - 1, fy - 1, fz))),
                      lerp(v, lerp(u, grad(noiseTable[AA + 1], fx, fy, fz - 1),
                                      grad(noiseTable[BA + 1], fx - 1, fy, fz - 1)),
                              lerp(u, grad(noiseTable[AB + 1], fx, fy - 1, fz - 1),
                                      grad(noiseTable[BB + 1], fx - 1, fy - 1, fz - 1))));
    }

    function fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    function lerp(t, a, b) {
        return a + t * (b - a);
    }

    function grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    // 色の補間関数
    function lerpColor(color1, color2, t) {
        return {
            r: color1.r + (color2.r - color1.r) * t,
            g: color1.g + (color2.g - color1.g) * t,
            b: color1.b + (color2.b - color1.b) * t
        };
    }

    // 形状の色定義（明るい背景での視認性向上のため調整）
    const shapeColors = {
        TORUS: { r: 1.0, g: 1.0, b: 0.0 },      // 明るい黄色（青背景の補色）
        SPHERE: { r: 1.0, g: 0.5, b: 0.0 },     // 明るいオレンジ
        LISSAJOUS: { r: 1.0, g: 0.0, b: 0.5 },  // 明るいピンク
        DNA_HELIX: { r: 0.0, g: 1.0, b: 0.2 },  // 明るいグリーン
        FRACTAL_CUBE: { r: 0.8, g: 0.0, b: 1.0 }, // 明るい紫
        GALAXY_SPIRAL: { r: 0.0, g: 0.8, b: 1.0 }, // 明るいシアン
        WAVE_FORM: { r: 1.0, g: 0.2, b: 0.0 }   // 明るい赤
    };

    // パーティクルシステムの初期化
    function initParticleSystem() {
        console.log('Initializing particle system...');
        
        // 形状データの事前計算
        torusPositions = generateTorusPositions();
        spherePositions = generateSpherePositions();
        lissajousPositions = generateLissajousPositions();
        dnaHelixPositions = generateDnaHelixPositions();
        fractalCubePositions = generateFractalCubePositions();
        galaxySpiralPositions = generateGalaxySpiralPositions();
        waveFormPositions = generateWaveFormPositions();
        
        // BufferGeometry の作成
        particleGeometry = new THREE.BufferGeometry();
        
        // 位置属性の初期化（トーラスから開始）
        particlePositions = new Float32Array(torusPositions);
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        
        // 色属性の初期化
        particleColors = new Float32Array(PARTICLE_COUNT * 3);
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particleColors[i * 3] = shapeColors.TORUS.r;
            particleColors[i * 3 + 1] = shapeColors.TORUS.g;
            particleColors[i * 3 + 2] = shapeColors.TORUS.b;
        }
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
        
        // マテリアルの作成（明るい背景での視認性向上）
        particleMaterial = new THREE.PointsMaterial({
            size: 20.0,
            sizeAttenuation: true,
            vertexColors: true,
            blending: THREE.NormalBlending,
            transparent: true,
            opacity: 0.95
        });
        
        // パーティクルシステムの作成
        particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        
        console.log('Particle system initialized successfully.');
        return particleSystem;
    }

    // アニメーション状態管理
    function getNextShape(current) {
        const shapes = ['TORUS', 'SPHERE', 'LISSAJOUS', 'DNA_HELIX', 'FRACTAL_CUBE', 'GALAXY_SPIRAL', 'WAVE_FORM'];
        const currentIndex = shapes.indexOf(current);
        return shapes[(currentIndex + 1) % shapes.length];
    }

    function getShapePositions(shapeName) {
        switch (shapeName) {
            case 'TORUS': return torusPositions;
            case 'SPHERE': return spherePositions;
            case 'LISSAJOUS': return lissajousPositions;
            case 'DNA_HELIX': return dnaHelixPositions;
            case 'FRACTAL_CUBE': return fractalCubePositions;
            case 'GALAXY_SPIRAL': return galaxySpiralPositions;
            case 'WAVE_FORM': return waveFormPositions;
            default: return torusPositions;
        }
    }

    // パフォーマンス監視とレベル調整
    function updatePerformanceLevel() {
        frameCount++;
        const currentTime = Date.now();
        
        if (currentTime - lastFpsTime > 1000) {
            currentFps = frameCount;
            frameCount = 0;
            lastFpsTime = currentTime;
            
            if (currentFps < 30) {
                performanceLevel = 'low';
            } else if (currentFps < 45) {
                performanceLevel = 'medium';
            } else {
                performanceLevel = 'high';
            }
            
            console.log(`FPS: ${currentFps}, Performance Level: ${performanceLevel}`);
        }
    }
    
    function getPerformanceSettings() {
        switch (performanceLevel) {
            case 'low':
                return {
                    updateFrequency: 33,
                    batchSize: 1000,
                    colorBatchSize: 5000,
                    noiseScale: 0.03
                };
            case 'medium':
                return {
                    updateFrequency: 22,
                    batchSize: 750,
                    colorBatchSize: 3750,
                    noiseScale: 0.04
                };
            case 'high':
            default:
                return {
                    updateFrequency: 16,
                    batchSize: 500,
                    colorBatchSize: 2500,
                    noiseScale: 0.05
                };
        }
    }

    // パーティクルアニメーション更新（パフォーマンス最適化版）
    function updateParticleAnimation() {
        if (!particleSystem || !particleGeometry) return;
        
        const currentTime = Date.now();
        const settings = getPerformanceSettings();
        
        updatePerformanceLevel();
        
        if (currentTime - lastUpdateTime < settings.updateFrequency) {
            frameSkipCounter++;
            if (frameSkipCounter < MAX_FRAME_SKIP) {
                return;
            }
        }
        
        lastUpdateTime = currentTime;
        frameSkipCounter = 0;
        
        // リッチアニメーションの更新
        const time = currentTime * 0.001;
        globalRotation.x += rotationSpeed * 0.7;
        globalRotation.y += rotationSpeed;
        globalRotation.z += rotationSpeed * 0.3;
        pulsePhase += 0.08;
        colorWavePhase += 0.05;
        
        particleSystem.rotation.x = globalRotation.x;
        particleSystem.rotation.y = globalRotation.y;
        particleSystem.rotation.z = globalRotation.z;
        
        const pulseSize = 20.0 + Math.sin(pulsePhase) * 5.0;
        particleMaterial.size = pulseSize;
        
        const cycleTime = (currentTime - animationStartTime) % ANIMATION_CYCLE;
        
        if (cycleTime < SHAPE_STABLE_TIME) {
            isStable = true;
            morphProgress = 0;
        } else {
            if (isStable) {
                isStable = false;
                currentShape = nextShape;
                nextShape = getNextShape(currentShape);
                console.log(`Starting morphing from ${currentShape} to ${nextShape}`);
            }
            
            const morphTime = cycleTime - SHAPE_STABLE_TIME;
            morphProgress = Math.min(morphTime / MORPHING_TIME, 1);
            
            const easedProgress = easeInOutSine(morphProgress);
            
            const currentPositions = getShapePositions(currentShape);
            const targetPositions = getShapePositions(nextShape);
            const noiseScale = settings.noiseScale;
            
            const batchSize = settings.batchSize;
            for (let batch = 0; batch < PARTICLE_COUNT; batch += batchSize) {
                const endIndex = Math.min(batch + batchSize, PARTICLE_COUNT);
                
                for (let i = batch; i < endIndex; i++) {
                    const i3 = i * 3;
                    
                    const lerpedX = currentPositions[i3] + (targetPositions[i3] - currentPositions[i3]) * easedProgress;
                    const lerpedY = currentPositions[i3 + 1] + (targetPositions[i3 + 1] - currentPositions[i3 + 1]) * easedProgress;
                    const lerpedZ = currentPositions[i3 + 2] + (targetPositions[i3 + 2] - currentPositions[i3 + 2]) * easedProgress;
                    
                    const noiseX = noise(lerpedX * 0.1, lerpedY * 0.1, time) * noiseScale;
                    const noiseY = noise(lerpedX * 0.1 + 100, lerpedY * 0.1 + 100, time) * noiseScale;
                    const noiseZ = noise(lerpedX * 0.1 + 200, lerpedY * 0.1 + 200, time) * noiseScale;
                    
                    particlePositions[i3] = lerpedX + noiseX;
                    particlePositions[i3 + 1] = lerpedY + noiseY;
                    particlePositions[i3 + 2] = lerpedZ + noiseZ;
                }
                
                if (batch + batchSize < PARTICLE_COUNT) {
                    setTimeout(() => {}, 0);
                }
            }
            
            const currentColor = shapeColors[currentShape];
            const targetColor = shapeColors[nextShape];
            const lerpedColor = lerpColor(currentColor, targetColor, easedProgress);
            
            const colorBatchSize = settings.colorBatchSize;
            for (let batch = 0; batch < PARTICLE_COUNT; batch += colorBatchSize) {
                const endIndex = Math.min(batch + colorBatchSize, PARTICLE_COUNT);
                
                for (let i = batch; i < endIndex; i++) {
                    const i3 = i * 3;
                    
                    const waveOffset = Math.sin(colorWavePhase + i * 0.01) * 0.2;
                    const gradientFactor = Math.sin(i * 0.005 + time) * 0.3;
                    
                    particleColors[i3] = Math.min(1.0, lerpedColor.r + waveOffset + gradientFactor);
                    particleColors[i3 + 1] = Math.min(1.0, lerpedColor.g + waveOffset * 0.7 + gradientFactor);
                    particleColors[i3 + 2] = Math.min(1.0, lerpedColor.b + waveOffset * 0.5 + gradientFactor);
                }
            }
            
            particleGeometry.attributes.position.needsUpdate = true;
            particleGeometry.attributes.color.needsUpdate = true;
        }
    }

    // A-Frame パーティクルアニメーションコンポーネント
    AFRAME.registerComponent('particle-animation', {
        init: function() {
            this.particleSystem = initParticleSystem();
            this.el.object3D.add(this.particleSystem);
            animationStartTime = Date.now();
            console.log('Particle animation component initialized.');
        },
        
        tick: function() {
            updateParticleAnimation();
        }
    });

    // リンクボタンのイベントリスナー
    websiteButton.addEventListener('click', () => {
        window.open('https://www.instagram.com/techconnect.em/', '_blank');
    });


     // 再生時間を整形する関数
    function formatTime(seconds) {
       const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);

         // 負の時間を考慮
         const absMins = Math.abs(mins);
        const absSecs = Math.abs(secs);

         const formattedMins = String(absMins).padStart(0, '0');
        const formattedSecs = String(absSecs).padStart(2, '0');
        return `${mins < 0 ? '-' : ''}${formattedMins}:${formattedSecs}`;
    }

   // イベントリスナー: メタデータがロードされたとき
    audio.addEventListener('loadedmetadata', () => {
        if (isNaN(audio.duration)) {
            console.warn("audio.duration is NaN. Trying again...");
            return;
        }
        const durationInSeconds = audio.duration;
        seekBar.max = durationInSeconds;
        durationDisplay.textContent = formatTime(durationInSeconds); // durationを初期化
    });

    // イベントリスナー: 再生時間が更新されたとき
    audio.addEventListener('timeupdate', () => {
        currentTimeDisplay.textContent = formatTime(audio.currentTime);
        seekBar.value = audio.currentTime;
          // 経過時間から残りの時間を計算して表示
        const timeLeft = audio.duration - audio.currentTime;
        durationDisplay.textContent = formatTime(timeLeft);
    });

    // イベントリスナー: seek barが変更されたとき
    seekBar.addEventListener('input', () => {
        audio.currentTime = seekBar.value;
        currentTimeDisplay.textContent = formatTime(audio.currentTime);
    });

    // イベントリスナー: 楽曲の再生が終わったとき
    audio.addEventListener('ended', () => {
        audioControl.querySelector('i').className = 'fas fa-play';
    });


    // 音声解析の初期化
    async function initAudioAnalyser() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await audioContext.resume();

            analyser = audioContext.createAnalyser();
            analyser.fftSize = FFT_SIZE;
            analyser.smoothingTimeConstant = 0.85;
            source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioContext.destination);

            // イコライザーバーの初期化
            try {
                for (let i = 0; i < numBars; i++) {
                    const bar = document.createElement('a-entity');
                    bar.setAttribute('geometry', `primitive: box; width: 0.02; height: 0.1; depth: 0.02`);
                    bar.setAttribute('material', `color: yellow`);
                    equalizerContainer.appendChild(bar);
                    bars.push(bar);
                }
                console.log('Equalizer bars initialized successfully.');
            } catch (error) {
                console.error('Error initializing equalizer bars:', error);
            }


            return true;
        } catch (error) {
            console.error('Audio analyser initialization error:', error);
            return false;
        }
    }

    // 音声データの解析と視覚化
    AFRAME.registerComponent('audio-visualizer', {
        init: function () {
            this.barWidth = 0.02;
            this.barColor = 'yellow';
            this.equalizerRadius = 1.1;
            this.smoothing = 0.3;
            this.barHeights = new Array(numBars).fill(0); // スムージング用の配列
            console.log('Audio visualizer component initialized.');
        },
        tick: function () {
            if (analyser && !audio.paused) {
                const freqByteData = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(freqByteData);

                // スフィアのスケールを変更
                let avgScale = 0;
                for (let i = 0; i < freqByteData.length; i++) {
                    avgScale += freqByteData[i];
                }
                avgScale /= freqByteData.length;
                const scale = 1 + (avgScale / 255) * 0.5;
                this.el.object3D.scale.set(scale, scale, scale);

                // イコライザーバーの更新
                this.updateEqualizerBars(freqByteData);
            }
        },
        updateEqualizerBars: function (freqByteData) {
            try {
                const targetPosition = mindarTarget.object3D.position;
                const radius = parseFloat(sphere.getAttribute('radius')) * this.equalizerRadius;
                const sphereBottomY = targetPosition.y - parseFloat(sphere.getAttribute('radius'));

                for (let i = 0; i < numBars; i++) {
                    const bar = bars[i];

                    if (!bar) {
                        console.error('bar is null or undefined:', i, bars);
                        continue;
                    }
                    // 使用する周波数データを選択（高周波数帯域をカット）
                    const freqIndex = Math.floor((i / numBars) * (FFT_SIZE / 2));
                    const freqSum = freqByteData[freqIndex] || 0;
                    let barHeight = (freqSum / 255) * 1.5;
                    barHeight = Math.max(0.1, barHeight); // 最小値を設定

                    // スムージング処理
                    this.barHeights[i] = this.barHeights[i] + (barHeight - this.barHeights[i]) * this.smoothing;

                    let angle = 0;
                    if (numBars > 1) {
                        angle = (i / (numBars - 1)) * Math.PI - (Math.PI / 2);
                    }
                    const x = Math.cos(angle - Math.PI / 2) * radius;
                    const z = Math.sin(angle - Math.PI / 2) * radius;
                    const y = sphereBottomY + this.barHeights[i] / 2;

                    bar.setAttribute('position', `${targetPosition.x + x} ${y} ${targetPosition.z + z}`);
                    bar.setAttribute('geometry', `primitive: box; width: ${this.barWidth}; height: ${this.barHeights[i]}; depth: ${this.barWidth}`);
                    bar.setAttribute('rotation', `0 ${-angle * 180 / Math.PI - 90} 0`);
                }
            } catch (error) {
                console.error('Error during equalizer animation:', error);
            }
        }
    });

    sphere.setAttribute('audio-visualizer', '');

    let isTargetFound = false;
    
    scene.addEventListener('targetFound', () => {
        isTargetFound = true;
        scanningOverlay.classList.add('fade-out');
        // 歌詞表示は手動制御のまま維持
    });

    scene.addEventListener('targetLost', () => {
        isTargetFound = false;
        scanningOverlay.classList.remove('fade-out');
        // 歌詞表示は手動制御のまま維持
    });

    scene.addEventListener('error', (e) => {
        console.error('A-Frame scene error:', e);
    });

    audio.addEventListener('play', updateAudioButton);
    audio.addEventListener('pause', updateAudioButton);


    //音楽再生、歌詞表示、Webサイト移動などのイベントリスナーを定義
    websiteButton.addEventListener('click', () => {
        window.open('https://www.instagram.com/techconnect.em/', '_blank');
    });

    toggleLyricsButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('歌詞ボタンがクリックされました');
        console.log('現在のisLyricsVisible:', isLyricsVisible);
        
        isLyricsVisible = !isLyricsVisible;
        
        // 強制的にスタイルを設定
        if (isLyricsVisible) {
            lyricsOverlay.style.setProperty('display', 'flex', 'important');
            console.log('歌詞を表示に設定');
        } else {
            lyricsOverlay.style.setProperty('display', 'none', 'important');
            console.log('歌詞を非表示に設定');
        }
        
        // 確認のため最終状態をログ出力
        setTimeout(() => {
            console.log('最終的なdisplayプロパティ:', getComputedStyle(lyricsOverlay).display);
        }, 100);
        
        updateLyricsButton();
    });

     function updateLyricsButton() {
        const icon = toggleLyricsButton.querySelector('i');
        icon.className = isLyricsVisible ? 'fas fa-times' : 'fas fa-align-justify';
    }

   audioControl.addEventListener('click', async () => {
        try {
            if (audio.paused) {
                await audio.play();
                await audioContext.resume();
            } else {
                audio.pause();
            }
            updateAudioButton();
        } catch (error) {
            console.error('Audio control error:', error);
        }
    });

    function updateAudioButton() {
        const icon = audioControl.querySelector('i');
        icon.className = audio.paused ? 'fas fa-play' : 'fas fa-pause';
    }

    // DOMContentLoaded以降に実行されるように、initAudioAnalyserの呼び出しをここに移動
    init();
    async function init() {
         await initAudioAnalyser();
    }
});
