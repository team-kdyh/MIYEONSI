/** Rejected before committing the player's turn; safe to request a fresh reply. */
export class ReplyRejectedError extends Error {
 constructor(reason:string,readonly draft?:unknown,readonly repairable=true){super(reason);this.name='ReplyRejectedError';}
}
/** The proposed score or recollection lacked support. Ask for a fresh, unscored exchange. */
export class UngroundedOfficeReply extends ReplyRejectedError {}
export const rejectedReplyMessage='인물의 답장을 준비하지 못했어요. 보내신 말은 고치지 않아도 됩니다. 같은 말로 답변을 다시 받을 수 있어요.';
