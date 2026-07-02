import { getDefensiveResistanceDetails } from './src/utils/typeUtils.js';

const mimikyuTypes = ['Ghost', 'Fairy'];
const oppList = [
  { id: '1', name: 'snorlax', sprite: 'img1', types: ['Normal'] },
  { id: '2', name: 'bewear', sprite: 'img2', types: ['Normal', 'Fighting'] },
  { id: '3', name: 'staraptor', sprite: 'img3', types: ['Normal', 'Flying'] }
];

console.log(JSON.stringify(getDefensiveResistanceDetails(mimikyuTypes, oppList), null, 2));
