import { EditorSkeleton } from "@/components/guru/skeletons";

/**
 * Kerangka navigasi ke editor. Bentuknya sama dengan `fallback` di
 * `page.tsx`, jadi tidak ada dua kerangka berbeda yang berkedip beruntun.
 */
export default function Loading() {
  return <EditorSkeleton />;
}
