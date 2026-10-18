/**
 * Helical Circular Torus Canvas Animation
 * Implements the 3D rotating helical wireframe ring with trailing vibrant orange pulse.
 */
class HelicalTorus {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    // Geometry settings
    this.numSlices = 160;        // Number of line elements around ring
    this.majorRadius = 105;      // Ring diameter
    this.minorRadius = 38;       // Tube thickness / ribbon width
    this.twists = 1.0;           // Twist along ribbon (half-twist / Moebius effect)
    
    // Animation phases
    this.rotationAngle = 0;      // Rotation around ring axis
    this.orangeSweepPhase = 0;   // Position of trailing orange arc
    this.orangeArcLength = Math.PI * 0.55; // Spread of orange trail (~100 deg)
    
    // Interactive mouse parallax
    this.targetPitch = 0.42;     // 3D tilt X
    this.targetYaw = -0.32;      // 3D tilt Y
    this.currentPitch = 0.42;
    this.currentYaw = -0.32;
    
    this.setupEvents();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupEvents() {
    window.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const dx = (e.clientX - centerX) / (window.innerWidth / 2);
      const dy = (e.clientY - centerY) / (window.innerHeight / 2);
      
      this.targetPitch = 0.42 + dy * 0.25;
      this.targetYaw = -0.32 + dx * 0.35;
    });
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height, 420);
    
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.viewSize = size;
  }

  project(x, y, z, cx, cy) {
    // 3D rotation with Yaw (Y) and Pitch (X)
    const cosY = Math.cos(this.currentYaw);
    const sinY = Math.sin(this.currentYaw);
    const cosX = Math.cos(this.currentPitch);
    const sinX = Math.sin(this.currentPitch);
    
    // Rotate Y
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;
    
    // Rotate X
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;
    
    // Perspective projection
    const fov = 400;
    const scale = fov / (fov + z2 + 180);
    
    return {
      x: cx + x1 * scale,
      y: cy + y2 * scale,
      z: z2,
      scale: scale
    };
  }

  animate() {
    // Smooth dampening towards target mouse tilt
    this.currentPitch += (this.targetPitch - this.currentPitch) * 0.05;
    this.currentYaw += (this.targetYaw - this.currentYaw) * 0.05;
    
    // Constant rotation
    this.rotationAngle += 0.012;         // Ring rotation speed
    this.orangeSweepPhase += 0.016;      // Orange pulse traversal speed
    if (this.orangeSweepPhase > Math.PI * 2) {
      this.orangeSweepPhase -= Math.PI * 2;
    }

    const cx = this.viewSize / 2;
    const cy = this.viewSize / 2;
    
    this.ctx.clearRect(0, 0, this.viewSize, this.viewSize);
    
    // Compute 3D segments
    const lines = [];
    const twoPi = Math.PI * 2;

    for (let i = 0; i < this.numSlices; i++) {
      const u = (i / this.numSlices) * twoPi;
      const angle = (u + this.rotationAngle) % twoPi;
      
      // Center of ring in 3D (X-Y plane ring)
      const ringX = Math.cos(angle) * this.majorRadius;
      const ringY = Math.sin(angle) * this.majorRadius;
      const ringZ = 0;
      
      // Normal vector pointing outwards from ring center
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      const nz = 0;
      
      // Binormal vector (Z axis)
      const bx = 0;
      const by = 0;
      const bz = 1;
      
      // Helical ribbon twist
      const twistAngle = u * this.twists + this.rotationAngle * 0.5;
      const cosT = Math.cos(twistAngle);
      const sinT = Math.sin(twistAngle);
      
      // Vector across ribbon
      const vx = nx * cosT + bx * sinT;
      const vy = ny * cosT + by * sinT;
      const vz = nz * cosT + bz * sinT;
      
      // Two endpoints of the line slice
      const halfLen = this.minorRadius * (0.85 + 0.15 * Math.sin(u * 3));
      
      const p1_3d = {
        x: ringX + vx * halfLen,
        y: ringY + vy * halfLen,
        z: ringZ + vz * halfLen
      };
      
      const p2_3d = {
        x: ringX - vx * halfLen,
        y: ringY - vy * halfLen,
        z: ringZ - vz * halfLen
      };
      
      const p1 = this.project(p1_3d.x, p1_3d.y, p1_3d.z, cx, cy);
      const p2 = this.project(p2_3d.x, p2_3d.y, p2_3d.z, cx, cy);
      
      // Calculate angular distance to orange sweep phase for coloring
      let diff = (angle - this.orangeSweepPhase + twoPi) % twoPi;
      
      lines.push({
        p1,
        p2,
        zAvg: (p1.z + p2.z) / 2,
        diff: diff
      });
    }

    // Sort by depth (painter's algorithm) so back lines render behind
    lines.sort((a, b) => b.zAvg - a.zAvg);

    // Render slices
    for (const line of lines) {
      const { p1, p2, diff } = line;
      
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      
      if (diff < this.orangeArcLength) {
        // Trailing orange gradient calculation
        const factor = 1 - (diff / this.orangeArcLength); // 1 at head, 0 at tail
        // Ease the trailing factor
        const easeFactor = Math.pow(factor, 0.8);
        
        // Vibrant coral/orange (#FF4D17 to #FF8A3D)
        const alpha = 0.35 + easeFactor * 0.65;
        this.ctx.strokeStyle = `rgba(255, ${Math.floor(75 + easeFactor * 55)}, ${Math.floor(25 + easeFactor * 25)}, ${alpha})`;
        this.ctx.lineWidth = 1.35 + easeFactor * 0.85;
      } else {
        // Charcoal / Taupe wireframe
        const distFromTail = (diff - this.orangeArcLength) / (twoPi - this.orangeArcLength);
        const alpha = 0.22 + 0.45 * Math.sin(distFromTail * Math.PI);
        this.ctx.strokeStyle = `rgba(55, 48, 42, ${alpha})`;
        this.ctx.lineWidth = 1.05;
      }
      
      this.ctx.stroke();
    }

    requestAnimationFrame(this.animate);
  }
}

// Auto-initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new HelicalTorus('helixCanvas');
});
