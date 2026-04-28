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
