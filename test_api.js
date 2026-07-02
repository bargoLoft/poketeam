import { apiService } from './src/services/apiService.js';
async function test() {
  const data = await apiService.fetchBattleData("Singles", "ogerpon");
  console.log(data.rows.slice(0, 10));
}
test();
