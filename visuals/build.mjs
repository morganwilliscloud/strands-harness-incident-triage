import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import * as fontkit from 'fontkit'

const root = path.dirname(fileURLToPath(import.meta.url))
const C = { bg:'#000000', panel:'#101712', card:'#171c19', line:'#43534a', green:'#00cc60', white:'#ffffff', muted:'#b5c5bb', pink:'#ff70eb', blue:'#6a8bff', yellow:'#f6bc00', red:'#f7414c', orange:'#ff922e', pale:'#e6f6e7' }
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
const monoBase = fontkit.openSync(path.join(root,'assets/JetBrainsMono.ttf'))
const bodyBase = fontkit.openSync(path.join(root,'assets/SpaceGrotesk.ttf'))
const fonts = new Map()
function font(f,w) { const k=f+w; if(!fonts.has(k)) fonts.set(k,(f==='mono'?monoBase:bodyBase).getVariation({wght:w})); return fonts.get(k) }
const width = (s,z=28,f='body',w=500) => font(f,w).layout(s).positions.reduce((n,p)=>n+p.xAdvance,0)*z/font(f,w).unitsPerEm
let spans=[], bounds=[], current=''
function text(x,y,s,z=30,c=C.white,f='body',w=500,anchor='start') {
  const fw=font(f,w), layout=fw.layout(s), scale=z/fw.unitsPerEm
  const len=layout.positions.reduce((n,p)=>n+p.xAdvance,0)*scale
  const xx=anchor==='middle'?x-len/2:anchor==='end'?x-len:x
  bounds.push({file:current,text:s,x:xx,y:y-z,width:len,height:z*1.25})
  let cursor=0, paths=''
  for(let i=0;i<layout.glyphs.length;i++){const p=layout.positions[i]; paths+=`<path transform="translate(${xx+(cursor+p.xOffset)*scale} ${y-p.yOffset*scale}) scale(${scale} ${-scale})" d="${layout.glyphs[i].path.toSVG()}"/>`;cursor+=p.xAdvance}
  const id=spans.length;spans.push(`<g fill="${c}" aria-label="${esc(s)}">${paths}</g>`)
  return `<text data-outline="${id}" x="${x}" y="${y}" font-family="${f==='mono'?'JetBrains Mono':'Space Grotesk'}" font-weight="${w}" font-size="${z}" fill="${c}" text-anchor="${anchor}">${esc(s)}</text>`
}
function wrap(x,y,s,max,z=28,c=C.muted,f='body',w=500,leading=1.38){let lines=[],line='';for(const word of s.split(' ')){const next=line?`${line} ${word}`:word;if(width(next,z,f,w)>max&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line);return lines.map((v,i)=>text(x,y+i*z*leading,v,z,c,f,w)).join('')}
const rect=(x,y,w,h,fill=C.card,stroke=C.line,r=24,sw=2)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
const line=(x1,y1,x2,y2,c=C.line,w=3,dash='')=>`<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${c}" stroke-width="${w}" ${dash?`stroke-dasharray="${dash}"`:''}/>`
const arrow=(pts,c=C.green,w=3)=>`<path d="M${pts.map(p=>p.join(' ')).join(' L')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" marker-end="url(#a${c.slice(1)})"/>`
const pill=(x,y,w,label,c=C.green,z=22)=>rect(x,y,w,44,'#090d0a',c,22,1.5)+text(x+w/2,y+30,label,z,c,'mono',600,'middle')
const frogSource=(await fs.readFile(path.join(root,'assets/frog-original.svg'),'utf8')).replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'')
const wordSource=(await fs.readFile(path.join(root,'assets/wordmark-original.svg'),'utf8')).replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'').replace(/<!--[\s\S]*?-->/g,'')
function frog(x,y,w=180,c=C.green,hat=false){let g=`<svg x="${x}" y="${y}" width="${w}" height="${w}" viewBox="0 0 32 32" color="${c}" fill="${c}">${frogSource}</svg>`;if(hat){g+=`<g transform="translate(${x+w*.13} ${y-w*.40}) scale(${w/100})"><path d="M0 41H9V35H17V25H25V13H33V0H44V7H49V19H55V30H63V36H74V42H0Z" fill="#6a8bff"/><path d="M11 33H61V39H11Z" fill="#ff922e"/><path d="M30 16H35V11H40V16H45V21H40V26H35V21H30Z" fill="#f6bc00"/></g>`}return g}
const wordmark=(x,y,w=240,c=C.green)=>`<svg x="${x}" y="${y}" width="${w}" height="${w*217/1512}" viewBox="0 0 1512 217" fill="${c}" color="${c}">${wordSource}</svg>`
function ghost(x,y,s=1,c=C.white){return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M8 0H32V8H40V48H32V40H24V48H16V40H8V48H0V8H8Z" fill="${c}"/><path d="M8 12H16V24H8ZM24 12H32V24H24Z" fill="#000"/></g>`}
function pumpkin(x,y,s=1){return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M24 0H32V12H24Z" fill="#00cc60"/><path d="M8 12H48V20H56V52H48V60H8V52H0V20H8Z" fill="#ff922e"/><path d="M8 26H20V38H8ZM36 26H48V38H36ZM16 44H40V52H16Z" fill="#000"/></g>`}
function icon(name,x,y,c=C.green,s=1){const shapes={
 cloud:'<path d="M12 48H56C78 48 78 20 58 20C50-3 20 1 17 23C-2 19-7 48 12 48Z"/>',
 alarm:'<path d="M18 50V24C18 4 52 4 52 24V50L60 58H10L18 50ZM28 67H42"/>',
 route:'<path d="M6 12H30V35H62M30 35V60H62M51 25L62 35L51 45M51 50L62 60L51 70"/>',
 loop:'<path d="M60 25A26 26 0 0 0 13 19M60 25V9M60 25H44M12 47A26 26 0 0 0 59 53M12 47V63M12 47H28"/>',
 lambda:'<path d="M13 10H30L56 62H70M31 24L10 62"/>',
 file:'<path d="M10 2H44L62 20V70H10ZM44 2V20H62M22 34H49M22 46H49M22 58H42"/>',
 book:'<path d="M35 14C20 5 5 8 3 12V62C14 55 25 56 35 63C46 56 59 55 69 62V12C58 6 44 7 35 14ZM35 14V63"/>',
 box:'<path d="M4 19L35 3L66 19V57L35 73L4 57ZM4 19L35 36L66 19M35 36V73"/>',
 terminal:'<rect x="0" y="5" width="72" height="56" rx="7"/><path d="M12 22L24 32L12 42M34 43H55"/>',
 memory:'<path d="M12 2H58V68H12ZM22 18H48M22 32H48M22 46H39M2 15H12M2 31H12M2 47H12M58 15H68M58 31H68M58 47H68"/>',
 key:'<circle cx="20" cy="23" r="16"/><path d="M33 34L62 63M45 46L55 36M53 54L63 44"/>',
 shield:'<path d="M35 2L65 13V34C65 52 48 67 35 73C22 67 5 52 5 34V13ZM21 34L31 45L51 23"/>',
 chart:'<path d="M5 3V65H70M16 47L30 33L43 42L66 14"/>',
 chat:'<path d="M5 5H69V53H32L15 68V53H5ZM17 20H57M17 35H47"/>',
 check:'<path d="M8 36L26 54L64 14"/>',
 tool:'<path d="M48 3L38 17L48 28L63 18C67 38 51 44 39 40L16 63C3 74-5 61 4 51L28 29C22 12 31 0 48 3Z"/>',
 model:'<path d="M18 14L36 3L56 14V38L36 50L18 38ZM18 14L36 26L56 14M36 26V50M4 60H68M18 70H54"/>',
 }
 return `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">${shapes[name]||shapes.box}</g>`}
function smallCard(x,y,w,h,title,body,color=C.green,ic='box'){return rect(x,y,w,h)+icon(ic,x+24,y+22,color,.65)+text(x+88,y+54,title,28,C.white,'mono',600)+wrap(x+26,y+104,body,w-52,27)}
function numbered(x,y,n,c=C.green){return `<circle cx="${x}" cy="${y}" r="25" fill="${c}"/>`+text(x,y+9,String(n),25,C.bg,'mono',700,'middle')}
function base(title,sub){return `<rect width="1920" height="1080" fill="${C.bg}"/><rect x="1310" width="610" height="1080" fill="url(#fade)"/><rect x="1400" y="60" width="520" height="860" fill="url(#dots)"/>`+wordmark(80,48,240)+text(80,170,title,54,C.white,'mono',600)+text(80,226,sub,29,C.muted)}
const defs=`<defs><linearGradient id="fade"><stop stop-color="#000"/><stop offset="1" stop-color="#0d3010" stop-opacity=".5"/></linearGradient><pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.4" fill="#00cc60" opacity=".15"/></pattern>${Object.values(C).filter((c,i,a)=>a.indexOf(c)===i).map(c=>`<marker id="a${c.slice(1)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="${c}"/></marker>`).join('')}</defs>`
const fontCss=`<style>@font-face{font-family:'JetBrains Mono';font-weight:100 800;src:url(data:font/ttf;base64,${(await fs.readFile(path.join(root,'assets/JetBrainsMono.ttf'))).toString('base64')})} @font-face{font-family:'Space Grotesk';font-weight:300 700;src:url(data:font/ttf;base64,${(await fs.readFile(path.join(root,'assets/SpaceGrotesk.ttf'))).toString('base64')})}</style>`
const manifest=[]
async function save(name,body,title,notes,sz=[1920,1080],folder='svg'){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${sz[0]}" height="${sz[1]}" viewBox="0 0 ${sz[0]} ${sz[1]}" role="img" aria-label="${esc(title)}">${fontCss}${defs}${body}</svg>`
 const rendered=svg.replace(/<text data-outline="(\d+)"[^>]*>[\s\S]*?<\/text>/g,(_,id)=>spans[+id])
 await fs.writeFile(path.join(root,folder,`${name}.svg`),svg.replace(/[ \t]+$/gm,''))
 const pngDir=folder==='overlays'?'overlays':'png'
 await sharp(Buffer.from(rendered)).png().toFile(path.join(root,pngDir,`${name}.png`))
 if(folder==='svg')manifest.push({name,title,notes,svg:`svg/${name}.svg`,png:`png/${name}.png`})
}

current='01-title'
let s=`<rect width="1920" height="1080" fill="#000"/><rect x="1050" width="870" height="1080" fill="url(#fade)"/><rect x="1150" y="150" width="770" height="850" fill="url(#dots)"/>`
s+=wordmark(94,70,360)+pill(94,174,330,'HALLOWEEN LIVE BUILD',C.pink)
s+=text(88,470,'Trick or ',110,C.white,'mono',600)+text(88+width('Trick or ',110,'mono',600),470,'Trace',110,C.green,'mono',600)
s+=text(94,605,'Build an AWS incident triage agent',42,C.white)+text(94,667,'with Strands harness',42,C.white)
s+=frog(1300,366,380,C.green,true)+ghost(1160,268,1.1,C.pink)+ghost(1750,612,1.3,C.white)+pumpkin(1360,833,1.45)
s+=line(1170,796,1800,796,C.green,2)+text(1660,872,'On-call wizard.',29,C.green,'mono',600,'middle')
s+=pill(94,812,220,'DETECT',C.yellow,26)+arrow([[335,834],[389,834]],C.muted)+pill(410,812,320,'INVESTIGATE',C.green,26)+arrow([[750,834],[804,834]],C.muted)+pill(826,812,220,'REPORT',C.pink,26)
await save(current,s,'Trick or Trace','Opening or holding graphic. Establish the outcome: detect, investigate, report. The wizard is a seasonal treatment of the original frog, not a new product logo.')

current='02-architecture'
s=base('AWS incident response agent architecture','')
const top=[['Candy storefront',['Amazon API Gateway','AWS Lambda','Amazon DynamoDB'],'box'],['Amazon CloudWatch',['Alarm: checkout errors','cross the threshold.'],'alarm'],['Amazon EventBridge',['Routes the alarm','state-change event.'],'route'],['AWS Lambda',['Intake: builds the prompt','and invokes the agent.'],'lambda']]
for(let i=0;i<4;i++){let x=80+i*450,c=i===1?C.red:C.yellow;s+=rect(x,292,410,182)+icon(top[i][2],x+24,314,c,.65)+text(x+88,346,top[i][0],25,C.white,'mono',600);for(let j=0;j<top[i][1].length;j++)s+=text(x+26,389+j*32,top[i][1][j],25,C.muted);if(i<3)s+=arrow([[x+412,383],[x+442,383]],C.yellow,2)}
s+=arrow([[1635,476],[1635,521],[954,521],[954,584]],C.yellow)
s+=rect(560,586,790,230,'#0b2514',C.green,32)+text(596,632,'Amazon Bedrock AgentCore Runtime',23,C.blue,'mono',600)+text(596,694,'Strands harness',43,C.white,'mono',600)+text(596,747,'Investigate → analyze → report',29,C.pale)+frog(1150,655,145,C.green,true)
s+=rect(80,585,390,255,C.card,C.green,24)+icon('cloud',104,607,C.green,.65)+text(168,639,'AWS MCP Server',28,C.white,'mono',600)+wrap(106,695,'Runs Python remotely. Reads logs, metrics and configuration. Returns evidence.',338,28)
s+=arrow([[560,669],[478,669]],C.green)+arrow([[478,716],[551,716]],C.green)
s+=smallCard(1450,622,390,182,'Slack report','Findings + next steps + on-call mention.',C.pink,'chat')+arrow([[1352,704],[1441,704]],C.pink)
s+=line(677.5,818,677.5,870,C.line,2)+line(937,818,937,870,C.line,2)+line(1214,818,1214,870,C.line,2)
s+=rect(560,876,235,96,'#090d0a',C.green,22,1.5)+text(677.5,916,'Amazon Bedrock',23,C.green,'body',600,'middle')+text(677.5,951,'Model',22,C.muted,'body',500,'middle')
s+=rect(813,876,248,96,'#090d0a',C.pink,22,1.5)+text(937,916,'Amazon S3',23,C.pink,'body',600,'middle')+text(937,951,'Session snapshots',22,C.muted,'body',500,'middle')
s+=rect(1079,876,270,96,'#090d0a',C.pink,22,1.5)+text(1214,916,'Amazon Bedrock',23,C.pink,'body',600,'middle')+text(1214,951,'AgentCore Memory',23,C.pink,'body',600,'middle')
await save(current,s,'Overall architecture','Read the top row left to right, then follow the event into Runtime. Intake Lambda only dispatches. Bidirectional tool connectors carry requests and results. Bedrock provides the model; S3 stores incident snapshots; AgentCore Memory stores lessons. Report text and mention are posted directly to Slack by application code. The current demo does not post a ticket or report URL. Not every deployed support resource is drawn.')

current='03-strands-loop'
s=base('A model that can act, then check.','Strands coordinates the conversation and tool execution.')
s+=arrow([[551,547],[590,547],[590,365],[625,365]],C.green)+arrow([[1286,365],[1325,365],[1325,547],[1360,547]],C.green)+arrow([[1587,652],[1587,845],[1295,845]],C.green)+arrow([[624,845],[317,845],[317,660]],C.green)
s+=smallCard(80,456,475,202,'1  Build context','Task, instructions, conversation and available tools.','#6a8bff','file')
s+=smallCard(635,282,650,167,'2  Ask the model','Amazon Bedrock: answer now, or choose a tool?',C.green,'model')
s+=smallCard(1365,456,475,202,'3  Execute a tool','Strands calls the selected tool with the model’s arguments.',C.yellow,'tool')
s+=smallCard(635,772,650,167,'4  Return evidence','The tool result becomes context for the next step.',C.pink,'file')
s+=frog(880,530,160,C.green,true)+text(960,738,'STRANDS AGENT',24,C.green,'mono',600,'middle')

await save(current,s,'The Strands agent loop','The model chooses a tool; Strands executes it and feeds back the result. The loop can continue through several tools or finish with an answer. This is a conceptual loop, not a separate deployment architecture. Reasoning does not require displaying private model reasoning.')

current='03b-what-is-a-harness'
s=base('Agent = Model + Harness','')
s+=rect(80,292,454,578,'#101826',C.blue,32)+text(116,354,'MODEL',31,C.blue,'mono',600)+icon('model',257,402,C.blue,1.1)
s+=text(116,564,'Interprets the task.',32,C.white)+text(116,624,'Chooses tools.',32,C.white)+text(116,684,'Uses the results.',32,C.white)+text(116,744,'Generates an answer.',32,C.white)
s+=text(582,611,'+',60,C.white,'mono',600,'middle')
s+=rect(630,292,1210,578,'#0b2514',C.green,32)+text(664,350,'HARNESS',31,C.green,'mono',600)
const harnessParts=[
 ['Agent loop','Call the model, return results, continue or finish.','loop',C.green],
 ['Tool execution','Run selected tools and return their output.','tool',C.yellow],
 ['Context management','Assemble, retrieve, offload and compact context.','file',C.blue],
 ['Sessions + memory','Resume work and recall information across runs.','memory',C.pink],
 ['Instructions + skills','Supply guidance and load relevant procedures.','book',C.green],
 ['Hooks + controls','Add checks, approvals and activity logging.','shield',C.orange]
]
for(let i=0;i<harnessParts.length;i++){
 const [title,body,ic,color]=harnessParts[i],x=654+(i%2)*582,y=378+Math.floor(i/2)*158
 s+=rect(x,y,558,148,C.card,C.line,24)+icon(ic,x+24,y+18,color,.65)+text(x+88,y+50,title,28,C.white,'mono',600)+wrap(x+26,y+96,body,506,27,C.muted,'body',500,1.25)
}
await save(current,s,'Agent = Model + Harness','Bridge from the agent loop to the configured Strands product. Say: “The model chooses a tool call, but software has to execute it, return the result, and make the next model call. That software is the harness. It also manages the information and state the model needs as work continues. Strands harness assembles those pieces with defaults we can customize.” Agent = Model + Harness is a useful system-design framing, explicitly used by LangChain, rather than a formal universal definition. The six boxes group common harness responsibilities; they are not a claim that every harness ships every feature. Hooks are extension points where developers can implement logging, checks or approvals; their presence alone is not an enforced security boundary or an automatic approval workflow. The next graphic describes this demo’s installed Strands defaults. Research: LangChain, The Anatomy of an Agent Harness (2026-03-10); Anthropic, Effective harnesses for long-running agents (2025-11-26); current Strands harness documentation. See SOURCES.md.')

current='04-harness-defaults'
s=base('The agent, already equipped.','createHarness() assembles the defaults. You choose what to change.')
s+=rect(662,395,597,449,'#0b2514',C.green,32)+frog(875,489,180,C.green,true)+text(960,720,'createHarness()',34,C.white,'mono',600,'middle')+text(960,775,'A configured Strands agent',28,C.pale,'body',500,'middle')
const cards=[['Built-in tools','Shell and file tools, ready for the model to use.','tool',C.yellow],['Context management','Offload large results. Retrieve details. Compact context.','file',C.blue],['Session storage','Save conversation snapshots; resume with a session ID.','box',C.pink],['Long-term memory','Extract useful facts and retrieve them in later sessions.','memory',C.pink],['Skills','Discover runbooks and load procedures when relevant.','book',C.green],['Default output','See generated text and tool activity in the console.','terminal',C.yellow]]
for(let i=0;i<6;i++){const right=i>=3,j=i%3,x=right?1340:80,y=292+j*224;s+=smallCard(x,y,500,185,cards[i][0],cards[i][1],cards[i][3],cards[i][2]);s+=line(right?1259:580,right?620:y+93,right?1340:662,right?y+93:620,C.line,2)}
await save(current,s,'What harness gives you','Use while the basic TypeScript example is visible. Defaults verified against harness 0.3.1 and SDK 1.22.0. Local file tools and shell are not automatically isolated. Sessions default to .agent/sessions; file memory defaults to .agent/memory; .agent/skills is discovered if present. Short demos may not exercise compaction or produce useful memories. Default web search is provider-dependent, so it is not represented as universally enabled.')

current='05-runtime-memory'
s=base('Remember the incident. Learn for next time.','')
s+=rect(80,336,650,523,'#101826',C.blue,32)+text(118,387,'AGENTCORE RUNTIME',25,C.blue,'mono',600)+rect(120,429,570,370,'#0b2514',C.green,24)+frog(535,551,125,C.green,true)+text(155,552,'Incident Response',30,C.white,'mono',600)+text(155,599,'Agent',30,C.white,'mono',600)+text(155,660,'powered by',27,C.pale)+text(155,706,'Strands harness',30,C.white,'mono',600)
s+=rect(1070,292,770,242,C.card,C.pink,24)+icon('box',1100,325,C.pink,.7)+text(1172,360,'S3 session snapshots',34,C.white,'mono',600)+text(1100,423,'“What have we done in this incident?”',31,C.white)+text(1100,477,'Saved conversation and state from this incident.',27,C.muted)
s+=rect(1070,649,770,272,C.card,C.pink,24)+icon('memory',1100,682,C.pink,.7)+text(1172,717,'AgentCore Memory',34,C.white,'mono',600)+text(1100,780,'“What helped in previous incidents?”',31,C.white)+text(1100,832,'Events → asynchronous extraction → lessons',27,C.muted)+text(1100,882,'Retrieve a lesson; verify it against current evidence.',26,C.pink)
s+=arrow([[730,469],[1060,469]],C.pink)+arrow([[1060,506],[740,506]],C.pink)+text(900,437,'save / restore',24,C.pink,'mono',500,'middle')
s+=arrow([[730,744],[1060,744]],C.pink)+arrow([[1060,781],[740,781]],C.pink)+text(900,709,'events / recall',24,C.pink,'mono',500,'middle')
await save(current,s,'harness on Runtime with sessions and memory','Runtime hosts the process; it is not the durable memory store. Our current TypeScript integration uses SessionManager and S3Storage for snapshots, and AgentCoreMemoryStore for lessons. This is a demo integration choice, not a claim that AgentCore lacks short-term memory. Extraction is asynchronous. A confirmed engineer outcome is stronger evidence for a future lesson than the agent’s initial hypothesis.')

current='06-runtime-interpreter'
s=base('The agent coordinates. AWS MCP executes.','')
s+=rect(80,300,765,620,'#101826',C.blue,32)+text(120,358,'AGENTCORE RUNTIME',30,C.blue,'mono',600)+rect(120,407,685,228,'#0b2514',C.green,24)+frog(607,459,154,C.green,true)+text(153,471,'Incident Response Agent',30,C.white,'mono',600)+text(153,529,'powered by',27,C.pale)+text(153,581,'Strands harness',32,C.white,'mono',600)
s+=icon('key',122,674,C.blue,.66)+text(190,711,'Runtime execution role',29,C.white,'mono',600)
s+=rect(1075,300,765,620,'#0b2514',C.green,32)+text(1115,358,'MANAGED AWS MCP',30,C.green,'mono',600)+rect(1115,407,685,228,'#101010',C.line,24)
s+=text(1149,459,'aws___run_script',30,C.green,'mono',600)+text(1149,518,'Collect logs and metrics.',29,C.white)+text(1149,571,'Inspect resource configuration.',29,C.white)+text(1149,614,'Compute and return evidence.',27,C.muted)
s+=icon('key',1117,674,C.green,.66)+text(1185,711,'Investigation identity',29,C.white,'mono',600)+text(1115,768,'AWS operations follow the scoped role.',27,C.muted)+text(1115,810,'Script results return to the model.',27,C.muted)+pill(1115,853,363,'REMOTE EXECUTION',C.green,23)
s+=arrow([[845,499],[1063,499]],C.green)+text(960,449,'signed HTTPS',21,C.green,'mono',600,'middle')+text(960,478,'+ Python',21,C.green,'mono',600,'middle')+arrow([[1075,601],[857,601]],C.pink)+text(960,652,'results',22,C.pink,'mono',600,'middle')
await save(current,s,'Runtime and AWS MCP execution','The model generates Python tool arguments. Strands sends them over signed Streamable HTTP to the managed AWS MCP endpoint. AWS MCP executes the script remotely and returns evidence or an error. The application assumes the scoped investigation role to sign requests. No local STDIO server or host shell executes these investigation scripts. The underlying managed sandbox compute technology is not asserted here. This replaces the former interpreter diagram; its existing filename is retained for presenter bookmarks.')

current='07-mcp-iam'
s=base('AWS access follows the credentials.','')
const xs=[80,540,1000,1460],ws=[380,380,380,380]
const cs=[C.blue,C.yellow,C.green,C.white]
for(let i=0;i<4;i++){s+=rect(xs[i],334,ws[i],310,C.card,cs[i],24)+numbered(xs[i]+37,334,i+1,cs[i]);if(i<3)s+=arrow([[xs[i]+383,483],[xs[i+1]-10,483]],C.yellow)}
s+=frog(110,395,97,C.green,true)+text(220,425,'harness',27,C.white,'mono',600)+text(220,470,'on Runtime',25,C.muted)+wrap(110,548,'The Runtime role may call STS AssumeRole.',320,29)
s+=icon('key',568,375,C.yellow,.75)+text(568,486,'Temporary credentials',25,C.yellow,'mono',600)+wrap(568,543,'For the scoped investigation role.',324,29)
s+=icon('cloud',1030,380,C.green,.78)+text(1030,486,'Managed AWS MCP',27,C.white,'mono',600)+wrap(1030,543,'Receives the signed request; executes AWS calls.',324,29)
s+=icon('chart',1490,375,C.white,.72)+text(1490,486,'AWS APIs',28,C.white,'mono',600)+wrap(1490,543,'Authorize calls and return evidence.',320,29)
s+=text(962,688,'SigV4 signing uses those temporary investigation credentials.',28,C.yellow,'body',500,'middle')
s+=rect(80,752,844,181,'#0b2514',C.green,24)+icon('check',110,787,C.green,.65)+text(178,805,'ALLOWED',25,C.green,'mono',600)+text(110,858,'Read application logs, metrics and configuration.',29,C.white)+text(110,900,'Inspect stack resources and table metadata.',27,C.muted)
s+=rect(974,752,866,181,'#241013',C.red,24)+text(1009,805,'NOT GRANTED TO THE INVESTIGATION ROLE',23,C.red,'mono',600)+text(1009,858,'Change the app, write orders, read the Slack secret.',28,C.white)+text(1009,900,'The model cannot grant itself extra permissions.',27,C.muted)
await save(current,s,'AWS MCP and the investigation role','Read the numbered chain carefully: application code uses the Runtime role to assume the investigation role through STS; support/aws.ts signs AWS MCP requests with the temporary credentials. Managed AWS MCP executes the requested AWS operations under the investigation identity. IAM bounds those operations. AWS MCP executes remotely; do not draw it as running in the agent container. Some CloudWatch metrics and Logs Insights result permissions require Resource:* and have a broader read scope than the named sample resources. IAM does not make untrusted logs safe instructions or block every possible data-exfiltration route.')

current='08-skills-context-memory'
s=base('What gives the agent context?','')
s+=frog(880,296,160,C.green,true)+text(960,502,'Incident response agent',32,C.white,'mono',600,'middle')
const contextColors=[C.green,C.blue,C.pink],contextTitles=['Skills','Session storage','Long-term memory'],contextDescriptions=['Reusable instructions and procedures for specific tasks.','Saved messages, tool results, and state from an agent session.','Facts and lessons retained across sessions.']
for(let i=0;i<3;i++){
 const x=80+i*600,c=contextColors[i],center=x+280
 s+=arrow([[960,532],[960,564],[center,564],[center,620]],c,3)
 s+=rect(x,628,560,286,C.card,c,32)+icon(['book','file','memory'][i],x+30,660,c,.72)+text(x+104,700,contextTitles[i],31,C.white,'mono',600)+wrap(x+34,780,contextDescriptions[i],492,32,C.white)
}
await save(current,s,'What gives the agent context?','Skills contain reusable instructions and procedures. Session storage persists messages, tool results, and agent state so a session can be restored. Long-term memory retains facts and lessons across sessions. The downward arrows show possible context sources, not a claim that each investigation reads all three. During one invocation, the agent loop retains its working conversation and tool results; it does not need to restore a saved session to use an earlier result. This demo starts a fresh incident session and does not demonstrate a follow-up that restores its snapshot. S3 preserves those snapshots outside the runtime for later inspection or restoration. Local storage could simplify a disposable demo, but files in the current runtime configuration are ephemeral. The shared storage backend can also hold offloaded context; that is distinct from restoring a session snapshot. See SOURCES.md for storage and session documentation.')

for(const [name,color,hat] of [['frog-wizard',C.green,true],['frog-green',C.green,false],['frog-pink',C.pink,false],['frog-pumpkin-orange',C.orange,true]]){
 current=name;let body=frog(152,316,720,color,hat);await save(name,body,name,'',[1024,1100],'overlays')
}
current='pixel-ghost';await save(current,ghost(52,20,10,C.white),'Pixel ghost','',[504,520],'overlays')
current='pixel-pumpkin';await save(current,pumpkin(20,20,8),'Pixel pumpkin','',[488,520],'overlays')

await sharp(path.join(root,'png/01-title.png')).resize(1280,720).png().toFile(path.join(root,'thumbnail.png'))

const thumbs=await Promise.all(manifest.map(async(m,i)=>({input:await sharp(path.join(root,m.png)).resize(640,360).png().toBuffer(),left:(i%3)*656,top:Math.floor(i/3)*376})))
await sharp({create:{width:1952,height:Math.ceil(manifest.length/3)*376-16,channels:4,background:'#000'}}).composite(thumbs).png().toFile(path.join(root,'contact-sheet.png'))
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
await fs.writeFile(path.join(root,'PRESENTER-NOTES.md'),'# Trick or Trace: visual cues\n\nUse the PNGs as full-screen 16:9 sources in your livestream software. Each diagram carries one main explanation; pause on it as long as needed.\n\n'+manifest.map(m=>`## ${m.name}: ${m.title}\n\n${m.notes}\n`).join('\n'))
const out=bounds.filter(b=>b.file.startsWith('0')&&(b.x<32||b.x+b.width>1888||b.y<16||b.y+b.height>1070))
await fs.writeFile(path.join(root,'layout-check.json'),JSON.stringify({textElements:bounds.length,canvasOverflow:out},null,2)+'\n')
if(out.length)throw new Error(`Text outside safe bounds: ${JSON.stringify(out)}`)
console.log(`Built ${manifest.length} full-screen graphics, 6 transparent overlays, and contact sheet. ${bounds.length} text elements checked.`)
