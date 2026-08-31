import { useCallback, useRef } from 'react';

const STORAGE_KEY = 'pixelzoom.hasUploaded';

/**
 * 이 브라우저가 이미지를 올린 적이 있는지 기억한다.
 *
 * 통계의 '사용자 수'가 이 표시로 세어진다. 저장하는 것은 참/거짓 한 비트이고
 * 서버로 나가는 것도 그 한 비트뿐이다 — 식별자를 만들지 않으므로 서버는 이
 * 값으로 사람을 구분할 수 없다. 대신 저장소를 비우거나 다른 브라우저로 오면
 * 다시 세어진다. 통계 페이지에 그 한계를 적어 둔다.
 */
export function useFirstUpload() {
    // 상태로 두지 않는다. 이 값이 바뀐다고 다시 그릴 것이 없다.
    const marked = useRef(false);

    const isFirstUpload = useCallback(() => {
        if (marked.current) return false;
        try {
            return window.localStorage.getItem(STORAGE_KEY) !== '1';
        } catch {
            // 접근이 막힌 환경. 셀 수 없으니 세지 않는다 — 올릴 때마다 새
            // 사용자로 세는 것보다 낫다.
            return false;
        }
    }, []);

    const markUploaded = useCallback(() => {
        marked.current = true;
        try {
            window.localStorage.setItem(STORAGE_KEY, '1');
        } catch {
            // 기억하지 못해도 이번 세션 동안은 marked가 막아 준다.
        }
    }, []);

    return { isFirstUpload, markUploaded };
}
