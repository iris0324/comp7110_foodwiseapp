export function seed(language='en',epoch='initial',now=new Date().toISOString()){
 return {schemaVersion:1,epoch,revision:0,settings:{language,currency:'AUD',nearDateDays:5,phoneNotifications:false,storyAnimations:true,reduceMotion:false,storyGuidance:true},foodItems:[],foodEvents:[],receiptImports:[],cart:[],drafts:[],purchases:[],purchaseItems:[],stories:[],storyActions:[],outcomes:[],appliedOperations:{}};
}
// The runtime intentionally does not provide sample food rows.
export function sampleRows(){return [];}
