import { useState, useCallback, useEffect, useRef } from 'react';
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
  const [activeTab, setActiveTab] = useState('matchup');
  const matchupRef = useRef(null);
  
  // API State
  const [indexData, setIndexData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [battleFormat, setBattleFormat] = useState('Singles'); // Doubles or Singles

  // Global Battle Data for Party Members
  const [partyBattleData, setPartyBattleData] = useState({});

  const [previewMegaState, setPreviewMegaState] = useState({});
  const [partyMegaAutoApplied, setPartyMegaAutoApplied] = useState([false, false, false, false, false, false]);
  const [opponentMegaAutoApplied, setOpponentMegaAutoApplied] = useState([false, false, false, false, false, false]);
  const [prevPartyNames, setPrevPartyNames] = useState([null, null, null, null, null, null]);
  const [prevOpponentNames, setPrevOpponentNames] = useState([null, null, null, null, null, null]);

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

  // Track name changes and reset auto-mega applied flags
  useEffect(() => {
    let partyChanged = false;
    const nextApplied = [...partyMegaAutoApplied];
    const nextPrevNames = [...prevPartyNames];

    party.forEach((p, idx) => {
      const name = p ? p.name : null;
      if (name !== prevPartyNames[idx]) {
        nextApplied[idx] = false;
        nextPrevNames[idx] = name;
        partyChanged = true;
      }
    });

    if (partyChanged) {
      setPartyMegaAutoApplied(nextApplied);
      setPrevPartyNames(nextPrevNames);
    }
  }, [party, prevPartyNames, partyMegaAutoApplied]);

  useEffect(() => {
    let oppChanged = false;
    const nextApplied = [...opponentMegaAutoApplied];
    const nextPrevNames = [...prevOpponentNames];

    opponentParty.forEach((p, idx) => {
      const name = p ? p.name : null;
      if (name !== prevOpponentNames[idx]) {
        nextApplied[idx] = false;
        nextPrevNames[idx] = name;
        oppChanged = true;
      }
    });

    if (oppChanged) {
      setOpponentMegaAutoApplied(nextApplied);
      setPrevOpponentNames(nextPrevNames);
    }
  }, [opponentParty, prevOpponentNames, opponentMegaAutoApplied]);

  // Automatically apply Mega forms when battle data is fetched
  useEffect(() => {
    let changed = false;
    const nextMegas = [...partyMegas];
    const nextApplied = [...partyMegaAutoApplied];

    party.forEach((p, idx) => {
      if (p && !partyMegaAutoApplied[idx]) {
        const bData = partyBattleData[p.name];
        if (bData) {
          const rows = bData.rows || [];
          const topItems = rows.filter(r => r.category === 'held_item').sort((a, b) => a.rank - b.rank).slice(0, 5);
          const topItemName = topItems.length > 0 ? topItems[0].name : '';
          const isMegaStone = topItemName.includes('ite') || topItemName.includes('나이트') || topItemName.endsWith('nite');
          if (isMegaStone && !topItemName.includes('Eviolite') && !topItemName.includes('Meteorite') && !topItemName.includes('휘석') && !topItemName.includes('운석')) {
            let auto = 'mega';
            if (topItemName.includes(' X') || topItemName.endsWith('X') || topItemName.endsWith('-x')) auto = 'x';
            else if (topItemName.includes(' Y') || topItemName.endsWith('Y') || topItemName.endsWith('-y')) auto = 'y';
            nextMegas[idx] = auto;
            changed = true;
          }
          nextApplied[idx] = true;
        }
      }
    });

    if (changed) {
      setPartyMegas(nextMegas);
    }
    if (nextApplied.some((val, idx) => val !== partyMegaAutoApplied[idx])) {
      setPartyMegaAutoApplied(nextApplied);
    }
  }, [party, partyBattleData, partyMegaAutoApplied, partyMegas]);

  useEffect(() => {
    let changed = false;
    const nextMegas = [...opponentPartyMegas];
    const nextApplied = [...opponentMegaAutoApplied];

    opponentParty.forEach((p, idx) => {
      if (p && !opponentMegaAutoApplied[idx]) {
        const bData = partyBattleData[p.name];
        if (bData) {
          const rows = bData.rows || [];
          const topItems = rows.filter(r => r.category === 'held_item').sort((a, b) => a.rank - b.rank).slice(0, 5);
          const topItemName = topItems.length > 0 ? topItems[0].name : '';
          const isMegaStone = topItemName.includes('ite') || topItemName.includes('나이트') || topItemName.endsWith('nite');
          if (isMegaStone && !topItemName.includes('Eviolite') && !topItemName.includes('Meteorite') && !topItemName.includes('휘석') && !topItemName.includes('운석')) {
            let auto = 'mega';
            if (topItemName.includes(' X') || topItemName.endsWith('X') || topItemName.endsWith('-x')) auto = 'x';
            else if (topItemName.includes(' Y') || topItemName.endsWith('Y') || topItemName.endsWith('-y')) auto = 'y';
            nextMegas[idx] = auto;
            changed = true;
          }
          nextApplied[idx] = true;
        }
      }
    });

    if (changed) {
      setOpponentPartyMegas(nextMegas);
    }
    if (nextApplied.some((val, idx) => val !== opponentMegaAutoApplied[idx])) {
      setOpponentMegaAutoApplied(nextApplied);
    }
  }, [opponentParty, partyBattleData, opponentMegaAutoApplied, opponentPartyMegas]);

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

  const handleToggleMegaForSelected = useCallback((form) => {
    if (!selectedPokemonName) return;
    
    // Find in party
    const pIdx = party.findIndex(p => p?.name === selectedPokemonName);
    if (pIdx !== -1) {
      setPartyMegas(prev => {
        const next = [...prev];
        next[pIdx] = next[pIdx] === form ? 'base' : form;
        return next;
      });
      return;
    }
    
    // Find in opponent party
    const oIdx = opponentParty.findIndex(p => p?.name === selectedPokemonName);
    if (oIdx !== -1) {
      setOpponentPartyMegas(prev => {
        const next = [...prev];
        next[oIdx] = next[oIdx] === form ? 'base' : form;
        return next;
      });
      return;
    }

    // Fallback to preview mega state
    setPreviewMegaState(prev => ({
      ...prev,
      [selectedPokemonName]: prev[selectedPokemonName] === form ? 'base' : form
    }));
  }, [selectedPokemonName, party, opponentParty]);

  const handleRandomSetup = useCallback(() => {
    if (!indexData || !indexData.pokemon) return;
    const topPokemon = indexData.pokemon.slice(0, 100);
    const shuffled = [...topPokemon].sort(() => 0.5 - Math.random());
    setParty(shuffled.slice(0, 6));
    setOpponentParty(shuffled.slice(6, 12));
    setPartyMegas([null, null, null, null, null, null]);
    setOpponentPartyMegas([null, null, null, null, null, null]);
  }, [indexData]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="error-state">{error}</div>;

  const selectedPokemon = selectedPokemonName
    ? party.find((p) => p?.name === selectedPokemonName) || indexData.pokemon.find(p => p.name === selectedPokemonName)
    : null;

  let activeMegaForSelected = null;
  if (selectedPokemonName) {
    const pIdx = party.findIndex(p => p?.name === selectedPokemonName);
    if (pIdx !== -1) {
      activeMegaForSelected = partyMegas[pIdx];
    } else {
      const oIdx = opponentParty.findIndex(p => p?.name === selectedPokemonName);
      if (oIdx !== -1) {
        activeMegaForSelected = opponentPartyMegas[oIdx];
      } else {
        // Fallback to local preview mega state
        activeMegaForSelected = previewMegaState[selectedPokemonName] || null;
      }
    }
  }

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
          indexData={indexData}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          matchupRef={matchupRef}
          onRandomSetup={handleRandomSetup}
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
              activeMega={activeMegaForSelected}
              onToggleMega={handleToggleMegaForSelected}
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
