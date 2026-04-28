export type NpcDialogue = {
  readonly pages: readonly string[];
};

export const NPC_DIALOGUES: Record<string, NpcDialogue> = {
  villageIdiot: {
    pages: [
      'Hey there! You look new around here.',
      "Be careful jumping around — the platforms get tricky.",
      "That's all I've got. Good luck!",
    ],
  },
};

export type DialogueState = {
  activeNpcId: string | null;
  pageIndex: number;
};

export function createDialogueState(): DialogueState {
  return { activeNpcId: null, pageIndex: 0 };
}

export function updateDialogue(
  state: DialogueState,
  interactPressed: boolean,
  nearbyNpcId: string | null,
): DialogueState {
  if (state.activeNpcId) {
    const dialogue = NPC_DIALOGUES[state.activeNpcId];
    if (!dialogue) {
      return createDialogueState();
    }

    if (nearbyNpcId !== state.activeNpcId) {
      return createDialogueState();
    }

    if (interactPressed) {
      const nextIndex = state.pageIndex + 1;
      if (nextIndex >= dialogue.pages.length) {
        return createDialogueState();
      }
      return { activeNpcId: state.activeNpcId, pageIndex: nextIndex };
    }

    return state;
  }

  if (nearbyNpcId && interactPressed) {
    return { activeNpcId: nearbyNpcId, pageIndex: 0 };
  }

  return state;
}
