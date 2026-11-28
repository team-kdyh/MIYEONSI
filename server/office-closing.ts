import type {DialogueGame} from './dialogue.ts';
import type {NarrativeReply} from './narrative.ts';
import {missions} from './office.ts';

// Only a standalone sign-off ends a turn without asking the character to reply.
// Questions, quotations and plans to leave later still belong to the conversation.
const courtesyPrefix=/^(?:(?:네|예|넵|그럼|그러면|저는|전|이만|먼저|이제|오늘은|부장님|감사합니다|고맙습니다|수고하세요|알겠습니다)[\s,.!~…]*)+/u;
const courtesySuffix=/(?:[.!~…\s]+(?:감사합니다|수고하세요|내일 뵙겠습니다))[.!~…\s]*$/u;
const signoffs=new Set([
 '퇴근하겠습니다','퇴근할게요','들어가겠습니다','들어가보겠습니다','들어갈게요',
 '물러가겠습니다','가보겠습니다','가볼게요','일어나겠습니다','안녕히계세요',
 '대화를여기서마치겠습니다','대화를여기서마칠게요','대화를마치겠습니다','대화마칠게요',
 '여기까지하겠습니다','여기까지할게요','내일뵙겠습니다','내일뵐게요',
]);

export function isOfficeFarewell(text:string){
 const phrase=text.trim().replace(courtesyPrefix,'').replace(courtesySuffix,'').replace(/[.!~…]+$/u,'').replace(/\s+/gu,'');
 return signoffs.has(phrase);
}

function close(g:DialogueGame,award:'success'|'agreed'|'closed',reason:string){
 const mission=missions[g.step];
 g.ending=`office-${mission.id}-${award}`;
 if(g.office)g.office.outcome=award==='success'?'success':null;
 g.log.push({speaker:'협상 결과',text:reason});
}

// The director and the adjudicator use the same final decisions. An NPC can
// grant the actual mission without inventing a player concession or a score.
const grants:Record<string,{example:string;summary:string;decision:RegExp}> = {
 clockout:{example:'이제 퇴근하세요.',summary:'부장이 퇴근을 허락했습니다.',decision:/^(?:(?:오늘은?|이제|먼저|정시에|지금|여섯 시에|6시에|바로|그냥|편하게)[,\s]*)*퇴근(?:하세요|하시죠|해요|(?:하셔도|해도) (?:돼요|됩니다|좋습니다))$/u},
 dinner:{example:'오늘 회식은 빠지셔도 됩니다.',summary:'부장이 오늘 회식에 빠져도 된다고 했습니다.',decision:/^(?:오늘\s*)?회식(?:은|에서|에는)?\s*(?:빠지셔도 (?:돼요|됩니다)|안 (?:오셔도|가셔도) (?:돼요|됩니다))$/u},
 weekend:{example:'이번 주말은 푹 쉬세요.',summary:'이번 주말은 출근하지 않고 쉬기로 했습니다.',decision:/^(?:이번\s*)?주말(?:은|에는|에|엔)?\s*(?:(?:잘|푹|편히)\s*)?(?:쉬세요|쉬고\s*오세요|(?:쉬셔도|쉬어도) (?:돼요|됩니다))$/u},
 vacation:{example:'신청한 휴가를 그대로 승인합니다.',summary:'부장이 신청한 휴가를 승인했습니다.',decision:/^(?:(?:신청한|신청하신|요청한|요청하신)\s*)?휴가(?:를|는)?\s*(?:그대로\s*)?승인(?:합니다|할게요|하겠습니다)$/u},
 credit:{example:'발표 자료에 원저자로 이름을 올리겠습니다.',summary:'부장이 발표 자료에 원저자의 이름을 올리기로 했습니다.',decision:/^발표 자료에 (?:원저자|작성자)로 (?:본인 |자네 |당신 )?이름을 (?:올리겠습니다|넣겠습니다|올릴게요)$/u},
 meeting:{example:'회의는 30분으로 줄이겠습니다.',summary:'부장이 회의 시간을 줄이기로 했습니다.',decision:/^(?:오늘\s*)?회의(?:는|를)?\s*(?:30|삼십)분으로\s*(?:줄이겠습니다|줄이죠|줄일게요|하죠)$/u},
 delegation:{example:'재고표는 영업팀에 돌려보내겠습니다.',summary:'재고표를 원래 담당인 영업팀에 돌려보내기로 했습니다.',decision:/^재고표(?:는|를) (?:원래 담당인 )?영업팀에 (?:돌려보내겠습니다|돌려보내죠|돌려보낼게요)$/u},
 remote:{example:'매주 수요일 재택근무를 승인합니다.',summary:'부장이 수요일 재택근무를 허락했습니다.',decision:/^매주 수요일(?:에는|은)? 재택(?:근무)?(?:를|는)? (?:승인합니다|승인할게요|허용합니다)$/u},
};
export function officeGrantExample(id:string){return grants[id].example;}

