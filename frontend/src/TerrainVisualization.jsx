import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export function TerrainVisualization() {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const animationRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/terrain/mesh')
      .then(res => {
        if (!res.ok) throw new Error(`Mesh API returned ${res.status}`);
        return res.json();
      })
      .then(meshData => {
        setData(meshData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch terrain data:', err);
        setError('Could not load terrain data');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!data || !containerRef.current) return;

    // Check WebGL support before attempting renderer creation
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      setError('WebGL is not supported on this device');
      return;
    }

    let renderer;
    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf5ede4);

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      if (width === 0 || height === 0) {
        setError('Visualization container has no dimensions');
        return;
      }

      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.set(5, 5, 8);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Create geometry from vertices and colors
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(data.vertices), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(data.colors), 3));

      const material = new THREE.PointsMaterial({
        size: 1.2,
        vertexColors: true,
        sizeAttenuation: true,
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);

      // Lighting
      const light = new THREE.PointLight(0xffffff, 1, 100);
      light.position.set(5, 10, 5);
      scene.add(light);
      scene.add(new THREE.AmbientLight(0xffffff, 0.5));

      // Helpers
      scene.add(new THREE.GridHelper(10, 10, 0xd4cac0, 0xe8ddd2));
      scene.add(new THREE.AxesHelper(5));

      // Mouse controls
      let isDragging = false;
      let previousMousePosition = { x: 0, y: 0 };

      const onMouseDown = (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      };

      const onMouseMove = (e) => {
        if (!isDragging) return;
        points.rotation.y += (e.clientX - previousMousePosition.x) * 0.005;
        points.rotation.x += (e.clientY - previousMousePosition.y) * 0.005;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      };

      const onMouseUp = () => { isDragging = false; };

      const onWheel = (e) => {
        e.preventDefault();
        camera.position.z += e.deltaY * 0.01;
      };

      renderer.domElement.addEventListener('mousedown', onMouseDown);
      renderer.domElement.addEventListener('mousemove', onMouseMove);
      renderer.domElement.addEventListener('mouseup', onMouseUp);
      renderer.domElement.addEventListener('wheel', onWheel);

      // Animation loop
      const animate = () => {
        animationRef.current = requestAnimationFrame(animate);
        if (!isDragging) {
          points.rotation.y += 0.0005;
        }
        renderer.render(scene, camera);
      };
      animate();

      // Resize handler
      const handleResize = () => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        renderer.domElement.removeEventListener('mousedown', onMouseDown);
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.domElement.removeEventListener('mouseup', onMouseUp);
        renderer.domElement.removeEventListener('wheel', onWheel);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    } catch (err) {
      console.error('Three.js initialization failed:', err);
      setError('3D visualization could not be initialized');
      if (renderer) {
        try { renderer.dispose(); } catch (_) {}
      }
    }
  }, [data]);

  if (error) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5ede4',
        color: '#7a6f66',
        fontSize: '0.95rem',
        fontFamily: 'Inter, sans-serif',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <div>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🗺️</div>
          <div>{error}</div>
          <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.7 }}>
            Sentiment data is still available in the sidebar
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#7a6f66',
          fontSize: '18px',
          zIndex: 10,
        }}>
          Loading terrain...
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
