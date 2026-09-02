import type { HTMLAttributes } from "react";
export function Conversation(props: HTMLAttributes<HTMLDivElement>) { return <div aria-live="polite" aria-relevant="additions text" aria-busy={props["aria-busy"]} {...props} />; }
