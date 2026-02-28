import { useEffect, useRef, useState } from 'react';

const PAGE_SIZE = 15;

interface UseInfiniteScrollOptions {
  totalCount: number;
  pageSize?: number;
  rootMargin?: string;
  threshold?: number;
}

export function useInfiniteScroll({
  totalCount,
  pageSize = PAGE_SIZE,
  rootMargin = '100px',
  threshold = 0,
}: UseInfiniteScrollOptions) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(prev => (prev === 0 ? pageSize : Math.min(prev, totalCount)));
  }, [totalCount, pageSize]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      entries => {
        if (!entries[0]?.isIntersecting) return;
        setVisibleCount(prev => Math.min(prev + pageSize, totalCount));
      },
      { rootMargin, threshold }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [totalCount, pageSize, rootMargin, threshold]);

  const hasMore = visibleCount < totalCount;

  return {
    visibleCount,
    sentinelRef,
    hasMore,
  };
}
