// Account cleanup follows a confirmed SDK signout, never a failed request.
export async function signOutAndClear(client,clear){
 if(client){const {error}=await client.auth.signOut();if(error)throw error;}
 await clear();
}
export function foodSavePage(isNew){return isNew?'food':'food-detail';}
