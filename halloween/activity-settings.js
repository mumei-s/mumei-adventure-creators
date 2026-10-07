// Article/profile context and optional keyword tags have separate switches.
// Removing a tag never removes the author's biography, articles or dialogue ideas.
export function profileForArtwork(profile,enabled=true,excluded=new Set(),{tagsEnabled=false}={}){
 if(!enabled)return {...profile,biography:'',titles:[],topics:[],inspiration:null,bodyRead:null,articles:[],sourceEvidence:[],activityEnabled:false,tagsEnabled:false};
 const topics=tagsEnabled?(profile.topics||[]).filter(t=>!excluded.has(t)):[];
 return {...profile,topics,activityEnabled:true,tagsEnabled:Boolean(tagsEnabled)};
}
