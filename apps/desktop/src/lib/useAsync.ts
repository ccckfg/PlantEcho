import { useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * 加载远程数据。deps 变化时不会清空旧 data —— 这是 stale-while-revalidate 行为，
 * 让切换植物 / 切换路由参数时 UI 不会闪到 skeleton。
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null
  });
  const firstLoadRef = useRef(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false;
    // 首次加载: data 还是 null, 保持 loading=true
    // 之后: 保留旧 data, 标记 loading=true 用于"refreshing"指示, 但不清 data
    setState((prev) => ({
      data: firstLoadRef.current ? null : prev.data,
      loading: true,
      error: null
    }));
    loader()
      .then((data) => {
        if (!cancelled) {
          firstLoadRef.current = false;
          setState({ data, loading: false, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          firstLoadRef.current = false;
          setState((prev) => ({
            data: prev.data,
            loading: false,
            error: err instanceof Error ? err.message : String(err)
          }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, deps);
  return state;
}
