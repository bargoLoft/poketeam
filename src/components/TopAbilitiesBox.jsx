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
  return [];
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
        <div style={{textAlign:'center', padding:'8px', color:'#94a3b8', fontSize:'0.8rem'}}>데이터 없음</div>
      </div>
    );
  }

  const abilitiesToRender = activeAbilityName 
    ? [{ name: activeAbilityName, isOverride: true, percentage: (topAbilities || []).find(a => a.name === activeAbilityName)?.percentage }]
    : (topAbilities || []).slice(0, 3);

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {abilitiesToRender.map((ab, idx) => {
          const info = abilityNames[ab.name] || {};
          const pctVal = ab.isOverride ? (ab.percentage ? parseFloat(ab.percentage) : 100) : getPct(ab);
          const pct = pctVal || (topAbilities?.length === 1 ? 100 : pctVal);
          const pctStyle = getPctStyle(pct);
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
                <span style={{ fontSize: '0.75rem', ...pctStyle }}>{Math.round(pct)}%</span>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                {abBadges && abBadges.map((b, bIdx) => (
                  <span key={bIdx} style={{ fontSize: '0.65rem', padding: '2px 6px', background: b.color, color: b.textColor || '#fff', borderRadius: '4px', fontWeight: 'bold', border: b.textColor ? '1px solid #cbd5e1' : 'none' }}>
                    {b.text}
                  </span>
                ))}
                {(info.flavor || info.flavorText) && (
                  <span style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', display: 'block' }}>{(info.flavor || info.flavorText).replace(/\n|\f/g, ' ')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
