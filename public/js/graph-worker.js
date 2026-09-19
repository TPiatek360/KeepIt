self.onmessage = function(e) {
    const { nodes, edges, center, iterations = 150, k = 0.05, repulsion = 100000, damping = 0.6 } = e.data;
    
    const links = edges.map(e => ({ source: e.source, target: e.target }));
    const velocities = {};
    nodes.forEach(n => velocities[n.id] = { x: 0, y: 0 });

    for (let i = 0; i < iterations; i++) {
        // Repulsion
        for (let a = 0; a < nodes.length; a++) {
            for (let b = a + 1; b < nodes.length; b++) {
                const nodeA = nodes[a];
                const nodeB = nodes[b];
                const dx = nodeA.x - nodeB.x;
                const dy = nodeA.y - nodeB.y;
                const distSq = dx * dx + dy * dy || 1;
                const force = repulsion / distSq;
                const fx = (dx / Math.sqrt(distSq)) * force;
                const fy = (dy / Math.sqrt(distSq)) * force;
                
                velocities[nodeA.id].x += fx;
                velocities[nodeA.id].y += fy;
                velocities[nodeB.id].x -= fx;
                velocities[nodeB.id].y -= fy;
            }
        }
        // Attraction
        links.forEach(link => {
            const s = nodes.find(n => n.id === link.source);
            const t = nodes.find(n => n.id === link.target);
            if (!s || !t) return;
            
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const dist = Math.sqrt(dx*dx + dy*dy) || 1;
            const force = (dist - 200) * k; 
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            velocities[s.id].x += fx;
            velocities[s.id].y += fy;
            velocities[t.id].x -= fx;
            velocities[t.id].y -= fy;
        });
        // Gravity
        nodes.forEach(n => {
            const dx = center.x - n.x;
            const dy = center.y - n.y;
            velocities[n.id].x += dx * 0.005; 
            velocities[n.id].y += dy * 0.005;
            
            n.x += velocities[n.id].x;
            n.y += velocities[n.id].y;
            
            velocities[n.id].x *= damping;
            velocities[n.id].y *= damping;
        });
    }

    const updates = nodes.map(n => ({
        id: n.originalId || n.id,
        type: n.nodeType,
        x: Math.round(n.x),
        y: Math.round(n.y)
    }));

    self.postMessage({ updates });
};