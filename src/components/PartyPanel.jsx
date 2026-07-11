import PokemonCard from './PokemonCard';
import EmptySlot from './EmptySlot';

function PartyPanel({ party, partyMegas, setPartyMegas, partyBattleData, selectedPokemonName, onSlotClick, onCardClick, onRemove }) {
  const count = party.filter(Boolean).length;

  return (
    <div className="party-panel">
      <div className="party-panel__header">
        <h2 className="party-panel__title">My Team</h2>
        <p className="party-panel__subtitle">
          <span className="party-panel__counter">
            <span className="party-panel__counter-num">{count}</span> / 6
          </span>
        </p>
      </div>

      <div className="party-panel__slots">
        {party.map((pokemon, index) => (
          <div 
            key={`slot-${index}`} 
            className="party-panel__slot-wrapper"
            draggable={!!pokemon}
            onDragStart={pokemon ? (e) => { e.dataTransfer.setData('pokemon', JSON.stringify({ name: pokemon.name, side: 'my' })); } : undefined}
          >
            {pokemon ? (() => {
              const form = partyMegas[index];
              const bData = partyBattleData[pokemon.name];
              return (
                <PokemonCard
                  pokemon={pokemon}
                  activeMega={form}
                  onToggleMega={(e, newForm) => {
                    e.stopPropagation();
                    const next = [...partyMegas];
                    next[index] = next[index] === newForm ? 'base' : newForm;
                    setPartyMegas(next);
                  }}
                  battleData={bData}
                  isSelected={selectedPokemonName === pokemon.name}
                  onClick={() => onCardClick(pokemon.name)}
                  onRemove={(e) => onRemove(index, e)}
                />
              );
            })() : (
              <button
                className="party-panel__slot"
                onClick={() => onSlotClick(index)}
                aria-label={`슬롯 ${index + 1} 추가`}
              >
                +
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PartyPanel;
