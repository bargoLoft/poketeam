const pokemonData = [
  {
    id: 1,
    nationalDexId: 987,
    name: "날개치는머리",
    types: ["고스트", "페어리"],
    stats: { hp: 55, atk: 55, def: 55, spa: 135, spd: 135, spe: 135 },
    roles: ["특수어태커", "기점마련"],
    ability: "부스트에너지",
    synergy: [2, 5, 8],
    counters: [3, 6, 9]
  },
  {
    id: 2,
    nationalDexId: 149,
    name: "망나뇽",
    types: ["드래곤", "비행"],
    stats: { hp: 91, atk: 134, def: 95, spa: 100, spd: 100, spe: 80 },
    roles: ["물리어태커"],
    ability: "멀티스케일",
    synergy: [1, 4, 7],
    counters: [5, 10, 3]
  },
  {
    id: 3,
    nationalDexId: 373,
    name: "보만다",
    types: ["드래곤", "비행"],
    stats: { hp: 95, atk: 135, def: 80, spa: 110, spd: 80, spe: 100 },
    roles: ["물리어태커", "특수어태커"],
    ability: "위협",
    synergy: [6, 9, 1],
    counters: [5, 10, 7]
  },
  {
    id: 4,
    nationalDexId: 113,
    name: "럭키",
    types: ["노말"],
    stats: { hp: 250, atk: 5, def: 5, spa: 35, spd: 105, spe: 50 },
    roles: ["특수막이", "서포터"],
    ability: "자연회복",
    synergy: [7, 10, 2],
    counters: [3, 6, 8]
  },
  {
    id: 5,
    nationalDexId: 473,
    name: "맘모꾸리",
    types: ["얼음", "땅"],
    stats: { hp: 110, atk: 130, def: 80, spa: 70, spd: 60, spe: 80 },
    roles: ["물리어태커"],
    ability: "둔감",
    synergy: [8, 1, 3],
    counters: [2, 7, 9]
  },
  {
    id: 6,
    nationalDexId: 248,
    name: "마기라스",
    types: ["바위", "악"],
    stats: { hp: 100, atk: 134, def: 110, spa: 95, spd: 100, spe: 61 },
    roles: ["물리어태커", "기점마련"],
    ability: "모래날림",
    synergy: [3, 9, 4],
    counters: [5, 8, 10]
  },
  {
    id: 7,
    nationalDexId: 227,
    name: "무장조",
    types: ["강철", "비행"],
    stats: { hp: 65, atk: 80, def: 140, spa: 40, spd: 70, spe: 70 },
    roles: ["물리막이", "서포터"],
    ability: "옹골참",
    synergy: [4, 10, 2],
    counters: [1, 6, 5]
  },
  {
    id: 8,
    nationalDexId: 637,
    name: "불카모스",
    types: ["벌레", "불꽃"],
    stats: { hp: 85, atk: 60, def: 65, spa: 135, spd: 105, spe: 100 },
    roles: ["특수어태커", "기점마련"],
    ability: "불꽃몸",
    synergy: [5, 1, 6],
    counters: [2, 9, 10]
  },
  {
    id: 9,
    nationalDexId: 143,
    name: "잠만보",
    types: ["노말"],
    stats: { hp: 160, atk: 110, def: 65, spa: 65, spd: 110, spe: 30 },
    roles: ["특수막이", "물리어태커"],
    ability: "면역",
    synergy: [6, 3, 7],
    counters: [5, 8, 1]
  },
  {
    id: 10,
    nationalDexId: 591,
    name: "뽀록나",
    types: ["풀", "독"],
    stats: { hp: 114, atk: 85, def: 70, spa: 85, spd: 80, spe: 30 },
    roles: ["서포터", "특수막이"],
    ability: "재생력",
    synergy: [4, 7, 9],
    counters: [8, 3, 1]
  }
];

export default pokemonData;
