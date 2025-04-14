class AudioAnalyzer {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        this.waveformData = new Uint8Array(this.bufferLength);
        this.source = null;
        this.isPlaying = false;

        // Transient detection properties - made much more sensitive
        this.lastEnergy = 0;
        this.energyHistory = new Array(5).fill(0); // Increased history for better change detection
        this.transientThreshold = 1.5; // Even lower threshold
        this.lastTransientTime = 0;
        this.minTimeBetweenTransients = 10; // Shorter time between transients (10ms)
        this.smoothingFactor = 0.7; // For exponential moving average
        this.baselineEnergy = 0; // Running baseline for adaptive threshold
        
        // Frequency band ranges for better transient detection
        this.frequencyBands = {
            kick: { start: 0, end: 0.1 },    // 0-10% of spectrum (low frequencies)
            snare: { start: 0.1, end: 0.3 }, // 10-30% of spectrum (low-mid frequencies)
            hihat: { start: 0.7, end: 1.0 }  // 70-100% of spectrum (high frequencies)
        };
    }

    async loadAudio(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            if (this.source) {
                this.source.disconnect();
            }
            
            this.source = this.audioContext.createBufferSource();
            this.source.buffer = audioBuffer;
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            return true;
        } catch (error) {
            console.error('Error loading audio:', error);
            return false;
        }
    }

    play() {
        if (!this.source) return;
        
        this.source.start(0);
        this.isPlaying = true;
    }

    stop() {
        if (this.source) {
            this.source.stop();
            this.source.disconnect();
            this.source = null;
        }
        this.isPlaying = false;
    }

    getAudioData() {
        this.analyser.getByteFrequencyData(this.dataArray);
        return this.dataArray;
    }

    getWaveformData() {
        this.analyser.getByteTimeDomainData(this.waveformData);
        return this.waveformData;
    }

    detectTransient() {
        const frequencies = this.getAudioData();
        
        // Calculate current energy with frequency weighting
        // Give more weight to mid-high frequencies where transients often occur
        const currentEnergy = frequencies.reduce((acc, val, idx) => {
            const freqWeight = Math.min(1, idx / (frequencies.length / 2)); // Weight increases with frequency
            return acc + (val * freqWeight);
        }, 0) / frequencies.length;
        
        // Update baseline energy with exponential moving average
        this.baselineEnergy = (this.baselineEnergy * this.smoothingFactor) + 
                             (currentEnergy * (1 - this.smoothingFactor));
        
        // Update energy history
        this.energyHistory.shift();
        this.energyHistory.push(currentEnergy);
        
        // Calculate short-term and long-term averages
        const shortTermAvg = this.energyHistory.slice(-2).reduce((a, b) => a + b) / 2;
        const longTermAvg = this.energyHistory.slice(0, -2).reduce((a, b) => a + b) / 
                           (this.energyHistory.length - 2);
        
        // Calculate multiple derivatives for better detection
        const instantChange = currentEnergy - this.energyHistory[this.energyHistory.length - 2];
        const acceleration = instantChange - 
            (this.energyHistory[this.energyHistory.length - 2] - 
             this.energyHistory[this.energyHistory.length - 3]);
        
        // Adaptive threshold based on recent energy levels
        const adaptiveThreshold = this.transientThreshold * 
            (1 + (this.baselineEnergy / 100)) * 
            Math.max(0.5, Math.min(2, longTermAvg / shortTermAvg));
        
        const now = Date.now();
        
        // Multi-condition transient detection
        const isTransient = (
            (Math.abs(instantChange) > adaptiveThreshold || 
             Math.abs(acceleration) > adaptiveThreshold * 1.5 ||
             (currentEnergy / (this.baselineEnergy + 0.1)) > 1.5) && 
            now - this.lastTransientTime > this.minTimeBetweenTransients
        );
        
        if (isTransient) {
            this.lastTransientTime = now;
            
            // Calculate intensity based on multiple factors
            const changeIntensity = Math.abs(instantChange) / 20;
            const accelIntensity = Math.abs(acceleration) / 30;
            const energyRatio = (currentEnergy / (this.baselineEnergy + 0.1)) / 2;
            
            return {
                detected: true,
                intensity: Math.min(1, Math.max(changeIntensity, accelIntensity, energyRatio)),
                time: now
            };
        }
        
        return {
            detected: false,
            intensity: 0,
            time: now
        };
    }

    getAverageFrequency() {
        const frequencies = this.getAudioData();
        return frequencies.reduce((acc, val) => acc + val, 0) / frequencies.length;
    }

    getBassFrequency() {
        const frequencies = this.getAudioData();
        const bassRange = Math.floor(frequencies.length / 4);
        return frequencies.slice(0, bassRange).reduce((acc, val) => acc + val, 0) / bassRange;
    }

    getTrebleFrequency() {
        const frequencies = this.getAudioData();
        const trebleRange = Math.floor(frequencies.length * 3 / 4);
        return frequencies.slice(trebleRange).reduce((acc, val) => acc + val, 0) / (frequencies.length - trebleRange);
    }

    getBandEnergy(frequencies, band) {
        const start = Math.floor(frequencies.length * band.start);
        const end = Math.floor(frequencies.length * band.end);
        const bandFreqs = frequencies.slice(start, end);
        return bandFreqs.reduce((acc, val) => acc + val, 0) / bandFreqs.length;
    }

    getTransientType(kickEnergy, snareEnergy, hihatEnergy) {
        const energies = {
            kick: kickEnergy,
            snare: snareEnergy,
            hihat: hihatEnergy
        };
        
        // Find the dominant energy type
        return Object.entries(energies)
            .reduce((a, b) => a[1] > b[1] ? a : b)[0];
    }
} 