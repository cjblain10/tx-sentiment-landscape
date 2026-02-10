import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export function TrendSparkline({ topic, dark = false }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const [history, setHistory] = useState(null);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    fetch(`${apiUrl}/api/sentiment/history?days=30`)
      .then(r => { if (!r.ok) throw new Error('fail'); return r.json(); })
      .then(d => setHistory(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!history || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 140;
    const margin = { top: 12, right: 12, bottom: 24, left: 12 };

    const colors = dark
      ? { line: '#94a3b8', axis: '#334155', tick: '#64748b', pos: '#10b981', neg: '#ef4444', hover: '#C4553A' }
      : { line: '#4A4A5A', axis: '#E5DED6', tick: '#9CA3AF', pos: '#059669', neg: '#DC2626', hover: '#C4553A' };

    // New history shape: each day has `topics[]` instead of `figures[]`
    const data = history.map(day => {
      // Find this topic in the day's data
      const topicData = (day.topics || []).find(t => t.name === topic);
      if (topicData) {
        return { date: new Date(day.date), sentiment: topicData.sentiment };
      }
      // Fallback: try old shape (figures with issues)
      if (day.figures) {
        let total = 0, count = 0;
        for (const fig of day.figures) {
          const issue = (fig.issues || []).find(i => i.name === topic);
          if (issue) { total += issue.sentiment; count++; }
          else { total += fig.sentiment; count++; }
        }
        return { date: new Date(day.date), sentiment: count > 0 ? total / count : 0 };
      }
      return { date: new Date(day.date), sentiment: 0 };
    }).filter(d => d.date instanceof Date && !isNaN(d.date));

    if (data.length < 2) return;

    const svg = d3.select(svgRef.current);
    svg.attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    const iw = width - margin.left - margin.right;
    const ih = height - margin.top - margin.bottom;

    const x = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([margin.left, margin.left + iw]);
    const y = d3.scaleLinear().domain([-1, 1]).range([margin.top + ih, margin.top]);
    const g = svg.append('g');

    // zero line
    g.append('line').attr('x1', margin.left).attr('x2', margin.left + iw)
      .attr('y1', y(0)).attr('y2', y(0))
      .attr('stroke', colors.axis).attr('stroke-width', 1).attr('stroke-dasharray', '4,3');

    // areas
    g.append('path').datum(data)
      .attr('d', d3.area().x(d => x(d.date)).y0(y(0)).y1(d => y(Math.max(0, d.sentiment))).curve(d3.curveMonotoneX))
      .attr('fill', colors.pos).attr('opacity', 0.15);
    g.append('path').datum(data)
      .attr('d', d3.area().x(d => x(d.date)).y0(y(0)).y1(d => y(Math.min(0, d.sentiment))).curve(d3.curveMonotoneX))
      .attr('fill', colors.neg).attr('opacity', 0.15);

    // line
    g.append('path').datum(data)
      .attr('d', d3.line().x(d => x(d.date)).y(d => y(d.sentiment)).curve(d3.curveMonotoneX))
      .attr('fill', 'none').attr('stroke', colors.line).attr('stroke-width', 2);

    // x axis
    g.append('g').attr('transform', `translate(0,${margin.top + ih})`)
      .call(d3.axisBottom(x).ticks(4).tickFormat(d3.timeFormat('%b %d')))
      .selectAll('text').attr('fill', colors.tick).attr('font-size', '0.65rem').attr('font-family', "'JetBrains Mono', monospace");
    g.selectAll('.domain').attr('stroke', colors.axis);
    g.selectAll('.tick line').attr('stroke', colors.axis);

    // hover
    const hl = g.append('line').attr('y1', margin.top).attr('y2', margin.top + ih).attr('stroke', colors.hover).attr('stroke-width', 1).attr('opacity', 0);
    const hd = g.append('circle').attr('r', 3.5).attr('fill', colors.hover).attr('opacity', 0);
    const tt = tooltipRef.current;

    g.append('rect').attr('x', margin.left).attr('y', margin.top).attr('width', iw).attr('height', ih)
      .attr('fill', 'transparent').attr('cursor', 'crosshair')
      .on('mousemove', (ev) => {
        const [mx] = d3.pointer(ev);
        const dt = x.invert(mx);
        const idx = Math.min(d3.bisector(d => d.date).left(data, dt), data.length - 1);
        const d = data[idx];
        hl.attr('x1', x(d.date)).attr('x2', x(d.date)).attr('opacity', 0.5);
        hd.attr('cx', x(d.date)).attr('cy', y(d.sentiment)).attr('opacity', 1);
        if (tt) {
          tt.style.opacity = '1'; tt.style.left = `${x(d.date)}px`; tt.style.top = `${y(d.sentiment) - 32}px`;
          tt.innerHTML = `<strong>${d3.timeFormat('%b %d')(d.date)}</strong> ${d.sentiment >= 0 ? '+' : ''}${d.sentiment.toFixed(2)}`;
        }
      })
      .on('mouseleave', () => { hl.attr('opacity', 0); hd.attr('opacity', 0); if (tt) tt.style.opacity = '0'; });
  }, [history, topic, dark]);

  return (
    <div className="trend-container" ref={containerRef} style={{ position: 'relative' }}>
      <div className="trend-header"><span className="trend-label">30-Day Trend</span></div>
      <div ref={tooltipRef} className="trend-tooltip" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', transition: 'opacity 0.15s' }} />
      <svg ref={svgRef} />
    </div>
  );
}
