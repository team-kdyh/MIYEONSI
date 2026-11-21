/** Rejected before committing the player's turn; safe to request a fresh reply. */
export class ReplyRejectedError extends Error {
 constructor(reason:string){super(reason);this.name='ReplyRejectedError';}
}
export const rejectedReplyMessage='답변이 현재 이야기와 맞지 않아 이어 가지 못했어요. 입력한 말과 이전 진행은 그대로 남아 있어요.';
