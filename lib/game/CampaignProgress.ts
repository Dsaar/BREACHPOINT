import { campaign, missionById } from './Campaign';
export type Progress = {
  version: 1;
  completed: number[];
  highestUnlocked: number;
  lastPlayed: number;
  campaignCompleted: boolean;
};
export interface ProgressStore {
  read(): unknown;
  write(progress: Progress): void;
}
export class LocalProgressStore implements ProgressStore {
  constructor(private key = 'breachpoint.black-tide.v1') {}
  read(): unknown {
    const raw = localStorage.getItem(this.key);
    return raw ? JSON.parse(raw) : null;
  }
  write(progress: Progress) {
    localStorage.setItem(this.key, JSON.stringify(progress));
  }
}
export function normalizeProgress(raw: unknown): Progress {
  const data = raw && typeof raw === 'object' ? (raw as Partial<Progress>) : {};
  const supplied =
    data.version === 1 && Array.isArray(data.completed) ? data.completed : [];
  // Only a contiguous sequence is valid. Derived fields are never trusted.
  const completed: number[] = [];
  for (const mission of campaign) {
    if (!supplied.includes(mission.id)) break;
    completed.push(mission.id);
  }
  const highestUnlocked =
    campaign[Math.min(completed.length, campaign.length - 1)].id;
  const lastPlayed = campaign.some(
    (m) => m.id === data.lastPlayed && m.id <= highestUnlocked,
  )
    ? data.lastPlayed!
    : 1;
  return {
    version: 1,
    completed,
    highestUnlocked,
    lastPlayed,
    campaignCompleted: completed.length === campaign.length,
  };
}
export class CampaignProgress {
  value: Progress;
  warning = '';
  constructor(private store: ProgressStore) {
    try {
      this.value = normalizeProgress(store.read());
    } catch {
      this.value = normalizeProgress(null);
      this.warning = 'Save unavailable. Progress will remain in this session.';
    }
  }
  canLaunch(id: number) {
    return campaign.some(
      (m) => m.id === id && id <= this.value.highestUnlocked,
    );
  }
  private save() {
    try {
      const existing = normalizeProgress(this.store.read());
      this.value = normalizeProgress({
        ...this.value,
        completed: [...existing.completed, ...this.value.completed],
      });
      this.store.write(this.value);
      this.warning = '';
    } catch {
      this.warning =
        'Progress could not be saved. Keep this tab open to retain this session.';
    }
    return this.value;
  }
  launch(id: number) {
    missionById(id);
    if (!this.canLaunch(id))
      throw new Error('Complete the preceding mission first');
    this.value = { ...this.value, lastPlayed: id };
    return this.save();
  }
  complete(id: number) {
    if (!this.canLaunch(id))
      throw new Error('Cannot complete a locked mission');
    this.value = normalizeProgress({
      ...this.value,
      completed: [...this.value.completed, id],
      lastPlayed: id,
    });
    return this.save();
  }
}
