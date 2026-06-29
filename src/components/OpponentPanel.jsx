import React from 'react';
import { apiService } from '../services/apiService';
import PokemonCard from './PokemonCard';
import typeColors from '../data/typeColors';

const hexToRgba = (hex, alpha) => {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getBackgroundStyle = (pokemon) => {
  if (!pokemon || !pokemon.summary || !pokemon.summary.types) return undefined;
  const types = pokemon.summary.types;
  if (types.length === 1) {
    const c = typeColors[types[0]];
    return hexToRgba(c, 0.4);
  } else if (types.length >= 2) {
    const c1 = hexToRgba(typeColors[types[0]], 0.4);
    const c2 = hexToRgba(typeColors[types[1]], 0.4);
    return `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`;
  }
  return undefined;
};

function OpponentPanel({ opponentParty, setOpponentParty, opponentPartyMegas, setOpponentPartyMegas, pokemonList, partyBattleData, onCardClick }) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 40;
  const totalPages = 6;
  
  // Slice pokemonList for current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentList = pokemonList.slice(startIndex, startIndex + itemsPerPage);
  
  const selectedCount = opponentParty.filter(Boolean).length;

  const handleSelect = (pokemon) => {
    // Find first empty slot
    const emptyIndex = opponentParty.indexOf(null);
    if (emptyIndex === -1) return; // Full

    setOpponentParty(prev => {
      const next = [...prev];
      next[emptyIndex] = pokemon;
      return next;
    });
    setOpponentPartyMegas(prev => {
      const next = [...prev];
      next[emptyIndex] = null;
      return next;
    });
  };

  const handleRemove = (index) => {
    setOpponentParty(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setOpponentPartyMegas(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const handleReset = () => {
    setOpponentParty([null, null, null, null, null, null]);
  };

  const isSelected = (pokemonName) => {
    return opponentParty.some(p => p && p.name === pokemonName);
  };

  return (
    <div className="opponent-panel">
      <div className="opponent-panel__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="opponent-panel__title">Opponent Team</h2>
          <p className="opponent-panel__subtitle">적 파티를 구성하세요</p>
        </div>
        <button 
          onClick={handleReset} 
          style={{ background: 'var(--danger)', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
        >
          초기화
        </button>
      </div>

      {selectedCount === 6 ? (
        <div className="party-panel__slots">
          {opponentParty.map((pokemon, index) => (
            <div key={`opp-slot-${index}`} className="party-panel__slot-wrapper">
            {pokemon ? (() => {
              const form = opponentPartyMegas[index];
              const bData = partyBattleData ? partyBattleData[pokemon.name] : null;
              return (
                <PokemonCard
                  pokemon={pokemon}
                  activeMega={form}
                  onToggleMega={(e, newForm) => {
                    e.stopPropagation();
                    const next = [...opponentPartyMegas];
                    next[index] = next[index] === newForm ? null : newForm;
                    setOpponentPartyMegas(next);
                  }}
                  battleData={bData}
                  isSelected={false}
                  onClick={() => onCardClick(pokemon.name)}
                  onRemove={() => handleRemove(index)}
                />
              );
            })() : null}
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* 6 Slots for selected opponents */}
          <div className="opponent-slots">
            {opponentParty.map((pokemon, idx) => (
              <div 
                key={idx} 
                className={`opponent-slot ${pokemon ? 'filled' : 'empty'}`}
                style={{ background: getBackgroundStyle(pokemon) }}
                onClick={() => pokemon && handleRemove(idx)}
                title={pokemon ? "클릭해서 제거" : ""}
              >
                {pokemon ? (
                  <img src={apiService.getSpriteUrl(pokemon.name)} alt={pokemon.name} />
                ) : (
                  <span className="opponent-slot-placeholder">?</span>
                )}
              </div>
            ))}
          </div>

          <div className="opponent-picker">
            <div className="opponent-picker__header">
              <h3 className="opponent-picker__title">TOP {startIndex + 1} - {startIndex + currentList.length}</h3>
              <div className="opponent-picker__controls">
                <button 
                  className="pagination-arrow" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  &lt;
                </button>
                <button 
                  className="pagination-arrow" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  &gt;
                </button>
              </div>
            </div>
            <div className="opponent-grid-large">
              {currentList.map(p => {
                const disabled = isSelected(p.name);
                return (
                  <button 
                    key={p.name} 
                    className={`picker-btn picker-btn--lg ${disabled ? 'disabled' : ''}`}
                    style={{ background: getBackgroundStyle(p) }}
                    onClick={() => !disabled && handleSelect(p)}
                    disabled={disabled}
                    title={p.name}
                  >
                    <img src={apiService.getSpriteUrl(p.name)} alt={p.name} />
                  </button>
                )
              })}
            </div>
            
          </div>
        </>
      )}
    </div>
  );
}

export default OpponentPanel;
