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
function base(title,sub,slug){return `<rect width="1920" height="1080" fill="${C.bg}"/><rect x="1310" width="610" height="1080" fill="url(#fade)"/><rect x="1400" y="60" width="520" height="860" fill="url(#dots)"/>`+wordmark(80,48,240)+text(1840,75,slug,22,C.pink,'mono',600,'end')+text(80,170,title,54,C.white,'mono',600)+text(80,226,sub,29,C.muted)}
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
s=base('An alarm becomes an investigation.','One investigator, with managed services doing different jobs.','THE WHOLE SYSTEM')
const top=[['Candy storefront','API Gateway → checkout Lambda → DynamoDB','box'],['CloudWatch alarm','Checkout errors cross the threshold.','alarm'],['EventBridge','Routes the ALARM state-change event.','route'],['Intake Lambda','Builds the prompt and invokes Runtime.','lambda']]
for(let i=0;i<4;i++){let x=80+i*450;s+=smallCard(x,292,410,182,top[i][0],top[i][1],i===1?C.red:C.yellow,top[i][2]);if(i<3)s+=arrow([[x+412,383],[x+442,383]],C.yellow,2)}
s+=arrow([[1635,476],[1635,521],[954,521],[954,584]],C.yellow)
s+=rect(560,586,790,230,'#0b2514',C.green,32)+text(596,632,'AGENTCORE RUNTIME',23,C.blue,'mono',600)+text(596,694,'Strands harness',43,C.white,'mono',600)+text(596,747,'Investigate → analyze → report',29,C.pale)+frog(1150,635,145)
s+=smallCard(80,560,390,151,'AWS MCP','Reads app logs, metrics and configuration.',C.green,'cloud')+smallCard(80,749,390,151,'Code Interpreter','Runs generated analysis code.',C.orange,'terminal')
s+=arrow([[560,649],[478,649]],C.green)+arrow([[478,676],[551,676]],C.green)+arrow([[560,758],[514,758],[514,821],[478,821]],C.orange)+arrow([[478,848],[533,848],[533,785],[551,785]],C.orange)
s+=smallCard(1450,622,390,182,'Slack report','Findings + next steps + on-call mention.',C.pink,'chat')+arrow([[1352,704],[1441,704]],C.pink)
s+=line(677.5,818,677.5,870,C.line,2)+line(937,818,937,870,C.line,2)+line(1214,818,1214,870,C.line,2)
s+=pill(560,876,235,'BEDROCK',C.green)+pill(813,876,248,'S3 SESSIONS',C.pink)+pill(1079,876,270,'AGENTCORE MEMORY',C.pink)
s+=text(1450,875,'The engineer applies',26,C.muted)+text(1450,912,'the recommended fix.',26,C.muted)
await save(current,s,'Overall architecture','Read the top row left to right, then follow the event into Runtime. Intake Lambda only dispatches. Bidirectional tool connectors carry requests and results. Bedrock provides the model; S3 stores incident snapshots; AgentCore Memory stores lessons. Report text and mention are posted directly to Slack by application code. The current demo does not post a ticket or report URL. Not every deployed support resource is drawn.')

current='03-strands-loop'
s=base('A model that can act, then check.','Strands coordinates the conversation and tool execution.','THE AGENT LOOP')
s+=arrow([[551,547],[590,547],[590,365],[625,365]],C.green)+arrow([[1286,365],[1325,365],[1325,547],[1360,547]],C.green)+arrow([[1587,652],[1587,845],[1295,845]],C.green)+arrow([[624,845],[317,845],[317,660]],C.green)
s+=smallCard(80,456,475,202,'1  Build context','Task, instructions, conversation and available tools.','#6a8bff','file')
s+=smallCard(635,282,650,167,'2  Ask the model','Amazon Bedrock: answer now, or choose a tool?',C.green,'model')
s+=smallCard(1365,456,475,202,'3  Execute a tool','Strands calls the selected tool with the model’s arguments.',C.yellow,'tool')
s+=smallCard(635,772,650,167,'4  Return evidence','The tool result becomes context for the next step.',C.pink,'file')
s+=frog(880,530,160,C.green,true)+text(960,738,'STRANDS AGENT',24,C.green,'mono',600,'middle')

await save(current,s,'The Strands agent loop','The model chooses a tool; Strands executes it and feeds back the result. The loop can continue through several tools or finish with an answer. This is a conceptual loop, not a separate deployment architecture. Reasoning does not require displaying private model reasoning.')

