export interface VocabularyWord {
  id: string;
  english: string;
  hebrew: string;
  known: boolean | null; // null = not tested, true = V, false = X
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  words: VocabularyWord[];
}

export const sampleWords: VocabularyWord[] = [];

export const users: UserProfile[] = [
  { id: "hadar", name: "הדר", avatar: "🌟", words: [] },
  { id: "maya", name: "מיה", avatar: "🦋", words: [] },
  { id: "ido", name: "עידו", avatar: "🚀", words: [] },
];
