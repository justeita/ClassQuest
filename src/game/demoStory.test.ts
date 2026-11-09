import { describe, expect, it } from "vitest";

import { DEMO_STORY, DEMO_STORY_ID, findDemoStory } from "./demoStory";

describe("cerita demo", () => {
  it("DEMO_STORY_ID berasal dari meta cerita", () => {
    expect(DEMO_STORY_ID).toBe(DEMO_STORY.meta.id);
    expect(DEMO_STORY_ID).not.toHaveLength(0);
  });

  it("findDemoStory mengembalikan cerita untuk id yang dikenal", () => {
    expect(findDemoStory(DEMO_STORY_ID)).toBe(DEMO_STORY);
  });

  it("findDemoStory mengembalikan undefined untuk id lain", () => {
    expect(findDemoStory("st_tidak_ada")).toBeUndefined();
    expect(findDemoStory("")).toBeUndefined();
  });
});