current='04-harness-defaults'
s=base('The agent, already equipped.','createHarness() assembles the defaults. You choose what to change.','Strands harness')
s+=rect(662,395,597,449,'#0b2514',C.green,32)+frog(875,489,180,C.green,true)+text(960,720,'createHarness()',34,C.white,'mono',600,'middle')+text(960,775,'A configured Strands agent',28,C.pale,'body',500,'middle')
const cards=[['Built-in tools','Shell and file tools, ready for the model to use.','tool',C.yellow],['Context management','Offload large results. Retrieve details. Compact context.','file',C.blue],['Local sessions','Save conversation snapshots; resume with a session ID.','box',C.pink],['Long-term memory','Extract useful facts and retrieve them in later sessions.','memory',C.pink],['Skills','Discover runbooks and load procedures when relevant.','book',C.green],['Default output','See generated text and tool activity in the console.','terminal',C.yellow]]
for(let i=0;i<6;i++){const right=i>=3,j=i%3,x=right?1340:80,y=292+j*224;s+=smallCard(x,y,500,185,cards[i][0],cards[i][1],cards[i][3],cards[i][2]);s+=line(right?1259:580,right?620:y+93,right?1340:662,right?y+93:620,C.line,2)}
s+=text(960,963,'Basic demo: defaults on. Incident agent: tools and providers selected explicitly.',27,C.muted,'body',500,'middle')
await save(current,s,'What harness gives you','Use while the basic TypeScript example is visible. Defaults verified against harness 0.3.1 and SDK 1.22.0. Local file tools and shell are not automatically isolated. Sessions default to .agent/sessions; file memory defaults to .agent/memory; .agent/skills is discovered if present. Short demos may not exercise compaction or produce useful memories. Default web search is provider-dependent, so it is not represented as universally enabled.')

current='05-runtime-memory'
s=base('Remember the incident. Learn for next time.','This demo uses two stores, with two different jobs.','RUNTIME + MEMORY')
s+=rect(80,336,650,523,'#101826',C.blue,32)+text(118,387,'AGENTCORE RUNTIME',25,C.blue,'mono',600)+rect(120,429,570,277,'#0b2514',C.green,24)+frog(535,495,125,C.green,true)+text(155,485,'Strands harness',33,C.white,'mono',600)+text(155,557,'Incident A',30,C.white,'mono')+text(155,613,'investigate → report',27,C.pale)+text(118,778,'Same service identity.',31,C.white)+text(118,825,'New session for each incident.',29,C.muted)
s+=rect(1070,292,770,242,C.card,C.pink,24)+icon('box',1100,325,C.pink,.7)+text(1172,360,'S3 session snapshots',34,C.white,'mono',600)+text(1100,423,'“What have we done in this incident?”',31,C.white)+text(1100,477,'Conversation and state for follow-up questions.',27,C.muted)
s+=rect(1070,649,770,272,C.card,C.pink,24)+icon('memory',1100,682,C.pink,.7)+text(1172,717,'AgentCore Memory',34,C.white,'mono',600)+text(1100,780,'“What helped in previous incidents?”',31,C.white)+text(1100,832,'Events → asynchronous extraction → lessons',27,C.muted)+text(1100,882,'Retrieve a lesson; verify it against current evidence.',26,C.pink)
s+=arrow([[730,469],[1060,469]],C.pink)+arrow([[1060,506],[740,506]],C.pink)+text(900,437,'save / restore',24,C.pink,'mono',500,'middle')
s+=arrow([[730,744],[1060,744]],C.pink)+arrow([[1060,781],[740,781]],C.pink)+text(900,709,'events / recall',24,C.pink,'mono',500,'middle')
s+=text(80,952,'S3 is this demo’s snapshot backend; AgentCore Memory also has short-term event storage.',26,C.muted)
await save(current,s,'harness on Runtime with sessions and memory','Runtime hosts the process; it is not the durable memory store. Our current TypeScript integration uses SessionManager and S3Storage for snapshots, and AgentCoreMemoryStore for lessons. This is a demo integration choice, not a claim that AgentCore lacks short-term memory. Extraction is asynchronous. A confirmed engineer outcome is stronger evidence for a future lesson than the agent’s initial hypothesis.')

