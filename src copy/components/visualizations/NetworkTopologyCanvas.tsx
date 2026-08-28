import { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/utils/helpers';
import { useReducedMotion } from '@/contexts/ReducedMotionContext';

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  glowColor: string;
  type: 'normal' | 'suspicious' | 'attack' | 'server';
  connections: number[];
  pulsePhase: number;
}

interface NetworkEdge {
  source: number;
  target: number;
  color: string;
  progress: number;
  speed: number;
}

const NODE_COLORS = {
  normal: '#38bdf8',     // Sky Blue
  suspicious: '#fbbf24', // Amber
  attack: '#f43f5e',     // Radiant Red
  server: '#a855f7',     // Cyber Purple
};

const GLOW_COLORS = {
  normal: 'rgba(56, 189, 248, 0.45)',
  suspicious: 'rgba(251, 191, 36, 0.55)',
  attack: 'rgba(244, 63, 94, 0.75)',
  server: 'rgba(168, 85, 247, 0.6)',
};

const EDGE_COLORS = {
  normal: 'rgba(56, 189, 248, 0.3)',
  suspicious: 'rgba(251, 191, 36, 0.4)',
  attack: 'rgba(244, 63, 94, 0.55)',
  server: 'rgba(168, 85, 247, 0.35)',
};

