const fs = require('fs');
const transcriptPath = '/Users/bargo/.gemini/antigravity/brain/07ba7823-3077-4228-9e25-7bd700bc6638/.system_generated/logs/transcript.jsonl';
const logLines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(l => l.trim() !== '');

function parseArg(val) {
  if (typeof val !== 'string') return val;
  try {
    let parsed = JSON.parse(val);
    if (typeof parsed === 'string') return parsed;
    return val;
  } catch(e) { return val; }
}

for (const line of logLines) {
  try {
    const step = JSON.parse(line);
    if (step.tool_calls) {
      for (const call of step.tool_calls) {
        if (call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
          let args = call.args;
          const targetFile = parseArg(args.TargetFile);
          if (targetFile && targetFile.includes('PartyDashboard.jsx')) {
             console.log(call.name);
             if (call.name === 'replace_file_content') {
               const repl = parseArg(args.ReplacementContent);
               if (repl) console.log("TARGET:", repl.substring(0, 50));
             } else {
               let chunks = parseArg(args.ReplacementChunks);
               if (typeof chunks === 'string') chunks = JSON.parse(chunks);
               if (chunks && chunks[0] && chunks[0].ReplacementContent) console.log("CHUNK TARGET:", chunks[0].ReplacementContent.substring(0, 50));
             }
          }
        }
      }
    }
  } catch(e) {}
}
