document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('visualizer');
    const audioInput = document.getElementById('audioInput');
    const playPauseButton = document.getElementById('playPause');
    
    const audioAnalyzer = new AudioAnalyzer();
    const particleSystem = new ParticleSystem(canvas);
    
    let animationFrameId = null;
    let lastAudioData = { avg: 1, bass: 1, treble: 1 };
    
    function animate() {
        let currentAudioData = {
            avg: 1,
            bass: 1,
            treble: 1
        };

        let waveformData = null;
        let transientData = null;

        if (audioAnalyzer.isPlaying) {
            currentAudioData = {
                avg: audioAnalyzer.getAverageFrequency(),
                bass: audioAnalyzer.getBassFrequency(),
                treble: audioAnalyzer.getTrebleFrequency()
            };
            waveformData = audioAnalyzer.getWaveformData();
            transientData = audioAnalyzer.detectTransient();
        }

        // Smooth transition between audio states
        lastAudioData = {
            avg: lastAudioData.avg + (currentAudioData.avg - lastAudioData.avg) * 0.1,
            bass: lastAudioData.bass + (currentAudioData.bass - lastAudioData.bass) * 0.1,
            treble: lastAudioData.treble + (currentAudioData.treble - lastAudioData.treble) * 0.1
        };
        
        particleSystem.update(
            lastAudioData.avg, 
            lastAudioData.bass, 
            lastAudioData.treble,
            waveformData,
            transientData
        );
        
        animationFrameId = requestAnimationFrame(animate);
    }
    
    audioInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Stop any existing playback
        if (audioAnalyzer.isPlaying) {
            audioAnalyzer.stop();
            playPauseButton.textContent = 'Play';
        }
        
        const success = await audioAnalyzer.loadAudio(file);
        if (success) {
            playPauseButton.disabled = false;
        }
    });
    
    playPauseButton.addEventListener('click', () => {
        if (!audioAnalyzer.isPlaying) {
            audioAnalyzer.play();
            playPauseButton.textContent = 'Pause';
        } else {
            audioAnalyzer.stop();
            playPauseButton.textContent = 'Play';
        }
    });
    
    // Start animation loop
    animate();
    
    // Initial button state
    playPauseButton.disabled = true;
}); 