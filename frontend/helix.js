/**
 * 3D Helical Polygonal Ribbon Torus
 * Accurately models the exact 3D shape, pentagonal inner aperture, and rotating gradient
 * rotating continuously around an axis through its centre into the plane.
 */
class HelicalTorus {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    // Geometry settings
    this.numSlices = 240;        // Densely spaced parallel fins/ribs
    this.twists = 2.5;           // 5 half-twists = creates the distinct 5-lobed inner opening
    
    // Rotation & Axis parameters
    // "rotates around an axis through it's centre into the plane"
    this.spinAngle = 0;          // Continuous rotation around central normal axis
    this.spinSpeed = 0.010;      // Smooth stately rotation speed
    
    // Perspective tilt (shows 3D depth into the plane while spinning around center)
    this.basePitch = 0.32;       // ~18 degrees tilt X
    this.baseYaw = -0.22;        // ~-12 degrees tilt Y
    this.currentPitch = this.basePitch;
    this.currentYaw = this.baseYaw;
    this.targetPitch = this.basePitch;
    this.targetYaw = this.baseYaw;
    
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
      
      // Interactive 3D parallax tracking
      this.targetPitch = this.basePitch + dy * 0.18;
      this.targetYaw = this.baseYaw + dx * 0.22;
    });
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    
    // Larger dynamic canvas size (up to 560px)
    const size = Math.min(Math.max(rect.width, 360), Math.max(rect.height, 460), 560);
    
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.viewSize = size;
    
    // Dynamic radii based on enlarged canvas
    this.majorRadius = size * 0.31;  // Prominent large ring diameter (~165px on 540px view)
    this.ribbonWidth = size * 0.135; // Generous ribbon width (~72px)
  }

  project(x, y, z, cx, cy) {
    // 3D rotation with Yaw (Y) and Pitch (X)
    const cosY = Math.cos(this.currentYaw);
    const sinY = Math.sin(this.currentYaw);
    const cosX = Math.cos(this.currentPitch);
    const sinX = Math.sin(this.currentPitch);
    
    // Rotate around Y axis
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;
    
    // Rotate around X axis
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;
    
    // Perspective projection onto the view plane
    const fov = 520;
    const scale = fov / (fov + z2 + 200);
    
    return {
      x: cx + x1 * scale,
      y: cy + y2 * scale,
      z: z2,
      scale: scale
    };
  }

  /**
   * Evaluates the precise color and opacity for slice i
   * Features the exact gradient from the reference:
   * - Crisp edge at ~30° meeting dark charcoal
   * - Warm taupe-gray along bottom & lower-left
   * - Soft peach gradient ascending on the left
   * - Blazing intense vermilion/orange along the top arc
   * Both shape AND gradient rotate synchronously around the central axis.
   */
  getSliceStyle(sliceFraction, depthFactor) {
    // sliceFraction is in [0, 1) representing position along the perimeter
    const angle = sliceFraction * Math.PI * 2;
    
    // Color zones:
    // 0 to 0.12 (approx 0° to 43°): Vibrant orange terminating sharply at 43°
    // 0.12 to 0.55 (43° to 198°): Deep charcoal / taupe-gray
    // 0.55 to 0.76 (198° to 274°): Soft peach / coral transitional gradient
    // 0.76 to 1.0 (274° to 360°): Fiery radiant orange
    
    let r, g, b, alpha;
    
    if (angle >= 0.75 && angle <= 0.75 + (0.13 * Math.PI * 2)) {
      // 1. Sharp cut-off section near upper-right:
      // Dark charcoal right after the sharp boundary
      const localT = (angle - 0.75) / (0.13 * Math.PI * 2);
      r = Math.round(55 + localT * 25);
      g = Math.round(50 + localT * 22);
      b = Math.round(45 + localT * 20);
      alpha = 0.55 + depthFactor * 0.40;
    } else if (angle > 0.75 + (0.13 * Math.PI * 2) && angle < Math.PI * 1.15) {
      // 2. Taupe / metallic warm gray through bottom and lower-left
      const t = (angle - (0.75 + 0.13 * Math.PI * 2)) / (Math.PI * 1.15 - (0.75 + 0.13 * Math.PI * 2));
      r = Math.round(80 + t * 45);
      g = Math.round(72 + t * 40);
      b = Math.round(65 + t * 35);
      alpha = 0.45 + depthFactor * 0.45;
    } else if (angle >= Math.PI * 1.15 && angle < Math.PI * 1.55) {
      // 3. Gradual warming transition from taupe to soft peach/coral on left
      const t = (angle - Math.PI * 1.15) / (Math.PI * 0.40);
      r = Math.round(125 + t * 115); // -> 240
      g = Math.round(105 + t * 45);  // -> 150
      b = Math.round(100 + t * 25);  // -> 125
      alpha = 0.60 + depthFactor * 0.35;
    } else {
      // 4. Vibrant fiery vermilion / orange arc along top and top-right
      let t;
      if (angle >= Math.PI * 1.55) {
        t = (angle - Math.PI * 1.55) / (Math.PI * 2 - Math.PI * 1.55 + 0.75);
      } else {
        t = (angle + (Math.PI * 2 - Math.PI * 1.55)) / (Math.PI * 2 - Math.PI * 1.55 + 0.75);
      }
      
      // Intense gradient from bright coral (#FF6B35) to deep vermilion (#FF3A05)
      r = 255;
      g = Math.round(110 - t * 45);
      b = Math.round(45 - t * 35);
      alpha = 0.75 + depthFactor * 0.25;
    }
    
    return {
      stroke: `rgba(${r}, ${g}, ${b}, ${Math.min(1, alpha)})`,
      lineWidth: 1.4 + depthFactor * 0.8
    };
  }

  animate() {
    // Smooth camera tilt damping
    this.currentPitch += (this.targetPitch - this.currentPitch) * 0.05;
    this.currentYaw += (this.targetYaw - this.currentYaw) * 0.05;
    
    // Continuous rotation around central axis through into the plane
    this.spinAngle += this.spinSpeed;
    if (this.spinAngle > Math.PI * 2) {
      this.spinAngle -= Math.PI * 2;
    }

    const cx = this.viewSize / 2;
    const cy = this.viewSize / 2;
    
    this.ctx.clearRect(0, 0, this.viewSize, this.viewSize);
    
    const lines = [];
    const twoPi = Math.PI * 2;

    for (let i = 0; i < this.numSlices; i++) {
      const sliceFraction = i / this.numSlices;
      const baseAngle = sliceFraction * twoPi;
      
      // Spin angle applies directly to the ring position -> rotates into the plane
      const theta = (baseAngle + this.spinAngle) % twoPi;
      
      // Ring center point in 3D (XY plane)
      const ringX = Math.cos(theta) * this.majorRadius;
      const ringY = Math.sin(theta) * this.majorRadius;
      const ringZ = 0;
      
      // Radial direction pointing outwards from center
      const rx = Math.cos(theta);
      const ry = Math.sin(theta);
      const rz = 0;
      
      // Axis normal to plane (Z axis through center into the plane)
      const ax = 0;
      const ay = 0;
      const az = 1;
      
      // Helical ribbon twist:
      // Twist progresses along the perimeter, creating the polygonal inner contour
      const twistPhase = baseAngle * this.twists;
      const cosTwist = Math.cos(twistPhase);
      const sinTwist = Math.sin(twistPhase);
      
      // Vector along the slice blade
      const vx = rx * cosTwist + ax * sinTwist;
      const vy = ry * cosTwist + ay * sinTwist;
      const vz = rz * cosTwist + az * sinTwist;
      
      // Blade length
      const halfWidth = this.ribbonWidth * 0.5;
      
      // 3D endpoints of the slice
      const p1_3d = {
        x: ringX + vx * halfWidth,
        y: ringY + vy * halfWidth,
        z: ringZ + vz * halfWidth
      };
      
      const p2_3d = {
        x: ringX - vx * halfWidth,
        y: ringY - vy * halfWidth,
        z: ringZ - vz * halfWidth
      };
      
      const p1 = this.project(p1_3d.x, p1_3d.y, p1_3d.z, cx, cy);
      const p2 = this.project(p2_3d.x, p2_3d.y, p2_3d.z, cx, cy);
      
      const zAvg = (p1.z + p2.z) / 2;
      
      lines.push({
        p1,
        p2,
        zAvg,
        sliceFraction // Fixed to slice so gradient rotates with the shape
      });
    }

    // Sort by depth (painter's algorithm: draw back-to-front)
    lines.sort((a, b) => b.zAvg - a.zAvg);

    // Min and max depth for normalizing shading
    const minZ = -this.ribbonWidth - 50;
    const maxZ = this.ribbonWidth + 50;

    // Render slices
    for (const line of lines) {
      const { p1, p2, zAvg, sliceFraction } = line;
      
      const depthFactor = Math.max(0, Math.min(1, (zAvg - minZ) / (maxZ - minZ)));
      const style = this.getSliceStyle(sliceFraction, depthFactor);
      
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      
      this.ctx.strokeStyle = style.stroke;
      this.ctx.lineWidth = style.lineWidth;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
    }

    requestAnimationFrame(this.animate);
  }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  new HelicalTorus('helixCanvas');
});
