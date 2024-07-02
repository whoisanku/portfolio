import React, { useRef, useEffect } from "react";
import * as THREE from "three";

interface MoonLoaderProps {
  size?: number;
}

const MoonLoader: React.FC<MoonLoaderProps> = ({ size = 300 }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    renderer.setSize(size, size);
    mountRef.current.appendChild(renderer.domElement);

    // Camera position
    camera.position.z = 1.5;

    // Create moon
    const geometry = new THREE.SphereGeometry(1, 128, 128);

    // Create custom shader material for moon surface with realistic craters
    const moonMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        lightPosition: { value: new THREE.Vector3(5, 3, 5) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 lightPosition;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        // Improved noise function
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                             -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1;
          i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                           + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m ;
          m = m*m ;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        float crater(vec2 uv, float scale, float offset) {
          float n = snoise(uv * scale + offset);
          return smoothstep(0.4, 0.5, n);
        }

        void main() {
          vec3 baseColor = vec3(0.6, 0.6, 0.6);  // Grey base color
          
          // Create multiple layers of craters with distinct areas
          float c1 = crater(vUv + time * 0.01, 10.0, 0.0);
          float c2 = crater(vUv - time * 0.015, 20.0, 50.0);
          float c3 = crater(vUv + time * 0.02, 30.0, 100.0);
          
          float craterDepth = max(c1, max(c2, c3)) * 0.5;

          // Lighting
          vec3 lightDir = normalize(lightPosition - vViewPosition);
          float diff = max(dot(vNormal, lightDir), 0.0);
          float ambient = 0.3;
          float shadow = 1.0 - craterDepth * 0.5;

          vec3 color = baseColor * (ambient + diff * shadow);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    const moon = new THREE.Mesh(geometry, moonMaterial);
    scene.add(moon);

    // Add a point light to simulate moon illumination
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(5, 3, 5);
    scene.add(pointLight);

    // Animation
    const animate = (time: number) => {
      moon.rotation.y = time * 0.0002;
      moonMaterial.uniforms.time.value = time * 0.001;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate(0);

    // Cleanup
    return () => {
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [size]);

  return (
    <div className="flex items-center justify-center">
      <div
        ref={mountRef}
        className="w-full h-full rounded-full overflow-hidden"
        style={{ width: size, height: size }}
      />
    </div>
  );
};

export default MoonLoader;
