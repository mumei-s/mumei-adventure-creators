import fs from 'node:fs';
import {productionPlan} from '../../production-plan.js?v=16';
import {composePrompt} from '../../prompt.js?v=16';
const old=JSON.parse(fs.readFileSync(new URL('./interview-crystal-plan.json',import.meta.url)));
const values={...old.values,medium:'宝石ホログラムアニメ'};
const profile={displayName:'無名 S note',activityEnabled:false,topics:[],biography:''};
const plan=productionPlan(profile,values,old.variant,'halloween',()=>.28);
fs.writeFileSync(new URL('./interview-hologram-plan.json',import.meta.url),JSON.stringify(plan,null,2));
fs.writeFileSync(new URL('./interview-hologram-input.txt',import.meta.url),composePrompt({profile,values,variant:plan.variant,edition:'HOLOGRAM-INTERVIEW-V16',references:[{name:'reference-01-1000015491.jpg',role:'identity'}],preparedPlan:plan}));
