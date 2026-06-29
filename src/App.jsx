import { useState, useCallback, useEffect } from 'react';
import { apiService } from './services/apiService';
import PartyPanel from './components/PartyPanel';
import DetailPanel from './components/DetailPanel';
import SearchModal from './components/SearchModal';
import LoadingSpinner from './components/LoadingSpinner';
import PartyDashboard from './components/PartyDashboard';
import OpponentPanel from './components/OpponentPanel';

function App() {
  const [party, setParty] = useState([null, null, null, null, null, null]);
  const [partyMegas, setPartyMegas] = useState([null, null, null, null, null, null]);
  const [opponentParty, setOpponentParty] = useState([null, null, null, null, null, null]);
  const [opponentPartyMegas, setOpponentPartyMegas] = useState([null, null, null, null, null, null]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedPokemonName, setSelectedPokemonName] = useState(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  
  // API State
  const [indexData, setIndexData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [battleFormat, setBattleFormat] = useState('Singles'); // Doubles or Singles

  // Global Battle Data for Party Members
  const [partyBattleData, setPartyBattleData] = useState({});

  // Initial Index Load
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await apiService.fetchIndex();
        
        // Pre-sort by usage rank (Singles default)
        data.pokemon.sort((a, b) => {
          const rankA = a.summary?.battleSummary?.Current?.Singles?.top?.move?.position ?? 9999;
          const rankB = b.summary?.battleSummary?.Current?.Singles?.top?.move?.position ?? 9999;
          return rankA - rankB;
        });
        
        setIndexData(data);
      } catch (err) {
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Fetch battle data for new party members globally
  useEffect(() => {
    const fetchMissingData = async () => {
      let fetchedAny = false;
      const newData = { ...partyBattleData };

      const queries = new Set();
      
      const getQueryName = (p) => {
        if (!p) return null;
        return p.name;
      };

      party.forEach((p) => {
        const q = getQueryName(p);
        if (q) queries.add(q);
      });
      
      opponentParty.forEach((p) => {
        const q = getQueryName(p);
        if (q) queries.add(q);
      });

      for (const queryName of queries) {
        if (!newData[queryName]) {
          try {
            const data = await apiService.fetchBattleData(battleFormat, queryName);
            newData[queryName] = data;
            fetchedAny = true;
          } catch (e) {
            console.error(e);
          }
        }
      }
      
      if (fetchedAny) {
        setPartyBattleData(newData);
      }
    };
    fetchMissingData();
  }, [party, partyMegas, opponentParty, opponentPartyMegas, battleFormat]);

  // Clear battle data when format changes to force refetch
  useEffect(() => {
    setPartyBattleData({});
  }, [battleFormat]);

  const partyNames = party.filter(Boolean).map((p) => p.name);

  const handleSlotClick = useCallback((index) => {
    if (party[index] === null) {
      setSelectedSlot(index);
      setIsSearchModalOpen(true);
    }
  }, [party]);

  const handleCardClick = useCallback((pokemonName) => {
    setSelectedPokemonName(pokemonName); // Opens Detail Modal
  }, []);

  const handleSelectPokemon = useCallback((pokemon) => {
    if (selectedSlot === null) return;
    setParty((prev) => {
      const next = [...prev];
      next[selectedSlot] = pokemon;
      return next;
    });
    setPartyMegas((prev) => {
      const next = [...prev];
      next[selectedSlot] = null;
      return next;
    });
    setIsSearchModalOpen(false);
    setSelectedSlot(null);
  }, [selectedSlot]);

  const handleRemovePokemon = useCallback((index, e) => {
    e.stopPropagation();
    setParty((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setPartyMegas((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }, []);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="error-state">{error}</div>;

  const selectedPokemon = selectedPokemonName
    ? party.find((p) => p?.name === selectedPokemonName) || indexData.pokemon.find(p => p.name === selectedPokemonName)
    : null;

  return (
    <div className="app-layout">
      {/* Left Panel: Party Slots */}
      <div className="left-panel">
        <PartyPanel
          party={party}
          partyMegas={partyMegas}
          setPartyMegas={setPartyMegas}
          partyBattleData={partyBattleData}
          selectedPokemonName={selectedPokemonName}
          onSlotClick={handleSlotClick}
          onCardClick={handleCardClick}
          onRemove={handleRemovePokemon}
        />
      </div>
      
      {/* Center Panel: Speed Tiers Only */}
      <div className="center-panel">
        <PartyDashboard 
          party={party} 
          partyMegas={partyMegas}
          opponentParty={opponentParty}
          opponentPartyMegas={opponentPartyMegas}
          battleFormat={battleFormat} 
          setBattleFormat={setBattleFormat}
          partyBattleData={partyBattleData}
          allPokemon={indexData?.pokemon || []}
        />
      </div>

      {/* Right Panel: Opponent Selection */}
      <div className="right-panel">
        <OpponentPanel
          opponentParty={opponentParty}
          setOpponentParty={setOpponentParty}
          opponentPartyMegas={opponentPartyMegas}
          setOpponentPartyMegas={setOpponentPartyMegas}
          pokemonList={indexData.pokemon}
          partyBattleData={partyBattleData}
          onCardClick={handleCardClick}
        />
      </div>

      {/* Modal: Detail Panel */}
      {selectedPokemon && (
        <div className="modal-overlay" onClick={() => setSelectedPokemonName(null)}>
          <div className="modal-content detail-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedPokemonName(null)}>×</button>
            <DetailPanel
              pokemon={selectedPokemon}
              allPokemon={indexData.pokemon}
              battleFormat={battleFormat}
              setBattleFormat={setBattleFormat}
              onSuggestionClick={handleCardClick}
            />
          </div>
        </div>
      )}

      {/* Modal: Search */}
      {isSearchModalOpen && (
        <SearchModal
          pokemonList={indexData.pokemon}
          battleFormat={battleFormat}
          onSelect={handleSelectPokemon}
          onClose={() => setIsSearchModalOpen(false)}
          disabledNames={partyNames}
        />
      )}
    </div>
  );
}

export default App;
