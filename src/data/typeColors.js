// 영문 타입을 색상에 매핑
export const typeColors = {
  "Normal": "#A8A77A",
  "Fire": "#EE8130",
  "Water": "#6390F0",
  "Electric": "#F7D02C",
  "Grass": "#7AC74C",
  "Ice": "#96D9D6",
  "Fighting": "#C22E28",
  "Poison": "#A33EA1",
  "Ground": "#E2BF65",
  "Flying": "#A98FF3",
  "Psychic": "#F95587",
  "Bug": "#A6B91A",
  "Rock": "#B6A136",
  "Ghost": "#735797",
  "Dragon": "#6F35FC",
  "Dark": "#705746",
  "Steel": "#B7B7CE",
  "Fairy": "#D685AD",
  // 한글 호환성 유지
  "노말": "#A8A77A",
  "불꽃": "#EE8130",
  "물": "#6390F0",
  "전기": "#F7D02C",
  "풀": "#7AC74C",
  "얼음": "#96D9D6",
  "격투": "#C22E28",
  "독": "#A33EA1",
  "땅": "#E2BF65",
  "비행": "#A98FF3",
  "에스퍼": "#F95587",
  "벌레": "#A6B91A",
  "바위": "#B6A136",
  "고스트": "#735797",
  "드래곤": "#6F35FC",
  "악": "#705746",
  "강철": "#B7B7CE",
  "페어리": "#D685AD"
};

// 영문 타입을 한글로 변환
export const typeNamesKo = {
  "Normal": "노말", "Fire": "불꽃", "Water": "물", "Electric": "전기", "Grass": "풀",
  "Ice": "얼음", "Fighting": "격투", "Poison": "독", "Ground": "땅", "Flying": "비행",
  "Psychic": "에스퍼", "Bug": "벌레", "Rock": "바위", "Ghost": "고스트", "Dragon": "드래곤",
  "Dark": "악", "Steel": "강철", "Fairy": "페어리"
};

export const typeEmojis = {
  "Normal": "⚪", "Fire": "🔥", "Water": "💧", "Electric": "⚡", "Grass": "🌿",
  "Ice": "❄️", "Fighting": "🥊", "Poison": "☠️", "Ground": "⛰️", "Flying": "🌪️",
  "Psychic": "👁️", "Bug": "🐛", "Rock": "🪨", "Ghost": "👻", "Dragon": "🐉",
  "Dark": "🌙", "Steel": "⚙️", "Fairy": "✨",
  "노말": "⚪", "불꽃": "🔥", "물": "💧", "전기": "⚡", "풀": "🌿",
  "얼음": "❄️", "격투": "🥊", "독": "☠️", "땅": "⛰️", "비행": "🌪️",
  "에스퍼": "👁️", "벌레": "🐛", "바위": "🪨", "고스트": "👻", "드래곤": "🐉",
  "악": "🌙", "강철": "⚙️", "페어리": "✨"
};

export const getTypeKo = (enType) => typeNamesKo[enType] || typeNamesKo[enType?.charAt(0).toUpperCase() + enType?.slice(1)] || enType;
export const getTypeEmoji = (type) => typeEmojis[type] || '';

// Official-style type icon (Serebii/PokeAPI style). Maps to duPokemon type icons on GitHub.
const typeIconMap = {
  'normal': 'normal', 'fire': 'fire', 'water': 'water', 'electric': 'electric', 'grass': 'grass',
  'ice': 'ice', 'fighting': 'fighting', 'poison': 'poison', 'ground': 'ground', 'flying': 'flying',
  'psychic': 'psychic', 'bug': 'bug', 'rock': 'rock', 'ghost': 'ghost', 'dragon': 'dragon',
  'dark': 'dark', 'steel': 'steel', 'fairy': 'fairy'
};
export const getTypeIconUrl = (enType) => {
  const key = (enType || '').toLowerCase();
  if (!typeIconMap[key]) return '';
  return `https://raw.githubusercontent.com/duPokemon/pokemon-type-svg-icons/master/icons/${key}.svg`;
};

export default typeColors;
