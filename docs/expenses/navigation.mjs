// Keep Android Back within an open editor/group; allow leaving from the home screen.
export function backTarget(openDialogs,groupId){return openDialogs.length?{kind:'dialog',id:openDialogs.at(-1)}:groupId?{kind:'group'}:{kind:'home'};}
export function inAppBack({hasContent,back,onError}){let armed=false,busy=false;history.replaceState({...history.state,expensesApp:true},'',location.href);function arm(){if(!armed&&hasContent()){history.pushState({expensesApp:true,expensesBack:true},'',location.href);armed=true;}}
 window.addEventListener('popstate',async()=>{armed=false;if(!hasContent())return;arm();if(busy)return;busy=true;try{await back();}catch(e){onError(e);}finally{busy=false;}});return {arm};}
