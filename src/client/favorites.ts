import type { Song } from "./songs";

const KEY = "favorites";

export class Favorites {
  private ids: Set<string>;

  constructor(songs: Song[]) {
    this.ids = new Set(read());
    // Migrate the old "favorite.<Song Title>" keys from the original app.
    let migrated = false;
    for (const song of songs) {
      const oldKey = `favorite.${song.title}`;
      if (safeGet(oldKey)) {
        this.ids.add(song.id);
        safeRemove(oldKey);
        migrated = true;
      }
    }
    if (migrated) this.save();
  }

  has(id: string): boolean {
    return this.ids.has(id);
  }

  toggle(id: string): boolean {
    if (this.ids.has(id)) {
      this.ids.delete(id);
    } else {
      this.ids.add(id);
    }
    this.save();
    return this.ids.has(id);
  }

  private save() {
    try {
      localStorage.setItem(KEY, JSON.stringify([...this.ids]));
    } catch {
      // Storage may be unavailable (private mode); favorites just won't persist.
    }
  }
}

function read(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
