// Typing telemetry remains disabled until a participant-authorized private channel exists.
const ignoreTyping = (_typing: boolean) => {};
const hideTyping = () => {};
export function useTypingIndicator(_conversationId: string, _otherUserId: string) {
 return { isOtherUserTyping: false, setTyping: ignoreTyping, hideTypingImmediately: hideTyping };
}
