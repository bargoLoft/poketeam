import { useState, useEffect, useMemo, useRef } from 'react';
import typeColors, { getTypeKo, getPokeApiTypeIconUrl } from '../data/typeColors';
import { getPokemonKo } from '../data/pokemonNamesKo';
import { getChosung } from '../utils/hangul';
import { apiService } from '../services/apiService';

// 검색 모달에서 사용할 타입 태그 목록 (API 타입 기반)
const TYPE_TAGS = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 
  'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
];

function SearchModal({ pokemonList, battleFormat = 'Singles', onSelect, onClose, disabledNames }) {
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState([]);
  const overlayRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const toggleTag = (tag) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filtered = useMemo(() => {
    if (!pokemonList) return [];
    
    return pokemonList.filter((pokemon) => {
      const koName = getPokemonKo(pokemon.name);
      const searchLower = search.toLowerCase();
      const koChosung = getChosung(koName);
      
      const matchesSearch = search === '' || 
        pokemon.name.toLowerCase().includes(searchLower) || 
        koName.includes(searchLower) ||
        koChosung.includes(searchLower);
        
      const pokemonTypes = pokemon.summary?.types || [];
      const matchesTags =
        activeTags.length === 0 ||
        activeTags.every((tag) => pokemonTypes.includes(tag));
        
      return matchesSearch && matchesTags;
    }).sort((a, b) => {
      const getRank = (p) => {
        try {
          return p.summary?.battleSummary?.Current?.[battleFormat]?.top?.move?.position ?? 9999;
        } catch (e) {
          return 9999;
        }
      };
      return getRank(a) - getRank(b);
    });
  }, [pokemonList, search, activeTags, battleFormat]);

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="포켓몬 검색">
        <div className="modal__header">
          <div className="modal__header-top">
            <h2 className="modal__title">포켓몬 선택</h2>
            <button className="modal__close" onClick={onClose} aria-label="닫기">
              ×
            </button>
          </div>
          <input
            ref={searchRef}
            className="modal__search"
            type="text"
            placeholder="포켓몬 이름을 검색하세요 (영문/한글 지원)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="포켓몬 검색"
          />
          <div className="modal__tags">
            {TYPE_TAGS.map((tag) => (
              <button
                key={tag}
                className={`tag-btn${activeTags.includes(tag) ? ' tag-btn--active' : ''}`}
                onClick={() => toggleTag(tag)}
                aria-pressed={activeTags.includes(tag)}
              >
                {getTypeKo(tag)}
              </button>
            ))}
          </div>
        </div>
        <div className="modal__list">
          {filtered.length === 0 ? (
            <div className="modal__empty">
              <span className="modal__empty-icon">🔍</span>
              <p>검색 결과가 없습니다</p>
            </div>
          ) : (
            filtered.map((pokemon) => {
              const isDisabled = disabledNames.includes(pokemon.name);
              const spriteUrl = apiService.getSpriteUrl(pokemon.name);
              const koName = getPokemonKo(pokemon.name);
              const types = pokemon.summary?.types || [];
              
              return (
                <button
                  key={pokemon.name}
                  className={`modal__pokemon-item${isDisabled ? ' modal__pokemon-item--disabled' : ''}`}
                  onClick={() => !isDisabled && onSelect(pokemon)}
                  disabled={isDisabled}
                  aria-label={`${koName} 선택${isDisabled ? ' (이미 추가됨)' : ''}`}
                >
                  <img
                    className="modal__pokemon-item-image"
                    src={spriteUrl}
                    alt={koName}
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
                    }}
                  />
                  <span className="modal__pokemon-item-name">{koName}</span>
                  <div className="modal__pokemon-item-types">
                    {types.map((type) => (
                      <img
                        key={type}
                        src={getPokeApiTypeIconUrl(type)}
                        alt={type}
                        title={getTypeKo(type)}
                        style={{width: '20px', height: '20px', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'}}
                      />
                    ))}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchModal;
