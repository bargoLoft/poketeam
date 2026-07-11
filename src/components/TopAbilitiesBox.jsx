import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { abilityBoosts } from '../data/abilityBoostData';

const getPct = (row) => parseFloat(row.percentage_value ?? row.percentage ?? 0) || 0;

const getPctStyle = (pct) => {
  if (pct >= 50) return { color: '#047857', fontWeight: 'bold' };
  if (pct >= 20) return { color: '#166534', fontWeight: 'bold' };
  if (pct >= 5) return { color: '#475569', fontWeight: '500' };
  return { color: '#94a3b8' };
};

const getAbilityBadges = (abilityName) => {
  const b = abilityBoosts[abilityName];
  if (!b) return null;
  const badges = [];
  if (b.badge) badges.push({ text: b.badge, color: '#f59e0b', textColor: '#fff' });
  if (b.type === 'stab') badges.push({ text: '자속 뻥튀기', color: '#3b82f6' });
  if (b.type === 'skin') badges.push({ text: '타입 변환', color: '#8b5cf6' });
  if (b.type === 'power' || b.type === 'stat') badges.push({ text: '결정력+', color: '#ef4444' });
  return badges.length > 0 ? badges : null;
};

export default function TopAbilitiesBox({ topAbilities, title = "✨ 주요 특성", titleStyle = {}, containerStyle = { marginTop: '8px' }, activeAbilityName }) {
  const [abilityNames, setAbilityNames] = useState({});

  useEffect(() => {
    let active = true;
    const fetchAbilities = async () => {
      const map = {};
      const toFetch = new Set();
      if (activeAbilityName) toFetch.add(activeAbilityName);
      (topAbilities || []).slice(0, 3).forEach(ab => {
        if (ab && ab.name) toFetch.add(ab.name);
      });
      await Promise.all(Array.from(toFetch).map(async (name) => {
        map[name] = await apiService.fetchAbilityInfo(name);
      }));
      if (active) setAbilityNames(map);
    };
    fetchAbilities();
    return () => { active = false; };
  }, [topAbilities, activeAbilityName]);

  if ((!topAbilities || topAbilities.length === 0) && !activeAbilityName) {
    return (
      <div style={containerStyle}>
        <h3 className="dp2-section-title" style={titleStyle}>{title}</h3>
        <div style={{textAlign:'center', padding:'8px', color:'#94a3b8', fontSize:'0.8rem'}}>데이터 없음</div>
      </div>
    );
  }

  const abilitiesToRender = activeAbilityName 
    ? [{ name: activeAbilityName, isOverride: true, percentage: (topAbilities || []).find(a => a.name === activeAbilityName)?.percentage }]
    : (topAbilities || []).slice(0, 3);

  return (
    <div style={containerStyle}>
      <h3 className="dp2-section-title" style={titleStyle}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {abilitiesToRender.map((ab, idx) => {
          const info = abilityNames[ab.name] || {};
          const pct = ab.isOverride ? (ab.percentage ? parseFloat(ab.percentage) : null) : getPct(ab);
          const pctStyle = pct !== null ? getPctStyle(pct) : {};
          const abBadges = getAbilityBadges(ab.name);
          return (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', flexDirection: 'column', 
                background: 'rgba(0,0,0,0.02)', 
                padding: '6px 8px', borderRadius: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#3b82f6' }}>{info.name || ab.name}</span>
                {pct !== null && <span style={{ fontSize: '0.75rem', ...pctStyle }}>{pct.toFixed(1)}%</span>}
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                {abBadges && abBadges.map((b, bIdx) => (
                  <span key={bIdx} style={{ fontSize: '0.65rem', padding: '2px 6px', background: b.color, color: b.textColor || '#fff', borderRadius: '4px', fontWeight: 'bold', border: b.textColor ? '1px solid #cbd5e1' : 'none' }}>
                    {b.text}
                  </span>
                ))}
                {!abBadges && (info.flavor || info.flavorText) && (
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{(info.flavor || info.flavorText).replace(/\n|\f/g, ' ')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