export function NetworkTopologyCanvas({ 
  width: initialWidth = 900, 
  height: initialHeight = 280, 
  attackProbability = 0, 
  isAttackLikely = false,
  nodeCount = 45,
  className 
}: { 
  width?: number; 
  height?: number; 
  attackProbability?: number;
  isAttackLikely?: boolean;
  nodeCount?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const nodesRef = useRef<NetworkNode[]>([]);
  const edgesRef = useRef<NetworkEdge[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const [dimensions, setDimensions] = useState({ width: initialWidth, height: initialHeight });
  const { reducedMotion } = useReducedMotion();

  // Dynamic ResizeObserver to ensure crystal-clear scaling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(Math.round(rect.width) || initialWidth, 300);
      const h = Math.max(Math.round(rect.height) || initialHeight, 200);
      setDimensions((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    };

    updateSize();

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({
            width: Math.round(width),
            height: Math.round(height)
          });
        }
      }
    });

    ro.observe(container);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [initialWidth, initialHeight]);

  const initNetwork = useCallback(() => {
    const width = Math.max(dimensions.width, 300);
    const height = Math.max(dimensions.height, 200);
    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];

    const effectiveProb = isAttackLikely ? Math.max(0.65, attackProbability) : attackProbability;

    for (let i = 0; i < nodeCount; i++) {
      const isServer = i < 3;
      const isAttack = !isServer && (i % 4 === 0 && effectiveProb > 0.3 || Math.random() < 0.35 * effectiveProb);
      const isSuspicious = !isServer && !isAttack && (i % 3 === 0 && effectiveProb > 0.2 || Math.random() < 0.3 * effectiveProb);
      
      let type: NetworkNode['type'] = 'normal';
      if (isServer) type = 'server';
      else if (isAttack) type = 'attack';
      else if (isSuspicious) type = 'suspicious';

      // Distribute evenly with slight jitter
      const gridCols = 8;
      const gridRows = Math.ceil(nodeCount / gridCols);
      const colIdx = i % gridCols;
      const rowIdx = Math.floor(i / gridCols);
      const cellW = (width - 60) / gridCols;
      const cellH = (height - 60) / gridRows;

      const baseX = 30 + colIdx * cellW + Math.random() * (cellW * 0.7);
      const baseY = 30 + rowIdx * cellH + Math.random() * (cellH * 0.7);

      nodes.push({
        x: Math.max(20, Math.min(width - 20, baseX)),
        y: Math.max(20, Math.min(height - 20, baseY)),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: isServer ? 7 : isAttack ? 6 : isSuspicious ? 5 : 4,
        color: NODE_COLORS[type],
        glowColor: GLOW_COLORS[type],
        type,
        connections: [],
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    // Connect nodes based on proximity
    nodes.forEach((node, i) => {
      const connectionCount = node.type === 'server' ? 4 : 2;
      const distances: { index: number; dist: number }[] = [];

      nodes.forEach((other, j) => {
        if (i !== j) {
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 220) {
            distances.push({ index: j, dist });
          }
        }
      });

      distances.sort((a, b) => a.dist - b.dist);
      const nearest = distances.slice(0, connectionCount);

      nearest.forEach(({ index }) => {
        if (!node.connections.includes(index)) {
          node.connections.push(index);
          const targetNode = nodes[index];
          if (!targetNode) return;
          const isAttackEdge = node.type === 'attack' || targetNode.type === 'attack';
          const isSuspiciousEdge = node.type === 'suspicious' || targetNode.type === 'suspicious';
          const isServerEdge = node.type === 'server' || targetNode.type === 'server';

          edges.push({
            source: i,
            target: index,
            color: isAttackEdge ? EDGE_COLORS.attack : isSuspiciousEdge ? EDGE_COLORS.suspicious : isServerEdge ? EDGE_COLORS.server : EDGE_COLORS.normal,
            progress: Math.random(),
            speed: 0.005 + Math.random() * 0.008,
          });
        }
      });
    });

    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [attackProbability, isAttackLikely, dimensions, nodeCount]);

  useEffect(() => {
    initNetwork();
  }, [initNetwork]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const animate = () => {
      if (!isRunning) return;

      const width = Math.max(dimensions.width, 300);
      const height = Math.max(dimensions.height, 200);
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, width, height);

      // Deep cyber background fill
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(1, '#05070c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Cyber Grid Lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // If nodes are not initialized yet, initialize them
      if (!nodesRef.current || nodesRef.current.length === 0) {
        initNetwork();
      }

      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      // Update node physics
      nodes.forEach((node) => {
        node.pulsePhase += 0.05;

        if (!reducedMotion) {
          const dx = mouseRef.current.x - node.x;
          const dy = mouseRef.current.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120 && dist > 0) {
            const force = (120 - dist) / 120 * 0.6;
            node.vx -= (dx / dist) * force;
            node.vy -= (dy / dist) * force;
          }

          node.vx *= 0.98;
          node.vy *= 0.98;
          node.x += node.vx;
          node.y += node.vy;

          if (node.x < 20) { node.x = 20; node.vx = Math.abs(node.vx); }
          if (node.x > width - 20) { node.x = width - 20; node.vx = -Math.abs(node.vx); }
          if (node.y < 20) { node.y = 20; node.vy = Math.abs(node.vy); }
          if (node.y > height - 20) { node.y = height - 20; node.vy = -Math.abs(node.vy); }
        }
      });

      // Update edge particles
      edges.forEach((edge) => {
        if (!reducedMotion) {
          edge.progress += edge.speed;
          if (edge.progress > 1) edge.progress = 0;
        }
      });

      // Draw Edges
      edges.forEach((edge) => {
        const source = nodes[edge.source];
        const target = nodes[edge.target];
        if (!source || !target) return;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = edge.color;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Animated Data Packet Glow
        const px = source.x + (target.x - source.x) * edge.progress;
        const py = source.y + (target.y - source.y) * edge.progress;
        
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = edge.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Nodes
      nodes.forEach((node) => {
        const pulse = (Math.sin(node.pulsePhase) + 1) * 0.5; // 0 to 1

        // Outer Pulse Ring for Alert / Attack / Server Nodes
        if (node.type === 'attack' || node.type === 'server' || node.type === 'suspicious') {
          const pulseRadius = node.size + 4 + pulse * 6;
          ctx.beginPath();
          ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
          ctx.fillStyle = node.glowColor.replace(')', `, ${0.35 * (1 - pulse)})`).replace('rgba', 'rgba');
          ctx.fill();
        }

        // Ambient Node Glow Halo
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size + 3, 0, Math.PI * 2);
        ctx.fillStyle = node.glowColor;
        ctx.fill();

        // Solid Node Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // White Center Specular Dot
        ctx.beginPath();
        ctx.arc(node.x - node.size * 0.25, node.y - node.size * 0.25, Math.max(1, node.size * 0.35), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fill();
      });

      ctx.restore();

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dimensions, reducedMotion, initNetwork]);

  return (
    <div ref={containerRef} className={cn('w-full h-full min-h-[220px] relative overflow-hidden rounded-xl', className)}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
        className="w-full h-full block"
      />
    </div>
  );
}