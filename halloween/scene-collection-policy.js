import {canonicalSelectionLabel} from './legacy-selection-aliases.js?v=28.4.6';

// Collection membership is editorial metadata, not a keyword/"spooky" filter.
// These events belong to the Halloween edition. Graveyards, witches' studies,
// pumpkin fields, ghost stories and other year-round fantasy remain available.
export const halloweenOnlySceneTitles=Object.freeze([
 '宇宙のHalloween','静かなハロウィーン','カボチャの収穫祭','都会の仮装パレード','花と骸骨の祝祭'
]);
const seasonalScenes=new Set(halloweenOnlySceneTitles);
export function sceneAvailableInCollection(value,collection){return collection!=='everyday'||!seasonalScenes.has(canonicalSelectionLabel('theme',value));}
export function selectionAvailableInCollection(key,value,collection){return key!=='theme'||sceneAvailableInCollection(value,collection);}
export function collectionForScene(values={},collection='halloween'){return sceneAvailableInCollection(values.theme,collection)?collection:'halloween';}

// A UI fallback never edits the saved history/source snapshot. Only the scene
// and an internal place that repeats that same scene are reset; other choices
// and unknown user-authored scenes are left untouched.
export function restoreSceneSelections(values,collection){
 if(!values||sceneAvailableInCollection(values.theme,collection))return values;
 return {...values,theme:'おまかせ',...(values.place===values.theme?{place:'おまかせ'}:{})};
}
export function restoreCollectionSnapshot(state,collection){
 if(!state)return state;
 const selections=restoreSceneSelections(state.selections,collection);
 const modeSnapshots=Object.fromEntries(Object.entries(state.modeSnapshots||{}).map(([mode,values])=>[mode,restoreSceneSelections(values,collection)]));
 const selectedProposal=state.selectedProposal&&sceneAvailableInCollection(state.selectedProposal.theme,collection)?state.selectedProposal:null;
 const proposals=(state.proposals||[]).filter(values=>sceneAvailableInCollection(values.theme,collection));
 const sceneReset=selections!==state.selections||Object.keys(modeSnapshots).some(mode=>modeSnapshots[mode]!==state.modeSnapshots[mode])||selectedProposal!==state.selectedProposal||proposals.length!==(state.proposals||[]).length;
 return {...state,selections,modeSnapshots,selectedProposal,proposals,sceneReset};
}
