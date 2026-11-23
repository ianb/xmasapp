const KEY = "favorites";

export class Favorites {
  private ids: Set<string>;

  constructor() {
    this.ids = new Set(read());
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