current='06-runtime-interpreter'
s=base('The agent runs here. Its analysis runs there.','Runtime hosts the investigator; Code Interpreter executes generated code.','TWO EXECUTION ENVIRONMENTS')
s+=rect(80,300,765,620,'#101826',C.blue,32)+text(120,358,'AGENTCORE RUNTIME',30,C.blue,'mono',600)+rect(120,407,685,228,'#0b2514',C.green,24)+frog(607,459,154,C.green,true)+text(153,467,'Strands harness',38,C.white,'mono',600)+text(153,528,'Model calls + tool coordination',28,C.pale)+text(153,582,'Packaged source + runbook',28,C.pale)
s+=icon('key',122,674,C.blue,.66)+text(190,711,'Runtime execution role',29,C.white,'mono',600)+wrap(121,768,'Model, sessions, memory, interpreter access and the Slack secret.',674,28)+pill(121,853,372,'HOST SHELL DISABLED',C.blue,23)
s+=rect(1075,300,765,620,'#21170d',C.orange,32)+text(1115,358,'CODE INTERPRETER',30,C.orange,'mono',600)+rect(1115,407,685,228,'#101010',C.line,24)
s+=text(1149,452,'synthetic-example.py',24,C.muted,'mono')+text(1149,511,'requests = 20',31,C.white,'mono')+text(1149,561,'errors = 20',31,C.white,'mono')+text(1149,611,'print(errors / requests)',31,C.green,'mono')
s+=icon('key',1117,674,C.orange,.66)+text(1185,711,'Separate execution role',29,C.white,'mono',600)+text(1115,768,'Separate filesystem. Code, shell and files.',28,C.muted)+text(1115,810,'No app permissions granted in this demo.',27,C.muted)+pill(1115,853,363,'SANDBOX NETWORKING',C.orange,23)
s+=arrow([[845,499],[1063,499]],C.green)+text(960,468,'code + data',22,C.green,'mono',600,'middle')+arrow([[1075,601],[857,601]],C.orange)+text(960,652,'results',22,C.orange,'mono',600,'middle')
s+=text(80,966,'Explicit startSession → execute → stopSession. Runtime credentials are not passed into analysis code.',25,C.muted)
await save(current,s,'Runtime and Code Interpreter boundaries','CodeInterpreterTools is the published AgentCore TypeScript integration. The Runtime process starts one interpreter session and closes it in finally. It sends selected code/data via service APIs and receives results. The interpreter role has no app-resource policies in this template. SANDBOX networking is not an absolute air gap. The Runtime itself has PUBLIC networking. Generated code running on the host would have a different access boundary; this demo disables the host shell.')

current='07-mcp-iam'
s=base('AWS access follows the credentials.','Our agent assumes the investigation role before it calls managed AWS MCP.','AWS MCP + IAM')
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
await save(current,s,'AWS MCP and the investigation role','Read the numbered chain carefully: application code uses the Runtime role to assume the investigation role through STS; support/aws.ts signs AWS MCP requests with the temporary credentials. Managed AWS MCP executes the requested AWS operations under the investigation identity. IAM bounds those operations. Do not label AWS MCP as our Code Interpreter instance or draw it as running in the agent container. Some CloudWatch metrics and Logs Insights result permissions require Resource:* and have a broader read scope than the named sample resources. IAM does not make untrusted logs safe instructions or block every possible data-exfiltration route.')

current='08-skills-context-memory'
s=base('Instructions. Working state. Experience.','Three kinds of information that help the same agent make its next decision.','CONTEXT ENGINEERING')
const names=['A RUNBOOK','THIS INVESTIGATION','PREVIOUS INCIDENTS'], colors=[C.green,C.blue,C.pink], titles=['Skills','Session + context','Long-term memory'], examples=['“Follow our checkout triage procedure.”','“We already checked the table name.”','“This failure was fixed by restoring config.”']
for(let i=0;i<3;i++){const x=80+i*600,c=colors[i];s+=rect(x,319,560,558,C.card,c,32)+pill(x+28,346,504,names[i],c,23)+icon(['book','file','memory'][i],x+38,430,c,1.0)+frog(x+382,441,122,c,i===0)+text(x+34,568,titles[i],33,C.white,'mono',600)+wrap(x+34,630,examples[i],492,33,C.white)+line(x+34,737,x+526,737,c,2)}
s+=text(114,791,'Packaged with the agent.',29,C.muted)+text(114,839,'Load the relevant procedure.',27,C.green)
s+=text(714,791,'Keep and retrieve useful evidence.',27,C.muted)+text(714,839,'Offload or compact as needed.',27,C.blue)
s+=text(1314,791,'Extract and recall useful lessons.',27,C.muted)+text(1314,839,'Check them against today’s facts.',27,C.pink)
s+=text(960,951,'Logs are evidence to inspect, not instructions to obey.',34,C.white,'body',600,'middle')
await save(current,s,'Skills, working context, and long-term memory','Use the runbook at .agent/skills/checkout-investigation as the concrete skill. A skill is authored procedure, session state records the current incident, and extracted memory carries earlier experience. Context management governs what stays in the model’s current window. Treat prompt-injection text in logs as untrusted evidence; this diagram states the intended workflow, not a guaranteed security property of a prompt.')

