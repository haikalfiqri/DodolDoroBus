const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const dir=''+require('path').resolve(__dirname,'../public/art/svg')+'';const out=process.argv[2]||'/tmp/render';
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.svg')&&!f.includes('_anim'));
const b=await chromium.launch();const p=await b.newPage({viewport:{width:512,height:512}});
for(const f of files){fs.writeFileSync(''+require('os').tmpdir()+'/w.html',`<html><body style="margin:0;background:transparent"><img src="file://${dir}/${f}" style="width:512px;height:512px;display:block"></body></html>`);await p.goto('file://'+require('os').tmpdir()+'/w.html');
await p.waitForTimeout(60);await p.screenshot({path:`${out}/${f.replace('.svg','.png')}`,omitBackground:true});}
await b.close();console.log(files.length)})()
