import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pixelzoom.seenIntro';

/**
 * 첫 방문인지 기억한다.
 *
 * 쿠키가 아니라 localStorage를 쓴다. 이 값은 서버가 볼 일이 전혀 없는데,
 * 쿠키로 두면 모든 요청에 실려 나가고 동의 배너가 필요한 종류의 저장소로
 * 분류된다. 브라우저 안에만 머무는 표시에는 localStorage가 맞다.
 *
 * 저장에 실패해도(사생활 보호 모드 등) 화면은 정상 동작해야 한다. 그 경우
 * 방문할 때마다 안내가 다시 뜨는데, 안내가 사라져 영영 못 보는 것보다는
 * 낫다고 판단했다.
 */
export function useFirstVisit() {
    // 초기값을 false로 두고 effect에서 켠다. 서버 렌더링이나 첫 페인트에서
    // 팝업이 번쩍였다 사라지는 일을 막는다.
    const [isFirstVisit, setIsFirstVisit] = useState(false);

    useEffect(() => {
        let seen = false;
        try {
            seen = window.localStorage.getItem(STORAGE_KEY) === '1';
        } catch {
            // 접근 자체가 막힌 환경. 처음 온 것으로 취급한다.
        }
        if (!seen) setIsFirstVisit(true);
    }, []);

    const acknowledge = useCallback(() => {
        setIsFirstVisit(false);
        try {
            window.localStorage.setItem(STORAGE_KEY, '1');
        } catch {
            // 기억하지 못해도 이번 방문 동안은 다시 뜨지 않는다.
        }
    }, []);

    return { isFirstVisit, acknowledge };
}
