import { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/utils/helpers';
import { useReducedMotion } from '@/contexts/ReducedMotionContext';
import { getDevicePerformanceTier } from '@/utils/helpers';

interface NetworkNode {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  intensity: number;
  type: 'normal' | 'suspicious' | 'attack' | 'server';
  connections: number[];
}

interface NetworkEdge {
  source: number;
  target: number;
  intensity: number;
  color: string;
  animated: boolean;
  progress: number;
}

const NODE_COLORS = {
  normal: '#3b82f6',
  suspicious: '#f59e0b',
  attack: '#ef4444',
  server: '#22c55e',
};

const EDGE_COLORS = {
  normal: 'rgba(59, 130, 246, 0.3)',
  suspicious: 'rgba(245, 158, 11, 0.4)',
  attack: 'rgba(239, 68, 68, 0.5)',
  server: 'rgba(34, 197, 94, 0.3)',
};

export function NetworkTopologyCanvas({ 
  width, 
  height, 
  attackProbability = 0, 
  isAttackLikely = false,
  nodeCount = 80,
  className 
}: { 
  width: number; 
  height: number; 
  attackProbability?: number;
  isAttackLikely?: boolean;
  nodeCount?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const nodesRef = useRef<NetworkNode[]>([]);
  const edgesRef = useRef<NetworkEdge[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const { reducedMotion } = useReducedMotion();
  const [, setInitialized] = useState(false);
  const performanceTier = getDevicePerformanceTier();

  const adjustedNodeCount = performanceTier === 'low' ? Math.min(nodeCount, 40) : nodeCount;

  const initNetwork = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];

    for (let i = 0; i < adjustedNodeCount; i++) {
      const isServer = i < 3;
      const isSuspicious = Math.random() < 0.15 * attackProbability;
      const isAttack = Math.random() < 0.05 * attackProbability;
      
      let type: NetworkNode['type'] = 'normal';
      if (isServer) type = 'server';
      else if (isAttack) type = 'attack';
      else if (isSuspicious) type = 'suspicious';

      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        vz: (Math.random() - 0.5) * 0.1,
        size: isServer ? 8 + Math.random() * 4 : 3 + Math.random() * 3,
        color: NODE_COLORS[type],
        intensity: isServer ? 1 : isAttack ? 0.9 : isSuspicious ? 0.7 : 0.3 + Math.random() * 0.4,
        type,
        connections: [],
      });
    }

    for (let i = 0; i < adjustedNodeCount; i++) {
      const node = nodes[i];
      if (!node) continue;

      const connectionCount = node.type === 'server' ? 8 + Math.floor(Math.random() * 4) : 2 + Math.floor(Math.random() * 3);
      const candidates = Array.from({ length: adjustedNodeCount }, (_, j) => j).filter(j => j !== i);

      for (let k = 0; k < connectionCount && candidates.length > 0; k++) {
        const idx = Math.floor(Math.random() * candidates.length);
        const [target] = candidates.splice(idx, 1);
        if (target === undefined) continue;

        const targetNode = nodes[target];
        if (!targetNode) continue;

        if (!node.connections.includes(target)) {
          node.connections.push(target);

          const sourceType = node.type;
          const targetType = targetNode.type;
          let edgeType: keyof typeof EDGE_COLORS = 'normal';
          if (sourceType === 'attack' || targetType === 'attack') edgeType = 'attack';
          else if (sourceType === 'suspicious' || targetType === 'suspicious') edgeType = 'suspicious';
          else if (sourceType === 'server' || targetType === 'server') edgeType = 'server';

          edges.push({
            source: i,
            target,
            intensity: 0.2 + Math.random() * 0.6,
            color: EDGE_COLORS[edgeType],
            animated: edgeType === 'attack' || edgeType === 'suspicious',
            progress: Math.random(),
          });
        }
      }
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;
    setInitialized(true);
  }, [width, height, adjustedNodeCount, attackProbability]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodes = nodesRef.current;
    const edges = edgesRef.current;

    ctx.clearRect(0, 0, width, height);

    const mouseInfluence = 150;
    const centerX = width / 2;
    const centerY = height / 2;

    nodes.forEach((node, i) => {
      if (!reducedMotion) {
        const dx = mouseRef.current.x - node.x;
        const dy = mouseRef.current.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < mouseInfluence && dist > 0) {
          const force = (mouseInfluence - dist) / mouseInfluence * 0.5;
          node.vx -= (dx / dist) * force;
          node.vy -= (dy / dist) * force;
        }

        const centerDx = centerX - node.x;
        const centerDy = centerY - node.y;
        const centerDist = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
        if (centerDist > 0) {
          node.vx += (centerDx / centerDist) * 0.001;
          node.vy += (centerDy / centerDist) * 0.001;
        }

        node.vx *= 0.98;
        node.vy *= 0.98;
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 50) { node.x = 50; node.vx *= -0.5; }
        if (node.x > width - 50) { node.x = width - 50; node.vx *= -0.5; }
        if (node.y < 50) { node.y = 50; node.vy *= -0.5; }
        if (node.y > height - 50) { node.y = height - 50; node.vy *= -0.5; }
      }

      node.intensity = 0.3 + Math.sin(Date.now() * 0.001 + i * 0.5) * 0.2 * (node.type === 'attack' ? 2 : node.type === 'suspicious' ? 1.5 : 1);
    });

    edges.forEach(edge => {
      if (edge.animated && !reducedMotion) {
        edge.progress += 0.003;
        if (edge.progress > 1) edge.progress = 0;
      }
    });

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    edges.forEach(edge => {
      const source = nodes[edge.source];
      const target = nodes[edge.target];
      if (!source || !target) return;

      const progress = edge.animated ? edge.progress : 0.5;
      const mx = source.x + (target.x - source.x) * progress;
      const my = source.y + (target.y - source.y) * progress;

      const gradient = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
      gradient.addColorStop(0, edge.color.replace('0.3', '0').replace('0.4', '0').replace('0.5', '0'));
      gradient.addColorStop(0.5, edge.color);
      gradient.addColorStop(1, edge.color.replace('0.3', '0').replace('0.4', '0').replace('0.5', '0'));

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.quadraticCurveTo(
        mx + Math.sin(Date.now() * 0.001 + edge.source) * 10,
        my + Math.cos(Date.now() * 0.001 + edge.target) * 10,
        target.x, target.y
      );
      ctx.strokeStyle = gradient;
      ctx.lineWidth = Math.max(0.5, edge.intensity * 2);
      ctx.globalAlpha = edge.intensity * 0.6;
      ctx.stroke();
    });

    nodes.forEach((node, i) => {
      const pulse = 1 + Math.sin(Date.now() * 0.003 + i) * 0.15 * node.intensity;
      const size = node.size * pulse;

      const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * 3);
      gradient.addColorStop(0, node.color);
      gradient.addColorStop(0.5, node.color + '80');
      gradient.addColorStop(1, node.color + '00');

      ctx.beginPath();
      ctx.arc(node.x, node.y, size * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.15 * node.intensity;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.globalAlpha = node.intensity;
      ctx.fill();

      if (node.type === 'server') {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * 1.8, 0, Math.PI * 2);
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.2;
        ctx.stroke();
      }

      if (node.type === 'attack') {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * 2.5, 0, Math.PI * 2);
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
        ctx.stroke();
      }
    });

    ctx.restore();

    animationRef.current = requestAnimationFrame(animate);
  }, [width, height, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    initNetwork();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) * dpr;
      mouseRef.current.y = (e.clientY - rect.top) * dpr;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [width, height, initNetwork, animate]);

  useEffect(() => {
    initNetwork();
  }, [attackProbability, isAttackLikely, initNetwork]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={cn('w-full h-full block', className)}
      aria-label="Network topology visualization showing nodes and connections"
      role="img"
    />
  );
}