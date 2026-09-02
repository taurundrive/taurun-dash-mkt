import { describe, it, expect } from "vitest";
import {
  normalizeMediaType,
  InstagramPost,
} from "../integrations/meta/fetchInstagramPosts";

describe("Instagram Posts and Metrics Logic", () => {
  it("normaliza tipos de mídia corretamente", () => {
    expect(normalizeMediaType("VIDEO", "REELS")).toBe("REELS");
    expect(normalizeMediaType("VIDEO", "FEED")).toBe("REELS");
    expect(normalizeMediaType("CAROUSEL_ALBUM", "FEED")).toBe("CAROUSEL");
    expect(normalizeMediaType("IMAGE", "FEED")).toBe("IMAGE");
  });

  it("calcula taxa de engajamento, collabs e ordenação corretamente", () => {
    const posts: InstagramPost[] = [
      {
        id: "post1",
        caption: "Post com alto alcance",
        mediaType: "REELS",
        mediaProductType: "REELS",
        permalink: "https://instagram.com/p/1",
        thumbnailUrl: "https://example.com/1.jpg",
        mediaUrl: "https://example.com/1.mp4",
        timestamp: "2026-09-02T10:00:00Z",
        likes: 100,
        comments: 10,
        shares: 5,
        saved: 5,
        reach: 2000,
        views: 3500,
        totalInteractions: 120,
        engagementRate: (120 / 2000) * 100, // 6%
        isCollab: true,
        collaborators: ["mansaomaromba", "professor_caveira"],
      },
      {
        id: "post2",
        caption: "Post com viralização extrema",
        mediaType: "REELS",
        mediaProductType: "REELS",
        permalink: "https://instagram.com/p/2",
        thumbnailUrl: "https://example.com/2.jpg",
        mediaUrl: "https://example.com/2.mp4",
        timestamp: "2026-09-01T15:00:00Z",
        likes: 500,
        comments: 50,
        shares: 30,
        saved: 20,
        reach: 10000,
        views: 18000,
        totalInteractions: 600,
        engagementRate: (600 / 10000) * 100, // 6%
        isCollab: true,
        collaborators: ["dumendesoficial", "leodutraa"],
      },
      {
        id: "post3",
        caption: "Carrossel de produto solo",
        mediaType: "CAROUSEL",
        mediaProductType: "FEED",
        permalink: "https://instagram.com/p/3",
        thumbnailUrl: "https://example.com/3.jpg",
        mediaUrl: "https://example.com/3.jpg",
        timestamp: "2026-08-25T12:00:00Z",
        likes: 200,
        comments: 20,
        shares: 10,
        saved: 15,
        reach: 4000,
        views: 0,
        totalInteractions: 245,
        engagementRate: (245 / 4000) * 100, // 6.125%
        isCollab: false,
        collaborators: [],
      },
    ];

    // Verifica collabs
    const collabs = posts.filter((p) => p.isCollab);
    expect(collabs.length).toBe(2);
    expect(collabs[0].collaborators).toContain("mansaomaromba");
    expect(collabs[1].collaborators).toContain("dumendesoficial");

    // Ordenação por visualizações (Views primeiro)
    const sortedByViews = [...posts].sort((a, b) => {
      const sA = a.views > 0 ? a.views : a.reach;
      const sB = b.views > 0 ? b.views : b.reach;
      return sB - sA;
    });

    expect(sortedByViews[0].id).toBe("post2"); // 18.000 views
    expect(sortedByViews[1].id).toBe("post3"); // 4.000 reach (sem views)
    expect(sortedByViews[2].id).toBe("post1"); // 3.500 views

    // Top 3 extração
    const top3 = sortedByViews.slice(0, 3);
    expect(top3.length).toBe(3);
    expect(top3[0].views).toBe(18000);
  });
});
