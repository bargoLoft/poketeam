import { useMemo } from 'react';
import { apiService } from '../services/apiService';
import { getMegaDataSync } from '../utils/megaUtils';
import { getStatColor } from '../utils/statUtils';

export default function PartyDashboard({ party, opponentParty, partyMegas, opponentPartyMegas, battleFormat, setBattleFormat, allPokemon }) {
  const activeParty = party.filter(Boolean);
  const activeOpponents = opponentParty.filter(Boolean);



  // Group by base speed
  const speedGroups = useMemo(() => {
    const groups = {};
    const addPokemon = (p, form, isOpponent) => {
      if (!p) return;
      let statsObj = p.summary?.baseStats;
      let sprite = apiService.getSpriteUrl(p.name);
      let types = p.summary?.types;
      
      let baseSpeed = 0;
      
      // If mega is active, we should try to use the cached mega stats and sprite
      if (form) {
        const mData = getMegaDataSync(p.name, form);
        if (mData) {
          statsObj = mData.baseStats;
          sprite = mData.spriteUrl;
          types = mData.types;
          // Mega stats from our utils are already true base stats
          baseSpeed = statsObj.speed || 0;
        }
      }

      // If no mega is active, we need to normalize the Lv50 stat from the API
      if (!form || baseSpeed === 0) {
        const lv50Speed = statsObj?.speed || 5;
        baseSpeed = Math.max(1, Math.round(((lv50Speed - 5) * 2 - 31) / 2));
      }
      if (!groups[baseSpeed]) groups[baseSpeed] = [];
      groups[baseSpeed].push({
        id: `${isOpponent ? 'opp' : 'my'}-${p.name}`,
        name: p.name,
        sprite: sprite,
        types: types,
        isOpponent
      });
    };
    party.forEach((p, i) => addPokemon(p, partyMegas[i], false));
    opponentParty.forEach((p, i) => addPokemon(p, opponentPartyMegas[i], true));
    return groups;
  }, [party, partyMegas, opponentParty, opponentPartyMegas]);

  const uniqueSpeeds = useMemo(() => {
    return Object.keys(speedGroups)
      .map(s => parseInt(s, 10))
      .sort((a, b) => a - b);
  }, [speedGroups]);



  if (activeParty.length === 0 && activeOpponents.length === 0) {
    return (
      <div className="party-dashboard">
        <div className="dashboard-empty" style={{ marginTop: '20px' }}>
          <span className="dashboard-empty-icon">👈</span>
          <p>포켓몬을 추가하면 스피드 비교가 시작됩니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="party-dashboard" style={{ paddingTop: '20px' }}>

      <div className="dashboard-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '40px' }}>
        <div className="horizontal-speed-track">
          <div className="speed-axis-line"></div>
          
          {uniqueSpeeds.map((speed, index) => {
            let pct;
            if (uniqueSpeeds.length === 1) {
              pct = 50;
            } else {
              // Map index to a percentage between 10% and 90% to avoid clipping at the edges
              pct = 10 + (index / (uniqueSpeeds.length - 1)) * 80;
            }
            const pokemons = speedGroups[speed];
            
            return (
              <div key={speed} className="speed-node" style={{ left: `${pct}%` }}>
                <div className="speed-node-stack">
                  {pokemons.map(p => (
                    <div 
                      key={p.id} 
                      className={`speed-node-sprite ${p.isOpponent ? 'speed-node-sprite--opp' : 'speed-node-sprite--my'}`}
                    >
                      <img src={p.sprite} alt={p.name} title={`${p.name} (Spe: ${speed})`} />
                    </div>
                  ))}
                </div>
                <div className="speed-node-tick"></div>
                <div className="speed-node-label" style={{ color: getStatColor(speed), fontWeight: 'bold' }}>{speed}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
