const fs = require('fs');
fetch('https://play.pokemonshowdown.com/data/moves.json')
  .then(res => res.json())
  .then(data => {
    const flags = {};
    for (const key in data) {
      if (data[key].flags) {
        flags[data[key].name.toLowerCase().replace(/[^a-z0-9]+/g, '-')] = data[key].flags;
      }
    }
    fs.writeFileSync('src/data/moveFlags.json', JSON.stringify(flags, null, 2));
    console.log('Saved moveFlags.json with ' + Object.keys(flags).length + ' moves.');
  });
