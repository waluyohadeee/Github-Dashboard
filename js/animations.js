// js/animations.js (File BARU)
// Diambil dari script.js ai-solution

document.addEventListener('DOMContentLoaded', function() {
    createParticles();
});

function createParticles() {
    const container = document.querySelector('.particles-container');
    if (!container) return;
    
    // Jangan buat terlalu banyak partikel
    for (let i = 0; i < 30; i++) { 
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.animationDelay = Math.random() * 10 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        container.appendChild(particle);
    }
}