current='09-observability'
s=base('Watch the investigation unfold.','Use AgentCore observability to inspect actual tool inputs, outputs and timing.','SHOW THE EVIDENCE')
s+=line(175,400,1745,400,C.green,5)
const stages=[['Runtime','Request accepted','cloud'],['Model','Chooses a tool','model'],['AWS MCP','Collects evidence','chart'],['Interpreter','Runs analysis','terminal'],['Slack','Posts the report','chat']]
for(let i=0;i<5;i++){const x=180+i*390,c=[C.blue,C.green,C.green,C.orange,C.pink][i];s+=`<circle cx="${x}" cy="400" r="65" fill="#080d09" stroke="${c}" stroke-width="3"/>`+icon(stages[i][2],x-29,370,c,.83)+text(x,515,stages[i][0],30,C.white,'mono',600,'middle')+text(x,566,stages[i][1],26,C.muted,'body',500,'middle')}
s+=rect(80,649,1190,282,'#111713',C.green,24)+text(117,701,'ILLUSTRATIVE REPORT',24,C.green,'mono',600)+text(117,765,'Evidence: TABLE_NAME points to a missing table.',32,C.white)+text(117,824,'Recommendation: restore the expected table name.',29,C.white)+text(117,886,'The engineer applies the fix and verifies recovery.',29,C.muted)
s+=frog(1530,743,158,C.green,true)+text(1604,940,'Show the tool result.',26,C.green,'mono',600,'middle')
await save(current,s,'Inspect the investigation in observability','Illustrative sequence, not a screenshot or a guarantee of tool ordering. Use actual AgentCore traces to inspect model/tool spans, AWS MCP nested API results, Code Interpreter code/results, and Slack HTTP reporting. ACCEPTED only acknowledges dispatch; it does not mean investigation or Slack delivery succeeded. Native ADOT supplies traces. No custom BeforeToolCall logging hook is required. Application code posts Slack after the final agent answer.')

for(const [name,color,hat] of [['frog-wizard',C.green,true],['frog-green',C.green,false],['frog-pink',C.pink,false],['frog-pumpkin-orange',C.orange,true]]){
 current=name;let body=frog(152,316,720,color,hat);await save(name,body,name,'',[1024,1100],'overlays')
}
current='pixel-ghost';await save(current,ghost(52,20,10,C.white),'Pixel ghost','',[504,520],'overlays')
current='pixel-pumpkin';await save(current,pumpkin(20,20,8),'Pixel pumpkin','',[488,520],'overlays')

await sharp(path.join(root,'png/01-title.png')).resize(1280,720).png().toFile(path.join(root,'thumbnail.png'))

const thumbs=await Promise.all(manifest.map(async(m,i)=>({input:await sharp(path.join(root,m.png)).resize(640,360).png().toBuffer(),left:(i%3)*656,top:Math.floor(i/3)*376})))
await sharp({create:{width:1952,height:1112,channels:4,background:'#000'}}).composite(thumbs).png().toFile(path.join(root,'contact-sheet.png'))
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
await fs.writeFile(path.join(root,'PRESENTER-NOTES.md'),'# Trick or Trace: visual cues\n\nUse the PNGs as full-screen 16:9 sources in your livestream software. Each diagram carries one main explanation; pause on it as long as needed.\n\n'+manifest.map(m=>`## ${m.name}: ${m.title}\n\n${m.notes}\n`).join('\n'))
const out=bounds.filter(b=>b.file.startsWith('0')&&(b.x<32||b.x+b.width>1888||b.y<16||b.y+b.height>1070))
await fs.writeFile(path.join(root,'layout-check.json'),JSON.stringify({textElements:bounds.length,canvasOverflow:out},null,2)+'\n')
if(out.length)throw new Error(`Text outside safe bounds: ${JSON.stringify(out)}`)
console.log(`Built ${manifest.length} full-screen graphics, 6 transparent overlays, and contact sheet. ${bounds.length} text elements checked.`)
