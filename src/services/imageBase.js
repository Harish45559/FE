const raw = (import.meta.env?.VITE_API_URL || "http://localhost:5000/api").trim();
export const IMAGE_BASE = raw.replace(/\/api\/?$/, "").replace(/\/+$/, "");

export function getMenuImageUrl(item) {
  if (item.image_url) return item.image_url;
  const slug = item.name
    .toLowerCase()
    .replace(/[''']/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `${IMAGE_BASE}/images/${slug}.jpg`;
}
