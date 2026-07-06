import type { MetadataRoute } from "next";

// 試辦階段:全 disallow,避免搜尋引擎收錄半成品
// 正式推廣時改成 allow: "/"
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
    ],
    sitemap: "https://caretaiwan.app/sitemap.xml",
  };
}
