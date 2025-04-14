class ParticleSystem {
    constructor(canvas, numParticles = 300) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.numParticles = numParticles;
        this.resize();
        this.transientHistory = [];
        this.maxTransientHistory = 150;
        this.peakValue = 0.1;
        this.minValue = 0;
        this.scalingFactor = 1;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.pulseRadius = 0;
        this.pulseStrength = 0;
        this.hueRotation = 0;
        this.lastBeat = Date.now();
        this.beatInterval = 500;
        this.explosionForce = 0;
        this.baseRadius = Math.min(this.canvas.width, this.canvas.height) * 0.2;
        this.maxRadius = Math.min(this.canvas.width, this.canvas.height) * 0.45;

        // Parameters that can be adjusted in real-time
        this.params = {
            particleCount: {
                value: Math.min(500, numParticles),
                min: 1,
                max: 500,
                step: 10,
                label: 'Particle Count'
            },
            baseSize: {
                value: 0.2,
                min: 0.1,
                max: 0.4,
                step: 0.01,
                label: 'Base Size'
            },
            explosionStrength: {
                value: 2,
                min: 0.5,
                max: 5,
                step: 0.1,
                label: 'Explosion Strength'
            },
            connectionDistance: {
                value: Math.min(180, 300),
                min: 1,
                max: 300,
                step: 10,
                label: 'Connection Distance'
            },
            beatSensitivity: {
                value: 0.15,
                min: 0.05,
                max: 0.3,
                step: 0.01,
                label: 'Beat Sensitivity'
            },
            transientSensitivity: {
                value: 1.0,
                min: 0.1,
                max: 3.0,
                step: 0.1,
                label: 'Transient Sensitivity'
            },
            glowIntensity: {
                value: 0.2,
                min: 0,
                max: 1,
                step: 0.05,
                label: 'Glow Intensity'
            },
            rotationSpeed: {
                value: 1,
                min: 0.1,
                max: 3,
                step: 0.1,
                label: 'Rotation Speed'
            },
            colorCycleSpeed: {
                value: 30,
                min: 1,
                max: 60,
                step: 1,
                label: 'Color Cycle Speed'
            }
        };

        this.showControls = false;
        this.cleanMode = false;
        this.createControlPanel();
        this.createControlHint();
        this.createCleanModeButton();
        
        window.addEventListener('resize', () => this.resize());
        
        // Add keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.key === 'c') {
                this.toggleControls();
            } else if (e.key === 'x') {
                this.toggleCleanMode();
            }
        });

        // Initialize particles immediately
        this.init();
    }

    createControlPanel() {
        // Create control panel container
        this.controlPanel = document.createElement('div');
        this.controlPanel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            padding: 15px;
            border-radius: 8px;
            color: white;
            font-family: Arial, sans-serif;
            z-index: 1000;
            display: none;
            max-height: 90vh;
            overflow-y: auto;
            min-width: 200px;
        `;

        // Add title
        const title = document.createElement('h3');
        title.textContent = 'Visualization Controls';
        title.style.margin = '0 0 10px 0';
        this.controlPanel.appendChild(title);

        // Add help text
        const helpText = document.createElement('p');
        helpText.textContent = 'Press C to toggle controls';
        helpText.style.fontSize = '12px';
        helpText.style.opacity = '0.7';
        helpText.style.margin = '0 0 15px 0';
        this.controlPanel.appendChild(helpText);

        // Add randomize button
        const randomizeButton = document.createElement('button');
        randomizeButton.textContent = '🎲 Randomize Presets';
        randomizeButton.style.cssText = `
            width: 100%;
            padding: 8px;
            margin-bottom: 15px;
            background: rgba(0, 255, 255, 0.2);
            border: 1px solid rgba(0, 255, 255, 0.3);
            color: white;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
        `;
        randomizeButton.addEventListener('mouseover', () => {
            randomizeButton.style.background = 'rgba(0, 255, 255, 0.3)';
        });
        randomizeButton.addEventListener('mouseout', () => {
            randomizeButton.style.background = 'rgba(0, 255, 255, 0.2)';
        });
        randomizeButton.addEventListener('click', () => this.randomizePresets());
        this.controlPanel.appendChild(randomizeButton);

        // Create sliders for each parameter
        Object.entries(this.params).forEach(([key, param]) => {
            const container = document.createElement('div');
            container.style.marginBottom = '20px';
            container.style.position = 'relative';

            const label = document.createElement('label');
            label.textContent = param.label;
            label.style.cssText = `
                display: block;
                margin-bottom: 8px;
                font-family: 'Arial', sans-serif;
                font-size: 12px;
                color: #0ff;
                text-transform: uppercase;
                letter-spacing: 1px;
                text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
            `;
            container.appendChild(label);

            // Create slider container for styling
            const sliderContainer = document.createElement('div');
            sliderContainer.style.cssText = `
                position: relative;
                background: rgba(0, 0, 0, 0.3);
                padding: 10px;
                border-radius: 4px;
                border: 1px solid rgba(0, 255, 255, 0.2);
                box-shadow: 0 0 10px rgba(0, 255, 255, 0.1);
            `;

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = param.min;
            slider.max = param.max;
            slider.step = param.step;
            slider.value = param.value;
            slider.dataset.param = key;
            
            // Custom slider styling
            slider.style.cssText = `
                width: 100%;
                margin: 0;
                -webkit-appearance: none;
                background: transparent;
                cursor: pointer;
            `;

            // Webkit specific styles (Chrome, Safari, newer Edge)
            const webkitStyles = `
                input[type='range']::-webkit-slider-runnable-track {
                    height: 4px;
                    background: linear-gradient(90deg, 
                        rgba(0, 255, 255, 0.1) 0%,
                        rgba(0, 255, 255, 0.3) 50%,
                        rgba(0, 255, 255, 0.1) 100%);
                    border-radius: 2px;
                    border: 1px solid rgba(0, 255, 255, 0.3);
                }

                input[type='range']::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 16px;
                    height: 16px;
                    margin-top: -7px;
                    background: #0ff;
                    border-radius: 50%;
                    box-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
                    border: 2px solid rgba(255, 255, 255, 0.8);
                    transition: all 0.2s ease;
                }

                input[type='range']::-webkit-slider-thumb:hover {
                    background: #fff;
                    box-shadow: 0 0 20px rgba(0, 255, 255, 1);
                }
            `;

            // Firefox specific styles
            const firefoxStyles = `
                input[type='range']::-moz-range-track {
                    height: 4px;
                    background: linear-gradient(90deg, 
                        rgba(0, 255, 255, 0.1) 0%,
                        rgba(0, 255, 255, 0.3) 50%,
                        rgba(0, 255, 255, 0.1) 100%);
                    border-radius: 2px;
                    border: 1px solid rgba(0, 255, 255, 0.3);
                }

                input[type='range']::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    background: #0ff;
                    border-radius: 50%;
                    box-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
                    border: 2px solid rgba(255, 255, 255, 0.8);
                    transition: all 0.2s ease;
                }

                input[type='range']::-moz-range-thumb:hover {
                    background: #fff;
                    box-shadow: 0 0 20px rgba(0, 255, 255, 1);
                }
            `;

            // Add styles to document if they don't exist
            if (!document.getElementById('sliderStyles')) {
                const styleSheet = document.createElement('style');
                styleSheet.id = 'sliderStyles';
                styleSheet.textContent = webkitStyles + firefoxStyles;
                document.head.appendChild(styleSheet);
            }

            const valueDisplay = document.createElement('span');
            valueDisplay.textContent = param.value;
            valueDisplay.dataset.param = key;
            valueDisplay.style.cssText = `
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 12px;
                color: #0ff;
                text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
                font-family: 'Courier New', monospace;
            `;

            // Add hover effect to slider container
            sliderContainer.addEventListener('mouseover', () => {
                sliderContainer.style.borderColor = 'rgba(0, 255, 255, 0.4)';
                sliderContainer.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.2)';
            });

            sliderContainer.addEventListener('mouseout', () => {
                sliderContainer.style.borderColor = 'rgba(0, 255, 255, 0.2)';
                sliderContainer.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.1)';
            });

            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                // Enforce limits for specific parameters
                if (key === 'particleCount') {
                    param.value = Math.min(500, Math.max(1, value));
                } else if (key === 'connectionDistance') {
                    param.value = Math.min(300, Math.max(1, value));
                } else {
                    param.value = value;
                }
                valueDisplay.textContent = param.value;
                
                // Special handling for particle count changes
                if (key === 'particleCount') {
                    this.updateParticleCount(param.value);
                }
                
                // Update base radius if size changed
                if (key === 'baseSize') {
                    this.baseRadius = Math.min(this.canvas.width, this.canvas.height) * param.value;
                    this.maxRadius = Math.min(this.canvas.width, this.canvas.height) * (param.value * 2.25);
                }
            });

            sliderContainer.appendChild(slider);
            sliderContainer.appendChild(valueDisplay);
            container.appendChild(sliderContainer);
            this.controlPanel.appendChild(container);
        });

        document.body.appendChild(this.controlPanel);
    }

    createControlHint() {
        // Create floating hint button
        this.controlHint = document.createElement('div');
        this.controlHint.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(5px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            opacity: 0.8;
        `;

        // Add keyboard icon
        const keyboardIcon = document.createElement('span');
        keyboardIcon.textContent = '⌨';
        keyboardIcon.style.fontSize = '16px';

        // Add text
        const text = document.createElement('span');
        text.textContent = 'Press "C" for controls';

        this.controlHint.appendChild(keyboardIcon);
        this.controlHint.appendChild(text);

        // Add hover effect
        this.controlHint.addEventListener('mouseover', () => {
            this.controlHint.style.background = 'rgba(0, 0, 0, 0.9)';
            this.controlHint.style.opacity = '1';
            this.controlHint.style.transform = 'scale(1.05)';
        });

        this.controlHint.addEventListener('mouseout', () => {
            this.controlHint.style.background = 'rgba(0, 0, 0, 0.7)';
            this.controlHint.style.opacity = '0.8';
            this.controlHint.style.transform = 'scale(1)';
        });

        // Add click handler
        this.controlHint.addEventListener('click', () => {
            this.toggleControls();
        });

        document.body.appendChild(this.controlHint);
    }

    createCleanModeButton() {
        this.cleanModeButton = document.createElement('div');
        this.cleanModeButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(5px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            opacity: 0.8;
        `;

        // Add icon
        const icon = document.createElement('span');
        icon.textContent = '👁';
        icon.style.fontSize = '16px';

        // Add text
        const text = document.createElement('span');
        text.textContent = 'Clean Mode (X)';

        this.cleanModeButton.appendChild(icon);
        this.cleanModeButton.appendChild(text);

        // Add hover effect
        this.cleanModeButton.addEventListener('mouseover', () => {
            this.cleanModeButton.style.background = 'rgba(0, 0, 0, 0.9)';
            this.cleanModeButton.style.opacity = '1';
            this.cleanModeButton.style.transform = 'scale(1.05)';
        });

        this.cleanModeButton.addEventListener('mouseout', () => {
            this.cleanModeButton.style.background = 'rgba(0, 0, 0, 0.7)';
            this.cleanModeButton.style.opacity = '0.8';
            this.cleanModeButton.style.transform = 'scale(1)';
        });

        // Add click handler
        this.cleanModeButton.addEventListener('click', () => {
            this.toggleCleanMode();
        });

        document.body.appendChild(this.cleanModeButton);
    }

    toggleCleanMode() {
        this.cleanMode = !this.cleanMode;
        
        // Update button appearance
        if (this.cleanMode) {
            this.cleanModeButton.style.background = 'rgba(0, 255, 255, 0.3)';
            this.cleanModeButton.style.borderColor = 'rgba(0, 255, 255, 0.5)';
        } else {
            this.cleanModeButton.style.background = 'rgba(0, 0, 0, 0.7)';
            this.cleanModeButton.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }

        // Hide/show UI elements
        if (this.cleanMode) {
            this.controlHint.style.display = 'none';
            this.controlPanel.style.display = 'none';
            this.showControls = false;
        } else {
            this.controlHint.style.display = 'flex';
            this.cleanModeButton.style.display = 'flex';
        }
    }

    toggleControls() {
        if (this.cleanMode) return;
        this.showControls = !this.showControls;
        this.controlPanel.style.display = this.showControls ? 'block' : 'none';
        this.controlHint.style.opacity = this.showControls ? '0.4' : '0.8';
    }

    updateParticleCount(count) {
        this.numParticles = Math.floor(count);
        this.init(); // Reinitialize with new particle count
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
    }

    init() {
        this.particles = [];
        
        // Create particles in a tighter initial formation
        for (let i = 0; i < this.numParticles; i++) {
            const angle = (i / this.numParticles) * Math.PI * 2;
            const radius = this.baseRadius * (0.8 + Math.random() * 0.4);
            const x = this.centerX + Math.cos(angle) * radius;
            const y = this.centerY + Math.sin(angle) * radius;
            const distanceFromCenter = Math.sqrt(
                Math.pow(x - this.centerX, 2) + 
                Math.pow(y - this.centerY, 2)
            );
            this.particles.push(new Particle(x, y, distanceFromCenter));
        }
    }

    update(audioData = 1, bassIntensity = 1, trebleIntensity = 1, waveformData = null, transientData = null) {
        const fadeAlpha = Math.max(0.05, Math.min(0.2, 0.15 - (bassIntensity * 0.1)));
        this.ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const currentIntensity = transientData ? 
            transientData.intensity * this.params.transientSensitivity.value : 0;
        const now = Date.now();
        
        // Use beat sensitivity parameter
        if (currentIntensity > this.params.beatSensitivity.value && (now - this.lastBeat) > this.beatInterval) {
            this.lastBeat = now;
            this.hueRotation = (this.hueRotation + this.params.colorCycleSpeed.value) % 360;
            
            // Use explosion strength parameter
            this.explosionForce = Math.min(
                this.params.explosionStrength.value, 
                this.explosionForce + currentIntensity * this.params.explosionStrength.value
            );
        }

        // Decay explosion force
        this.explosionForce *= 0.95;

        this.transientHistory.push({
            intensity: currentIntensity,
            time: now,
            age: 0
        });

        // Safety checks with increased range for more dramatic effects
        bassIntensity = Math.min(2, Math.max(0, bassIntensity * 1.5));
        trebleIntensity = Math.min(2, Math.max(0, trebleIntensity * 1.2));
        
        // More dramatic pulse effect
        if (currentIntensity > 0.1) {
            this.pulseStrength = Math.min(1.5, this.pulseStrength + currentIntensity * 0.5);
            this.pulseRadius = 0;
        }
        
        // Faster pulse animation
        this.pulseRadius += Math.min(25, 8 + bassIntensity * 15);
        this.pulseStrength *= 0.92; // Slower decay for longer-lasting effects

        // History management
        while (this.transientHistory.length > this.maxTransientHistory) {
            this.transientHistory.shift();
        }

        this.transientHistory = this.transientHistory
            .map(t => ({ ...t, age: (now - t.time) / 1000 }))
            .filter(t => t.age < 2);

        // Enhanced pulse rings
        if (this.pulseStrength > 0.01 && this.pulseRadius < this.canvas.width) {
            const gradient = this.ctx.createRadialGradient(
                this.centerX, this.centerY, 0,
                this.centerX, this.centerY, this.pulseRadius
            );
            const hue = (this.hueRotation + 180) % 360;
            gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0)`);
            gradient.addColorStop(0.5, `hsla(${hue}, 100%, 50%, ${0.15 * this.pulseStrength})`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
            
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, this.pulseRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }

        const time = now / 1000;
        this.particles.forEach((particle, index) => {
            const dx = particle.x - this.centerX;
            const dy = particle.y - this.centerY;
            const angle = Math.atan2(dy, dx);
            
            // More dramatic oscillation
            const oscillation = Math.sin(time * 2 + index * 0.1) * 0.5;
            
            // Enhanced pulse effect with explosion force
            const pulseEffect = Math.min(8, (this.pulseStrength + this.explosionForce) * 5 * 
                (1 - particle.distanceFromCenter / (this.canvas.width * 0.3)));
            
            // More dynamic movement
            const baseSpeed = Math.min(3, 0.5 + (bassIntensity * 1.5) + oscillation * 0.3);
            
            // Use rotation speed parameter
            const orbitAngle = baseSpeed * (0.01 + Math.min(0.08, currentIntensity * 0.05)) * this.params.rotationSpeed.value;
            
            // Calculate radius with more variation
            let targetRadius = this.baseRadius * (1 + (bassIntensity + this.explosionForce) * 0.5);
            targetRadius = Math.min(this.maxRadius, targetRadius);
            
            // Add some chaos to the movement
            const chaos = (Math.sin(time * 3 + index) * 0.5 + 0.5) * currentIntensity * 50;
            const currentRadius = Math.sqrt(dx * dx + dy * dy);
            const newRadius = currentRadius + (targetRadius - currentRadius) * 0.1 + chaos;
            
            // Update position with more dramatic movement
            particle.x = this.centerX + Math.cos(angle + orbitAngle) * newRadius * (1 + oscillation * 0.2);
            particle.y = this.centerY + Math.sin(angle + orbitAngle) * newRadius * (1 + oscillation * 0.2);
            
            // Enhanced particle properties
            particle.energy = Math.min(2, Math.max(bassIntensity, currentIntensity * 1.5));
            particle.hue = (this.hueRotation + index * (360 / this.numParticles)) % 360;
            particle.update(audioData, Math.min(3, bassIntensity + currentIntensity), trebleIntensity);
            particle.draw(this.ctx, oscillation * (1 + this.explosionForce));
        });

        // Draw visualizations with enhanced intensity
        this.drawConnections(Math.min(1.5, bassIntensity + currentIntensity));
        if (waveformData) {
            this.drawWaveform(waveformData);
        }
        this.drawTransients();
    }

    drawTransients() {
        if (this.cleanMode) return;
        const width = this.canvas.width * 0.3;
        const height = this.canvas.height * 0.15;
        const x = 20;
        const y = 20;
        const padding = 15;

        // Draw background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, width, height);

        // Draw border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.strokeRect(x, y, width, height);

        // Draw label
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('Transients', x + 5, y + 12);

        const graphHeight = height - padding * 2;
        const graphY = y + padding;
        const graphWidth = width - padding * 2;
        const graphX = x + padding;

        // Calculate points with proper x-coordinate scaling
        const points = this.transientHistory.map((t, i) => {
            // Scale x-coordinates to use the full width
            const xProgress = i / (this.transientHistory.length - 1);
            const pointX = graphX + (graphWidth * xProgress);
            
            return {
                x: pointX,
                y: graphY + graphHeight - (t.intensity * this.scalingFactor * graphHeight),
                intensity: t.intensity,
                age: t.age
            };
        }).reverse(); // Reverse to draw newest points on the right

        if (points.length < 2) return; // Need at least 2 points to draw

        // Draw filled area under the line
        this.ctx.beginPath();
        this.ctx.moveTo(graphX, graphY + graphHeight);
        points.forEach(point => {
            this.ctx.lineTo(point.x, point.y);
        });
        this.ctx.lineTo(graphX + graphWidth, graphY + graphHeight);
        this.ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
        this.ctx.fill();

        // Draw the line itself
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
        this.ctx.lineWidth = 1.5;
        this.ctx.lineJoin = 'round';
        
        points.forEach((point, i) => {
            if (i === 0) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                this.ctx.lineTo(point.x, point.y);
            }
        });
        this.ctx.stroke();

        // Draw peaks as dots
        points.forEach(point => {
            if (point.intensity > 0.1) {
                const opacity = Math.max(0, 1 - point.age / 2);
                this.ctx.beginPath();
                this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                this.ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        // Draw scale indicator
        const scaleY = graphY + graphHeight - (0.5 * this.scalingFactor * graphHeight);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.setLineDash([2, 2]);
        this.ctx.beginPath();
        this.ctx.moveTo(graphX, scaleY);
        this.ctx.lineTo(graphX + graphWidth, scaleY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawWaveform(waveformData) {
        if (this.cleanMode) return;
        const width = this.canvas.width * 0.3; // 30% of screen width
        const height = this.canvas.height * 0.15; // 15% of screen height
        const x = this.canvas.width - width - 20; // 20px padding from right
        const y = 20; // 20px padding from top

        // Draw background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, width, height);

        // Draw border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.strokeRect(x, y, width, height);

        // Draw waveform
        const sliceWidth = width / waveformData.length;
        let currentX = x;

        this.ctx.beginPath();
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)'; // Cyan color for waveform

        for (let i = 0; i < waveformData.length; i++) {
            const v = waveformData[i] / 128.0; // Convert to range [-1, 1]
            const yPos = y + (height / 2) * (1 + v);

            if (i === 0) {
                this.ctx.moveTo(currentX, yPos);
            } else {
                this.ctx.lineTo(currentX, yPos);
            }

            currentX += sliceWidth;
        }

        this.ctx.lineTo(x + width, y + height / 2);
        this.ctx.stroke();

        // Draw label
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('Waveform', x + 5, y + 15);
    }

    drawConnections(intensity) {
        // Use connection distance parameter
        const maxDistance = this.params.connectionDistance.value * (1 + intensity * 0.8);
        const maxLineWidth = 3 * (1 + intensity * 0.8);
        const baseAlpha = 0.2 + intensity * 0.3;

        // Performance optimization: Only check nearby particles using grid-based approach
        const gridSize = maxDistance;
        const grid = {};
        
        // Place particles in grid cells
        this.particles.forEach((particle, index) => {
            const cellX = Math.floor(particle.x / gridSize);
            const cellY = Math.floor(particle.y / gridSize);
            const cellKey = `${cellX},${cellY}`;
            if (!grid[cellKey]) grid[cellKey] = [];
            grid[cellKey].push(index);
        });

        // Calculate average energy more efficiently
        const avgEnergy = Math.min(1, this.particles.reduce((sum, p) => sum + p.energy, 0) / this.particles.length);

        // Create a web-like effect by tracking strong connections
        const strongConnections = new Set();
        
        this.particles.forEach((p1, i) => {
            const cellX = Math.floor(p1.x / gridSize);
            const cellY = Math.floor(p1.y / gridSize);
            
            // Check only neighboring cells
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const neighborKey = `${cellX + dx},${cellY + dy}`;
                    if (!grid[neighborKey]) continue;
                    
                    grid[neighborKey].forEach(j => {
                        if (j <= i) return; // Avoid duplicate connections
                        
                        const p2 = this.particles[j];
                        const dx = p2.x - p1.x;
                        const dy = p2.y - p1.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < maxDistance) {
                            const distanceRatio = 1 - (distance / maxDistance);
                            const alpha = baseAlpha * distanceRatio;
                            const energyBoost = Math.max(p1.energy, p2.energy);
                            const lineWidth = Math.min(maxLineWidth * distanceRatio * (1 + energyBoost), 4);
                            
                            // Create dynamic gradient based on particle energies
                            const gradient = this.ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                            const p1Opacity = alpha * (0.5 + p1.energy * 0.5);
                            const p2Opacity = alpha * (0.5 + p2.energy * 0.5);
                            
                            gradient.addColorStop(0, `hsla(${p1.hue}, 100%, 50%, ${p1Opacity})`);
                            gradient.addColorStop(1, `hsla(${p2.hue}, 100%, 50%, ${p2Opacity})`);
                            
                            // Draw main connection
                            this.ctx.beginPath();
                            this.ctx.moveTo(p1.x, p1.y);
                            this.ctx.lineTo(p2.x, p2.y);
                            this.ctx.strokeStyle = gradient;
                            this.ctx.lineWidth = lineWidth;
                            this.ctx.stroke();

                            // Track strong connections for secondary effects
                            if (distance < maxDistance * 0.5 && energyBoost > 0.5) {
                                strongConnections.add(`${i},${j}`);
                            }
                        }
                    });
                }
            }
        });

        // Draw secondary connection effects for strong connections
        if (avgEnergy > 0.3) {
            strongConnections.forEach(connection => {
                const [i, j] = connection.split(',').map(Number);
                const p1 = this.particles[i];
                const p2 = this.particles[j];
                
                // Create pulsing glow effect
                const glowGradient = this.ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                const glowOpacity = this.params.glowIntensity.value * (0.1 + (avgEnergy * 0.2) * 
                    (1 + Math.sin(Date.now() / 500) * 0.5));
                
                glowGradient.addColorStop(0, `hsla(${p1.hue}, 100%, 70%, ${glowOpacity})`);
                glowGradient.addColorStop(0.5, `hsla(${(p1.hue + p2.hue) / 2}, 100%, 70%, ${glowOpacity * 1.5})`);
                glowGradient.addColorStop(1, `hsla(${p2.hue}, 100%, 70%, ${glowOpacity})`);
                
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                this.ctx.lineTo(p2.x, p2.y);
                this.ctx.strokeStyle = glowGradient;
                this.ctx.lineWidth = maxLineWidth * 2;
                this.ctx.globalCompositeOperation = 'lighter';
                this.ctx.stroke();
                this.ctx.globalCompositeOperation = 'source-over';
            });
        }
    }

    randomizePresets() {
        // Helper function to get random value within range
        const getRandomValue = (min, max, step) => {
            const steps = Math.floor((max - min) / step);
            return min + (Math.floor(Math.random() * steps) * step);
        };

        // Randomize each parameter
        Object.entries(this.params).forEach(([key, param]) => {
            let newValue = getRandomValue(param.min, param.max, param.step);
            
            // Enforce limits for specific parameters
            if (key === 'particleCount') {
                newValue = Math.min(500, Math.max(1, newValue));
            } else if (key === 'connectionDistance') {
                newValue = Math.min(300, Math.max(1, newValue));
            }
            
            param.value = newValue;

            // Update slider visual and value display
            const slider = this.controlPanel.querySelector(`input[type="range"][data-param="${key}"]`);
            const valueDisplay = this.controlPanel.querySelector(`span[data-param="${key}"]`);
            
            if (slider && valueDisplay) {
                slider.value = newValue;
                valueDisplay.textContent = newValue;
                
                // Create and dispatch a more complete input event
                const inputEvent = new InputEvent('input', {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    inputType: 'insertText',
                    data: String(newValue)
                });
                slider.dispatchEvent(inputEvent);
                
                // Also dispatch a change event for good measure
                const changeEvent = new Event('change', {
                    bubbles: true,
                    cancelable: true
                });
                slider.dispatchEvent(changeEvent);
            }

            // Special handling for particle count changes
            if (key === 'particleCount') {
                this.updateParticleCount(newValue);
            }
            
            // Update base radius if size changed
            if (key === 'baseSize') {
                this.baseRadius = Math.min(this.canvas.width, this.canvas.height) * newValue;
                this.maxRadius = Math.min(this.canvas.width, this.canvas.height) * (newValue * 2.25);
            }
        });
    }
} 