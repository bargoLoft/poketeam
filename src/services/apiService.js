const API_BASE_URL = 'https://championsbattledata.com/api';
const ASSETS_BASE_URL = 'https://championsbattledata.com/pokemon_champions_assets';

export const apiService = {
  async fetchIndex() {
    try {
      const response = await fetch(API_BASE_URL);
      if (!response.ok) throw new Error('Failed to fetch API index');
      return await response.json();
    } catch (error) {
      console.error('Error fetching index:', error);
      throw error;
    }
  },

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

  getSpriteUrl(pokemonName) {
    return `${ASSETS_BASE_URL}/pokemon/${encodeURIComponent(pokemonName)}.png`;
  },

  _cache: {
    items: {},
    abilities: {},
    moves: {}
  },

  _itemTranslationPatch: {
    "Choice Scarf": "구애스카프", "Choice Band": "구애머리띠", "Choice Specs": "구애안경",
    "Leftovers": "먹다남은음식", "Life Orb": "생명의구슬", "Focus Sash": "기합의띠",
    "Heavy-Duty Boots": "통굽부츠", "Rocky Helmet": "울퉁불퉁멧", "Eviolite": "진화의휘석",
    "Assault Vest": "돌격조끼", "Black Sludge": "검은진흙", "Air Balloon": "풍선",
    "Sitrus Berry": "자뭉열매", "Lum Berry": "리샘열매", "Covert Cloak": "은밀망토",
    "Loaded Dice": "속임수주사위", "Clear Amulet": "클리어참", "Booster Energy": "부스트에너지",
    "Safety Goggles": "방진고글", "Weakness Policy": "약점보험", "Expert Belt": "달인의띠",
    "Toxic Orb": "맹독구슬", "Flame Orb": "화염구슬", "Metal Coat": "금속코트",
    "Muscle Band": "근육머리띠", "Wise Glasses": "박식안경", "Scope Lens": "초점렌즈",
    "Shell Bell": "조개껍질방울", "Mirror Herb": "흉내허브", "Throat Spray": "목스프레이",
    "White Herb": "하양허브", "Power Herb": "파워허브", "Mental Herb": "멘탈허브",
    "Terrain Extender": "그라운드코트", "Light Clay": "빛의점토", "Heat Rock": "뜨거운바위",
    "Smooth Rock": "보송보송바위", "Damp Rock": "축축한바위", "Icy Rock": "차가운바위",
    "Bright Powder": "반짝가루", "King's Rock": "왕의징표석", "Razor Claw": "예리한손톱",
    "Protective Pads": "방호패드", "Ability Shield": "특성가드", "Punching Glove": "펀치글러브",
    "Fairy Feather": "페어리페더", "Wellspring Mask": "우물가면", "Hearthflame Mask": "화덕가면", 
    "Cornerstone Mask": "주춧돌가면", "Ogerpon's Mask": "오거폰의가면", "Eject Pack": "탈출팩",
    "Red Card": "레드카드", "Eject Button": "탈출버튼",
    // Mega Stones
    "Charizardite X": "리자몽나이트X", "Charizardite Y": "리자몽나이트Y", "Venusaurite": "이상해꽃나이트",
    "Blastoisinite": "거북왕나이트", "Alakazite": "후딘나이트", "Gengarite": "팬텀나이트",
    "Kangaskhanite": "캥카나이트", "Pinsirite": "쁘사이저나이트", "Gyaradosite": "갸라도스나이트",
    "Aerodactylite": "프테라나이트", "Mewtwonite X": "뮤츠나이트X", "Mewtwonite Y": "뮤츠나이트Y",
    "Ampharosite": "전룡나이트", "Scizorite": "핫삼나이트", "Heracrossite": "헤라크로스나이트",
    "Houndoominite": "헬가나이트", "Tyranitarite": "마기라스나이트", "Blazikenite": "번치코나이트",
    "Gardevoirite": "가디안나이트", "Mawilite": "입치트나이트", "Aggronite": "보스로라나이트",
    "Medichamite": "요가램나이트", "Manectite": "썬더볼트나이트", "Banettite": "다크펫나이트",
    "Absolite": "앱솔나이트", "Garchompite": "한카리아스나이트", "Lucarionite": "루카리오나이트",
    "Abomasite": "눈설왕나이트", "Beedrillite": "독침붕나이트", "Pidgeotite": "피죤투나이트",
    "Slowbronite": "야도란나이트", "Steelixite": "강철톤나이트", "Sceptilite": "나무킹나이트",
    "Swampertite": "대짱이나이트", "Sablenite": "깜까미나이트", "Sharpedonite": "샤크니아나이트",
    "Cameruptite": "폭타나이트", "Altarianite": "파비코리나이트", "Glalitite": "얼음귀신나이트",
    "Salamencite": "보만다나이트", "Metagrossite": "메타그로스나이트", "Latiasite": "라티아스나이트",
    "Latiosite": "라티오스나이트", "Lopunnite": "이어롭나이트", "Galladite": "엘레이드나이트",
    "Audinite": "다부니나이트", "Diancite": "디안시나이트", "Raichunite X": "라이츄나이트X", "Raichunite Y": "라이츄나이트Y",
    "Glimmoranite": "킬라플로르나이트", "Staraptorite": "찌르호크나이트"
  },

  async fetchItemInfo(itemName) {
    if (this._cache.items[itemName]) return this._cache.items[itemName];
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/item/${itemName.toLowerCase().replace(/ /g, '-')}`);
      if (!response.ok) throw new Error('Item not found');
      const data = await response.json();
      
      let koName = data.names.find(n => n.language.name === 'ko')?.name;
      if (!koName && this._itemTranslationPatch[itemName]) {
        koName = this._itemTranslationPatch[itemName];
      } else if (!koName) {
        koName = itemName;
      }
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
      const fallbackName = this._itemTranslationPatch[itemName] || itemName;
      let sprite = '';
      if (itemName.endsWith('nite') || itemName.endsWith('ite')) {
         sprite = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/key-stone.png';
      }
      return { name: fallbackName, flavor: '', sprite };
    }
  },

  async fetchAbilityInfo(abilityName) {
    if (this._cache.abilities[abilityName]) return this._cache.abilities[abilityName];
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/ability/${abilityName.toLowerCase().replace(/ /g, '-')}`);
      if (!response.ok) throw new Error('Ability not found');
      const data = await response.json();
      
      const koName = data.names.find(n => n.language.name === 'ko')?.name || abilityName;
      const koFlavor = data.flavor_text_entries.find(f => f.language.name === 'ko')?.flavor_text || '';
      
      const result = { name: koName, flavor: koFlavor };
      this._cache.abilities[abilityName] = result;
      return result;
    } catch (error) {
      console.warn(`Error fetching ability info for ${abilityName}:`, error);
      return { name: abilityName, flavor: '' };
    }
  },
  
  _moveTranslationPatch: {
    "Make It Rain": "골드러시", "Ivy Cudgel": "덩굴방망이", "Electro Shot": "일렉트로빔",
    "Blood Moon": "블러드문", "Tachyon Cutter": "타키온커터", "Mortal Spin": "킬러스핀",
    "Tera Starstorm": "테라클러스터", "Alluring Voice": "매혹의보이스", "Psychic Noise": "사이코노이즈",
    "Upper Hand": "기선제압", "Mighty Cleave": "강력절단", "Hard Press": "하드프레스",
    "Supercell Slam": "슈퍼셀토네이도", "Thunderclap": "진벽력", "Electro Drift": "라이트닝드라이브",
    "Collision Course": "콜리전코스", "Salt Cure": "소금절이", "Gigaton Hammer": "거대해머",
    "Rage Fist": "분노의주먹", "Flower Trick": "트릭플라워", "Kowtow Cleave": "도게자찌르기",
    "Shed Tail": "꼬리자르기", "Chilling Water": "찬물끼얹기", "Ruination": "카타스트로피",
    "Lumina Crash": "루미나콜리전", "Armor Cannon": "아머캐논", "Bitter Blade": "원념의칼",
    "Surging Strikes": "수류연타", "Wicked Blow": "암흑강타", "Astral Barrage": "아스트랄비트",
    "Glacial Lance": "블리자드랜스", "Dire Claw": "페이탈클로", "Psyshield Bash": "배리어러시",
    "Mystical Power": "신비의힘", "Springtide Storm": "봄의폭풍", "Bleakwind Storm": "찬바람폭풍",
    "Wildbolt Storm": "번개폭풍", "Sandsear Storm": "열사폭풍", "Syrup Bomb": "물엿폭탄",
    "Matcha Gotcha": "샤카샤카포", "Wave Crash": "웨이브태클", "Jet Punch": "제트펀치",
    "Aqua Step": "아쿠아스텝", "Twin Beam": "트윈빔", "Spin Out": "휠스핀",
    "Hyper Drill": "하이퍼드릴", "Population Bomb": "쥐산산", "Triple Dive": "트리플다이브",
    "Fillet Away": "살을깎기", "Raging Bull": "성난황소", "Ice Spinner": "아이스스피너",
    "Trailblaze": "개척하기", "Pounce": "덤벼들기", "Glaive Rush": "대검돌격",
    "Order Up": "일동참배"
  },

  async fetchMoveInfo(moveName) {
    if (this._cache.moves[moveName]) return this._cache.moves[moveName];
    try {
      const formattedName = moveName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const response = await fetch(`https://pokeapi.co/api/v2/move/${formattedName}`);
      if (!response.ok) throw new Error('Move not found');
      const data = await response.json();
      
      let koName = data.names.find(n => n.language.name === 'ko')?.name;
      if (!koName && this._moveTranslationPatch[moveName]) {
        koName = this._moveTranslationPatch[moveName];
      } else if (!koName) {
        koName = moveName;
      }
      const typeName = data.type.name;
      const capType = typeName.charAt(0).toUpperCase() + typeName.slice(1);
      
      const result = { name: koName, type: capType, power: data.power || 0, damageClass: data.damage_class.name || 'status' };
      this._cache.moves[moveName] = result;
      return result;
    } catch (error) {
      console.warn(`Error fetching move info for ${moveName}:`, error);
      const fallbackName = this._moveTranslationPatch[moveName] || moveName;
      return { name: fallbackName, type: 'Normal', power: 0, damageClass: 'status' };
    }
  },
};