const courtesyEnd=/^(?:수고(?:했어요|했습니다| 많았어요)|고생했어요|(?:내일|월요일|다음\s*주)(?:에|에는|엔)?\s*(?:봅시다|봐요|뵙죠|뵙겠습니다)|(?:다음\s*주|월요일)(?:에는|엔|에)?\s*좋은 소식(?:도)?\s*(?:좀\s*)?들고 오(?:세요|시고요)|(?:남은 (?:건|일은) |나머지는 )?(?:내가|제가) (?:보증하죠|맡죠|맡을게요|처리할게요))$/u;
const optionalAnecdote=/^(?:[^.!?]{1,60}\s)?(?:아이디어|좋은 생각|재밌는 이야기)(?:가| 하나)? (?:떠오르|생기|있으)면 (?:나중에 )?(?:귀띔만|얘기만) 해\s*주세요$/u;
const sentences=(line:string)=>line.split(/[.!~。！\n]+/u).map(s=>s.trim().replace(/^(?:(?:네|그래요|좋아요|그럼|알겠습니다)[,\s]+)+/u,'')).filter(Boolean);
function grantsMission(id:string,line:string){
 if(/[?？“”‘’"'「」]|가정(?:해|하)|예를 들|(?:하|되|라|다)면|거든|기 전에|하고 나서|아직|끝내고|마치고|단[,\s]|말고|취소/u.test(line))return false;
 const parts=sentences(line);
 const index=parts.findIndex((s,i)=>grants[id].decision.test(s)||(id==='clockout'&&grants.weekend.decision.test(s)&&parts.slice(i+1).some(p=>/^(?:다음\s*주|월요일)/u.test(p))));
 return index>=0&&!parts.slice(0,index).some(s=>/(?:하세요|주세요|하셔야|해야 합니다|부터 끝내|해야 해요|조건이|조건은|못 합|안 됩)/u.test(s))&&parts.slice(index+1).every(s=>courtesyEnd.test(s)||optionalAnecdote.test(s));
}
function finishGrantedRelease(g:DialogueGame,line=g.dialogue?.reply){
 if(g.ending||g.mode!=='office'||!line)return false;
 const mission=missions[g.step];
 if(!grantsMission(mission.id,line))return false;
 const reason=grants[mission.id].summary;
 close(g,'success',`${reason} “${line}”`);
 return true;
}

/** Older builds could save an acknowledgement after a grant. Keep the actual
 * transcript and settle only across an uninterrupted courtesy exchange. */
export function settleSavedOfficeDecision(g:DialogueGame|null){
 if(!g?.officeMatch||g.ending)return false;
 const exchanges=g.officeMatch.exchanges;
 for(let i=exchanges.length-1;i>=0;i--){
  const turn=exchanges[i];
  if(finishGrantedRelease(g,turn.reply))return true;
  if(!/^(?:네|예|넵|알겠습니다|감사합니다|고맙습니다)[.!~,\s]*$/u.test(turn.player.trim()))break;
  const parts=sentences(turn.reply);
  if(!parts.length||!parts.every(s=>courtesyEnd.test(s)||optionalAnecdote.test(s)))break;
 }
 return false;
}

function currentAgreements(events:NarrativeReply['events']){
 const agreements=new Map<string,string>();
 for(const event of events){
  if(event.kind!=='concession')continue;
  if(event.status==='accepted')agreements.set(event.value,event.text);
  if(event.status==='refused')agreements.delete(event.value);
 }
 return [...agreements.values()];
}
// The boss can sign off one turn after agreeing. A pose alone is not a decision.
export function finishOfficeReply(g:DialogueGame,reply:NarrativeReply,accepted:NarrativeReply['events']){
 if(g.mode!=='office'||g.ending)return;
 finishGrantedRelease(g);
 if(g.ending||/[?？“”‘’"'「」]|(?:하|되|다)면|단[,\s]|해야|보내세요|해주세요|해 주세요/u.test(reply.line))return;
 const last=sentences(reply.line).at(-1);
 if(!last||!/^(?:수고(?:했어요|했습니다| 많았어요)|고생했어요|(?:내일|월요일|다음\s*주)(?:에|에는|엔)?\s*(?:봐요|봅시다|뵙죠|뵙겠습니다)|여기까지(?:입니다| 하죠| 합시다))$/u.test(last))return;
 const settled=currentAgreements(g.narrative?.events??accepted);
 if(settled.length)close(g,'agreed',`대화에서 정한 내용입니다.\n${settled.join('\n')}\n“${reply.line}”`);
}

export function finishOfficeConversation(g:DialogueGame){
 const previous=g.dialogue?.reply;
 finishGrantedRelease(g);
 if(!g.ending){
  const settled=currentAgreements(g.narrative?.events??[]);
  if(settled.length)close(g,'agreed',`대화에서 정한 내용입니다.\n${settled.join('\n')}`);
  else close(g,'closed',previous&&g.officeMatch?.exchanges.some(e=>e.reply)?`여기서 대화를 마쳤습니다. 부장의 마지막 말은 “${previous}”였습니다.`:'당신이 먼저 대화를 마쳤습니다.');
 }
}
