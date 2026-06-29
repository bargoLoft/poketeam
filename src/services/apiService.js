const API_BASE_URL = 'https://championsbattledata.com/api';
const ASSETS_BASE_URL = 'https://championsbattledata.com/pokemon_champions_assets';

export const apiService = {
  // 전체 포켓몬 인덱스 가져오기
  async fetchIndex() {
    try {
      const response = await fetch(API_BASE_URL);
      if (!response.ok) throw new Error('Failed to fetch API index');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching index:', error);
      throw error;
    }
  },

  // 특정 포켓몬의 배틀 데이터 가져오기 (기술, 아이템, 팀메이트 등)
  async fetchBattleData(format, pokemonName, season = 'Current') {
    try {
      const url = `${API_BASE_URL}/battle/${format}/${encodeURIComponent(pokemonName)}?season=${encodeURIComponent(season)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch battle data for ${pokemonName}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching battle data for ${pokemonName}:`, error);
      throw error;
    }
  },

  // 특정 포켓몬의 메타데이터 가져오기 (종족값, 특성 등 폼 정보)
  async fetchMetadata(pokemonName) {
    try {
      const url = `${API_BASE_URL}/metadata/${encodeURIComponent(pokemonName)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch metadata for ${pokemonName}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching metadata for ${pokemonName}:`, error);
      throw error;
    }
  },

  // 스프라이트 이미지 URL 생성
  getSpriteUrl(pokemonName) {
    return `${ASSETS_BASE_URL}/pokemon/${encodeURIComponent(pokemonName)}.png`;
  },

  // 내부 캐시 (아이템, 특성)
  _cache: {
    items: {},
    abilities: {}
  },

  // PokeAPI에서 아이템 정보(한글명, 설명, 이미지) 가져오기
  async fetchItemInfo(itemName) {
    if (this._cache.items[itemName]) return this._cache.items[itemName];
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/item/${itemName.toLowerCase().replace(/ /g, '-')}`);
      if (!response.ok) throw new Error('Item not found');
      const data = await response.json();
      
      const koName = data.names.find(n => n.language.name === 'ko')?.name || itemName;
      const koFlavor = data.flavor_text_entries.find(f => f.language.name === 'ko')?.text || '';
      
      const result = {
        name: koName,
        flavor: koFlavor,
        sprite: data.sprites.default
      };
      this._cache.items[itemName] = result;
      return result;
    } catch (error) {
      console.warn(`Error fetching item info for ${itemName}:`, error);
      return { name: itemName, flavor: '', sprite: '' };
    }
  },

  // PokeAPI에서 특성 정보(한글명, 설명) 가져오기
  async fetchAbilityInfo(abilityName) {
    if (this._cache.abilities[abilityName]) return this._cache.abilities[abilityName];
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/ability/${abilityName.toLowerCase().replace(/ /g, '-')}`);
      if (!response.ok) throw new Error('Ability not found');
      const data = await response.json();
      
      const koName = data.names.find(n => n.language.name === 'ko')?.name || abilityName;
      const koFlavor = data.flavor_text_entries.find(f => f.language.name === 'ko')?.flavor_text || '';
      
      const result = {
        name: koName,
        flavor: koFlavor
      };
      this._cache.abilities[abilityName] = result;
      return result;
    } catch (error) {
      console.warn(`Error fetching ability info for ${abilityName}:`, error);
      return { name: abilityName, flavor: '' };
    }
  },

  // PokeAPI에서 기술 정보(한글명, 타입) 가져오기
  async fetchMoveInfo(moveName) {
    if (!this._cache.moves) this._cache.moves = {};
    if (this._cache.moves[moveName]) return this._cache.moves[moveName];
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/move/${moveName.toLowerCase().replace(/ /g, '-').replace(/'/g, '')}`);
      if (!response.ok) throw new Error('Move not found');
      const data = await response.json();
      
      const koName = data.names.find(n => n.language.name === 'ko')?.name || moveName;
      const typeName = data.type.name; // English type name, e.g. "fire", "water"
      
      // Capitalize type name to match our Type map
      const capType = typeName.charAt(0).toUpperCase() + typeName.slice(1);
      
      const result = {
        name: koName,
        type: capType
      };
      this._cache.moves[moveName] = result;
      return result;
    } catch (error) {
      console.warn(`Error fetching move info for ${moveName}:`, error);
      return { name: moveName, type: 'Normal' };
    }
  }
};
